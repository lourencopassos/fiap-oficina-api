import { ClienteView, VeiculoView } from '../../cadastro/application/views';
import { TipoItemOrdemServico } from '../domain/item-ordem-servico';
import { StatusOrcamento } from '../domain/orcamento';
import { OrdemServico } from '../domain/ordem-servico';
import { DESCRICAO_STATUS, StatusOrdemServico } from '../domain/status-ordem-servico';

export interface ItemView {
  id: string;
  tipo: TipoItemOrdemServico;
  referenciaId: string;
  descricao: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  subtotalCentavos: number;
}

export interface OrcamentoView {
  status: StatusOrcamento;
  valorServicosCentavos: number;
  valorPecasCentavos: number;
  valorTotalCentavos: number;
  valorTotal: number;
  enviadoEm: Date;
  respondidoEm: Date | null;
}

export interface HistoricoView {
  status: StatusOrdemServico;
  descricao: string;
  observacao: string | null;
  ocorridoEm: Date;
}

export interface OrdemServicoView {
  id: string;
  codigo: string;
  status: StatusOrdemServico;
  statusDescricao: string;
  observacao: string | null;
  cliente: Pick<ClienteView, 'id' | 'nome' | 'documento'>;
  veiculo: Pick<VeiculoView, 'id' | 'placa' | 'marca' | 'modelo' | 'ano'>;
  itens: ItemView[];
  valorTotalItensCentavos: number;
  orcamento: OrcamentoView | null;
  historico: HistoricoView[];
  criadaEm: Date;
  inicioExecucao: Date | null;
  fimExecucao: Date | null;
  entregueEm: Date | null;
  tempoExecucaoMinutos: number | null;
}

/** Visão para o cliente final: sem IDs internos e com documento mascarado. */
export interface AcompanhamentoView {
  codigo: string;
  status: StatusOrdemServico;
  statusDescricao: string;
  cliente: { nome: string; documento: string };
  veiculo: { placa: string; marca: string; modelo: string; ano: number };
  itens: Omit<ItemView, 'id' | 'referenciaId'>[];
  orcamento: OrcamentoView | null;
  historico: HistoricoView[];
  criadaEm: Date;
}

const itemView = (os: OrdemServico): ItemView[] =>
  os.itens.map((i) => ({
    id: i.id,
    tipo: i.tipo,
    referenciaId: i.referenciaId,
    descricao: i.descricao,
    quantidade: i.quantidade,
    precoUnitarioCentavos: i.precoUnitario.centavos,
    subtotalCentavos: i.subtotal.centavos,
  }));

const orcamentoView = (os: OrdemServico): OrcamentoView | null => {
  const o = os.orcamento;
  if (!o) return null;
  return {
    status: o.status,
    valorServicosCentavos: o.valorServicos.centavos,
    valorPecasCentavos: o.valorPecas.centavos,
    valorTotalCentavos: o.valorTotal.centavos,
    valorTotal: o.valorTotal.reais,
    enviadoEm: o.enviadoEm,
    respondidoEm: o.respondidoEm ?? null,
  };
};

const historicoView = (os: OrdemServico): HistoricoView[] =>
  os.historico.map((h) => ({
    status: h.status,
    descricao: DESCRICAO_STATUS[h.status],
    observacao: h.observacao ?? null,
    ocorridoEm: h.ocorridoEm,
  }));

export const paraOrdemServicoView = (
  os: OrdemServico,
  cliente: ClienteView,
  veiculo: VeiculoView,
): OrdemServicoView => ({
  id: os.id,
  codigo: os.codigo,
  status: os.status,
  statusDescricao: DESCRICAO_STATUS[os.status],
  observacao: os.observacao ?? null,
  cliente: { id: cliente.id, nome: cliente.nome, documento: cliente.documento },
  veiculo: {
    id: veiculo.id,
    placa: veiculo.placa,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    ano: veiculo.ano,
  },
  itens: itemView(os),
  valorTotalItensCentavos: os.valorTotalItens.centavos,
  orcamento: orcamentoView(os),
  historico: historicoView(os),
  criadaEm: os.criadaEm,
  inicioExecucao: os.inicioExecucao ?? null,
  fimExecucao: os.fimExecucao ?? null,
  entregueEm: os.entregueEm ?? null,
  tempoExecucaoMinutos: os.tempoExecucaoMinutos,
});

export const paraAcompanhamentoView = (
  os: OrdemServico,
  cliente: { nome: string; documentoMascarado: string },
  veiculo: VeiculoView,
): AcompanhamentoView => ({
  codigo: os.codigo,
  status: os.status,
  statusDescricao: DESCRICAO_STATUS[os.status],
  cliente: { nome: cliente.nome, documento: cliente.documentoMascarado },
  veiculo: { placa: veiculo.placa, marca: veiculo.marca, modelo: veiculo.modelo, ano: veiculo.ano },
  itens: itemView(os).map(({ id: _id, referenciaId: _ref, ...resto }) => resto),
  orcamento: orcamentoView(os),
  historico: historicoView(os),
  criadaEm: os.criadaEm,
});
