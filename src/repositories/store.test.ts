import { FlagStore } from './store';

describe('FlagStore', () => {
  let store: FlagStore;

  beforeEach(() => {
    store = new FlagStore();
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

  it('throws when updating a non-existent flag', async () => {
    await expect(store.update('fake-id', { enabled: true })).rejects.toThrow();
  });

  it('deletes a flag', async () => {
    const flag = await store.create({ key: 'delete-me' });
    const result = await store.delete(flag.id);
    expect(result).toBe(true);
    expect(await store.getById(flag.id)).toBeUndefined();
  });
});
