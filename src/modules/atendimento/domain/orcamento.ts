import { DomainError } from '../../../shared/domain/domain-error';
import { Dinheiro } from '../../../shared/domain/value-objects/dinheiro';
import { ItemOrdemServico, TipoItemOrdemServico } from './item-ordem-servico';

export enum StatusOrcamento {
  PENDENTE = 'PENDENTE',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
}

/** Value Object imutável: orçamento gerado automaticamente a partir dos itens da OS. */
export class Orcamento {
  private constructor(
    public readonly valorServicos: Dinheiro,
    public readonly valorPecas: Dinheiro,
    public readonly status: StatusOrcamento,
    public readonly enviadoEm: Date,
    public readonly respondidoEm?: Date,
  ) {}

  static gerar(itens: ItemOrdemServico[], agora: Date): Orcamento {
    if (itens.length === 0)
      throw new DomainError('Não é possível gerar orçamento sem itens', 'ORCAMENTO_SEM_ITENS');
    const somar = (tipo: TipoItemOrdemServico) =>
      itens
        .filter((i) => i.tipo === tipo)
        .reduce((acc, i) => acc.somar(i.subtotal), Dinheiro.zero());
    return new Orcamento(
      somar(TipoItemOrdemServico.SERVICO),
      somar(TipoItemOrdemServico.PECA),
      StatusOrcamento.PENDENTE,
      agora,
    );
  }

  static restaurar(dados: {
    valorServicosCentavos: number;
    valorPecasCentavos: number;
    status: StatusOrcamento;
    enviadoEm: Date;
    respondidoEm?: Date | null;
  }): Orcamento {
    return new Orcamento(
      Dinheiro.deCentavos(dados.valorServicosCentavos),
      Dinheiro.deCentavos(dados.valorPecasCentavos),
      dados.status,
      dados.enviadoEm,
      dados.respondidoEm ?? undefined,
    );
  }

  get valorTotal(): Dinheiro {
    return this.valorServicos.somar(this.valorPecas);
  }

  aprovar(agora: Date): Orcamento {
    return this.responder(StatusOrcamento.APROVADO, agora);
  }

  rejeitar(agora: Date): Orcamento {
    return this.responder(StatusOrcamento.REJEITADO, agora);
  }

  private responder(status: StatusOrcamento, agora: Date): Orcamento {
    if (this.status !== StatusOrcamento.PENDENTE) {
      throw new DomainError('Orçamento já foi respondido', 'ORCAMENTO_JA_RESPONDIDO');
    }
    return new Orcamento(this.valorServicos, this.valorPecas, status, this.enviadoEm, agora);
  }
}
