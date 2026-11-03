import { Injectable } from '@nestjs/common';
import { EstoqueService } from '../../estoque/application/estoque.service';
import { OrdemServico } from '../domain/ordem-servico';
import { IdentificacaoCliente, OrdemServicoSuporte } from './ordem-servico.suporte';
import { AcompanhamentoView, OrdemServicoView } from './ordem-servico.view';

/**
 * Registro da aprovação ou rejeição do orçamento. Na aprovação, a mudança para
 * "Em execução" e a baixa das peças no estoque ocorrem na MESMA transação:
 * se faltar qualquer peça, nada é alterado.
 */
@Injectable()
export class ResponderOrcamentoUseCase {
  constructor(
    private readonly suporte: OrdemServicoSuporte,
    private readonly estoque: EstoqueService,
  ) {}

  async aprovarPorId(id: string): Promise<OrdemServicoView> {
    return this.suporte.montarView(await this.aprovar(() => this.suporte.buscarPorId(id)));
  }

  async rejeitarPorId(id: string, motivo?: string): Promise<OrdemServicoView> {
    return this.suporte.montarView(await this.rejeitar(() => this.suporte.buscarPorId(id), motivo));
  }

  async aprovarPeloCliente(ident: IdentificacaoCliente): Promise<AcompanhamentoView> {
    return this.suporte.montarAcompanhamento(
      await this.aprovar(() => this.suporte.localizarParaCliente(ident)),
    );
  }

  async rejeitarPeloCliente(
    ident: IdentificacaoCliente,
    motivo?: string,
  ): Promise<AcompanhamentoView> {
    const os = await this.rejeitar(() => this.suporte.localizarParaCliente(ident), motivo);
    return this.suporte.montarAcompanhamento(os);
  }

  private aprovar(carregar: () => Promise<OrdemServico>): Promise<OrdemServico> {
    return this.suporte.executarComando(carregar, async (os) => {
      os.aprovarOrcamento();
      await this.estoque.baixarParaOrdemServico(os.pecasNecessarias(), os.id);
    });
  }

  private rejeitar(carregar: () => Promise<OrdemServico>, motivo?: string): Promise<OrdemServico> {
    return this.suporte.executarComando(carregar, (os) => os.rejeitarOrcamento(new Date(), motivo));
  }
}
