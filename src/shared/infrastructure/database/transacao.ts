import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaService } from './prisma.service';

/**
 * Host de transação usado pelos repositórios: `txHost.tx` devolve o cliente
 * da transação ativa (se houver) ou o PrismaClient padrão.
 */
export type PrismaTxHost = TransactionHost<TransactionalAdapterPrisma<PrismaService>>;
export const PrismaTxHost = TransactionHost;
