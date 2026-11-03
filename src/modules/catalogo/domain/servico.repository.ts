import { Servico } from './servico';

export abstract class ServicoRepository {
  abstract buscarPorId(id: string): Promise<Servico | null>;
  abstract buscarPorNome(nome: string): Promise<Servico | null>;
  abstract listar(filtro?: { apenasAtivos?: boolean }): Promise<Servico[]>;
  abstract salvar(servico: Servico): Promise<void>;
  abstract remover(id: string): Promise<void>;
}
