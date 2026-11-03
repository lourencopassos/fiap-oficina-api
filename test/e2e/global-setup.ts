import { execSync } from 'node:child_process';

/**
 * Banco para os testes de integração:
 *  - se E2E_DATABASE_URL estiver definida (ex.: CI com service container), usa esse banco;
 *  - caso contrário, sobe um PostgreSQL efêmero via Testcontainers (requer Docker).
 * Em seguida aplica as migrations reais do projeto. O banco informado deve estar vazio.
 */
export default async function globalSetup(): Promise<void> {
  let url = process.env.E2E_DATABASE_URL;
  if (!url) {
    // Import tardio: só carrega o Testcontainers (e exige Docker) quando realmente necessário.
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('oficina_test')
      .withUsername('oficina')
      .withPassword('oficina')
      .start();
    (globalThis as Record<string, unknown>).__PG_CONTAINER__ = container;
    url = container.getConnectionUri();
  }

  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = 'segredo-somente-para-testes-e2e-com-mais-de-32-chars';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.THROTTLE_LIMIT = '1000';

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
