import { DomainError } from '../domain-error';

export class Email {
  private constructor(public readonly valor: string) {}

  static criar(entrada: string): Email {
    const normalizado = (entrada ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) {
      throw new DomainError('E-mail inválido', 'EMAIL_INVALIDO');
    }
    return new Email(normalizado);
  }
}
