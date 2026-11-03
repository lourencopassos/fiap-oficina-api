import { Injectable } from '@nestjs/common';
import { UnidadeDeTrabalho } from '../../application/unidade-de-trabalho';
import { PrismaTxHost } from './transacao';

@Injectable()
export class PrismaUnidadeDeTrabalho extends UnidadeDeTrabalho {
  constructor(private readonly txHost: PrismaTxHost) {
    super();
  }

  executar<T>(trabalho: () => Promise<T>): Promise<T> {
    return this.txHost.withTransaction(trabalho);
  }
}
