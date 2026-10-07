import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { PgFlagStore } from './repositories/pgFlagStore';
import { CachedFlagStore, FLAG_CHANGE_CHANNEL } from './repositories/cachedFlagStore';
import {
  CreateFlagInput,
  UserContext,
  TargetingRule,
  RolloutConfig,
  Flag,
  CreateSegmentInput,
  SegmentCondition,
} from './types';
import { evaluateFlag } from './services/evaluation';
import { SegmentStore } from './repositories/segmentStore';
import { ExperimentStore } from './repositories/experimentStore';
import { AuditStore } from './repositories/auditStore';
import { config } from './config';

type FlagPatchBody = Partial<Pick<Flag, 'description' | 'enabled' | 'defaultValue'>>;

export function buildServer(pool?: Pool, redisClient?: Redis) {
  const app = Fastify({ logger: !config.isTest });

  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for health check and CORS preflight
    if (request.url === '/health' || request.method === 'OPTIONS') return;
    const providedKey = request.headers['x-api-key'];
    if (providedKey !== config.apiKey) {
      reply.code(401).send({ error: 'Unauthorized: missing or invalid API key' });
    }
  });

  const dbPool =
    pool ??
    new Pool({
      connectionString: config.databaseUrl,
    });

  const redis = redisClient ?? new Redis(config.redisUrl);

  const store = new CachedFlagStore(new PgFlagStore(dbPool), redis);
  const segmentStore = new SegmentStore(dbPool);
  const experimentStore = new ExperimentStore(dbPool);
  const auditStore = new AuditStore(dbPool);

  if (!redisClient) {
    app.addHook('onClose', async () => {
      await redis.quit();
    });
  }

  // --- Health Check ---

  app.get('/health', async () => {
    const checks: Record<string, string> = {};

    try {
      await dbPool.query('SELECT 1');
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'error';
    }

    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return { status: healthy ? 'healthy' : 'degraded', checks };
  });

  // --- Flags CRUD ---

  app.post<{ Body: CreateFlagInput }>('/flags', async (request, reply) => {
    try {
      const flag = await store.create(request.body);
      await auditStore.log({
        entityType: 'flag',
        entityId: flag.id,
        action: 'created',
        changes: request.body as unknown as Record<string, unknown>,
      });
      reply.code(201).send(flag);
    } catch (err) {
      reply.code(409).send({ error: (err as Error).message });
    }
  });

  app.get('/flags', async () => {
    return store.getAll();
  });

  app.get<{ Params: { id: string } }>('/flags/:id', async (request, reply) => {
    const flag = await store.getById(request.params.id);

    if (!flag) {
      return reply.code(404).send({ error: 'Flag not found' });
    }

    return flag;
  });

  app.patch<{ Params: { id: string }; Body: FlagPatchBody }>(
    '/flags/:id',
    async (request, reply) => {
      try {
        const flag = await store.update(request.params.id, request.body);
        await auditStore.log({
          entityType: 'flag',
          entityId: flag.id,
          action: 'updated',
          changes: request.body as unknown as Record<string, unknown>,
        });
        return flag;
      } catch (err) {
        reply.code(404).send({ error: (err as Error).message });
      }
    }
  );

  app.delete<{ Params: { id: string } }>('/flags/:id', async (request, reply) => {
    const deleted = await store.delete(request.params.id);

    if (!deleted) {
      return reply.code(404).send({ error: 'Flag not found' });
    }

    await auditStore.log({
      entityType: 'flag',
      entityId: request.params.id,
      action: 'deleted',
      changes: {},
    });

    reply.code(204).send();
  });

  // --- Flag Evaluation ---

  app.post<{ Params: { key: string }; Body: UserContext }>(
    '/evaluate/:key',
    async (request, reply) => {
      const flag = await store.getByKey(request.params.key);

      if (!flag) {
        return reply.code(404).send({ error: 'Flag not found' });
      }

      const allSegments = await segmentStore.getAll();
      const segmentMap = new Map(allSegments.map((s) => [s.name, s]));

      const value = evaluateFlag(flag, request.body, segmentMap);

      await experimentStore.logExposure({
        flagKey: flag.key,
        userId: request.body.userId,
        value,
      });

      return {
        key: flag.key,
        value,
      };
    }
  );

  // --- Rules & Rollout ---

  app.put<{ Params: { id: string }; Body: { rules: TargetingRule[] } }>(
    '/flags/:id/rules',
    async (request, reply) => {
      try {
        const flag = await store.setRules(request.params.id, request.body.rules);
        await auditStore.log({
          entityType: 'flag',
          entityId: flag.id,
          action: 'rules_updated',
          changes: { rules: request.body.rules as unknown as Record<string, unknown>[] },
        });
        return flag;
      } catch (err) {
        reply.code(404).send({ error: (err as Error).message });
      }
    }
  );

  app.put<{ Params: { id: string }; Body: { rollout: RolloutConfig | null } }>(
    '/flags/:id/rollout',
    async (request, reply) => {
      try {
        const flag = await store.setRollout(request.params.id, request.body.rollout);
        await auditStore.log({
          entityType: 'flag',
          entityId: flag.id,
          action: 'rollout_updated',
          changes: { rollout: request.body.rollout as unknown as Record<string, unknown> },
        });
        return flag;
      } catch (err) {
        reply.code(404).send({ error: (err as Error).message });
      }
    }
  );

  // --- Segments ---

  app.post<{ Body: CreateSegmentInput }>('/segments', async (request, reply) => {
    try {
      const segment = await segmentStore.create(request.body);
      await auditStore.log({
        entityType: 'segment',
        entityId: segment.id,
        action: 'created',
        changes: request.body as unknown as Record<string, unknown>,
      });
      reply.code(201).send(segment);
    } catch (err) {
      reply.code(409).send({ error: (err as Error).message });
    }
  });

  app.get('/segments', async () => {
    return segmentStore.getAll();
  });

  app.get<{ Params: { id: string } }>('/segments/:id', async (request, reply) => {
    const segments = await segmentStore.getAll();
    const segment = segments.find((s) => s.id === request.params.id);
    if (!segment) {
      return reply.code(404).send({ error: 'Segment not found' });
    }
    return segment;
  });

  app.put<{ Params: { id: string }; Body: { name?: string; conditions?: SegmentCondition[] } }>(
    '/segments/:id',
    async (request, reply) => {
      try {
        const segment = await segmentStore.update(request.params.id, request.body);
        await auditStore.log({
          entityType: 'segment',
          entityId: segment.id,
          action: 'updated',
          changes: request.body as unknown as Record<string, unknown>,
        });
        return segment;
      } catch (err) {
        reply.code(404).send({ error: (err as Error).message });
      }
    }
  );

  app.delete<{ Params: { id: string } }>('/segments/:id', async (request, reply) => {
    const deleted = await segmentStore.delete(request.params.id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Segment not found' });
    }
    await auditStore.log({
      entityType: 'segment',
      entityId: request.params.id,
      action: 'deleted',
      changes: {},
    });
    reply.code(204).send();
  });

  // --- Experiments ---

  app.post<{ Body: { userId: string; eventName: string } }>('/outcomes', async (request, reply) => {
    await experimentStore.logOutcome(request.body);
    reply.code(201).send({ status: 'logged' });
  });

  app.get<{ Params: { key: string }; Querystring: { event: string } }>(
    '/experiments/:key/stats',
    async (request, reply) => {
      if (!request.query.event) {
        return reply.code(400).send({ error: 'Query parameter "event" is required' });
      }
      return experimentStore.getStats(request.params.key, request.query.event);
    }
  );

  // --- Audit Log ---

  app.get<{ Params: { entityType: string; entityId: string } }>(
    '/audit-log/:entityType/:entityId',
    async (request) => {
      return auditStore.getByEntity(request.params.entityType, request.params.entityId);
    }
  );

  app.get('/audit-log', async () => {
    return auditStore.getAll(50);
  });

  // --- SSE Stream ---

  app.get('/stream', async (request, reply) => {
    reply.hijack();

    const subscriber = redis.duplicate();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.raw.write(': connected\n\n');

    await subscriber.subscribe(FLAG_CHANGE_CHANNEL);

    subscriber.on('message', (_channel, message) => {
      reply.raw.write(`data: ${message}\n\n`);
    });

    request.raw.on('close', () => {
      subscriber.unsubscribe();
      subscriber.quit();
    });
  });

  return app;
}
