import { Injectable } from '@nestjs/common';
import { Usuario as UsuarioModel } from '@prisma/client';
import { PrismaTxHost } from '../../../shared/infrastructure/database/transacao';
import { Role } from '../domain/role';
import { Usuario } from '../domain/usuario';
import { UsuarioRepository } from '../domain/usuario.repository';

const paraDominio = (m: UsuarioModel): Usuario =>
  Usuario.restaurar(m.id, {
    nome: m.nome,
    email: m.email,
    senhaHash: m.senhaHash,
    role: m.role as Role,
    ativo: m.ativo,
  });

@Injectable()
export class PrismaUsuarioRepository extends UsuarioRepository {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const m = await this.txHost.tx.usuario.findUnique({ where: { id } });
    return m ? paraDominio(m) : null;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const m = await this.txHost.tx.usuario.findUnique({ where: { email } });
    return m ? paraDominio(m) : null;
  }

  async listar(): Promise<Usuario[]> {
    return (await this.txHost.tx.usuario.findMany({ orderBy: { nome: 'asc' } })).map(paraDominio);
  }

  async salvar(u: Usuario): Promise<void> {
    const dados = {
      nome: u.nome,
      email: u.email,
      senhaHash: u.senhaHash,
      role: u.role,
      ativo: u.ativo,
    };
    await this.txHost.tx.usuario.upsert({
      where: { id: u.id },
      create: { id: u.id, ...dados },
      update: dados,
    });
  }

  async remover(id: string): Promise<void> {
    await this.txHost.tx.usuario.delete({ where: { id } });
  }
}
