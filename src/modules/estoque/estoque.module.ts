import { Module } from '@nestjs/common';
import { EstoqueService } from './application/estoque.service';
import { PecasService } from './application/pecas.service';
import { PecaRepository } from './domain/peca.repository';
import { PrismaPecaRepository } from './infrastructure/prisma-peca.repository';
import { PecasController } from './interfaces/http/pecas.controller';

@Module({
  controllers: [PecasController],
  providers: [
    PecasService,
    EstoqueService,
    { provide: PecaRepository, useClass: PrismaPecaRepository },
  ],
  exports: [PecasService, EstoqueService],
})
export class EstoqueModule {}
