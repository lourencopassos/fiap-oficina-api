import { Injectable } from '@nestjs/common';
import { CredenciaisInvalidasError } from '../../../shared/application/errors';
import { UsuarioRepository } from '../domain/usuario.repository';
import { GeradorToken, HasherSenha } from './portas';
import { paraUsuarioView, UsuarioView } from './usuario.view';

export interface ResultadoAutenticacao {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: UsuarioView;
}

@Injectable()
export class AutenticarUsuarioUseCase {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: HasherSenha,
    private readonly gerador: GeradorToken,
  ) {}

  async executar(email: string, senha: string): Promise<ResultadoAutenticacao> {
    const usuario = await this.usuarios.buscarPorEmail(email.trim().toLowerCase());
    const senhaConfere = usuario ? await this.hasher.comparar(senha, usuario.senhaHash) : false;
    // Mesma mensagem para usuário inexistente, inativo ou senha errada: não revela quais e-mails existem.
    if (!usuario || !usuario.ativo || !senhaConfere) throw new CredenciaisInvalidasError();

    const { token, expiraEmSegundos } = await this.gerador.gerar({
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
    });
    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: expiraEmSegundos,
      usuario: paraUsuarioView(usuario),
    };
  }
}
