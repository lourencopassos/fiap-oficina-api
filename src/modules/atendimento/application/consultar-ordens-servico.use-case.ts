import { Injectable } from '@nestjs/common';
import { FiltroOrdensServico, OrdemServicoConsultas, ResumoOrdemServico } from './consultas';
import { IdentificacaoCliente, OrdemServicoSuporte } from './ordem-servico.suporte';
import { AcompanhamentoView, OrdemServicoView } from './ordem-servico.view';

@Injectable()
export class ConsultarOrdensServicoUseCase {
  constructor(
    private readonly suporte: OrdemServicoSuporte,
    private readonly consultas: OrdemServicoConsultas,
  ) {}

  listar(filtro: FiltroOrdensServico = {}): Promise<ResumoOrdemServico[]> {
    return this.consultas.listar(filtro);
  }

  async detalhar(id: string): Promise<OrdemServicoView> {
    return this.suporte.montarView(await this.suporte.buscarPorId(id));
  }

  /** Acompanhamento pelo cliente (API pública): código da OS + CPF/CNPJ. */
  async acompanhar(ident: IdentificacaoCliente): Promise<AcompanhamentoView> {
    return this.suporte.montarAcompanhamento(await this.suporte.localizarParaCliente(ident));
  }
}
