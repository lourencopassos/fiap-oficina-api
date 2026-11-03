import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../../../shared/domain/domain-event';
import {
  EventosOrdemServico,
  OrcamentoEnviadoPayload,
  StatusAlteradoPayload,
} from '../domain/eventos';
import { DESCRICAO_STATUS } from '../domain/status-ordem-servico';
import { NotificadorCliente } from './notificador-cliente';

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Políticas (Event Storming): "Quando o orçamento for enviado, notificar o cliente"
 * e "Quando o status da OS mudar, avisar o cliente". Executadas após o commit;
 * falhas de notificação não desfazem a operação de negócio.
 */
@Injectable()
export class NotificarClientePolicy {
  private readonly logger = new Logger(NotificarClientePolicy.name);

  constructor(private readonly notificador: NotificadorCliente) {}

  @OnEvent(EventosOrdemServico.ORCAMENTO_ENVIADO)
  async quandoOrcamentoEnviado(evento: DomainEvent): Promise<void> {
    const p = evento.payload as OrcamentoEnviadoPayload;
    await this.enviar({
      clienteId: p.clienteId,
      codigoOrdemServico: p.codigo,
      assunto: `Orçamento disponível - ${p.codigo}`,
      texto: `O orçamento da sua OS ${p.codigo} está disponível no valor de ${reais(p.valorTotalCentavos)}. Acesse o acompanhamento para aprovar ou rejeitar.`,
    });
  }

  @OnEvent(EventosOrdemServico.STATUS_ALTERADO)
  async quandoStatusAlterado(evento: DomainEvent): Promise<void> {
    const p = evento.payload as StatusAlteradoPayload;
    await this.enviar({
      clienteId: p.clienteId,
      codigoOrdemServico: p.codigo,
      assunto: `Atualização da OS ${p.codigo}`,
      texto: `Sua ordem de serviço ${p.codigo} está agora: ${DESCRICAO_STATUS[p.para]}.`,
    });
  }

  private async enviar(mensagem: Parameters<NotificadorCliente['notificar']>[0]): Promise<void> {
    try {
      await this.notificador.notificar(mensagem);
    } catch (erro) {
      this.logger.warn(
        `Falha ao notificar cliente da OS ${mensagem.codigoOrdemServico}: ${String(erro)}`,
      );
    }
  }
}
