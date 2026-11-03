import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsCpfOuCnpj, IsPlaca } from '../../../../../shared/infrastructure/http/validators';
import { TipoItemOrdemServico } from '../../../domain/item-ordem-servico';
import { StatusOrcamento } from '../../../domain/orcamento';
import { StatusOrdemServico } from '../../../domain/status-ordem-servico';

// ---------- Entrada ----------

export class VeiculoDaOrdemDto {
  /** @example BRA2E19 */
  @IsPlaca()
  placa: string;

  /** Obrigatório se o veículo ainda não estiver cadastrado. @example Volkswagen */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  marca?: string;

  /** @example Gol 1.0 */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  modelo?: string;

  /** @example 2020 */
  @IsOptional()
  @IsInt()
  @Min(1900)
  ano?: number;
}

export class ServicoSolicitadoDto {
  @IsUUID()
  servicoId: string;

  /** @example 1 */
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(100)
  quantidade?: number;
}

export class PecaSolicitadaDto {
  @IsUUID()
  pecaId: string;

  /** @example 1 */
  @IsInt()
  @IsPositive()
  @Max(1000)
  quantidade: number;
}

export class AbrirOrdemServicoDto {
  /** CPF/CNPJ do cliente cadastrado. @example 529.982.247-25 */
  @IsCpfOuCnpj()
  documentoCliente: string;

  @ValidateNested()
  @Type(() => VeiculoDaOrdemDto)
  veiculo: VeiculoDaOrdemDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ServicoSolicitadoDto)
  servicos?: ServicoSolicitadoDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PecaSolicitadaDto)
  pecas?: PecaSolicitadaDto[];

  /** Relato do cliente / observações da recepção. @example Barulho ao frear */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;
}

export class ObservacaoDto {
  /** @example Pastilhas de freio desgastadas */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;
}

export class RejeicaoOrcamentoDto {
  /** @example Valor acima do esperado */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

export class FiltroOrdensServicoDto {
  /** Um ou mais status, separados por vírgula. @example EM_EXECUCAO,AGUARDANDO_APROVACAO */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value,
  )
  @IsEnum(StatusOrdemServico, { each: true })
  status?: StatusOrdemServico[];

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  veiculoId?: string;
}

export class PeriodoDto {
  /** Início (ISO 8601). @example 2026-01-01 */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  de?: Date;

  /** Fim (ISO 8601). @example 2026-12-31 */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ate?: Date;
}

export class IdentificacaoClienteDto {
  /** CPF/CNPJ do titular da OS. @example 52998224725 */
  @IsString()
  @MinLength(11)
  @MaxLength(18)
  documento: string;
}

export class RejeicaoPeloClienteDto extends IdentificacaoClienteDto {
  /** @example Vou pensar */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

// ---------- Saída ----------

export class ItemResponseDto {
  id: string;
  tipo: TipoItemOrdemServico;
  referenciaId: string;
  descricao: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  subtotalCentavos: number;
}

export class OrcamentoResponseDto {
  status: StatusOrcamento;
  valorServicosCentavos: number;
  valorPecasCentavos: number;
  valorTotalCentavos: number;
  /** Total em reais */
  valorTotal: number;
  enviadoEm: Date;
  respondidoEm: Date | null;
}

export class HistoricoResponseDto {
  status: StatusOrdemServico;
  /** @example Em diagnóstico */
  descricao: string;
  observacao: string | null;
  ocorridoEm: Date;
}

class ClienteResumoDto {
  id: string;
  nome: string;
  documento: string;
}

class VeiculoResumoDto {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export class OrdemServicoResponseDto {
  id: string;
  /** Código para acompanhamento pelo cliente. @example OS-7K3M9QX2 */
  codigo: string;
  status: StatusOrdemServico;
  statusDescricao: string;
  observacao: string | null;
  cliente: ClienteResumoDto;
  veiculo: VeiculoResumoDto;
  itens: ItemResponseDto[];
  valorTotalItensCentavos: number;
  orcamento: OrcamentoResponseDto | null;
  historico: HistoricoResponseDto[];
  criadaEm: Date;
  inicioExecucao: Date | null;
  fimExecucao: Date | null;
  entregueEm: Date | null;
  tempoExecucaoMinutos: number | null;
}

class ClienteListagemDto {
  id: string;
  nome: string;
}

class VeiculoListagemDto {
  id: string;
  placa: string;
  modelo: string;
}

export class ResumoOrdemServicoResponseDto {
  id: string;
  codigo: string;
  status: StatusOrdemServico;
  cliente: ClienteListagemDto;
  veiculo: VeiculoListagemDto;
  valorTotalCentavos: number;
  criadaEm: Date;
  atualizadaEm: Date;
}

class ItemAcompanhamentoDto {
  tipo: TipoItemOrdemServico;
  descricao: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  subtotalCentavos: number;
}

class ClienteAcompanhamentoDto {
  nome: string;
  /** Documento mascarado. @example ***.982.247-** */
  documento: string;
}

class VeiculoAcompanhamentoDto {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export class AcompanhamentoResponseDto {
  codigo: string;
  status: StatusOrdemServico;
  statusDescricao: string;
  cliente: ClienteAcompanhamentoDto;
  veiculo: VeiculoAcompanhamentoDto;
  itens: ItemAcompanhamentoDto[];
  orcamento: OrcamentoResponseDto | null;
  historico: HistoricoResponseDto[];
  criadaEm: Date;
}

class TempoMedioPorServicoDto {
  servicoId: string;
  servico: string;
  quantidadeOrdens: number;
  tempoMedioMinutos: number;
}

class PeriodoResponseDto {
  de: Date | null;
  ate: Date | null;
}

export class TempoMedioExecucaoResponseDto {
  periodo: PeriodoResponseDto;
  totalOrdensConsideradas: number;
  /** Média geral (aprovação -> finalização), em minutos */
  tempoMedioMinutos: number | null;
  porServico: TempoMedioPorServicoDto[];
}
