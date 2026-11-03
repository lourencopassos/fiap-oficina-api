export default async function globalTeardown(): Promise<void> {
  const container = (globalThis as Record<string, unknown>).__PG_CONTAINER__ as
    { stop(): Promise<unknown> } | undefined;
  await container?.stop();
}
