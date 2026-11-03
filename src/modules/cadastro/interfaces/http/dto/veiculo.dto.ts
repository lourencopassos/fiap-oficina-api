import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { IsPlaca } from '../../../../../shared/infrastructure/http/validators';

export class CriarVeiculoDto {
  @IsUUID()
  clienteId: string;

  /** Padrão antigo (ABC1234) ou Mercosul (ABC1D23). @example BRA2E19 */
  @IsPlaca()
  placa: string;

  /** @example Volkswagen */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  marca: string;

  /** @example Gol 1.0 */
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  modelo: string;

  /** @example 2020 */
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  ano: number;
}

export class AtualizarVeiculoDto extends PartialType(
  OmitType(CriarVeiculoDto, ['placa'] as const),
) {}

export class VeiculoResponseDto {
  id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export class FiltroVeiculosDto {
  @IsOptional()
  @IsUUID()
  clienteId?: string;
}
