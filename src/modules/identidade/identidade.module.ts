import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AutenticarUsuarioUseCase } from './application/autenticar-usuario.use-case';
import { GeradorToken, HasherSenha } from './application/portas';
import { UsuariosService } from './application/usuarios.service';
import { UsuarioRepository } from './domain/usuario.repository';
import { BcryptHasherSenha } from './infrastructure/bcrypt-hasher-senha';
import { JwtGeradorToken } from './infrastructure/jwt-gerador-token';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { AuthController } from './interfaces/http/auth.controller';
import { JwtAuthGuard } from './interfaces/http/guards/jwt-auth.guard';
import { RolesGuard } from './interfaces/http/guards/roles.guard';
import { UsuariosController } from './interfaces/http/usuarios.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', '1h') as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
          algorithm: 'HS256',
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AutenticarUsuarioUseCase,
    UsuariosService,
    { provide: UsuarioRepository, useClass: PrismaUsuarioRepository },
    { provide: HasherSenha, useClass: BcryptHasherSenha },
    { provide: GeradorToken, useClass: JwtGeradorToken },
    // Ordem importa: autenticação (JWT) antes da autorização (roles).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class IdentidadeModule {}
