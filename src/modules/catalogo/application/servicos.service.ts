import { Injectable } from '@nestjs/common';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { DadosServico, Servico } from '../domain/servico';
import { ServicoRepository } from '../domain/servico.repository';

export interface ServicoView {
  id: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  preco: number;
  tempoEstimadoMinutos: number | null;
  ativo: boolean;
}

export const paraServicoView = (s: Servico): ServicoView => ({
  id: s.id,
  nome: s.nome,
  descricao: s.descricao ?? null,
  precoCentavos: s.preco.centavos,
  preco: s.preco.reais,
  tempoEstimadoMinutos: s.tempoEstimadoMinutos ?? null,
  ativo: s.ativo,
});

@Injectable()
export class ServicosService {
  constructor(private readonly servicos: ServicoRepository) {}

  async criar(input: DadosServico): Promise<ServicoView> {
    const servico = Servico.criar(input);
    await this.garantirNomeUnico(servico.nome);
    await this.servicos.salvar(servico);
    return paraServicoView(servico);
  }

  async listar(filtro?: { apenasAtivos?: boolean }): Promise<ServicoView[]> {
    return (await this.servicos.listar(filtro)).map(paraServicoView);
  }

  async obter(id: string): Promise<ServicoView> {
    return paraServicoView(await this.buscar(id));
  }

  async atualizar(id: string, input: Partial<DadosServico>): Promise<ServicoView> {
    const servico = await this.buscar(id);
    if (input.nome && input.nome.trim() !== servico.nome)
      await this.garantirNomeUnico(input.nome.trim());
    servico.atualizar(input);
    await this.servicos.salvar(servico);
    return paraServicoView(servico);
  }

  async remover(id: string): Promise<void> {
    await this.buscar(id);
    await this.servicos.remover(id);
  }

  private async buscar(id: string): Promise<Servico> {
    const servico = await this.servicos.buscarPorId(id);
    if (!servico) throw new RecursoNaoEncontradoError('Serviço', id);
    return servico;
  }

  private async garantirNomeUnico(nome: string): Promise<void> {
    if (await this.servicos.buscarPorNome(nome))
      throw new ConflitoError('Já existe um serviço com este nome');
  }
}
