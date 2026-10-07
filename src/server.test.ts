import { buildServer } from './server';
import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { config } from './config';

const authHeaders = { 'x-api-key': config.apiKey };
const pool = new Pool({
  connectionString: 'postgresql://ffp:ffp_dev_password@localhost:5432/feature_flags',
});

const redis = new Redis({ host: 'localhost', port: 6379 });

describe('SSE stream', () => {
  it('pushes a message on the stream when a flag changes', async () => {
    await pool.query('DELETE FROM flags');
    const streamApp = buildServer(pool, redis);
    await streamApp.ready();

    const address = await streamApp.listen({ port: 0, host: '127.0.0.1' });
    const streamResponse = await fetch(`${address}/stream`, { headers: authHeaders });
    const reader = streamResponse.body!.getReader();

    const streamPromise = (async () => {
      const decoder = new TextDecoder();
      let buffer = '';
      while (!buffer.includes('stream-test-flag')) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      return buffer;
    })();

    await new Promise((resolve) => setTimeout(resolve, 200));

    await streamApp.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'stream-test-flag' },
      headers: authHeaders,
    });

    const chunk = await streamPromise;
    expect(chunk).toContain('stream-test-flag');

    reader.cancel();
    await streamApp.close();
  }, 10000);
});

describe('Flag API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await pool.query('DELETE FROM flags');
    await pool.query('DELETE FROM exposures');
    await pool.query('DELETE FROM outcomes');
    await redis.flushall();
    app = buildServer(pool, redis);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await pool.end();
    await redis.quit();
  });

  it('creates a flag via POST /flags', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'checkout-v2', description: 'test' },
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.key).toBe('checkout-v2');
    expect(body.enabled).toBe(false);
  });

  it('rejects duplicate keys with 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'dup' },
      headers: authHeaders,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'dup' },
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(409);
  });

  it('lists all flags via GET /flags', async () => {
    await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'a' },
      headers: authHeaders,
    });
    await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'b' },
      headers: authHeaders,
    });

    const response = await app.inject({ method: 'GET', url: '/flags', headers: authHeaders });
    const body = JSON.parse(response.body);

    expect(body).toHaveLength(2);
  });

  it('returns 404 for a non-existent flag', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/flags/fake-id',
      headers: authHeaders,
    });
    expect(response.statusCode).toBe(404);
  });

  it('updates a flag via PATCH', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'toggle' },
      headers: authHeaders,
    });
    const { id } = JSON.parse(created.body);

    const response = await app.inject({
      method: 'PATCH',
      url: `/flags/${id}`,
      payload: { enabled: true },
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).enabled).toBe(true);
  });

  it('deletes a flag via DELETE', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'temp' },
      headers: authHeaders,
    });
    const { id } = JSON.parse(created.body);

    const response = await app.inject({
      method: 'DELETE',
      url: `/flags/${id}`,
      headers: authHeaders,
    });
    expect(response.statusCode).toBe(204);

    const getResponse = await app.inject({
      method: 'GET',
      url: `/flags/${id}`,
      headers: authHeaders,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  it('evaluates a disabled flag to its default value', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'eval-test', defaultValue: false },
      headers: authHeaders,
    });
    const { key } = JSON.parse(created.body);

    const response = await app.inject({
      method: 'POST',
      url: `/evaluate/${key}`,
      payload: { userId: 'u1' },
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).value).toBe(false);
  });

  it('returns 404 when evaluating a non-existent flag key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/evaluate/does-not-exist',
      payload: { userId: 'u1' },
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(404);
  });

  it('sets targeting rules and applies them on evaluate', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'plan-gate', defaultValue: false },
      headers: authHeaders,
    });
    const { id, key } = JSON.parse(created.body);

    await app.inject({
      method: 'PATCH',
      url: `/flags/${id}`,
      payload: { enabled: true },
      headers: authHeaders,
    });

    await app.inject({
      method: 'PUT',
      url: `/flags/${id}/rules`,
      payload: {
        rules: [{ attribute: 'plan', operator: 'equals', value: 'pro', serveValue: true }],
      },
      headers: authHeaders,
    });

    const proResponse = await app.inject({
      method: 'POST',
      url: `/evaluate/${key}`,
      payload: { userId: 'u1', attributes: { plan: 'pro' } },
      headers: authHeaders,
    });
    const freeResponse = await app.inject({
      method: 'POST',
      url: `/evaluate/${key}`,
      payload: { userId: 'u2', attributes: { plan: 'free' } },
      headers: authHeaders,
    });

    expect(JSON.parse(proResponse.body).value).toBe(true);
    expect(JSON.parse(freeResponse.body).value).toBe(false);
  });

  it('sets a rollout and applies it on evaluate', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'full-rollout', defaultValue: false },
      headers: authHeaders,
    });
    const { id, key } = JSON.parse(created.body);

    await app.inject({
      method: 'PATCH',
      url: `/flags/${id}`,
      payload: { enabled: true },
      headers: authHeaders,
    });

    await app.inject({
      method: 'PUT',
      url: `/flags/${id}/rollout`,
      payload: { rollout: { percentage: 100, serveValue: true } },
      headers: authHeaders,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/evaluate/${key}`,
      payload: { userId: 'any-user' },
      headers: authHeaders,
    });

    expect(JSON.parse(response.body).value).toBe(true);
  });

  it('returns 404 when setting rules on a non-existent flag', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/flags/fake-id/rules',
      payload: { rules: [] },
      headers: authHeaders,
    });
    expect(response.statusCode).toBe(404);
  });

  it('logs an exposure when evaluating a flag', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'exposure-test', defaultValue: true },
      headers: authHeaders,
    });
    const { key } = JSON.parse(created.body);

    await app.inject({
      method: 'POST',
      url: `/evaluate/${key}`,
      payload: { userId: 'exposure-user' },
      headers: authHeaders,
    });

    const statsResponse = await app.inject({
      method: 'GET',
      url: `/experiments/${key}/stats?event=purchase`,
      headers: authHeaders,
    });

    const stats = JSON.parse(statsResponse.body);
    const trueVariant = stats.variants.find((v: { variant: boolean }) => v.variant === true);

    expect(trueVariant?.exposures).toBe(1);
  });

  it('logs an outcome and reflects it in stats', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/flags',
      payload: { key: 'outcome-test', defaultValue: true },
      headers: authHeaders,
    });
    const { key } = JSON.parse(created.body);

    await app.inject({
      method: 'POST',
      url: `/evaluate/${key}`,
      payload: { userId: 'converting-user' },
      headers: authHeaders,
    });

    await app.inject({
      method: 'POST',
      url: '/outcomes',
      payload: { userId: 'converting-user', eventName: 'signup' },
      headers: authHeaders,
    });

    const statsResponse = await app.inject({
      method: 'GET',
      url: `/experiments/${key}/stats?event=signup`,
      headers: authHeaders,
    });

    const stats = JSON.parse(statsResponse.body);
    const trueVariant = stats.variants.find((v: { variant: boolean }) => v.variant === true);

    expect(trueVariant?.conversions).toBe(1);
    expect(trueVariant?.conversionRate).toBe(1);
  });

  it('returns 400 from stats endpoint when event query param is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/experiments/some-flag/stats',
      headers: authHeaders,
    });
    expect(response.statusCode).toBe(400);
  });
});
