import { randomUUID } from 'node:crypto';
import { StatusOrdemServico } from './status-ordem-servico';

/** Entrada imutável na linha do tempo da OS (exibida ao cliente no acompanhamento). */
export class HistoricoStatus {
  constructor(
    public readonly id: string,
    public readonly status: StatusOrdemServico,
    public readonly ocorridoEm: Date,
    public readonly observacao?: string,
  ) {}

  static registrar(
    status: StatusOrdemServico,
    ocorridoEm: Date,
    observacao?: string,
  ): HistoricoStatus {
    return new HistoricoStatus(randomUUID(), status, ocorridoEm, observacao);
  }
}
