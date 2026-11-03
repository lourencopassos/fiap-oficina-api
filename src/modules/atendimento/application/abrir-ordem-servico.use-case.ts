import { Injectable } from '@nestjs/common';
import { ConflitoError } from '../../../shared/application/errors';
import { DomainError } from '../../../shared/domain/domain-error';
import { VeiculoView } from '../../cadastro/application/views';
import { OrdemServico } from '../domain/ordem-servico';
import { OrdemServicoSuporte } from './ordem-servico.suporte';
import { OrdemServicoView, paraOrdemServicoView } from './ordem-servico.view';

export interface AbrirOrdemServicoInput {
  /** CPF/CNPJ do cliente já cadastrado. */
  documentoCliente: string;
  /** Veículo pela placa; se ainda não existir, marca/modelo/ano são obrigatórios para cadastrá-lo. */
  veiculo: { placa: string; marca?: string; modelo?: string; ano?: number };
  servicos?: { servicoId: string; quantidade?: number }[];
  pecas?: { pecaId: string; quantidade: number }[];
  observacao?: string;
}

/**
 * Criação da OS: identifica o cliente pelo documento, localiza ou cadastra o veículo
 * e inclui serviços/peças. Tudo numa única transação.
 */
@Injectable()
export class AbrirOrdemServicoUseCase {
  constructor(private readonly suporte: OrdemServicoSuporte) {}

  async executar(input: AbrirOrdemServicoInput): Promise<OrdemServicoView> {
    const { os, cliente, veiculo } = await this.suporte.executar(async () => {
      const cliente = await this.suporte.clientes.obterPorDocumento(input.documentoCliente);
      const veiculo = await this.localizarOuCadastrarVeiculo(cliente.id, input.veiculo);

      const os = OrdemServico.abrir({
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        observacao: input.observacao,
      });
      for (const s of input.servicos ?? [])
        os.adicionarItem(await this.suporte.itemDeServico(s.servicoId, s.quantidade ?? 1));
      for (const p of input.pecas ?? [])
        os.adicionarItem(await this.suporte.itemDePeca(p.pecaId, p.quantidade));

      await this.suporte.repositorio.salvar(os);
      return { os, cliente, veiculo };
    });
    await this.suporte.publicar(os);
    return paraOrdemServicoView(os, cliente, veiculo);
  }

  private async localizarOuCadastrarVeiculo(
    clienteId: string,
    dados: AbrirOrdemServicoInput['veiculo'],
  ): Promise<VeiculoView> {
    const existente = await this.suporte.veiculos.buscarPorPlaca(dados.placa);
    if (existente) {
      if (existente.clienteId !== clienteId) {
        throw new ConflitoError('Veículo com esta placa está cadastrado para outro cliente');
      }
      return existente;
    }
    if (!dados.marca || !dados.modelo || dados.ano === undefined) {
      throw new DomainError(
        'Veículo não cadastrado: informe marca, modelo e ano para cadastrá-lo',
        'VEICULO_INCOMPLETO',
      );
    }
    return this.suporte.veiculos.criar({
      clienteId,
      placa: dados.placa,
      marca: dados.marca,
      modelo: dados.modelo,
      ano: dados.ano,
    });
  }
}
