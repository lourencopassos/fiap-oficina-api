import { CNPJ_VALIDO, CPF_VALIDO } from '@test/fakes';
import { DomainError } from '../domain-error';
import { Documento } from './documento';

describe('Documento (CPF/CNPJ)', () => {
  it.each(['529.982.247-25', '52998224725', ' 529 982 247 25 '])(
    'aceita CPF válido com ou sem máscara: %s',
    (cpf) => {
      const doc = Documento.criar(cpf);
      expect(doc.valor).toBe(CPF_VALIDO);
      expect(doc.tipo).toBe('CPF');
    },
  );

  it.each(['11.222.333/0001-81', '11222333000181'])('aceita CNPJ válido: %s', (cnpj) => {
    const doc = Documento.criar(cnpj);
    expect(doc.valor).toBe(CNPJ_VALIDO);
    expect(doc.tipo).toBe('CNPJ');
  });

  it.each([
    ['dígito verificador errado (CPF)', '529.982.247-24'],
    ['segundo dígito errado (CPF)', '529.982.247-35'],
    ['todos iguais (CPF)', '111.111.111-11'],
    ['dígito verificador errado (CNPJ)', '11.222.333/0001-82'],
    ['primeiro dígito errado (CNPJ)', '11.222.333/0001-91'],
    ['todos iguais (CNPJ)', '00.000.000/0000-00'],
    ['tamanho inválido', '1234567890'],
    ['vazio', ''],
  ])('rejeita %s', (_, entrada) => {
    expect(() => Documento.criar(entrada)).toThrow(DomainError);
    expect(Documento.ehValido(entrada)).toBe(false);
  });

  it('rejeita nulo/indefinido sem estourar', () => {
    expect(() => Documento.criar(undefined as unknown as string)).toThrow('CPF/CNPJ inválido');
  });

  it('formata e mascara CPF', () => {
    const doc = Documento.criar(CPF_VALIDO);
    expect(doc.formatado).toBe('529.982.247-25');
    expect(doc.mascarado).toBe('***.982.247-**');
  });

  it('formata e mascara CNPJ', () => {
    const doc = Documento.criar(CNPJ_VALIDO);
    expect(doc.formatado).toBe('11.222.333/0001-81');
    expect(doc.mascarado).toBe('**.222.333/0001-**');
  });

  it('compara por valor', () => {
    expect(Documento.criar('529.982.247-25').equals(Documento.criar(CPF_VALIDO))).toBe(true);
    expect(Documento.criar(CPF_VALIDO).equals(Documento.criar(CNPJ_VALIDO))).toBe(false);
  });
});
