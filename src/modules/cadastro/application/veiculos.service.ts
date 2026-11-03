import { Injectable } from '@nestjs/common';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { Placa } from '../../../shared/domain/value-objects/placa';
import { ClienteRepository, VeiculoRepository } from '../domain/repositories';
import { DadosVeiculo, Veiculo } from '../domain/veiculo';
import { paraVeiculoView, VeiculoView } from './views';

@Injectable()
export class VeiculosService {
  constructor(
    private readonly veiculos: VeiculoRepository,
    private readonly clientes: ClienteRepository,
  ) {}

  async criar(input: DadosVeiculo): Promise<VeiculoView> {
    await this.garantirCliente(input.clienteId);
    const veiculo = Veiculo.criar(input);
    if (await this.veiculos.buscarPorPlaca(veiculo.placa.valor)) {
      throw new ConflitoError('Já existe um veículo com esta placa');
    }
    await this.veiculos.salvar(veiculo);
    return paraVeiculoView(veiculo);
  }

  async listar(filtro?: { clienteId?: string }): Promise<VeiculoView[]> {
    return (await this.veiculos.listar(filtro)).map(paraVeiculoView);
  }

  async obter(id: string): Promise<VeiculoView> {
    return paraVeiculoView(await this.buscar(id));
  }

  async buscarPorPlaca(placa: string): Promise<VeiculoView | null> {
    const veiculo = await this.veiculos.buscarPorPlaca(Placa.criar(placa).valor);
    return veiculo ? paraVeiculoView(veiculo) : null;
  }

  async atualizar(
    id: string,
    input: { clienteId?: string; marca?: string; modelo?: string; ano?: number },
  ): Promise<VeiculoView> {
    const veiculo = await this.buscar(id);
    if (input.clienteId && input.clienteId !== veiculo.clienteId)
      await this.garantirCliente(input.clienteId);
    veiculo.atualizar(input);
    await this.veiculos.salvar(veiculo);
    return paraVeiculoView(veiculo);
  }

  async remover(id: string): Promise<void> {
    await this.buscar(id);
    await this.veiculos.remover(id);
  }

  private async buscar(id: string): Promise<Veiculo> {
    const veiculo = await this.veiculos.buscarPorId(id);
    if (!veiculo) throw new RecursoNaoEncontradoError('Veículo', id);
    return veiculo;
  }

  private async garantirCliente(clienteId: string): Promise<void> {
    if (!(await this.clientes.buscarPorId(clienteId)))
      throw new RecursoNaoEncontradoError('Cliente', clienteId);
  }
}
