import { Module } from '@nestjs/common';
import { CadastroModule } from '../cadastro/cadastro.module';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { AbrirOrdemServicoUseCase } from './application/abrir-ordem-servico.use-case';
import { AlterarStatusOrdemServicoUseCase } from './application/alterar-status.use-case';
import { CalcularTempoMedioExecucaoUseCase } from './application/calcular-tempo-medio.use-case';
import { ConsultarOrdensServicoUseCase } from './application/consultar-ordens-servico.use-case';
import { OrdemServicoConsultas } from './application/consultas';
import { GerenciarItensOrdemServicoUseCase } from './application/gerenciar-itens.use-case';
import { NotificadorCliente } from './application/notificador-cliente';
import { NotificarClientePolicy } from './application/notificar-cliente.policy';
import { OrdemServicoSuporte } from './application/ordem-servico.suporte';
import { ResponderOrcamentoUseCase } from './application/responder-orcamento.use-case';
import { OrdemServicoRepository } from './domain/ordem-servico.repository';
import { LogNotificadorCliente } from './infrastructure/log-notificador-cliente';
import { PrismaOrdemServicoConsultas } from './infrastructure/prisma-ordem-servico.consultas';
import { PrismaOrdemServicoRepository } from './infrastructure/prisma-ordem-servico.repository';
import { AcompanhamentoController } from './interfaces/http/acompanhamento.controller';
import { MetricasController } from './interfaces/http/metricas.controller';
import { OrdensServicoController } from './interfaces/http/ordens-servico.controller';

/**
 * Bounded Context de Atendimento (core domain). Consome Cadastro, Catálogo e Estoque
 * através dos serviços de aplicação exportados por esses módulos (relação cliente/fornecedor).
 */
@Module({
  imports: [CadastroModule, CatalogoModule, EstoqueModule],
  controllers: [OrdensServicoController, AcompanhamentoController, MetricasController],
  providers: [
    OrdemServicoSuporte,
    AbrirOrdemServicoUseCase,
    GerenciarItensOrdemServicoUseCase,
    AlterarStatusOrdemServicoUseCase,
    ResponderOrcamentoUseCase,
    ConsultarOrdensServicoUseCase,
    CalcularTempoMedioExecucaoUseCase,
    NotificarClientePolicy,
    { provide: OrdemServicoRepository, useClass: PrismaOrdemServicoRepository },
    { provide: OrdemServicoConsultas, useClass: PrismaOrdemServicoConsultas },
    { provide: NotificadorCliente, useClass: LogNotificadorCliente },
  ],
})
export class AtendimentoModule {}
