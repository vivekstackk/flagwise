import { Pool } from 'pg';
import { SegmentStore } from './segmentStore';

const pool = new Pool({
  connectionString: 'postgresql://ffp:ffp_dev_password@localhost:5432/feature_flags',
});

describe('SegmentStore', () => {
  let store: SegmentStore;

  beforeEach(async () => {
    store = new SegmentStore(pool);
    await pool.query('DELETE FROM segments');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates a segment with conditions', async () => {
    const segment = await store.create({
      name: 'beta-testers',
      conditions: [{ attribute: 'plan', operator: 'equals', value: 'beta' }],
    });

    expect(segment.name).toBe('beta-testers');
    expect(segment.conditions).toHaveLength(1);
    expect(segment.id).toBeDefined();
  });

  it('prevents duplicate segment names', async () => {
    await store.create({ name: 'dup-segment', conditions: [] });
    await expect(store.create({ name: 'dup-segment', conditions: [] })).rejects.toThrow();
  });

  it('retrieves a segment by name', async () => {
    await store.create({ name: 'find-me', conditions: [] });
    const found = await store.getByName('find-me');
    expect(found?.name).toBe('find-me');
  });

  it('lists all segments', async () => {
    await store.create({ name: 'seg-a', conditions: [] });
    await store.create({ name: 'seg-b', conditions: [] });

    const all = await store.getAll();
    expect(all).toHaveLength(2);
  });

  it('deletes a segment', async () => {
    const segment = await store.create({ name: 'delete-me', conditions: [] });
    const result = await store.delete(segment.id);
    expect(result).toBe(true);
    expect(await store.getByName('delete-me')).toBeUndefined();
  });

  it('returns false when deleting a non-existent segment id', async () => {
    const result = await store.delete('fake-id');
    expect(result).toBe(false);
  });
});
