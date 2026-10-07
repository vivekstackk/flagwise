import { buildServer } from './server';
import { config } from './config';

const app = buildServer();

app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Keep-alive: ping own health endpoint every 14 minutes to prevent
  // Render free tier from spinning down the server due to inactivity
  if (config.nodeEnv === 'production') {
    const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        await fetch(`http://0.0.0.0:${config.port}/health`);
      } catch {
        // Ignore errors — this is just a keep-alive ping
      }
    }, KEEP_ALIVE_INTERVAL);
  }
});
