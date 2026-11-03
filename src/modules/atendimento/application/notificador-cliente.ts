/** Porta de saída para comunicar o cliente (e-mail, SMS, WhatsApp...). */
export abstract class NotificadorCliente {
  abstract notificar(mensagem: {
    clienteId: string;
    codigoOrdemServico: string;
    assunto: string;
    texto: string;
  }): Promise<void>;
}
