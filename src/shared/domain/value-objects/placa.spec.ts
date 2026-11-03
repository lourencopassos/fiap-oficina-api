import { Placa } from './placa';

describe('Placa', () => {
  it.each([
    ['ABC1234', 'ABC1234', false],
    ['abc-1234', 'ABC1234', false],
    ['BRA2E19', 'BRA2E19', true],
    ['bra 2e19', 'BRA2E19', true],
  ])('aceita %s', (entrada, esperado, mercosul) => {
    const placa = Placa.criar(entrada);
    expect(placa.valor).toBe(esperado);
    expect(placa.mercosul).toBe(mercosul);
  });

  it.each(['AB12345', 'ABCD123', 'ABC12345', 'ABC1D2E', '1234ABC', ''])('rejeita %s', (entrada) => {
    expect(() => Placa.criar(entrada)).toThrow('Placa de veículo inválida');
    expect(Placa.ehValida(entrada)).toBe(false);
  });

  it('rejeita nulo sem estourar', () => {
    expect(Placa.ehValida(null as unknown as string)).toBe(false);
  });

  it('compara por valor', () => {
    expect(Placa.criar('abc-1234').equals(Placa.criar('ABC1234'))).toBe(true);
    expect(Placa.criar('ABC1234').equals(Placa.criar('BRA2E19'))).toBe(false);
  });
});
