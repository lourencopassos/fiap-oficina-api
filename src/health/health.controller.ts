import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../modules/identidade/interfaces/http/decorators/public.decorator';
import { PrismaService } from '../shared/infrastructure/database/prisma.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Verifica se a API e o banco estão disponíveis' })
  async verificar(): Promise<{ status: string; banco: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', banco: 'ok' };
  }
}
