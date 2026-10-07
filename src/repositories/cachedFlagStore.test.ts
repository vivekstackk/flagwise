import Redis from 'ioredis';
import { CachedFlagStore } from './cachedFlagStore';
import { FlagRepository, FlagConfig, CreateFlagInput } from '../types';

class FakeInnerStore implements FlagRepository {
  public getByKeyCallCount = 0;
  private flags: Map<string, FlagConfig> = new Map();

  async create(input: CreateFlagInput): Promise<FlagConfig> {
    const flag: FlagConfig = {
      id: `id-${this.flags.size + 1}`,
      key: input.key,
      description: input.description ?? '',
      enabled: false,
      defaultValue: input.defaultValue ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rules: [],
      rollout: null,
    };
    this.flags.set(flag.id, flag);
    return flag;
  }

  async getById(id: string) {
    return this.flags.get(id);
  }

  async getByKey(key: string) {
    this.getByKeyCallCount++;
    return Array.from(this.flags.values()).find((f) => f.key === key);
  }

  async getAll() {
    return Array.from(this.flags.values());
  }

  async update(id: string, changes: Partial<FlagConfig>) {
    const flag = this.flags.get(id)!;
    const updated = { ...flag, ...changes };
    this.flags.set(id, updated);
    return updated;
  }

  async setRules(id: string, rules: FlagConfig['rules']) {
    return this.update(id, { rules });
  }

  async setRollout(id: string, rollout: FlagConfig['rollout']) {
    return this.update(id, { rollout });
  }

  async delete(id: string) {
    return this.flags.delete(id);
  }
}

describe('CachedFlagStore', () => {
  let redis: Redis;
  let inner: FakeInnerStore;
  let store: CachedFlagStore;

  beforeEach(async () => {
    redis = new Redis({ host: 'localhost', port: 6379 });
    await redis.flushall();
    inner = new FakeInnerStore();
    store = new CachedFlagStore(inner, redis);
  });

  afterEach(async () => {
    await redis.quit();
  });

  it('hits the inner store on first getByKey call', async () => {
    await inner.create({ key: 'cached-flag' });
    await store.getByKey('cached-flag');
    expect(inner.getByKeyCallCount).toBe(1);
  });

  it('serves the second getByKey call from cache, not the inner store', async () => {
    await inner.create({ key: 'cached-flag' });
    await store.getByKey('cached-flag');
    await store.getByKey('cached-flag');
    expect(inner.getByKeyCallCount).toBe(1);
  });

  it('invalidates the cache when the flag is updated', async () => {
    const flag = await inner.create({ key: 'toggle-flag' });
    await store.getByKey('toggle-flag');
    await store.update(flag.id, { enabled: true });
    await store.getByKey('toggle-flag');
    expect(inner.getByKeyCallCount).toBe(2);
  });

  it('invalidates the cache when rules are set', async () => {
    const flag = await inner.create({ key: 'rule-flag' });
    await store.getByKey('rule-flag');
    await store.setRules(flag.id, [
      { attribute: 'plan', operator: 'equals', value: 'pro', serveValue: true },
    ]);
    await store.getByKey('rule-flag');
    expect(inner.getByKeyCallCount).toBe(2);
  });

  it('returns undefined for a flag that does not exist, without caching it', async () => {
    const result = await store.getByKey('does-not-exist');
    expect(result).toBeUndefined();
    expect(inner.getByKeyCallCount).toBe(1);
  });
});
