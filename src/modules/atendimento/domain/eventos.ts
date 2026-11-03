import { DomainEvent } from '../../../shared/domain/domain-event';
import { StatusOrdemServico } from './status-ordem-servico';

export const EventosOrdemServico = {
  ABERTA: 'ordem-servico.aberta',
  STATUS_ALTERADO: 'ordem-servico.status-alterado',
  ORCAMENTO_ENVIADO: 'ordem-servico.orcamento-enviado',
  ORCAMENTO_APROVADO: 'ordem-servico.orcamento-aprovado',
  ORCAMENTO_REJEITADO: 'ordem-servico.orcamento-rejeitado',
} as const;

export interface StatusAlteradoPayload extends Record<string, unknown> {
  codigo: string;
  clienteId: string;
  de: StatusOrdemServico | null;
  para: StatusOrdemServico;
}

export interface OrcamentoEnviadoPayload extends Record<string, unknown> {
  codigo: string;
  clienteId: string;
  valorTotalCentavos: number;
}

export const criarEvento = (
  nome: string,
  aggregateId: string,
  ocorridoEm: Date,
  payload: Record<string, unknown>,
): DomainEvent => ({ nome, aggregateId, ocorridoEm, payload });
