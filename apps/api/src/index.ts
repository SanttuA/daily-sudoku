import { buildApp } from './app';
import { createConfig } from './lib/config';

async function main(): Promise<void> {
  const config = createConfig(process.env);
  const app = buildApp({ config });

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void main();
