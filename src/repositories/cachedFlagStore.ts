import Redis from 'ioredis';
import {
  CreateFlagInput,
  FlagConfig,
  FlagRepository,
  RolloutConfig,
  TargetingRule,
} from '../types';

const CACHE_TTL_SECONDS = 60;
export const FLAG_CHANGE_CHANNEL = 'flag-changes';

function cacheKey(key: string): string {
  return `flag:key:${key}`;
}

export class CachedFlagStore implements FlagRepository {
  constructor(
    private inner: FlagRepository,
    private redis: Redis
  ) {}

  async create(input: CreateFlagInput): Promise<FlagConfig> {
    const flag = await this.inner.create(input);
    try {
      await this.redis.publish(FLAG_CHANGE_CHANNEL, JSON.stringify({ key: flag.key }));
    } catch {
      console.warn('[CachedFlagStore] Redis publish failed on create, continuing without cache');
    }
    return flag;
  }

  async getById(id: string): Promise<FlagConfig | undefined> {
    return this.inner.getById(id);
  }

  async getByKey(key: string): Promise<FlagConfig | undefined> {
    try {
      const cached = await this.redis.get(cacheKey(key));
      if (cached) {
        return JSON.parse(cached) as FlagConfig;
      }
    } catch {
      console.warn('[CachedFlagStore] Redis get failed, falling through to Postgres');
    }

    const flag = await this.inner.getByKey(key);
    if (flag) {
      try {
        await this.redis.set(cacheKey(key), JSON.stringify(flag), 'EX', CACHE_TTL_SECONDS);
      } catch {
        console.warn('[CachedFlagStore] Redis set failed, continuing without cache');
      }
    }
    return flag;
  }

  async getAll(): Promise<FlagConfig[]> {
    return this.inner.getAll();
  }

  async update(
    id: string,
    changes: Partial<Pick<FlagConfig, 'description' | 'enabled' | 'defaultValue'>>
  ): Promise<FlagConfig> {
    const flag = await this.inner.update(id, changes);
    try {
      await this.redis.del(cacheKey(flag.key));
      await this.redis.publish(FLAG_CHANGE_CHANNEL, JSON.stringify({ key: flag.key }));
    } catch {
      console.warn('[CachedFlagStore] Redis invalidation failed on update, continuing');
    }
    return flag;
  }

  async setRules(id: string, rules: TargetingRule[]): Promise<FlagConfig> {
    const flag = await this.inner.setRules(id, rules);
    try {
      await this.redis.del(cacheKey(flag.key));
      await this.redis.publish(FLAG_CHANGE_CHANNEL, JSON.stringify({ key: flag.key }));
    } catch {
      console.warn('[CachedFlagStore] Redis invalidation failed on setRules, continuing');
    }
    return flag;
  }

  async setRollout(id: string, rollout: RolloutConfig | null): Promise<FlagConfig> {
    const flag = await this.inner.setRollout(id, rollout);
    try {
      await this.redis.del(cacheKey(flag.key));
      await this.redis.publish(FLAG_CHANGE_CHANNEL, JSON.stringify({ key: flag.key }));
    } catch {
      console.warn('[CachedFlagStore] Redis invalidation failed on setRollout, continuing');
    }
    return flag;
  }

  async delete(id: string): Promise<boolean> {
    const flag = await this.inner.getById(id);
    const result = await this.inner.delete(id);
    if (flag) {
      try {
        await this.redis.del(cacheKey(flag.key));
        await this.redis.publish(FLAG_CHANGE_CHANNEL, JSON.stringify({ key: flag.key }));
      } catch {
        console.warn('[CachedFlagStore] Redis invalidation failed on delete, continuing');
      }
    }
    return result;
  }
}
