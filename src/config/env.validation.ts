/** Falha cedo (fail fast) se o ambiente estiver mal configurado. */
export function validarAmbiente(config: Record<string, unknown>): Record<string, unknown> {
  const erros: string[] = [];
  if (!config.DATABASE_URL) erros.push('DATABASE_URL é obrigatória');
  const segredo = String(config.JWT_SECRET ?? '');
  if (segredo.length < 32) erros.push('JWT_SECRET é obrigatório e deve ter ao menos 32 caracteres');
  if (erros.length) throw new Error(`Configuração inválida:\n - ${erros.join('\n - ')}`);
  return config;
}
