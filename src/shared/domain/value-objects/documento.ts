import { DomainError } from '../domain-error';

export type TipoDocumento = 'CPF' | 'CNPJ';

/** CPF ou CNPJ válido (dígitos verificadores conferidos), armazenado apenas com números. */
export class Documento {
  private constructor(
    public readonly valor: string,
    public readonly tipo: TipoDocumento,
  ) {}

  static criar(entrada: string): Documento {
    const digitos = (entrada ?? '').replace(/\D/g, '');
    if (digitos.length === 11 && Documento.cpfValido(digitos)) return new Documento(digitos, 'CPF');
    if (digitos.length === 14 && Documento.cnpjValido(digitos))
      return new Documento(digitos, 'CNPJ');
    throw new DomainError('CPF/CNPJ inválido', 'DOCUMENTO_INVALIDO');
  }

  static ehValido(entrada: string): boolean {
    try {
      Documento.criar(entrada);
      return true;
    } catch {
      return false;
    }
  }

  get formatado(): string {
    return this.tipo === 'CPF'
      ? this.valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      : this.valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /** Versão mascarada para exposição em APIs públicas e logs (LGPD). */
  get mascarado(): string {
    return this.tipo === 'CPF'
      ? `***.${this.valor.slice(3, 6)}.${this.valor.slice(6, 9)}-**`
      : `**.${this.valor.slice(2, 5)}.${this.valor.slice(5, 8)}/${this.valor.slice(8, 12)}-**`;
  }

  equals(outro: Documento): boolean {
    return this.valor === outro.valor;
  }

  private static todosIguais(digitos: string): boolean {
    return /^(\d)\1+$/.test(digitos);
  }

  private static cpfValido(cpf: string): boolean {
    if (Documento.todosIguais(cpf)) return false;
    const digito = (base: string, pesoInicial: number) => {
      const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    const d1 = digito(cpf.slice(0, 9), 10);
    const d2 = digito(cpf.slice(0, 10), 11);
    return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
  }

  private static cnpjValido(cnpj: string): boolean {
    if (Documento.todosIguais(cnpj)) return false;
    const digito = (base: string) => {
      const pesos =
        base.length === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const soma = [...base].reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const d1 = digito(cnpj.slice(0, 12));
    const d2 = digito(cnpj.slice(0, 13));
    return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
  }
}
