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
import { VeiculosService } from '../../application/veiculos.service';
import {
  AtualizarVeiculoDto,
  CriarVeiculoDto,
  FiltroVeiculosDto,
  VeiculoResponseDto,
} from './dto/veiculo.dto';

@ApiTags('Admin - Veículos')
@ApiBearerAuth()
@Roles(Role.ATENDENTE)
@Controller('admin/veiculos')
export class VeiculosController {
  constructor(private readonly service: VeiculosService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um veículo para um cliente' })
  criar(@Body() dto: CriarVeiculoDto): Promise<VeiculoResponseDto> {
    return this.service.criar(dto);
  }

  @Get()
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Lista veículos (opcionalmente por cliente)' })
  listar(@Query() filtro: FiltroVeiculosDto): Promise<VeiculoResponseDto[]> {
    return this.service.listar(filtro);
  }

  @Get(':id')
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Detalha um veículo' })
  obter(@Param('id', ParseUUIDPipe) id: string): Promise<VeiculoResponseDto> {
    return this.service.obter(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados do veículo (placa é imutável)' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarVeiculoDto,
  ): Promise<VeiculoResponseDto> {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove um veículo (somente se não houver OS vinculadas)' })
  remover(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remover(id);
  }
}
