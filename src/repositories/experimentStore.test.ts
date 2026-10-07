import { Pool } from 'pg';
import { ExperimentStore } from './experimentStore';

const pool = new Pool({
  connectionString: 'postgresql://ffp:ffp_dev_password@localhost:5432/feature_flags',
});

describe('ExperimentStore', () => {
  let store: ExperimentStore;

  beforeEach(async () => {
    store = new ExperimentStore(pool);
    await pool.query('DELETE FROM exposures');
    await pool.query('DELETE FROM outcomes');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('logs an exposure without error', async () => {
    await expect(
      store.logExposure({ flagKey: 'checkout-v2', userId: 'u1', value: true })
    ).resolves.not.toThrow();
  });

  it('logs an outcome without error', async () => {
    await expect(store.logOutcome({ userId: 'u1', eventName: 'purchase' })).resolves.not.toThrow();
  });

  it('computes conversion rate per variant', async () => {
    await store.logExposure({ flagKey: 'checkout-v2', userId: 'u1', value: true });
    await store.logExposure({ flagKey: 'checkout-v2', userId: 'u2', value: true });
    await store.logExposure({ flagKey: 'checkout-v2', userId: 'u3', value: false });
    await store.logExposure({ flagKey: 'checkout-v2', userId: 'u4', value: false });

    await store.logOutcome({ userId: 'u1', eventName: 'purchase' });
    await store.logOutcome({ userId: 'u3', eventName: 'purchase' });

    const stats = await store.getStats('checkout-v2', 'purchase');

    const trueVariant = stats.variants.find((v) => v.variant === true);
    const falseVariant = stats.variants.find((v) => v.variant === false);

    expect(trueVariant?.exposures).toBe(2);
    expect(trueVariant?.conversions).toBe(1);
    expect(trueVariant?.conversionRate).toBe(0.5);

    expect(falseVariant?.exposures).toBe(2);
    expect(falseVariant?.conversions).toBe(1);
    expect(falseVariant?.conversionRate).toBe(0.5);
  });

  it('does not count an outcome that happened before the exposure', async () => {
    await store.logOutcome({ userId: 'early-user', eventName: 'purchase' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await store.logExposure({ flagKey: 'checkout-v2', userId: 'early-user', value: true });

    const stats = await store.getStats('checkout-v2', 'purchase');
    const trueVariant = stats.variants.find((v) => v.variant === true);

    expect(trueVariant?.conversions).toBe(0);
  });

  it('returns empty variants when no exposures exist for the flag', async () => {
    const stats = await store.getStats('nonexistent-flag', 'purchase');
    expect(stats.variants).toHaveLength(0);
  });
});
