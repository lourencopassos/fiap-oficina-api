import { DomainError } from '../../../shared/domain/domain-error';
import { Entity } from '../../../shared/domain/entity';
import { Dinheiro } from '../../../shared/domain/value-objects/dinheiro';

interface ServicoProps {
  nome: string;
  descricao?: string;
  preco: Dinheiro;
  tempoEstimadoMinutos?: number;
  ativo: boolean;
}

export interface DadosServico {
  nome: string;
  descricao?: string | null;
  precoCentavos: number;
  tempoEstimadoMinutos?: number | null;
  ativo?: boolean;
}

/** Serviço oferecido pela oficina (ex.: troca de óleo, alinhamento), com preço de tabela. */
export class Servico extends Entity<ServicoProps> {
  static criar(dados: DadosServico): Servico {
    return new Servico(Servico.montar({ ...dados, ativo: dados.ativo ?? true }));
  }

  static restaurar(id: string, dados: DadosServico): Servico {
    return new Servico(Servico.montar(dados), id);
  }

  get nome(): string {
    return this.props.nome;
  }
  get descricao(): string | undefined {
    return this.props.descricao;
  }
  get preco(): Dinheiro {
    return this.props.preco;
  }
  get tempoEstimadoMinutos(): number | undefined {
    return this.props.tempoEstimadoMinutos;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }

  atualizar(dados: Partial<DadosServico>): void {
    this.props = Servico.montar({
      nome: dados.nome ?? this.props.nome,
      descricao: dados.descricao === undefined ? this.props.descricao : dados.descricao,
      precoCentavos: dados.precoCentavos ?? this.props.preco.centavos,
      tempoEstimadoMinutos:
        dados.tempoEstimadoMinutos === undefined
          ? this.props.tempoEstimadoMinutos
          : dados.tempoEstimadoMinutos,
      ativo: dados.ativo ?? this.props.ativo,
    });
  }

  private static montar(dados: DadosServico): ServicoProps {
    const nome = (dados.nome ?? '').trim();
    if (nome.length < 2) throw new DomainError('Nome do serviço é obrigatório');
    const tempo = dados.tempoEstimadoMinutos ?? undefined;
    if (tempo !== undefined && (!Number.isInteger(tempo) || tempo <= 0)) {
      throw new DomainError('Tempo estimado deve ser um número inteiro positivo de minutos');
    }
    return {
      nome,
      descricao: dados.descricao?.trim() || undefined,
      preco: Dinheiro.deCentavos(dados.precoCentavos),
      tempoEstimadoMinutos: tempo,
      ativo: dados.ativo ?? true,
    };
  }
}
