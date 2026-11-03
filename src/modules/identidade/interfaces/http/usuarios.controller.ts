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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioAutenticado } from '../../application/portas';
import { UsuariosService } from '../../application/usuarios.service';
import { Role } from '../../domain/role';
import { Roles } from './decorators/roles.decorator';
import { UsuarioAtual } from './decorators/usuario-atual.decorator';
import { AtualizarUsuarioDto, CriarUsuarioDto, UsuarioResponseDto } from './dto/usuario.dto';

@ApiTags('Admin - Usuários')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um usuário administrativo' })
  criar(@Body() dto: CriarUsuarioDto): Promise<UsuarioResponseDto> {
    return this.service.criar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os usuários' })
  listar(): Promise<UsuarioResponseDto[]> {
    return this.service.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um usuário' })
  obter(@Param('id', ParseUUIDPipe) id: string): Promise<UsuarioResponseDto> {
    return this.service.obter(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza nome, senha, perfil ou status de um usuário' })
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarUsuarioDto,
    @UsuarioAtual() atual: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {
    return this.service.atualizar(id, dto, atual.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove um usuário' })
  remover(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() atual: UsuarioAutenticado,
  ): Promise<void> {
    return this.service.remover(id, atual.id);
  }
}
