import { DomainError } from '../domain-error';

/** Valor monetário em BRL, armazenado em centavos para evitar erros de ponto flutuante. */
export class Dinheiro {
  private constructor(public readonly centavos: number) {}

  static deCentavos(centavos: number): Dinheiro {
    if (!Number.isInteger(centavos))
      throw new DomainError('Valor monetário deve ser inteiro em centavos');
    if (centavos < 0) throw new DomainError('Valor monetário não pode ser negativo');
    return new Dinheiro(centavos);
  }

  static deReais(reais: number): Dinheiro {
    return Dinheiro.deCentavos(Math.round(reais * 100));
  }

  static zero(): Dinheiro {
    return new Dinheiro(0);
  }

  somar(outro: Dinheiro): Dinheiro {
    return new Dinheiro(this.centavos + outro.centavos);
  }

  multiplicar(fator: number): Dinheiro {
    if (!Number.isInteger(fator) || fator < 0)
      throw new DomainError('Fator de multiplicação inválido');
    return new Dinheiro(this.centavos * fator);
  }

  get reais(): number {
    return this.centavos / 100;
  }

  equals(outro: Dinheiro): boolean {
    return this.centavos === outro.centavos;
  }
}
