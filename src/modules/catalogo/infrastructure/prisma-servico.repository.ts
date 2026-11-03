import { Injectable } from '@nestjs/common';
import { Servico as ServicoModel } from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import { Servico } from '../domain/servico';
import { ServicoRepository } from '../domain/servico.repository';

const paraDominio = (m: ServicoModel): Servico =>
  Servico.restaurar(m.id, {
    nome: m.nome,
    descricao: m.descricao,
    precoCentavos: m.precoCentavos,
    tempoEstimadoMinutos: m.tempoEstimadoMinutos,
    ativo: m.ativo,
  });

@Injectable()
export class PrismaServicoRepository extends ServicoRepository {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    const m = await this.txHost.tx.servico.findUnique({ where: { id } });
    return m ? paraDominio(m) : null;
  }

  async buscarPorNome(nome: string): Promise<Servico | null> {
    const m = await this.txHost.tx.servico.findUnique({ where: { nome } });
    return m ? paraDominio(m) : null;
  }

  async listar(filtro?: { apenasAtivos?: boolean }): Promise<Servico[]> {
    const where = filtro?.apenasAtivos ? { ativo: true } : {};
    return (await this.txHost.tx.servico.findMany({ where, orderBy: { nome: 'asc' } })).map(
      paraDominio,
    );
  }

  async salvar(s: Servico): Promise<void> {
    const dados = {
      nome: s.nome,
      descricao: s.descricao ?? null,
      precoCentavos: s.preco.centavos,
      tempoEstimadoMinutos: s.tempoEstimadoMinutos ?? null,
      ativo: s.ativo,
    };
    await this.txHost.tx.servico.upsert({
      where: { id: s.id },
      create: { id: s.id, ...dados },
      update: dados,
    });
  }

  async remover(id: string): Promise<void> {
    await this.txHost.tx.servico.delete({ where: { id } });
  }
}
