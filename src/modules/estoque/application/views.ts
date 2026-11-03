import { MovimentacaoEstoque, TipoMovimentacao } from '../domain/movimentacao-estoque';
import { Peca, TipoPeca } from '../domain/peca';

export interface PecaView {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoPeca;
  unidade: string;
  precoCentavos: number;
  preco: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  abaixoDoMinimo: boolean;
}

export interface MovimentacaoView {
  id: string;
  pecaId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  ordemServicoId: string | null;
  criadoEm: Date;
}

export const paraPecaView = (p: Peca): PecaView => ({
  id: p.id,
  codigo: p.codigo,
  nome: p.nome,
  tipo: p.tipo,
  unidade: p.unidade,
  precoCentavos: p.preco.centavos,
  preco: p.preco.reais,
  quantidadeEstoque: p.quantidadeEstoque,
  estoqueMinimo: p.estoqueMinimo,
  abaixoDoMinimo: p.abaixoDoMinimo,
});

export const paraMovimentacaoView = (m: MovimentacaoEstoque): MovimentacaoView => ({
  id: m.id,
  pecaId: m.pecaId,
  tipo: m.tipo,
  quantidade: m.quantidade,
  motivo: m.motivo,
  ordemServicoId: m.ordemServicoId ?? null,
  criadoEm: m.criadoEm,
});
