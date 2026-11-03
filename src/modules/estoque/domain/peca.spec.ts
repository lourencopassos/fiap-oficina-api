import { MovimentacaoEstoque, TipoMovimentacao } from './movimentacao-estoque';
import { EstoqueInsuficienteError, Peca, TipoPeca } from './peca';

const dados = {
  codigo: ' flt-01 ',
  nome: 'Filtro de óleo',
  tipo: TipoPeca.PECA,
  unidade: 'un',
  precoCentavos: 3500,
  quantidadeEstoque: 5,
  estoqueMinimo: 2,
};

describe('Peca', () => {
  it('cria com código e unidade normalizados', () => {
    const p = Peca.criar(dados);
    expect([p.codigo, p.unidade, p.nome, p.tipo, p.preco.centavos, p.estoqueMinimo]).toEqual([
      'FLT-01',
      'UN',
      'Filtro de óleo',
      TipoPeca.PECA,
      3500,
      2,
    ]);
    expect(p.abaixoDoMinimo).toBe(false);
  });

  it.each([
    [{ ...dados, codigo: ' ' }, 'Código'],
    [{ ...dados, nome: 'F' }, 'Nome da peça'],
    [{ ...dados, unidade: '' }, 'Unidade'],
    [{ ...dados, tipo: 'OUTRO' as TipoPeca }, 'Tipo deve ser'],
    [{ ...dados, quantidadeEstoque: -1 }, 'Quantidade em estoque'],
    [{ ...dados, estoqueMinimo: 1.5 }, 'Estoque mínimo'],
  ])('valida (%#)', (d, msg) => {
    expect(() => Peca.criar(d)).toThrow(msg);
  });

  it('dá entrada e baixa respeitando o saldo', () => {
    const p = Peca.criar(dados);
    p.darEntrada(3);
    expect(p.quantidadeEstoque).toBe(8);
    p.darBaixa(6);
    expect(p.quantidadeEstoque).toBe(2);
    expect(p.abaixoDoMinimo).toBe(true);
    expect(p.podeAtender(3)).toBe(false);
    expect(() => p.darBaixa(3)).toThrow(EstoqueInsuficienteError);
    expect(() => p.darBaixa(3)).toThrow('disponível 2, solicitado 3');
    expect(() => p.darEntrada(0)).toThrow('positivo');
    expect(() => p.darBaixa(-1)).toThrow('positivo');
  });

  it('atualiza cadastro sem alterar o saldo', () => {
    const p = Peca.restaurar('id', dados);
    p.atualizar({
      nome: 'Filtro',
      precoCentavos: 4000,
      estoqueMinimo: 10,
      tipo: TipoPeca.INSUMO,
      unidade: 'cx',
      codigo: 'f2',
    });
    expect([
      p.nome,
      p.preco.centavos,
      p.quantidadeEstoque,
      p.abaixoDoMinimo,
      p.tipo,
      p.unidade,
      p.codigo,
    ]).toEqual(['Filtro', 4000, 5, true, TipoPeca.INSUMO, 'CX', 'F2']);
  });
});

describe('MovimentacaoEstoque', () => {
  it('registra entradas e saídas vinculadas à OS', () => {
    const e = MovimentacaoEstoque.entrada('p1', 5, 'NF 1');
    const s = MovimentacaoEstoque.saidaParaOrdemServico('p1', 2, 'os1');
    expect([e.tipo, e.quantidade, e.ordemServicoId]).toEqual([
      TipoMovimentacao.ENTRADA,
      5,
      undefined,
    ]);
    expect([s.tipo, s.ordemServicoId, s.motivo]).toEqual([
      TipoMovimentacao.SAIDA,
      'os1',
      'Baixa por aprovação de orçamento',
    ]);
    const r = MovimentacaoEstoque.restaurar({ ...s, ordemServicoId: null });
    expect(r.ordemServicoId).toBeUndefined();
  });
});
