import { AggregateRoot } from './aggregate-root';
import { DomainError } from './domain-error';

class Exemplo extends AggregateRoot<{ nome: string }> {
  static novo() {
    return new Exemplo({ nome: 'x' });
  }
  disparar() {
    this.registrarEvento({
      nome: 'evento',
      aggregateId: this.id,
      ocorridoEm: new Date(),
      payload: {},
    });
  }
}

describe('AggregateRoot / Entity', () => {
  it('acumula e extrai eventos uma única vez', () => {
    const a = Exemplo.novo();
    a.disparar();
    a.disparar();
    expect(a.extrairEventos()).toHaveLength(2);
    expect(a.extrairEventos()).toHaveLength(0);
  });

  it('compara entidades por identidade', () => {
    const a = Exemplo.novo();
    expect(a.equals(a)).toBe(true);
    expect(a.equals(Exemplo.novo())).toBe(false);
    expect(a.equals(undefined)).toBe(false);
  });

  it('DomainError carrega código e nome', () => {
    const erro = new DomainError('falhou', 'CODIGO');
    expect(erro.codigo).toBe('CODIGO');
    expect(erro.name).toBe('DomainError');
    expect(new DomainError('padrão').codigo).toBe('REGRA_DE_NEGOCIO_VIOLADA');
  });
});
