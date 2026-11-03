import { randomUUID } from 'node:crypto';

export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

/** Registro imutável de uma entrada ou saída de estoque (trilha de auditoria). */
export class MovimentacaoEstoque {
  private constructor(
    public readonly id: string,
    public readonly pecaId: string,
    public readonly tipo: TipoMovimentacao,
    public readonly quantidade: number,
    public readonly motivo: string,
    public readonly criadoEm: Date,
    public readonly ordemServicoId?: string,
  ) {}

  static entrada(
    pecaId: string,
    quantidade: number,
    motivo: string,
    agora = new Date(),
  ): MovimentacaoEstoque {
    return new MovimentacaoEstoque(
      randomUUID(),
      pecaId,
      TipoMovimentacao.ENTRADA,
      quantidade,
      motivo,
      agora,
    );
  }

  static saidaParaOrdemServico(
    pecaId: string,
    quantidade: number,
    ordemServicoId: string,
    agora = new Date(),
  ): MovimentacaoEstoque {
    return new MovimentacaoEstoque(
      randomUUID(),
      pecaId,
      TipoMovimentacao.SAIDA,
      quantidade,
      'Baixa por aprovação de orçamento',
      agora,
      ordemServicoId,
    );
  }

  static restaurar(dados: {
    id: string;
    pecaId: string;
    tipo: TipoMovimentacao;
    quantidade: number;
    motivo: string;
    criadoEm: Date;
    ordemServicoId?: string | null;
  }): MovimentacaoEstoque {
    return new MovimentacaoEstoque(
      dados.id,
      dados.pecaId,
      dados.tipo,
      dados.quantidade,
      dados.motivo,
      dados.criadoEm,
      dados.ordemServicoId ?? undefined,
    );
  }
}
