import { CNPJ_VALIDO, CPF_VALIDO } from '@test/fakes';
import { Cliente } from './cliente';
import { Veiculo } from './veiculo';

describe('Cliente', () => {
  it('cria pessoa física com dados normalizados', () => {
    const c = Cliente.criar({
      nome: ' João ',
      documento: '529.982.247-25',
      email: 'J@X.COM',
      telefone: '(11) 98765-4321',
    });
    expect(c.nome).toBe('João');
    expect(c.documento.valor).toBe(CPF_VALIDO);
    expect(c.documento.tipo).toBe('CPF');
    expect(c.email).toBe('j@x.com');
    expect(c.telefone).toBe('11987654321');
  });

  it('aceita pessoa jurídica sem contatos', () => {
    const c = Cliente.criar({ nome: 'Transportes LTDA', documento: CNPJ_VALIDO });
    expect(c.documento.tipo).toBe('CNPJ');
    expect(c.email).toBeUndefined();
    expect(c.telefone).toBeUndefined();
  });

  it.each([
    [{ nome: 'J', documento: CPF_VALIDO }, 'Nome do cliente'],
    [{ nome: 'João', documento: '123' }, 'CPF/CNPJ inválido'],
    [{ nome: 'João', documento: CPF_VALIDO, telefone: '123' }, 'Telefone inválido'],
    [{ nome: 'João', documento: CPF_VALIDO, email: 'invalido' }, 'E-mail inválido'],
  ])('valida dados (%#)', (dados, mensagem) => {
    expect(() => Cliente.criar(dados)).toThrow(mensagem);
  });

  it('atualiza contatos mantendo o documento e permite limpar campos', () => {
    const c = Cliente.restaurar('id', {
      nome: 'João',
      documento: CPF_VALIDO,
      email: 'a@b.com',
      telefone: '11987654321',
    });
    c.atualizar({ nome: 'João Silva', email: null });
    expect(c.nome).toBe('João Silva');
    expect(c.email).toBeUndefined();
    expect(c.telefone).toBe('11987654321');
    expect(c.documento.valor).toBe(CPF_VALIDO);
    c.atualizar({ telefone: '1133334444' });
    expect(c.telefone).toBe('1133334444');
  });
});

describe('Veiculo', () => {
  const agora = new Date('2026-06-01');
  const dados = { clienteId: 'c1', placa: 'bra-2e19', marca: ' VW ', modelo: ' Gol ', ano: 2020 };

  it('cria com placa normalizada', () => {
    const v = Veiculo.criar(dados, agora);
    expect([v.placa.valor, v.marca, v.modelo, v.ano, v.clienteId]).toEqual([
      'BRA2E19',
      'VW',
      'Gol',
      2020,
      'c1',
    ]);
    expect(v.pertenceA('c1')).toBe(true);
    expect(v.pertenceA('c2')).toBe(false);
  });

  it.each([
    [{ ...dados, placa: 'XX' }, 'Placa'],
    [{ ...dados, marca: ' ' }, 'Marca'],
    [{ ...dados, modelo: '' }, 'Modelo'],
    [{ ...dados, ano: 1899 }, 'Ano do veículo'],
    [{ ...dados, ano: 2028 }, 'Ano do veículo'],
    [{ ...dados, ano: 2020.5 }, 'Ano do veículo'],
  ])('valida dados (%#)', (d, mensagem) => {
    expect(() => Veiculo.criar(d, agora)).toThrow(mensagem);
  });

  it('aceita modelo do ano seguinte', () => {
    expect(Veiculo.criar({ ...dados, ano: 2027 }, agora).ano).toBe(2027);
  });

  it('atualiza dados e dono, mantendo a placa', () => {
    const v = Veiculo.restaurar('v1', { ...dados, placa: 'BRA2E19' });
    v.atualizar({ clienteId: 'c2', ano: 2021 }, agora);
    expect([v.clienteId, v.ano, v.placa.valor, v.marca]).toEqual([
      'c2',
      2021,
      'BRA2E19',
      ' VW '.trim(),
    ]);
    v.atualizar({ marca: 'Volkswagen', modelo: 'Polo' });
    expect([v.marca, v.modelo]).toEqual(['Volkswagen', 'Polo']);
  });
});
