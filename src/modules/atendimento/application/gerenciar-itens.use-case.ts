import { Injectable } from '@nestjs/common';
import { OrdemServicoSuporte } from './ordem-servico.suporte';
import { OrdemServicoView } from './ordem-servico.view';

/** Inclusão e remoção de serviços e peças/insumos durante o diagnóstico. */
@Injectable()
export class GerenciarItensOrdemServicoUseCase {
  constructor(private readonly suporte: OrdemServicoSuporte) {}

  async adicionarServico(
    ordemServicoId: string,
    servicoId: string,
    quantidade = 1,
  ): Promise<OrdemServicoView> {
    const os = await this.suporte.executarComando(
      () => this.suporte.buscarPorId(ordemServicoId),
      async (os) => {
        os.adicionarItem(await this.suporte.itemDeServico(servicoId, quantidade));
      },
    );
    return this.suporte.montarView(os);
  }

  async adicionarPeca(
    ordemServicoId: string,
    pecaId: string,
    quantidade: number,
  ): Promise<OrdemServicoView> {
    const os = await this.suporte.executarComando(
      () => this.suporte.buscarPorId(ordemServicoId),
      async (os) => {
        os.adicionarItem(await this.suporte.itemDePeca(pecaId, quantidade));
      },
    );
    return this.suporte.montarView(os);
  }

  async removerItem(ordemServicoId: string, itemId: string): Promise<OrdemServicoView> {
    const os = await this.suporte.executarComando(
      () => this.suporte.buscarPorId(ordemServicoId),
      (os) => os.removerItem(itemId),
    );
    return this.suporte.montarView(os);
  }
}
