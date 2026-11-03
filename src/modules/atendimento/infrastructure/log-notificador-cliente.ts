import { Injectable, Logger } from '@nestjs/common';
import { NotificadorCliente } from '../application/notificador-cliente';

/**
 * Adaptador de notificação do MVP: registra a mensagem em log.
 * Pode ser substituído por e-mail/SMS/WhatsApp sem alterar domínio ou casos de uso.
 */
@Injectable()
export class LogNotificadorCliente extends NotificadorCliente {
  private readonly logger = new Logger('NotificacaoCliente');

  async notificar(mensagem: {
    clienteId: string;
    codigoOrdemServico: string;
    assunto: string;
    texto: string;
  }) {
    this.logger.log(`[cliente=${mensagem.clienteId}] ${mensagem.assunto} :: ${mensagem.texto}`);
  }
}
