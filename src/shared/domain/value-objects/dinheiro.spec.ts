import { Dinheiro } from './dinheiro';

describe('Dinheiro', () => {
  it('cria a partir de reais arredondando para centavos', () => {
    expect(Dinheiro.deReais(19.99).centavos).toBe(1999);
    expect(Dinheiro.deReais(0.1).somar(Dinheiro.deReais(0.2)).reais).toBe(0.3);
  });

  it('soma e multiplica sem erro de ponto flutuante', () => {
    const total = Dinheiro.deCentavos(4500).multiplicar(3).somar(Dinheiro.deCentavos(1));
    expect(total.centavos).toBe(13501);
    expect(total.equals(Dinheiro.deCentavos(13501))).toBe(true);
    expect(Dinheiro.zero().centavos).toBe(0);
  });

  it.each([
    [() => Dinheiro.deCentavos(-1), 'não pode ser negativo'],
    [() => Dinheiro.deCentavos(1.5), 'inteiro em centavos'],
    [() => Dinheiro.deCentavos(100).multiplicar(-1), 'Fator de multiplicação inválido'],
    [() => Dinheiro.deCentavos(100).multiplicar(1.5), 'Fator de multiplicação inválido'],
  ])('rejeita valores inválidos (%#)', (acao, mensagem) => {
    expect(acao).toThrow(mensagem);
  });
});
