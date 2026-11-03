import { StatusOrdemServico } from '../domain/status-ordem-servico';

export interface FiltroOrdensServico {
  status?: StatusOrdemServico[];
  clienteId?: string;
  veiculoId?: string;
}

export interface ResumoOrdemServico {
  id: string;
  codigo: string;
  status: StatusOrdemServico;
  cliente: { id: string; nome: string };
  veiculo: { id: string; placa: string; modelo: string };
  valorTotalCentavos: number;
  criadaEm: Date;
  atualizadaEm: Date;
}

export interface ExecucaoConcluida {
  ordemServicoId: string;
  inicioExecucao: Date;
  fimExecucao: Date;
  servicos: { servicoId: string; descricao: string }[];
}

/** Consultas de leitura (lado "query"), otimizadas e sem reconstruir agregados. */
export abstract class OrdemServicoConsultas {
  abstract listar(filtro: FiltroOrdensServico): Promise<ResumoOrdemServico[]>;
  abstract listarExecucoesConcluidas(periodo: {
    de?: Date;
    ate?: Date;
  }): Promise<ExecucaoConcluida[]>;
}
