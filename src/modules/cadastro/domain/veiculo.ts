import { DomainError } from '../../../shared/domain/domain-error';
import { Entity } from '../../../shared/domain/entity';
import { Placa } from '../../../shared/domain/value-objects/placa';

interface VeiculoProps {
  clienteId: string;
  placa: Placa;
  marca: string;
  modelo: string;
  ano: number;
}

export interface DadosVeiculo {
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export const ANO_MINIMO_VEICULO = 1900;

export class Veiculo extends Entity<VeiculoProps> {
  static criar(dados: DadosVeiculo, agora: Date = new Date()): Veiculo {
    return new Veiculo(Veiculo.montar(dados, agora));
  }

  static restaurar(id: string, dados: DadosVeiculo): Veiculo {
    return new Veiculo({ ...dados, placa: Placa.criar(dados.placa) }, id);
  }

  get clienteId(): string {
    return this.props.clienteId;
  }
  get placa(): Placa {
    return this.props.placa;
  }
  get marca(): string {
    return this.props.marca;
  }
  get modelo(): string {
    return this.props.modelo;
  }
  get ano(): number {
    return this.props.ano;
  }

  /** A placa identifica o veículo e não pode ser alterada; a troca de dono é permitida. */
  atualizar(
    dados: { clienteId?: string; marca?: string; modelo?: string; ano?: number },
    agora: Date = new Date(),
  ): void {
    this.props = Veiculo.montar(
      {
        clienteId: dados.clienteId ?? this.props.clienteId,
        placa: this.props.placa.valor,
        marca: dados.marca ?? this.props.marca,
        modelo: dados.modelo ?? this.props.modelo,
        ano: dados.ano ?? this.props.ano,
      },
      agora,
    );
  }

  pertenceA(clienteId: string): boolean {
    return this.props.clienteId === clienteId;
  }

  private static montar(dados: DadosVeiculo, agora: Date): VeiculoProps {
    const marca = (dados.marca ?? '').trim();
    const modelo = (dados.modelo ?? '').trim();
    if (!marca) throw new DomainError('Marca do veículo é obrigatória');
    if (!modelo) throw new DomainError('Modelo do veículo é obrigatório');
    const anoMaximo = agora.getFullYear() + 1;
    if (!Number.isInteger(dados.ano) || dados.ano < ANO_MINIMO_VEICULO || dados.ano > anoMaximo) {
      throw new DomainError(`Ano do veículo deve estar entre ${ANO_MINIMO_VEICULO} e ${anoMaximo}`);
    }
    return {
      clienteId: dados.clienteId,
      placa: Placa.criar(dados.placa),
      marca,
      modelo,
      ano: dados.ano,
    };
  }
}
