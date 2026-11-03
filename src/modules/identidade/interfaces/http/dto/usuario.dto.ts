import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../domain/role';

export class CriarUsuarioDto {
  /** @example Maria Atendente */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  /** @example maria@oficina.com */
  @IsEmail()
  email: string;

  /** Mínimo de 8 caracteres, com letras e números. @example Senha@123 */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha: string;

  @IsEnum(Role)
  role: Role;
}

class CamposAtualizaveisUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha: string;

  @IsEnum(Role)
  role: Role;

  @IsBoolean()
  ativo: boolean;
}

export class AtualizarUsuarioDto extends PartialType(CamposAtualizaveisUsuarioDto) {}

export class UsuarioResponseDto {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
}
