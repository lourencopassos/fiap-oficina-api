import { Injectable } from '@nestjs/common';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { DadosPeca, Peca } from '../domain/peca';
import { FiltroPecas, PecaRepository } from '../domain/peca.repository';
import { paraPecaView, PecaView } from './views';

export type CriarPecaInput = Omit<DadosPeca, 'quantidadeEstoque' | 'estoqueMinimo'> & {
  quantidadeEstoque?: number;
  estoqueMinimo?: number;
};

/** CRUD de peças e insumos (dados cadastrais). Saldo é alterado via EstoqueService. */
@Injectable()
export class PecasService {
  constructor(private readonly pecas: PecaRepository) {}

  async criar(input: CriarPecaInput): Promise<PecaView> {
    const peca = Peca.criar({
      ...input,
      quantidadeEstoque: input.quantidadeEstoque ?? 0,
      estoqueMinimo: input.estoqueMinimo ?? 0,
    });
    await this.garantirCodigoUnico(peca.codigo);
    await this.pecas.salvar(peca);
    return paraPecaView(peca);
  }

  async listar(filtro?: FiltroPecas): Promise<PecaView[]> {
    return (await this.pecas.listar(filtro)).map(paraPecaView);
  }

  async obter(id: string): Promise<PecaView> {
    return paraPecaView(await this.buscar(id));
  }

  async atualizar(
    id: string,
    input: Partial<Omit<DadosPeca, 'quantidadeEstoque'>>,
  ): Promise<PecaView> {
    const peca = await this.buscar(id);
    if (input.codigo && input.codigo.trim().toUpperCase() !== peca.codigo) {
      await this.garantirCodigoUnico(input.codigo.trim().toUpperCase());
    }
    peca.atualizar(input);
    await this.pecas.salvar(peca);
    return paraPecaView(peca);
  }

  async remover(id: string): Promise<void> {
    await this.buscar(id);
    await this.pecas.remover(id);
  }

  private async buscar(id: string): Promise<Peca> {
    const peca = await this.pecas.buscarPorId(id);
    if (!peca) throw new RecursoNaoEncontradoError('Peça/insumo', id);
    return peca;
  }

  private async garantirCodigoUnico(codigo: string): Promise<void> {
    if (await this.pecas.buscarPorCodigo(codigo))
      throw new ConflitoError('Já existe uma peça com este código');
  }
}
