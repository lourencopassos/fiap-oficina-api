import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../shared/domain/domain-error';
import { Dinheiro } from '../../../shared/domain/value-objects/dinheiro';

export enum TipoItemOrdemServico {
  SERVICO = 'SERVICO',
  PECA = 'PECA',
}

export interface DadosItemOrdemServico {
  tipo: TipoItemOrdemServico;
  referenciaId: string;
  descricao: string;
  quantidade: number;
  precoUnitarioCentavos: number;
}

/**
 * Serviço ou peça/insumo incluído na OS. O preço é um snapshot do catálogo no momento
 * da inclusão: mudanças posteriores de preço não alteram orçamentos já gerados.
 */
export class ItemOrdemServico {
  private constructor(
    public readonly id: string,
    public readonly tipo: TipoItemOrdemServico,
    public readonly referenciaId: string,
    public readonly descricao: string,
    private _quantidade: number,
    public readonly precoUnitario: Dinheiro,
  ) {}

  static criar(dados: DadosItemOrdemServico, id: string = randomUUID()): ItemOrdemServico {
    ItemOrdemServico.validarQuantidade(dados.quantidade);
    if (!dados.descricao?.trim()) throw new DomainError('Descrição do item é obrigatória');
    return new ItemOrdemServico(
      id,
      dados.tipo,
      dados.referenciaId,
      dados.descricao.trim(),
      dados.quantidade,
      Dinheiro.deCentavos(dados.precoUnitarioCentavos),
    );
  }

  get quantidade(): number {
    return this._quantidade;
  }

  get subtotal(): Dinheiro {
    return this.precoUnitario.multiplicar(this._quantidade);
  }

  mesmaReferencia(tipo: TipoItemOrdemServico, referenciaId: string): boolean {
    return this.tipo === tipo && this.referenciaId === referenciaId;
  }

  acrescentar(quantidade: number): void {
    ItemOrdemServico.validarQuantidade(quantidade);
    this._quantidade += quantidade;
  }

  private static validarQuantidade(quantidade: number): void {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new DomainError('Quantidade do item deve ser um inteiro positivo');
    }
  }
}
