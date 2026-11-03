/**
 * Violação de uma regra de negócio. A camada HTTP traduz para 422.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly codigo: string = 'REGRA_DE_NEGOCIO_VIOLADA',
  ) {
    super(message);
    this.name = new.target.name;
  }
}
