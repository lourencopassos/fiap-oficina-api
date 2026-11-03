import { Cliente } from './cliente';
import { Veiculo } from './veiculo';

export abstract class ClienteRepository {
  abstract buscarPorId(id: string): Promise<Cliente | null>;
  abstract buscarPorDocumento(documento: string): Promise<Cliente | null>;
  abstract listar(filtro?: { nome?: string }): Promise<Cliente[]>;
  abstract salvar(cliente: Cliente): Promise<void>;
  abstract remover(id: string): Promise<void>;
}

export abstract class VeiculoRepository {
  abstract buscarPorId(id: string): Promise<Veiculo | null>;
  abstract buscarPorPlaca(placa: string): Promise<Veiculo | null>;
  abstract listar(filtro?: { clienteId?: string }): Promise<Veiculo[]>;
  abstract salvar(veiculo: Veiculo): Promise<void>;
  abstract remover(id: string): Promise<void>;
}
