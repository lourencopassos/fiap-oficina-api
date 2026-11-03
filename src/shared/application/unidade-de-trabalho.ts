/**
 * Porta para delimitar uma transação de banco. Tudo o que os repositórios
 * fizerem dentro de `executar` é confirmado ou desfeito em conjunto.
 */
export abstract class UnidadeDeTrabalho {
  abstract executar<T>(trabalho: () => Promise<T>): Promise<T>;
}
