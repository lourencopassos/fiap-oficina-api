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
import { ClientesService } from '../../application/clientes.service';
import {
  AtualizarClienteDto,
  ClienteResponseDto,
  CriarClienteDto,
  FiltroClientesDto,
} from './dto/cliente.dto';

@ApiTags('Admin - Clientes')
@ApiBearerAuth()
@Roles(Role.ATENDENTE)
@Controller('admin/clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um cliente (CPF ou CNPJ)' })
  criar(@Body() dto: CriarClienteDto): Promise<ClienteResponseDto> {
    return this.service.criar(dto);
  }

  @Get()
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Lista clientes' })
  listar(@Query() filtro: FiltroClientesDto): Promise<ClienteResponseDto[]> {
    return this.service.listar(filtro);
  }

  @Get('documento/:documento')
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Identifica um cliente pelo CPF/CNPJ (somente dígitos)' })
  obterPorDocumento(@Param('documento') documento: string): Promise<ClienteResponseDto> {
    return this.service.obterPorDocumento(documento);
  }

  @Get(':id')
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Detalha um cliente' })
  obter(@Param('id', ParseUUIDPipe) id: string): Promise<ClienteResponseDto> {
    return this.service.obter(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados de contato do cliente' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarClienteDto,
  ): Promise<ClienteResponseDto> {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove um cliente (somente se não houver veículos/OS vinculados)' })
  remover(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remover(id);
  }
}
