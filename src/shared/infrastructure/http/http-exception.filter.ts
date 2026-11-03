import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import {
  ConflitoError,
  CredenciaisInvalidasError,
  RecursoNaoEncontradoError,
} from '../../application/errors';
import { DomainError } from '../../domain/domain-error';

interface CorpoErro {
  statusCode: number;
  erro: string;
  mensagem: string | string[];
  codigo?: string;
}

/** Traduz erros de domínio, aplicação e persistência para respostas HTTP padronizadas. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const corpo = this.mapear(exception);
    if (corpo.statusCode >= 500) this.logger.error(exception);
    response.status(corpo.statusCode).json(corpo);
  }

  private mapear(exception: unknown): CorpoErro {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const mensagem =
        typeof res === 'object' && res !== null && 'message' in res
          ? (res as { message: string | string[] }).message
          : exception.message;
      return { statusCode: status, erro: HttpStatus[status] ?? 'Error', mensagem };
    }
    if (exception instanceof DomainError) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        erro: 'UNPROCESSABLE_ENTITY',
        mensagem: exception.message,
        codigo: exception.codigo,
      };
    }
    if (exception instanceof RecursoNaoEncontradoError) {
      return { statusCode: HttpStatus.NOT_FOUND, erro: 'NOT_FOUND', mensagem: exception.message };
    }
    if (exception instanceof ConflitoError) {
      return { statusCode: HttpStatus.CONFLICT, erro: 'CONFLICT', mensagem: exception.message };
    }
    if (exception instanceof CredenciaisInvalidasError) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        erro: 'UNAUTHORIZED',
        mensagem: exception.message,
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            erro: 'CONFLICT',
            mensagem: 'Registro duplicado',
          };
        case 'P2003':
          return {
            statusCode: HttpStatus.CONFLICT,
            erro: 'CONFLICT',
            mensagem: 'Operação viola um relacionamento existente (registro em uso)',
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            erro: 'NOT_FOUND',
            mensagem: 'Registro não encontrado',
          };
      }
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      erro: 'INTERNAL_SERVER_ERROR',
      mensagem: 'Erro interno inesperado',
    };
  }
}
