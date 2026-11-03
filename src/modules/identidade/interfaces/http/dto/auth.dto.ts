import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { UsuarioResponseDto } from './usuario.dto';

export class LoginDto {
  /** @example admin@oficina.com */
  @IsEmail()
  email: string;

  /** @example Admin@123 */
  @IsString()
  @IsNotEmpty()
  senha: string;
}

export class TokenResponseDto {
  accessToken: string;
  /** @example Bearer */
  tokenType: string;
  /** Validade do token em segundos */
  expiresIn: number;
  usuario: UsuarioResponseDto;
}
