export enum StatusOrdemServico {
  RECEBIDA = 'RECEBIDA',
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
  EM_EXECUCAO = 'EM_EXECUCAO',
  FINALIZADA = 'FINALIZADA',
  ENTREGUE = 'ENTREGUE',
}

export const DESCRICAO_STATUS: Record<StatusOrdemServico, string> = {
  [StatusOrdemServico.RECEBIDA]: 'Recebida',
  [StatusOrdemServico.EM_DIAGNOSTICO]: 'Em diagnóstico',
  [StatusOrdemServico.AGUARDANDO_APROVACAO]: 'Aguardando aprovação',
  [StatusOrdemServico.EM_EXECUCAO]: 'Em execução',
  [StatusOrdemServico.FINALIZADA]: 'Finalizada',
  [StatusOrdemServico.ENTREGUE]: 'Entregue',
};

/**
 * Regras de transição do ciclo de vida da OS.
 * AGUARDANDO_APROVACAO -> FINALIZADA ocorre quando o cliente rejeita o orçamento
 * (OS encerrada sem execução; o veículo segue para entrega).
 */
export const TRANSICOES_PERMITIDAS: Record<StatusOrdemServico, StatusOrdemServico[]> = {
  [StatusOrdemServico.RECEBIDA]: [StatusOrdemServico.EM_DIAGNOSTICO],
  [StatusOrdemServico.EM_DIAGNOSTICO]: [StatusOrdemServico.AGUARDANDO_APROVACAO],
  [StatusOrdemServico.AGUARDANDO_APROVACAO]: [
    StatusOrdemServico.EM_EXECUCAO,
    StatusOrdemServico.FINALIZADA,
  ],
  [StatusOrdemServico.EM_EXECUCAO]: [StatusOrdemServico.FINALIZADA],
  [StatusOrdemServico.FINALIZADA]: [StatusOrdemServico.ENTREGUE],
  [StatusOrdemServico.ENTREGUE]: [],
};
