import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../../identidade/interfaces/http/decorators/public.decorator';
import { ConsultarOrdensServicoUseCase } from '../../application/consultar-ordens-servico.use-case';
import { ResponderOrcamentoUseCase } from '../../application/responder-orcamento.use-case';
import {
  AcompanhamentoResponseDto,
  IdentificacaoClienteDto,
  RejeicaoPeloClienteDto,
} from './dto/ordem-servico.dto';

/**
 * API pública do cliente: sem JWT, autorizada pelo par código da OS + CPF/CNPJ do titular.
 * Protegida por rate limit contra enumeração.
 */
@ApiTags('Público - Acompanhamento do Cliente')
@Public()
@UseGuards(ThrottlerGuard)
@Controller('public/ordens-servico')
export class AcompanhamentoController {
  constructor(
    private readonly consultas: ConsultarOrdensServicoUseCase,
    private readonly orcamento: ResponderOrcamentoUseCase,
  ) {}

  @Get(':codigo')
  @ApiOperation({ summary: 'Consulta o andamento da OS (status, orçamento e linha do tempo)' })
  @ApiNotFoundResponse({ description: 'OS inexistente ou documento não confere' })
  acompanhar(
    @Param('codigo') codigo: string,
    @Query() { documento }: IdentificacaoClienteDto,
  ): Promise<AcompanhamentoResponseDto> {
    return this.consultas.acompanhar({ codigo, documento });
  }

  @Post(':codigo/orcamento/aprovar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cliente aprova o orçamento; a execução é iniciada' })
  aprovar(
    @Param('codigo') codigo: string,
    @Body() { documento }: IdentificacaoClienteDto,
  ): Promise<AcompanhamentoResponseDto> {
    return this.orcamento.aprovarPeloCliente({ codigo, documento });
  }

  @Post(':codigo/orcamento/rejeitar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cliente rejeita o orçamento; a OS é encerrada sem execução' })
  rejeitar(
    @Param('codigo') codigo: string,
    @Body() { documento, motivo }: RejeicaoPeloClienteDto,
  ): Promise<AcompanhamentoResponseDto> {
    return this.orcamento.rejeitarPeloCliente({ codigo, documento }, motivo);
  }
}
