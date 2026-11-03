import { Injectable } from '@nestjs/common';
import { RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { PublicadorEventos } from '../../../shared/application/publicador-eventos';
import { UnidadeDeTrabalho } from '../../../shared/application/unidade-de-trabalho';
import { DomainError } from '../../../shared/domain/domain-error';
import { Documento } from '../../../shared/domain/value-objects/documento';
import { ClientesService } from '../../cadastro/application/clientes.service';
import { VeiculosService } from '../../cadastro/application/veiculos.service';
import { ServicosService } from '../../catalogo/application/servicos.service';
import { PecasService } from '../../estoque/application/pecas.service';
import { DadosItemOrdemServico, TipoItemOrdemServico } from '../domain/item-ordem-servico';
import { OrdemServico } from '../domain/ordem-servico';
import { OrdemServicoRepository } from '../domain/ordem-servico.repository';
import {
  AcompanhamentoView,
  OrdemServicoView,
  paraAcompanhamentoView,
  paraOrdemServicoView,
} from './ordem-servico.view';

/** Credenciais do cliente para agir sobre a própria OS sem login: código da OS + CPF/CNPJ. */
export interface IdentificacaoCliente {
  codigo: string;
  documento: string;
}

/**
 * Infra de aplicação compartilhada pelos casos de uso da OS: carregar o agregado,
 * executar o comando numa transação, persistir, publicar eventos após o commit
 * e montar a visão de resposta. Também resolve itens a partir do catálogo e do estoque.
 */
@Injectable()
export class OrdemServicoSuporte {
  constructor(
    readonly repositorio: OrdemServicoRepository,
    private readonly uow: UnidadeDeTrabalho,
    private readonly publicador: PublicadorEventos,
    readonly clientes: ClientesService,
    readonly veiculos: VeiculosService,
    private readonly servicos: ServicosService,
    private readonly pecas: PecasService,
  ) {}

  async buscarPorId(id: string): Promise<OrdemServico> {
    const os = await this.repositorio.buscarPorId(id);
    if (!os) throw new RecursoNaoEncontradoError('Ordem de serviço', id);
    return os;
  }

  /** Executa `comando` sobre a OS carregada por `carregar`, tudo numa única transação. */
  async executarComando(
    carregar: () => Promise<OrdemServico>,
    comando: (os: OrdemServico) => void | Promise<void>,
  ): Promise<OrdemServico> {
    const os = await this.uow.executar(async () => {
      const os = await carregar();
      await comando(os);
      await this.repositorio.salvar(os);
      return os;
    });
    await this.publicar(os);
    return os;
  }

  /**
   * Localiza a OS pelo código e confere se o documento informado é do cliente dono.
   * Qualquer divergência responde 404, para não revelar a existência de OS de terceiros.
   */
  async localizarParaCliente({ codigo, documento }: IdentificacaoCliente): Promise<OrdemServico> {
    const naoEncontrada = new RecursoNaoEncontradoError('Ordem de serviço', codigo);
    if (!Documento.ehValido(documento)) throw naoEncontrada;
    const os = await this.repositorio.buscarPorCodigo((codigo ?? '').trim().toUpperCase());
    if (!os) throw naoEncontrada;
    const cliente = await this.clientes.obter(os.clienteId);
    if (!Documento.criar(cliente.documento).equals(Documento.criar(documento))) throw naoEncontrada;
    return os;
  }

  async publicar(os: OrdemServico): Promise<void> {
    await this.publicador.publicar(os.extrairEventos());
  }

  async executar<T>(trabalho: () => Promise<T>): Promise<T> {
    return this.uow.executar(trabalho);
  }

  async montarView(os: OrdemServico): Promise<OrdemServicoView> {
    const [cliente, veiculo] = await Promise.all([
      this.clientes.obter(os.clienteId),
      this.veiculos.obter(os.veiculoId),
    ]);
    return paraOrdemServicoView(os, cliente, veiculo);
  }

  async montarAcompanhamento(os: OrdemServico): Promise<AcompanhamentoView> {
    const [cliente, veiculo] = await Promise.all([
      this.clientes.obter(os.clienteId),
      this.veiculos.obter(os.veiculoId),
    ]);
    return paraAcompanhamentoView(
      os,
      { nome: cliente.nome, documentoMascarado: Documento.criar(cliente.documento).mascarado },
      veiculo,
    );
  }

  /** Serviço do catálogo com preço vigente (snapshot). Serviços inativos não podem ser incluídos. */
  async itemDeServico(servicoId: string, quantidade = 1): Promise<DadosItemOrdemServico> {
    const servico = await this.servicos.obter(servicoId);
    if (!servico.ativo)
      throw new DomainError(`Serviço "${servico.nome}" está inativo`, 'SERVICO_INATIVO');
    return {
      tipo: TipoItemOrdemServico.SERVICO,
      referenciaId: servico.id,
      descricao: servico.nome,
      quantidade,
      precoUnitarioCentavos: servico.precoCentavos,
    };
  }

  /** Peça/insumo com preço vigente. O saldo é verificado e baixado somente na aprovação. */
  async itemDePeca(pecaId: string, quantidade: number): Promise<DadosItemOrdemServico> {
    const peca = await this.pecas.obter(pecaId);
    return {
      tipo: TipoItemOrdemServico.PECA,
      referenciaId: peca.id,
      descricao: peca.nome,
      quantidade,
      precoUnitarioCentavos: peca.precoCentavos,
    };
  }
}
