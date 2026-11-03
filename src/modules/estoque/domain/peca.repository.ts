import { MovimentacaoEstoque } from './movimentacao-estoque';
import { Peca, TipoPeca } from './peca';

export interface FiltroPecas {
  tipo?: TipoPeca;
  abaixoDoMinimo?: boolean;
}

export abstract class PecaRepository {
  abstract buscarPorId(id: string): Promise<Peca | null>;
  abstract buscarPorCodigo(codigo: string): Promise<Peca | null>;
  abstract listar(filtro?: FiltroPecas): Promise<Peca[]>;
  /** Persiste dados cadastrais. Na criação grava também o saldo inicial. */
  abstract salvar(peca: Peca): Promise<void>;
  abstract remover(id: string): Promise<void>;

  /**
   * Ajusta o saldo de forma atômica no banco. Para baixas (delta < 0) só aplica se houver
   * saldo suficiente, evitando condição de corrida entre aprovações simultâneas.
   * Retorna false se o saldo era insuficiente.
   */
  abstract ajustarSaldo(pecaId: string, delta: number): Promise<boolean>;
  abstract registrarMovimentacao(movimentacao: MovimentacaoEstoque): Promise<void>;
  abstract listarMovimentacoes(pecaId: string): Promise<MovimentacaoEstoque[]>;
}
