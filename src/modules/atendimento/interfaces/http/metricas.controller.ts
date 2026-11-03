import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../identidade/domain/role';
import { Roles } from '../../../identidade/interfaces/http/decorators/roles.decorator';
import { CalcularTempoMedioExecucaoUseCase } from '../../application/calcular-tempo-medio.use-case';
import { PeriodoDto, TempoMedioExecucaoResponseDto } from './dto/ordem-servico.dto';

@ApiTags('Admin - Métricas')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/metricas')
export class MetricasController {
  constructor(private readonly tempoMedio: CalcularTempoMedioExecucaoUseCase) {}

  @Get('tempo-medio-execucao')
  @ApiOperation({
    summary: 'Tempo médio de execução dos serviços',
    description:
      'Média de (finalização - aprovação do orçamento) das OS concluídas, geral e por serviço.',
  })
  tempoMedioExecucao(@Query() periodo: PeriodoDto): Promise<TempoMedioExecucaoResponseDto> {
    return this.tempoMedio.executar(periodo);
  }
}
