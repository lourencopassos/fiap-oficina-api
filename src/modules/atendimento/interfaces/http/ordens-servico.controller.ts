import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../identidade/domain/role';
import { Roles } from '../../../identidade/interfaces/http/decorators/roles.decorator';
import { AbrirOrdemServicoUseCase } from '../../application/abrir-ordem-servico.use-case';
import { AlterarStatusOrdemServicoUseCase } from '../../application/alterar-status.use-case';
import { ConsultarOrdensServicoUseCase } from '../../application/consultar-ordens-servico.use-case';
import { GerenciarItensOrdemServicoUseCase } from '../../application/gerenciar-itens.use-case';
import { ResponderOrcamentoUseCase } from '../../application/responder-orcamento.use-case';
import {
  AbrirOrdemServicoDto,
  FiltroOrdensServicoDto,
  ObservacaoDto,
  OrdemServicoResponseDto,
  PecaSolicitadaDto,
  RejeicaoOrcamentoDto,
  ResumoOrdemServicoResponseDto,
  ServicoSolicitadoDto,
} from './dto/ordem-servico.dto';

@ApiTags('Admin - Ordens de Serviço')
@ApiBearerAuth()
@Roles(Role.ATENDENTE, Role.MECANICO)
@Controller('admin/ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly abrir: AbrirOrdemServicoUseCase,
    private readonly itens: GerenciarItensOrdemServicoUseCase,
    private readonly status: AlterarStatusOrdemServicoUseCase,
    private readonly orcamento: ResponderOrcamentoUseCase,
    private readonly consultas: ConsultarOrdensServicoUseCase,
  ) {}

  @Post()
  @Roles(Role.ATENDENTE)
  @ApiOperation({
    summary: 'Abre uma OS',
    description:
      'Identifica o cliente pelo CPF/CNPJ, localiza ou cadastra o veículo pela placa e inclui serviços/peças. ' +
      'Com itens, a OS já passa automaticamente para "Em diagnóstico".',
  })
  criar(@Body() dto: AbrirOrdemServicoDto): Promise<OrdemServicoResponseDto> {
    return this.abrir.executar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista ordens de serviço (mais recentes primeiro)' })
  listar(@Query() filtro: FiltroOrdensServicoDto): Promise<ResumoOrdemServicoResponseDto[]> {
    return this.consultas.listar(filtro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma OS (itens, orçamento, histórico e tempos)' })
  detalhar(@Param('id', ParseUUIDPipe) id: string): Promise<OrdemServicoResponseDto> {
    return this.consultas.detalhar(id);
  }

  @Post(':id/diagnostico')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia o diagnóstico (Recebida -> Em diagnóstico)' })
  iniciarDiagnostico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ObservacaoDto,
  ): Promise<OrdemServicoResponseDto> {
    return this.status.iniciarDiagnostico(id, dto.observacao);
  }

  @Post(':id/servicos')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inclui um serviço na OS (antes do envio do orçamento)' })
  adicionarServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ServicoSolicitadoDto,
  ): Promise<OrdemServicoResponseDto> {
    return this.itens.adicionarServico(id, dto.servicoId, dto.quantidade);
  }

  @Post(':id/pecas')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inclui uma peça/insumo na OS (antes do envio do orçamento)' })
  adicionarPeca(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PecaSolicitadaDto,
  ): Promise<OrdemServicoResponseDto> {
    return this.itens.adicionarPeca(id, dto.pecaId, dto.quantidade);
  }

  @Delete(':id/itens/:itemId')
  @ApiOperation({ summary: 'Remove um item da OS (antes do envio do orçamento)' })
  removerItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<OrdemServicoResponseDto> {
    return this.itens.removerItem(id, itemId);
  }

  @Post(':id/orcamento/enviar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Gera o orçamento e envia ao cliente (Em diagnóstico -> Aguardando aprovação)',
  })
  enviarOrcamento(@Param('id', ParseUUIDPipe) id: string): Promise<OrdemServicoResponseDto> {
    return this.status.enviarOrcamento(id);
  }

  @Post(':id/orcamento/aprovar')
  @HttpCode(200)
  @Roles(Role.ATENDENTE)
  @ApiOperation({
    summary: 'Registra aprovação do cliente recebida presencialmente/telefone',
    description: 'Baixa o estoque das peças e inicia a execução, na mesma transação.',
  })
  aprovarOrcamento(@Param('id', ParseUUIDPipe) id: string): Promise<OrdemServicoResponseDto> {
    return this.orcamento.aprovarPorId(id);
  }

  @Post(':id/orcamento/rejeitar')
  @HttpCode(200)
  @Roles(Role.ATENDENTE)
  @ApiOperation({ summary: 'Registra rejeição do orçamento (OS encerrada sem execução)' })
  rejeitarOrcamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejeicaoOrcamentoDto,
  ): Promise<OrdemServicoResponseDto> {
    return this.orcamento.rejeitarPorId(id, dto.motivo);
  }

  @Post(':id/finalizar')
  @HttpCode(200)
  @Roles(Role.MECANICO)
  @ApiOperation({ summary: 'Conclui a execução (Em execução -> Finalizada)' })
  finalizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ObservacaoDto,
  ): Promise<OrdemServicoResponseDto> {
    return this.status.finalizar(id, dto.observacao);
  }

  @Post(':id/entregar')
  @HttpCode(200)
  @Roles(Role.ATENDENTE)
  @ApiOperation({ summary: 'Registra a entrega do veículo (Finalizada -> Entregue)' })
  entregar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ObservacaoDto,
  ): Promise<OrdemServicoResponseDto> {
    return this.status.entregar(id, dto.observacao);
  }
}
