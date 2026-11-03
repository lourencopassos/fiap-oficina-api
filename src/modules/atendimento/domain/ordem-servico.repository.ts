import { OrdemServico } from './ordem-servico';

export abstract class OrdemServicoRepository {
  abstract buscarPorId(id: string): Promise<OrdemServico | null>;
  abstract buscarPorCodigo(codigo: string): Promise<OrdemServico | null>;
  abstract salvar(os: OrdemServico): Promise<void>;
}
