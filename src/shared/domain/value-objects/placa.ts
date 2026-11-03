import { DomainError } from '../domain-error';

const PADRAO_ANTIGO = /^[A-Z]{3}[0-9]{4}$/;
const PADRAO_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

/** Placa veicular brasileira: padrão antigo (ABC1234) ou Mercosul (ABC1D23). */
export class Placa {
  private constructor(public readonly valor: string) {}

  static criar(entrada: string): Placa {
    const normalizada = (entrada ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!PADRAO_ANTIGO.test(normalizada) && !PADRAO_MERCOSUL.test(normalizada)) {
      throw new DomainError('Placa de veículo inválida', 'PLACA_INVALIDA');
    }
    return new Placa(normalizada);
  }

  static ehValida(entrada: string): boolean {
    try {
      Placa.criar(entrada);
      return true;
    } catch {
      return false;
    }
  }

  get mercosul(): boolean {
    return PADRAO_MERCOSUL.test(this.valor);
  }

  equals(outra: Placa): boolean {
    return this.valor === outra.valor;
  }
}
