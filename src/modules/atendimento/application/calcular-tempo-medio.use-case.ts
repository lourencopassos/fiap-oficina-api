import { Injectable } from '@nestjs/common';
import { ExecucaoConcluida, OrdemServicoConsultas } from './consultas';

export interface TempoMedioPorServico {
  servicoId: string;
  servico: string;
  quantidadeOrdens: number;
  tempoMedioMinutos: number;
}

export interface TempoMedioExecucaoView {
  periodo: { de: Date | null; ate: Date | null };
  totalOrdensConsideradas: number;
  tempoMedioMinutos: number | null;
  porServico: TempoMedioPorServico[];
}

const minutos = (e: ExecucaoConcluida): number =>
  (e.fimExecucao.getTime() - e.inicioExecucao.getTime()) / 60_000;
const media = (valores: number[]): number =>
  Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);

/**
 * Tempo médio de execução = média de (finalização - aprovação) das OS concluídas.
 * Na visão por serviço, cada OS contribui com sua duração total para cada serviço que contém.
 */
export const calcularTempoMedio = (
  execucoes: ExecucaoConcluida[],
): Omit<TempoMedioExecucaoView, 'periodo'> => {
  const porServico = new Map<string, { nome: string; duracoes: number[] }>();
  for (const e of execucoes) {
    for (const s of e.servicos) {
      const acc = porServico.get(s.servicoId) ?? { nome: s.descricao, duracoes: [] };
      acc.duracoes.push(minutos(e));
      porServico.set(s.servicoId, acc);
    }
  }
  return {
    totalOrdensConsideradas: execucoes.length,
    tempoMedioMinutos: execucoes.length ? media(execucoes.map(minutos)) : null,
    porServico: [...porServico.entries()]
      .map(([servicoId, { nome, duracoes }]) => ({
        servicoId,
        servico: nome,
        quantidadeOrdens: duracoes.length,
        tempoMedioMinutos: media(duracoes),
      }))
      .sort(
        (a, b) => b.quantidadeOrdens - a.quantidadeOrdens || a.servico.localeCompare(b.servico),
      ),
  };
};

@Injectable()
export class CalcularTempoMedioExecucaoUseCase {
  constructor(private readonly consultas: OrdemServicoConsultas) {}

  async executar(periodo: { de?: Date; ate?: Date } = {}): Promise<TempoMedioExecucaoView> {
    const execucoes = await this.consultas.listarExecucoesConcluidas(periodo);
    return {
      periodo: { de: periodo.de ?? null, ate: periodo.ate ?? null },
      ...calcularTempoMedio(execucoes),
    };
  }
}
