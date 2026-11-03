export interface DomainEvent {
  readonly nome: string;
  readonly aggregateId: string;
  readonly ocorridoEm: Date;
  readonly payload: Record<string, unknown>;
}
