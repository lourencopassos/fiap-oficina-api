import { DomainEvent } from '../domain/domain-event';

export abstract class PublicadorEventos {
  abstract publicar(eventos: DomainEvent[]): Promise<void>;
}
