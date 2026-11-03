import { Injectable } from '@nestjs/common';
import {
  MovimentacaoEstoque as MovimentacaoModel,
  Peca as PecaModel,
  Prisma,
} from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import { MovimentacaoEstoque, TipoMovimentacao } from '../domain/movimentacao-estoque';
import { Peca, TipoPeca } from '../domain/peca';
import { FiltroPecas, PecaRepository } from '../domain/peca.repository';

const paraDominio = (m: PecaModel): Peca =>
  Peca.restaurar(m.id, {
    codigo: m.codigo,
    nome: m.nome,
    tipo: m.tipo as TipoPeca,
    unidade: m.unidade,
    precoCentavos: m.precoCentavos,
    quantidadeEstoque: m.quantidadeEstoque,
    estoqueMinimo: m.estoqueMinimo,
  });

const movimentacaoParaDominio = (m: MovimentacaoModel): MovimentacaoEstoque =>
  MovimentacaoEstoque.restaurar({ ...m, tipo: m.tipo as TipoMovimentacao });

@Injectable()
export class PrismaPecaRepository extends PecaRepository {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async buscarPorId(id: string): Promise<Peca | null> {
    const m = await this.txHost.tx.peca.findUnique({ where: { id } });
    return m ? paraDominio(m) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Peca | null> {
    const m = await this.txHost.tx.peca.findUnique({ where: { codigo } });
    return m ? paraDominio(m) : null;
  }

  async listar(filtro?: FiltroPecas): Promise<Peca[]> {
    const where: Prisma.PecaWhereInput = filtro?.tipo ? { tipo: filtro.tipo } : {};
    const pecas = (await this.txHost.tx.peca.findMany({ where, orderBy: { nome: 'asc' } })).map(
      paraDominio,
    );
    // Comparação entre duas colunas: filtrada em memória para manter a query simples.
    return filtro?.abaixoDoMinimo ? pecas.filter((p) => p.abaixoDoMinimo) : pecas;
  }

  async salvar(p: Peca): Promise<void> {
    const dados = {
      codigo: p.codigo,
      nome: p.nome,
      tipo: p.tipo,
      unidade: p.unidade,
      precoCentavos: p.preco.centavos,
      estoqueMinimo: p.estoqueMinimo,
    };
    await this.txHost.tx.peca.upsert({
      where: { id: p.id },
      create: { id: p.id, quantidadeEstoque: p.quantidadeEstoque, ...dados },
      update: dados,
    });
  }

  async remover(id: string): Promise<void> {
    await this.txHost.tx.peca.delete({ where: { id } });
  }

  async ajustarSaldo(pecaId: string, delta: number): Promise<boolean> {
    const where: Prisma.PecaWhereInput =
      delta < 0 ? { id: pecaId, quantidadeEstoque: { gte: -delta } } : { id: pecaId };
    const { count } = await this.txHost.tx.peca.updateMany({
      where,
      data: { quantidadeEstoque: { increment: delta } },
    });
    return count === 1;
  }

  async registrarMovimentacao(m: MovimentacaoEstoque): Promise<void> {
    await this.txHost.tx.movimentacaoEstoque.create({
      data: {
        id: m.id,
        pecaId: m.pecaId,
        tipo: m.tipo,
        quantidade: m.quantidade,
        motivo: m.motivo,
        ordemServicoId: m.ordemServicoId ?? null,
        criadoEm: m.criadoEm,
      },
    });
  }

  async listarMovimentacoes(pecaId: string): Promise<MovimentacaoEstoque[]> {
    const ms = await this.txHost.tx.movimentacaoEstoque.findMany({
      where: { pecaId },
      orderBy: { criadoEm: 'desc' },
    });
    return ms.map(movimentacaoParaDominio);
  }
}
