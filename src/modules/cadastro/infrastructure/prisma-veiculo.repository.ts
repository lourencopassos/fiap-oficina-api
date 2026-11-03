import { Injectable } from '@nestjs/common';
import { Veiculo as VeiculoModel } from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import { VeiculoRepository } from '../domain/repositories';
import { Veiculo } from '../domain/veiculo';

const paraDominio = (m: VeiculoModel): Veiculo =>
  Veiculo.restaurar(m.id, {
    clienteId: m.clienteId,
    placa: m.placa,
    marca: m.marca,
    modelo: m.modelo,
    ano: m.ano,
  });

@Injectable()
export class PrismaVeiculoRepository extends VeiculoRepository {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async buscarPorId(id: string): Promise<Veiculo | null> {
    const m = await this.txHost.tx.veiculo.findUnique({ where: { id } });
    return m ? paraDominio(m) : null;
  }

  async buscarPorPlaca(placa: string): Promise<Veiculo | null> {
    const m = await this.txHost.tx.veiculo.findUnique({ where: { placa } });
    return m ? paraDominio(m) : null;
  }

  async listar(filtro?: { clienteId?: string }): Promise<Veiculo[]> {
    const where = filtro?.clienteId ? { clienteId: filtro.clienteId } : {};
    return (await this.txHost.tx.veiculo.findMany({ where, orderBy: { placa: 'asc' } })).map(
      paraDominio,
    );
  }

  async salvar(v: Veiculo): Promise<void> {
    const dados = {
      clienteId: v.clienteId,
      placa: v.placa.valor,
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano,
    };
    await this.txHost.tx.veiculo.upsert({
      where: { id: v.id },
      create: { id: v.id, ...dados },
      update: dados,
    });
  }

  async remover(id: string): Promise<void> {
    await this.txHost.tx.veiculo.delete({ where: { id } });
  }
}
