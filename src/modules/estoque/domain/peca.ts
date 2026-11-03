import { DomainError } from '../../../shared/domain/domain-error';
import { Entity } from '../../../shared/domain/entity';
import { Dinheiro } from '../../../shared/domain/value-objects/dinheiro';

export enum TipoPeca {
  PECA = 'PECA',
  INSUMO = 'INSUMO',
}

export class EstoqueInsuficienteError extends DomainError {
  constructor(nome: string, disponivel: number, solicitado: number) {
    super(
      `Estoque insuficiente para "${nome}": disponível ${disponivel}, solicitado ${solicitado}`,
      'ESTOQUE_INSUFICIENTE',
    );
  }
}

interface PecaProps {
  codigo: string;
  nome: string;
  tipo: TipoPeca;
  unidade: string;
  preco: Dinheiro;
  quantidadeEstoque: number;
  estoqueMinimo: number;
}

export interface DadosPeca {
  codigo: string;
  nome: string;
  tipo: TipoPeca;
  unidade: string;
  precoCentavos: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
}

const validarQuantidade = (q: number, rotulo: string, permiteZero = false): void => {
  if (!Number.isInteger(q) || q < 0 || (!permiteZero && q === 0)) {
    throw new DomainError(
      `${rotulo} deve ser um inteiro ${permiteZero ? 'não negativo' : 'positivo'}`,
    );
  }
};

/** Peça (ex.: filtro de óleo) ou insumo (ex.: óleo, fluido) controlado em estoque. */
export class Peca extends Entity<PecaProps> {
  static criar(dados: DadosPeca): Peca {
    return new Peca(Peca.montar(dados));
  }

  static restaurar(id: string, dados: DadosPeca): Peca {
    return new Peca(Peca.montar(dados), id);
  }

  get codigo(): string {
    return this.props.codigo;
  }
  get nome(): string {
    return this.props.nome;
  }
  get tipo(): TipoPeca {
    return this.props.tipo;
  }
  get unidade(): string {
    return this.props.unidade;
  }
  get preco(): Dinheiro {
    return this.props.preco;
  }
  get quantidadeEstoque(): number {
    return this.props.quantidadeEstoque;
  }
  get estoqueMinimo(): number {
    return this.props.estoqueMinimo;
  }
  get abaixoDoMinimo(): boolean {
    return this.props.quantidadeEstoque <= this.props.estoqueMinimo;
  }

  /** O saldo só muda por movimentações de estoque, nunca por edição cadastral. */
  atualizar(dados: Partial<Omit<DadosPeca, 'quantidadeEstoque'>>): void {
    this.props = Peca.montar({
      codigo: dados.codigo ?? this.props.codigo,
      nome: dados.nome ?? this.props.nome,
      tipo: dados.tipo ?? this.props.tipo,
      unidade: dados.unidade ?? this.props.unidade,
      precoCentavos: dados.precoCentavos ?? this.props.preco.centavos,
      quantidadeEstoque: this.props.quantidadeEstoque,
      estoqueMinimo: dados.estoqueMinimo ?? this.props.estoqueMinimo,
    });
  }

  podeAtender(quantidade: number): boolean {
    return this.props.quantidadeEstoque >= quantidade;
  }

  darEntrada(quantidade: number): void {
    validarQuantidade(quantidade, 'Quantidade de entrada');
    this.props.quantidadeEstoque += quantidade;
  }

  darBaixa(quantidade: number): void {
    validarQuantidade(quantidade, 'Quantidade de baixa');
    if (!this.podeAtender(quantidade)) {
      throw new EstoqueInsuficienteError(this.props.nome, this.props.quantidadeEstoque, quantidade);
    }
    this.props.quantidadeEstoque -= quantidade;
  }

  private static montar(dados: DadosPeca): PecaProps {
    const codigo = (dados.codigo ?? '').trim().toUpperCase();
    const nome = (dados.nome ?? '').trim();
    const unidade = (dados.unidade ?? '').trim().toUpperCase();
    if (!codigo) throw new DomainError('Código da peça é obrigatório');
    if (nome.length < 2) throw new DomainError('Nome da peça é obrigatório');
    if (!unidade) throw new DomainError('Unidade de medida é obrigatória');
    if (!Object.values(TipoPeca).includes(dados.tipo))
      throw new DomainError('Tipo deve ser PECA ou INSUMO');
    validarQuantidade(dados.quantidadeEstoque, 'Quantidade em estoque', true);
    validarQuantidade(dados.estoqueMinimo, 'Estoque mínimo', true);
    return {
      codigo,
      nome,
      tipo: dados.tipo,
      unidade,
      preco: Dinheiro.deCentavos(dados.precoCentavos),
      quantidadeEstoque: dados.quantidadeEstoque,
      estoqueMinimo: dados.estoqueMinimo,
    };
  }
}
