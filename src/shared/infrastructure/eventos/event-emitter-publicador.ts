import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublicadorEventos } from '../../application/publicador-eventos';
import { DomainEvent } from '../../domain/domain-event';

@Injectable()
export class EventEmitterPublicadorEventos extends PublicadorEventos {
  private readonly logger = new Logger('EventosDeDominio');

  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  async publicar(eventos: DomainEvent[]): Promise<void> {
    for (const evento of eventos) {
      this.logger.log(`${evento.nome} (aggregateId=${evento.aggregateId})`);
      await this.emitter.emitAsync(evento.nome, evento);
    }
  }
}
