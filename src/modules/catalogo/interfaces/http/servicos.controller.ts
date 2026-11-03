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
import { ServicosService } from '../../application/servicos.service';
import {
  AtualizarServicoDto,
  CriarServicoDto,
  FiltroServicosDto,
  ServicoResponseDto,
} from './dto/servico.dto';

@ApiTags('Admin - Serviços')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/servicos')
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um serviço no catálogo' })
  criar(@Body() dto: CriarServicoDto): Promise<ServicoResponseDto> {
    return this.service.criar(dto);
  }

  @Get()
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Lista serviços do catálogo' })
  listar(@Query() filtro: FiltroServicosDto): Promise<ServicoResponseDto[]> {
    return this.service.listar(filtro);
  }

  @Get(':id')
  @Roles(Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Detalha um serviço' })
  obter(@Param('id', ParseUUIDPipe) id: string): Promise<ServicoResponseDto> {
    return this.service.obter(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um serviço (preço, descrição, ativação)' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarServicoDto,
  ): Promise<ServicoResponseDto> {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove um serviço do catálogo (prefira desativar se já foi usado em OS)',
  })
  remover(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remover(id);
  }
}
