jest.mock('eventsource', () => ({
  EventSource: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    onmessage: null,
    onerror: null,
    onopen: null,
  })),
}));

import { FeatureFlagClient } from './client';
import { FlagConfig } from '../types';

function makeFlag(overrides: Partial<FlagConfig> = {}): FlagConfig {
  return {
    id: '1',
    key: 'test-flag',
    description: '',
    enabled: true,
    defaultValue: false,
    createdAt: '',
    updatedAt: '',
    rules: [],
    rollout: { percentage: 100, serveValue: true },
    ...overrides,
  };
}

describe('FeatureFlagClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('populates the local cache from the initial fetch and evaluates locally', async () => {
    const flags = [makeFlag({ key: 'checkout-v2' })];
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => flags,
    } as Response);

    const client = new FeatureFlagClient({ baseUrl: 'http://localhost:3000' });
    await client.start();

    const result = client.evaluate('checkout-v2', { userId: 'u1' });
    expect(result).toBe(true);

    client.stop();
  });

  it('returns false for a flag key that does not exist in the cache', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => [],
    } as Response);

    const client = new FeatureFlagClient({ baseUrl: 'http://localhost:3000' });
    await client.start();

    const result = client.evaluate('unknown-flag', { userId: 'u1' });
    expect(result).toBe(false);

    client.stop();
  });

  it('respects a disabled flag, ignoring its rollout', async () => {
    const flags = [makeFlag({ key: 'off-flag', enabled: false })];
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => flags,
    } as Response);

    const client = new FeatureFlagClient({ baseUrl: 'http://localhost:3000' });
    await client.start();

    const result = client.evaluate('off-flag', { userId: 'u1' });
    expect(result).toBe(false);

    client.stop();
  });
});
