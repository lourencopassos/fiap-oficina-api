import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AutenticarUsuarioUseCase } from '../../application/autenticar-usuario.use-case';
import { Public } from './decorators/public.decorator';
import { LoginDto, TokenResponseDto } from './dto/auth.dto';

@ApiTags('Autenticação')
@Public()
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly autenticar: AutenticarUsuarioUseCase) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica um usuário administrativo e retorna um JWT' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.autenticar.executar(dto.email, dto.senha);
  }
}
