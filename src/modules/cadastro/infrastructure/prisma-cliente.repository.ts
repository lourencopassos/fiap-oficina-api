import { Injectable } from '@nestjs/common';
import { Cliente as ClienteModel } from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import { Cliente } from '../domain/cliente';
import { ClienteRepository } from '../domain/repositories';

const paraDominio = (m: ClienteModel): Cliente =>
  Cliente.restaurar(m.id, {
    nome: m.nome,
    documento: m.documento,
    email: m.email,
    telefone: m.telefone,
  });

@Injectable()
export class PrismaClienteRepository extends ClienteRepository {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const m = await this.txHost.tx.cliente.findUnique({ where: { id } });
    return m ? paraDominio(m) : null;
  }

  async buscarPorDocumento(documento: string): Promise<Cliente | null> {
    const m = await this.txHost.tx.cliente.findUnique({ where: { documento } });
    return m ? paraDominio(m) : null;
  }

  async listar(filtro?: { nome?: string }): Promise<Cliente[]> {
    const where = filtro?.nome
      ? { nome: { contains: filtro.nome, mode: 'insensitive' as const } }
      : {};
    return (await this.txHost.tx.cliente.findMany({ where, orderBy: { nome: 'asc' } })).map(
      paraDominio,
    );
  }

  async salvar(c: Cliente): Promise<void> {
    const dados = {
      nome: c.nome,
      documento: c.documento.valor,
      tipoDocumento: c.documento.tipo,
      email: c.email ?? null,
      telefone: c.telefone ?? null,
    };
    await this.txHost.tx.cliente.upsert({
      where: { id: c.id },
      create: { id: c.id, ...dados },
      update: dados,
    });
  }

  async remover(id: string): Promise<void> {
    await this.txHost.tx.cliente.delete({ where: { id } });
  }
}
