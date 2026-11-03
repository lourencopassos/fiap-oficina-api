import { Injectable } from '@nestjs/common';
import { OrdemServicoSuporte } from './ordem-servico.suporte';
import { OrdemServicoView } from './ordem-servico.view';

/** Ações da equipe da oficina que avançam o ciclo de vida da OS. */
@Injectable()
export class AlterarStatusOrdemServicoUseCase {
  constructor(private readonly suporte: OrdemServicoSuporte) {}

  iniciarDiagnostico(id: string, observacao?: string): Promise<OrdemServicoView> {
    return this.alterar(id, (os) => os.iniciarDiagnostico(new Date(), observacao));
  }

  /** Gera o orçamento automaticamente e o disponibiliza para aprovação do cliente. */
  enviarOrcamento(id: string): Promise<OrdemServicoView> {
    return this.alterar(id, (os) => {
      os.enviarOrcamento();
    });
  }

  finalizar(id: string, observacao?: string): Promise<OrdemServicoView> {
    return this.alterar(id, (os) => os.finalizar(new Date(), observacao));
  }

  entregar(id: string, observacao?: string): Promise<OrdemServicoView> {
    return this.alterar(id, (os) => os.entregar(new Date(), observacao));
  }

  private async alterar(id: string, acao: Parameters<OrdemServicoSuporte['executarComando']>[1]) {
    const os = await this.suporte.executarComando(() => this.suporte.buscarPorId(id), acao);
    return this.suporte.montarView(os);
  }
}
