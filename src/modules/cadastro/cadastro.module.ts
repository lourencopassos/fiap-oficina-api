import { Module } from '@nestjs/common';
import { ClientesService } from './application/clientes.service';
import { VeiculosService } from './application/veiculos.service';
import { ClienteRepository, VeiculoRepository } from './domain/repositories';
import { PrismaClienteRepository } from './infrastructure/prisma-cliente.repository';
import { PrismaVeiculoRepository } from './infrastructure/prisma-veiculo.repository';
import { ClientesController } from './interfaces/http/clientes.controller';
import { VeiculosController } from './interfaces/http/veiculos.controller';

@Module({
  controllers: [ClientesController, VeiculosController],
  providers: [
    ClientesService,
    VeiculosService,
    { provide: ClienteRepository, useClass: PrismaClienteRepository },
    { provide: VeiculoRepository, useClass: PrismaVeiculoRepository },
  ],
  exports: [ClientesService, VeiculosService],
})
export class CadastroModule {}
