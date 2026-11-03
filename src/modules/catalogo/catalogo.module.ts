import { Module } from '@nestjs/common';
import { ServicosService } from './application/servicos.service';
import { ServicoRepository } from './domain/servico.repository';
import { PrismaServicoRepository } from './infrastructure/prisma-servico.repository';
import { ServicosController } from './interfaces/http/servicos.controller';

@Module({
  controllers: [ServicosController],
  providers: [ServicosService, { provide: ServicoRepository, useClass: PrismaServicoRepository }],
  exports: [ServicosService],
})
export class CatalogoModule {}
