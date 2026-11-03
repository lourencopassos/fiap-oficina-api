import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../identidade/domain/role';
import { Roles } from '../../../identidade/interfaces/http/decorators/roles.decorator';
import { EstoqueService } from '../../application/estoque.service';
import { PecasService } from '../../application/pecas.service';
import {
  AtualizarPecaDto,
  CriarPecaDto,
  EntradaEstoqueDto,
  FiltroPecasDto,
  MovimentacaoResponseDto,
  PecaResponseDto,
} from './dto/peca.dto';

@ApiTags('Admin - Peças e Insumos')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/pecas')
export class PecasController {
  constructor(
    private readonly pecas: PecasService,
    private readonly estoque: EstoqueService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra uma peça ou insumo' })
  criar(@Body() dto: CriarPecaDto): Promise<PecaResponseDto> {
    return this.pecas.criar(dto);
  }

  @Get()
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Lista peças e insumos com saldo em estoque' })
  listar(@Query() filtro: FiltroPecasDto): Promise<PecaResponseDto[]> {
    return this.pecas.listar(filtro);
  }

  @Get(':id')
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Detalha uma peça/insumo' })
  obter(@Param('id', ParseUUIDPipe) id: string): Promise<PecaResponseDto> {
    return this.pecas.obter(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados cadastrais (saldo só muda via movimentação)' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPecaDto,
  ): Promise<PecaResponseDto> {
    return this.pecas.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove uma peça/insumo' })
  remover(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.pecas.remover(id);
  }

  @Post(':id/entradas')
  @ApiOperation({ summary: 'Registra entrada de estoque (compra/reposição)' })
  registrarEntrada(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EntradaEstoqueDto,
  ): Promise<PecaResponseDto> {
    return this.estoque.registrarEntrada(id, dto.quantidade, dto.motivo);
  }

  @Get(':id/movimentacoes')
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Histórico de entradas e saídas da peça' })
  movimentacoes(@Param('id', ParseUUIDPipe) id: string): Promise<MovimentacaoResponseDto[]> {
    return this.estoque.listarMovimentacoes(id);
  }
}
