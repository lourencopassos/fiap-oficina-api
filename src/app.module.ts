import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validarAmbiente } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { AtendimentoModule } from './modules/atendimento/atendimento.module';
import { CadastroModule } from './modules/cadastro/cadastro.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { EstoqueModule } from './modules/estoque/estoque.module';
import { IdentidadeModule } from './modules/identidade/identidade.module';
import { SharedModule } from './shared/infrastructure/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarAmbiente }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('THROTTLE_TTL_MS', 60_000)),
          limit: Number(config.get('THROTTLE_LIMIT', 20)),
        },
      ],
    }),
    SharedModule,
    IdentidadeModule,
    CadastroModule,
    CatalogoModule,
    EstoqueModule,
    AtendimentoModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
