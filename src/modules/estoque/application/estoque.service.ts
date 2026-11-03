import { Injectable } from '@nestjs/common';
import { RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { UnidadeDeTrabalho } from '../../../shared/application/unidade-de-trabalho';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque';
import { EstoqueInsuficienteError, Peca } from '../domain/peca';
import { PecaRepository } from '../domain/peca.repository';
import { MovimentacaoView, paraMovimentacaoView, paraPecaView, PecaView } from './views';

export interface ItemBaixa {
  pecaId: string;
  quantidade: number;
}

/** Controle de estoque: entradas manuais e baixas decorrentes de ordens de serviço. */
@Injectable()
export class EstoqueService {
  constructor(
    private readonly pecas: PecaRepository,
    private readonly uow: UnidadeDeTrabalho,
  ) {}

  async registrarEntrada(pecaId: string, quantidade: number, motivo?: string): Promise<PecaView> {
    return this.uow.executar(async () => {
      const peca = await this.buscar(pecaId);
      peca.darEntrada(quantidade);
      await this.pecas.ajustarSaldo(pecaId, quantidade);
      await this.pecas.registrarMovimentacao(
        MovimentacaoEstoque.entrada(
          pecaId,
          quantidade,
          motivo?.trim() || 'Entrada manual de estoque',
        ),
      );
      return paraPecaView(peca);
    });
  }

  /**
   * Baixa as peças de uma OS. Deve ser chamada dentro da transação do caso de uso
   * chamador: se qualquer item faltar, nada é baixado.
   */
  async baixarParaOrdemServico(itens: ItemBaixa[], ordemServicoId: string): Promise<void> {
    for (const item of itens) {
      const peca = await this.buscar(item.pecaId);
      // Regra de domínio (mensagem clara) + garantia atômica no banco (concorrência).
      peca.darBaixa(item.quantidade);
      const baixou = await this.pecas.ajustarSaldo(item.pecaId, -item.quantidade);
      if (!baixou)
        throw new EstoqueInsuficienteError(
          peca.nome,
          peca.quantidadeEstoque + item.quantidade,
          item.quantidade,
        );
      await this.pecas.registrarMovimentacao(
        MovimentacaoEstoque.saidaParaOrdemServico(item.pecaId, item.quantidade, ordemServicoId),
      );
    }
  }

  async listarMovimentacoes(pecaId: string): Promise<MovimentacaoView[]> {
    await this.buscar(pecaId);
    return (await this.pecas.listarMovimentacoes(pecaId)).map(paraMovimentacaoView);
  }

  private async buscar(id: string): Promise<Peca> {
    const peca = await this.pecas.buscarPorId(id);
    if (!peca) throw new RecursoNaoEncontradoError('Peça/insumo', id);
    return peca;
  }
}
