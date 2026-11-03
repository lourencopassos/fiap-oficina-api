import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import { HistoricoStatus } from '../domain/historico-status';
import { ItemOrdemServico, TipoItemOrdemServico } from '../domain/item-ordem-servico';
import { Orcamento, StatusOrcamento } from '../domain/orcamento';
import { OrdemServico } from '../domain/ordem-servico';
import { OrdemServicoRepository } from '../domain/ordem-servico.repository';
import { StatusOrdemServico } from '../domain/status-ordem-servico';

const INCLUDE = {
  itens: { orderBy: [{ tipo: 'desc' }, { descricao: 'asc' }] },
  historico: { orderBy: { sequencia: 'asc' } },
} satisfies Prisma.OrdemServicoInclude;

type OrdemServicoCompleta = Prisma.OrdemServicoGetPayload<{ include: typeof INCLUDE }>;

const paraDominio = (m: OrdemServicoCompleta): OrdemServico =>
  OrdemServico.restaurar(m.id, {
    codigo: m.codigo,
    clienteId: m.clienteId,
    veiculoId: m.veiculoId,
    status: m.status as StatusOrdemServico,
    observacao: m.observacao ?? undefined,
    itens: m.itens.map((i) =>
      ItemOrdemServico.criar(
        {
          tipo: i.tipo as TipoItemOrdemServico,
          referenciaId: i.referenciaId,
          descricao: i.descricao,
          quantidade: i.quantidade,
          precoUnitarioCentavos: i.precoUnitarioCentavos,
        },
        i.id,
      ),
    ),
    orcamento:
      m.orcamentoStatus && m.orcamentoEnviadoEm
        ? Orcamento.restaurar({
            status: m.orcamentoStatus as StatusOrcamento,
            valorServicosCentavos: m.orcamentoValorServicosCentavos ?? 0,
            valorPecasCentavos: m.orcamentoValorPecasCentavos ?? 0,
            enviadoEm: m.orcamentoEnviadoEm,
            respondidoEm: m.orcamentoRespondidoEm,
          })
        : undefined,
    historico: m.historico.map(
      (h) =>
        new HistoricoStatus(
          h.id,
          h.status as StatusOrdemServico,
          h.ocorridoEm,
          h.observacao ?? undefined,
        ),
    ),
    criadaEm: m.criadaEm,
    inicioExecucao: m.inicioExecucao ?? undefined,
    fimExecucao: m.fimExecucao ?? undefined,
    entregueEm: m.entregueEm ?? undefined,
  });

/**
 * Persiste o agregado completo (OS + itens + histórico). Deve ser chamado dentro
 * de uma transação (UnidadeDeTrabalho) para que as tabelas fiquem consistentes.
 */
@Injectable()
export class PrismaOrdemServicoRepository extends OrdemServicoRepository {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async buscarPorId(id: string): Promise<OrdemServico | null> {
    const m = await this.txHost.tx.ordemServico.findUnique({ where: { id }, include: INCLUDE });
    return m ? paraDominio(m) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<OrdemServico | null> {
    const m = await this.txHost.tx.ordemServico.findUnique({ where: { codigo }, include: INCLUDE });
    return m ? paraDominio(m) : null;
  }

  async salvar(os: OrdemServico): Promise<void> {
    const tx = this.txHost.tx;
    const o = os.orcamento;
    const dados = {
      status: os.status,
      observacao: os.observacao ?? null,
      orcamentoStatus: o?.status ?? null,
      orcamentoValorServicosCentavos: o?.valorServicos.centavos ?? null,
      orcamentoValorPecasCentavos: o?.valorPecas.centavos ?? null,
      orcamentoEnviadoEm: o?.enviadoEm ?? null,
      orcamentoRespondidoEm: o?.respondidoEm ?? null,
      inicioExecucao: os.inicioExecucao ?? null,
      fimExecucao: os.fimExecucao ?? null,
      entregueEm: os.entregueEm ?? null,
    };
    await tx.ordemServico.upsert({
      where: { id: os.id },
      create: {
        id: os.id,
        codigo: os.codigo,
        clienteId: os.clienteId,
        veiculoId: os.veiculoId,
        criadaEm: os.criadaEm,
        ...dados,
      },
      update: dados,
    });

    // Itens: o agregado é a fonte da verdade; substituímos o conjunto.
    await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: os.id } });
    if (os.itens.length) {
      await tx.itemOrdemServico.createMany({
        data: os.itens.map((i) => ({
          id: i.id,
          ordemServicoId: os.id,
          tipo: i.tipo,
          referenciaId: i.referenciaId,
          descricao: i.descricao,
          quantidade: i.quantidade,
          precoUnitarioCentavos: i.precoUnitario.centavos,
        })),
      });
    }

    // Histórico é append-only: só insere entradas novas.
    await tx.historicoStatusOrdemServico.createMany({
      data: os.historico.map((h, sequencia) => ({
        id: h.id,
        ordemServicoId: os.id,
        sequencia,
        status: h.status,
        observacao: h.observacao ?? null,
        ocorridoEm: h.ocorridoEm,
      })),
      skipDuplicates: true,
    });
  }
}
