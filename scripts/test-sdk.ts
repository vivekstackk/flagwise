import { FeatureFlagClient } from '../src/sdk/client';

async function main() {
  const client = new FeatureFlagClient({ baseUrl: 'http://localhost:3000' });
  await client.start();

  console.log('SDK started. Evaluating "sdk-test-flag" every 2s. Ctrl+C to stop.');

  setInterval(() => {
    const value = client.evaluate('sdk-test-flag', { userId: 'demo-user' });
    console.log(new Date().toISOString(), '-> sdk-test-flag =', value);
  }, 2000);
}

main();