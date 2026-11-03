import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoMovimentacao } from '../../../domain/movimentacao-estoque';
import { TipoPeca } from '../../../domain/peca';

export class CriarPecaDto {
  /** Código interno/SKU. @example FLT-OLEO-001 */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  codigo: string;

  /** @example Filtro de óleo */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @IsEnum(TipoPeca)
  tipo: TipoPeca;

  /** Unidade de medida. @example UN */
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  unidade: string;

  /** Preço de venda em centavos. @example 4500 */
  @IsInt()
  @Min(0)
  precoCentavos: number;

  /** Saldo inicial. @example 10 */
  @IsOptional()
  @IsInt()
  @Min(0)
  quantidadeEstoque?: number;

  /** @example 2 */
  @IsOptional()
  @IsInt()
  @Min(0)
  estoqueMinimo?: number;
}

export class AtualizarPecaDto extends PartialType(
  OmitType(CriarPecaDto, ['quantidadeEstoque'] as const),
) {}

export class EntradaEstoqueDto {
  /** @example 5 */
  @IsInt()
  @IsPositive()
  quantidade: number;

  /** @example NF 12345 - Fornecedor X */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}

export class FiltroPecasDto {
  @IsOptional()
  @IsEnum(TipoPeca)
  tipo?: TipoPeca;

  /** Somente itens com saldo menor ou igual ao estoque mínimo */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  abaixoDoMinimo?: boolean;
}

export class PecaResponseDto {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoPeca;
  unidade: string;
  precoCentavos: number;
  preco: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  /** Alerta de reposição */
  abaixoDoMinimo: boolean;
}

export class MovimentacaoResponseDto {
  id: string;
  pecaId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  ordemServicoId: string | null;
  criadoEm: Date;
}
