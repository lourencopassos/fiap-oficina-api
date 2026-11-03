import { DomainEvent } from './domain-event';
import { Entity } from './entity';

export abstract class AggregateRoot<P> extends Entity<P> {
  private eventos: DomainEvent[] = [];

  protected registrarEvento(evento: DomainEvent): void {
    this.eventos.push(evento);
  }

  /** Retorna e limpa os eventos pendentes, para publicação após o commit. */
  extrairEventos(): DomainEvent[] {
    const pendentes = this.eventos;
    this.eventos = [];
    return pendentes;
  }
}
