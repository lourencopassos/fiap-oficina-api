import { OmitType, PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsCpfOuCnpj } from '../../../../../shared/infrastructure/http/validators';

export class CriarClienteDto {
  /** @example João da Silva */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  /** CPF ou CNPJ, com ou sem máscara. @example 529.982.247-25 */
  @IsCpfOuCnpj()
  documento: string;

  /** @example joao@email.com */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** DDD + número. @example (11) 98765-4321 */
  @IsOptional()
  @Matches(/^[\d\s()+-]{10,20}$/, { message: 'telefone inválido' })
  telefone?: string;
}

export class AtualizarClienteDto extends PartialType(
  OmitType(CriarClienteDto, ['documento'] as const),
) {}

export class ClienteResponseDto {
  id: string;
  nome: string;
  /** Documento formatado. @example 529.982.247-25 */
  documento: string;
  /** @example CPF */
  tipoDocumento: string;
  email: string | null;
  telefone: string | null;
}

export class FiltroClientesDto {
  /** Filtra por parte do nome */
  @IsOptional()
  @IsString()
  nome?: string;
}
