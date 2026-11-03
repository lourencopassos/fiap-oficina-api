import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { PublicadorEventos } from '../application/publicador-eventos';
import { UnidadeDeTrabalho } from '../application/unidade-de-trabalho';
import { PrismaUnidadeDeTrabalho } from './database/prisma-unidade-de-trabalho';
import { PrismaModule } from './database/prisma.module';
import { PrismaService } from './database/prisma.service';
import { EventEmitterPublicadorEventos } from './eventos/event-emitter-publicador';

@Global()
@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
        }),
      ],
    }),
  ],
  providers: [
    { provide: UnidadeDeTrabalho, useClass: PrismaUnidadeDeTrabalho },
    { provide: PublicadorEventos, useClass: EventEmitterPublicadorEventos },
  ],
  exports: [PrismaModule, UnidadeDeTrabalho, PublicadorEventos],
})
export class SharedModule {}
