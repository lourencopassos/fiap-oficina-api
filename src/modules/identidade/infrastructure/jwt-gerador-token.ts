import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GeradorToken, UsuarioAutenticado } from '../application/portas';

@Injectable()
export class JwtGeradorToken extends GeradorToken {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  async gerar(usuario: UsuarioAutenticado): Promise<{ token: string; expiraEmSegundos: number }> {
    const token = await this.jwt.signAsync({
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    });
    const { iat, exp } = this.jwt.decode<{ iat: number; exp: number }>(token);
    return { token, expiraEmSegundos: exp - iat };
  }
}
