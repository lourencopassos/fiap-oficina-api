import { Injectable } from '@nestjs/common';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { DomainError } from '../../../shared/domain/domain-error';
import { Role } from '../domain/role';
import { Usuario } from '../domain/usuario';
import { UsuarioRepository } from '../domain/usuario.repository';
import { HasherSenha } from './portas';
import { paraUsuarioView, UsuarioView } from './usuario.view';

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  role: Role;
}

export interface AtualizarUsuarioInput {
  nome?: string;
  senha?: string;
  role?: Role;
  ativo?: boolean;
}

/** Política de senha: mínimo de 8 caracteres, com letras e números. */
export const validarPoliticaSenha = (senha: string): void => {
  if (!senha || senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    throw new DomainError(
      'Senha deve ter ao menos 8 caracteres, com letras e números',
      'SENHA_FRACA',
    );
  }
};

@Injectable()
export class UsuariosService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: HasherSenha,
  ) {}

  async criar(input: CriarUsuarioInput): Promise<UsuarioView> {
    validarPoliticaSenha(input.senha);
    if (await this.usuarios.buscarPorEmail(input.email.trim().toLowerCase())) {
      throw new ConflitoError('Já existe um usuário com este e-mail');
    }
    const usuario = Usuario.criar({ ...input, senhaHash: await this.hasher.gerar(input.senha) });
    await this.usuarios.salvar(usuario);
    return paraUsuarioView(usuario);
  }

  async listar(): Promise<UsuarioView[]> {
    return (await this.usuarios.listar()).map(paraUsuarioView);
  }

  async obter(id: string): Promise<UsuarioView> {
    return paraUsuarioView(await this.buscar(id));
  }

  async atualizar(
    id: string,
    input: AtualizarUsuarioInput,
    solicitanteId?: string,
  ): Promise<UsuarioView> {
    const usuario = await this.buscar(id);
    if (
      id === solicitanteId &&
      (input.ativo === false || (input.role && input.role !== Role.ADMIN))
    ) {
      throw new DomainError('Um administrador não pode desativar nem rebaixar o próprio usuário');
    }
    usuario.atualizar(input);
    if (input.senha !== undefined) {
      validarPoliticaSenha(input.senha);
      usuario.alterarSenha(await this.hasher.gerar(input.senha));
    }
    await this.usuarios.salvar(usuario);
    return paraUsuarioView(usuario);
  }

  async remover(id: string, solicitanteId?: string): Promise<void> {
    if (id === solicitanteId) throw new DomainError('Um usuário não pode remover a si mesmo');
    await this.buscar(id);
    await this.usuarios.remover(id);
  }

  private async buscar(id: string): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario) throw new RecursoNaoEncontradoError('Usuário', id);
    return usuario;
  }
}
