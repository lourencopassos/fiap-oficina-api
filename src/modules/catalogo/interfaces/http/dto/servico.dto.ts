import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CriarServicoDto {
  /** @example Troca de óleo */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  /** @example Troca de óleo do motor e filtro */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  /** Preço de tabela em centavos. @example 15000 */
  @IsInt()
  @Min(0)
  precoCentavos: number;

  /** @example 45 */
  @IsOptional()
  @IsInt()
  @IsPositive()
  tempoEstimadoMinutos?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AtualizarServicoDto extends PartialType(CriarServicoDto) {}

export class ServicoResponseDto {
  id: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  /** Preço em reais */
  preco: number;
  tempoEstimadoMinutos: number | null;
  ativo: boolean;
}

export class FiltroServicosDto {
  /** Retorna apenas serviços ativos */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  apenasAtivos?: boolean;
}
