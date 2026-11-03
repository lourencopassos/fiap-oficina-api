import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import {
  ExecucaoConcluida,
  FiltroOrdensServico,
  OrdemServicoConsultas,
  ResumoOrdemServico,
} from '../application/consultas';
import { TipoItemOrdemServico } from '../domain/item-ordem-servico';
import { StatusOrdemServico } from '../domain/status-ordem-servico';

@Injectable()
export class PrismaOrdemServicoConsultas extends OrdemServicoConsultas {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async listar(filtro: FiltroOrdensServico): Promise<ResumoOrdemServico[]> {
    const where: Prisma.OrdemServicoWhereInput = {
      ...(filtro.status?.length ? { status: { in: filtro.status } } : {}),
      ...(filtro.clienteId ? { clienteId: filtro.clienteId } : {}),
      ...(filtro.veiculoId ? { veiculoId: filtro.veiculoId } : {}),
    };
    const ordens = await this.txHost.tx.ordemServico.findMany({
      where,
      orderBy: { criadaEm: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, placa: true, modelo: true } },
        itens: { select: { quantidade: true, precoUnitarioCentavos: true } },
      },
    });
    return ordens.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      status: o.status as StatusOrdemServico,
      cliente: o.cliente,
      veiculo: o.veiculo,
      valorTotalCentavos: o.itens.reduce(
        (acc, i) => acc + i.quantidade * i.precoUnitarioCentavos,
        0,
      ),
      criadaEm: o.criadaEm,
      atualizadaEm: o.atualizadaEm,
    }));
  }

  async listarExecucoesConcluidas(periodo: {
    de?: Date;
    ate?: Date;
  }): Promise<ExecucaoConcluida[]> {
    const ordens = await this.txHost.tx.ordemServico.findMany({
      where: {
        inicioExecucao: { not: null },
        fimExecucao: {
          not: null,
          ...(periodo.de ? { gte: periodo.de } : {}),
          ...(periodo.ate ? { lte: periodo.ate } : {}),
        },
      },
      select: {
        id: true,
        inicioExecucao: true,
        fimExecucao: true,
        itens: {
          where: { tipo: TipoItemOrdemServico.SERVICO },
          select: { referenciaId: true, descricao: true },
        },
      },
    });
    return ordens.map((o) => ({
      ordemServicoId: o.id,
      inicioExecucao: o.inicioExecucao as Date,
      fimExecucao: o.fimExecucao as Date,
      servicos: o.itens.map((i) => ({ servicoId: i.referenciaId, descricao: i.descricao })),
    }));
  }
}
