import { Pool } from 'pg';
import { PgFlagStore } from './pgFlagStore';

const pool = new Pool({
  connectionString: 'postgresql://ffp:ffp_dev_password@localhost:5432/feature_flags',
});

describe('PgFlagStore', () => {
  let store: PgFlagStore;

  beforeEach(async () => {
    store = new PgFlagStore(pool);
    await pool.query('DELETE FROM flags');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates a flag with defaults', async () => {
    const flag = await store.create({ key: 'new-checkout' });
    expect(flag.key).toBe('new-checkout');
    expect(flag.enabled).toBe(false);
    expect(flag.defaultValue).toBe(false);
    expect(flag.id).toBeDefined();
  });

  it('prevents duplicate keys', async () => {
    await store.create({ key: 'dup-flag' });
    await expect(store.create({ key: 'dup-flag' })).rejects.toThrow();
  });

  it('retrieves a flag by key', async () => {
    await store.create({ key: 'find-me' });
    const found = await store.getByKey('find-me');
    expect(found?.key).toBe('find-me');
  });

  it('updates a flag', async () => {
    const flag = await store.create({ key: 'toggle-me' });
    const updated = await store.update(flag.id, { enabled: true });
    expect(updated.enabled).toBe(true);
  });

  it('sets and persists rules', async () => {
    const flag = await store.create({ key: 'rule-test' });
    const updated = await store.setRules(flag.id, [
      { attribute: 'plan', operator: 'equals', value: 'pro', serveValue: true },
    ]);
    expect(updated.rules).toHaveLength(1);
    expect(updated.rules[0].attribute).toBe('plan');
  });

  it('sets and persists a rollout', async () => {
    const flag = await store.create({ key: 'rollout-test' });
    const updated = await store.setRollout(flag.id, { percentage: 50, serveValue: true });
    expect(updated.rollout?.percentage).toBe(50);
  });

  it('deletes a flag', async () => {
    const flag = await store.create({ key: 'delete-me' });
    const result = await store.delete(flag.id);
    expect(result).toBe(true);
    expect(await store.getById(flag.id)).toBeUndefined();
  });
});
