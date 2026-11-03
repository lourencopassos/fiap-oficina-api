import { randomInt } from 'node:crypto';
import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { DomainError } from '../../../shared/domain/domain-error';
import { Dinheiro } from '../../../shared/domain/value-objects/dinheiro';
import { criarEvento, EventosOrdemServico } from './eventos';
import { HistoricoStatus } from './historico-status';
import {
  DadosItemOrdemServico,
  ItemOrdemServico,
  TipoItemOrdemServico,
} from './item-ordem-servico';
import { Orcamento } from './orcamento';
import {
  DESCRICAO_STATUS,
  StatusOrdemServico,
  TRANSICOES_PERMITIDAS,
} from './status-ordem-servico';

export class TransicaoStatusInvalidaError extends DomainError {
  constructor(de: StatusOrdemServico, para: StatusOrdemServico) {
    super(
      `Transição de status inválida: "${DESCRICAO_STATUS[de]}" -> "${DESCRICAO_STATUS[para]}"`,
      'TRANSICAO_STATUS_INVALIDA',
    );
  }
}

interface OrdemServicoProps {
  codigo: string;
  clienteId: string;
  veiculoId: string;
  status: StatusOrdemServico;
  observacao?: string;
  itens: ItemOrdemServico[];
  orcamento?: Orcamento;
  historico: HistoricoStatus[];
  criadaEm: Date;
  inicioExecucao?: Date;
  fimExecucao?: Date;
  entregueEm?: Date;
}

export type DadosRestauracaoOrdemServico = OrdemServicoProps;

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos (0/O, 1/I)

/** Código público da OS, informado ao cliente para acompanhamento. Ex.: OS-7K3M9QX2 */
export const gerarCodigoOrdemServico = (): string =>
  'OS-' +
  Array.from({ length: 8 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join('');

/**
 * Agregado raiz do contexto de Atendimento. Toda mudança de status passa por aqui,
 * garantindo as regras de transição, o histórico e os eventos de domínio.
 */
export class OrdemServico extends AggregateRoot<OrdemServicoProps> {
  static abrir(
    dados: { clienteId: string; veiculoId: string; observacao?: string },
    agora: Date = new Date(),
  ): OrdemServico {
    const os = new OrdemServico({
      codigo: gerarCodigoOrdemServico(),
      clienteId: dados.clienteId,
      veiculoId: dados.veiculoId,
      status: StatusOrdemServico.RECEBIDA,
      observacao: dados.observacao?.trim() || undefined,
      itens: [],
      historico: [
        HistoricoStatus.registrar(StatusOrdemServico.RECEBIDA, agora, 'Ordem de serviço aberta'),
      ],
      criadaEm: agora,
    });
    os.registrarEvento(
      criarEvento(EventosOrdemServico.ABERTA, os.id, agora, {
        codigo: os.codigo,
        clienteId: os.clienteId,
        veiculoId: os.veiculoId,
      }),
    );
    os.registrarEvento(
      criarEvento(EventosOrdemServico.STATUS_ALTERADO, os.id, agora, {
        codigo: os.codigo,
        clienteId: os.clienteId,
        de: null,
        para: StatusOrdemServico.RECEBIDA,
      }),
    );
    return os;
  }

  static restaurar(id: string, dados: DadosRestauracaoOrdemServico): OrdemServico {
    return new OrdemServico(
      { ...dados, itens: [...dados.itens], historico: [...dados.historico] },
      id,
    );
  }

  // ---------- Leitura ----------

  get codigo(): string {
    return this.props.codigo;
  }
  get clienteId(): string {
    return this.props.clienteId;
  }
  get veiculoId(): string {
    return this.props.veiculoId;
  }
  get status(): StatusOrdemServico {
    return this.props.status;
  }
  get observacao(): string | undefined {
    return this.props.observacao;
  }
  get itens(): readonly ItemOrdemServico[] {
    return this.props.itens;
  }
  get orcamento(): Orcamento | undefined {
    return this.props.orcamento;
  }
  get historico(): readonly HistoricoStatus[] {
    return this.props.historico;
  }
  get criadaEm(): Date {
    return this.props.criadaEm;
  }
  get inicioExecucao(): Date | undefined {
    return this.props.inicioExecucao;
  }
  get fimExecucao(): Date | undefined {
    return this.props.fimExecucao;
  }
  get entregueEm(): Date | undefined {
    return this.props.entregueEm;
  }

  get valorTotalItens(): Dinheiro {
    return this.props.itens.reduce((acc, i) => acc.somar(i.subtotal), Dinheiro.zero());
  }

  /** Duração da execução (aprovação -> finalização) em minutos, se concluída. */
  get tempoExecucaoMinutos(): number | null {
    const { inicioExecucao, fimExecucao } = this.props;
    if (!inicioExecucao || !fimExecucao) return null;
    return Math.round((fimExecucao.getTime() - inicioExecucao.getTime()) / 60_000);
  }

  /** Peças/insumos a baixar do estoque, consolidados por peça. */
  pecasNecessarias(): { pecaId: string; quantidade: number }[] {
    return this.props.itens
      .filter((i) => i.tipo === TipoItemOrdemServico.PECA)
      .map((i) => ({ pecaId: i.referenciaId, quantidade: i.quantidade }));
  }

  // ---------- Comandos ----------

  iniciarDiagnostico(agora: Date = new Date(), observacao?: string): void {
    this.transicionar(
      StatusOrdemServico.EM_DIAGNOSTICO,
      agora,
      observacao ?? 'Diagnóstico iniciado',
    );
  }

  /**
   * Inclui serviço ou peça. Se a OS ainda estiver "Recebida", passa automaticamente
   * para "Em diagnóstico". Itens repetidos têm a quantidade somada.
   */
  adicionarItem(dados: DadosItemOrdemServico, agora: Date = new Date()): ItemOrdemServico {
    this.garantirItensEditaveis();
    if (this.props.status === StatusOrdemServico.RECEBIDA) this.iniciarDiagnostico(agora);

    const existente = this.props.itens.find((i) =>
      i.mesmaReferencia(dados.tipo, dados.referenciaId),
    );
    if (existente) {
      existente.acrescentar(dados.quantidade);
      return existente;
    }
    const item = ItemOrdemServico.criar(dados);
    this.props.itens.push(item);
    return item;
  }

  removerItem(itemId: string): void {
    this.garantirItensEditaveis();
    const indice = this.props.itens.findIndex((i) => i.id === itemId);
    if (indice < 0)
      throw new DomainError('Item não encontrado na ordem de serviço', 'ITEM_NAO_ENCONTRADO');
    this.props.itens.splice(indice, 1);
  }

  /** Gera o orçamento automaticamente a partir dos itens e o disponibiliza ao cliente. */
  enviarOrcamento(agora: Date = new Date()): Orcamento {
    this.exigirStatus(StatusOrdemServico.EM_DIAGNOSTICO, 'enviar o orçamento');
    const orcamento = Orcamento.gerar(this.props.itens, agora);
    this.props.orcamento = orcamento;
    this.transicionar(
      StatusOrdemServico.AGUARDANDO_APROVACAO,
      agora,
      'Orçamento enviado ao cliente para aprovação',
    );
    this.registrarEvento(
      criarEvento(EventosOrdemServico.ORCAMENTO_ENVIADO, this.id, agora, {
        codigo: this.codigo,
        clienteId: this.clienteId,
        valorTotalCentavos: orcamento.valorTotal.centavos,
      }),
    );
    return orcamento;
  }

  /** Aprovação do cliente: inicia a execução (a baixa de estoque é orquestrada pela aplicação). */
  aprovarOrcamento(agora: Date = new Date()): void {
    this.exigirStatus(StatusOrdemServico.AGUARDANDO_APROVACAO, 'aprovar o orçamento');
    this.props.orcamento = this.orcamentoAtual().aprovar(agora);
    this.props.inicioExecucao = agora;
    this.transicionar(
      StatusOrdemServico.EM_EXECUCAO,
      agora,
      'Orçamento aprovado pelo cliente; execução iniciada',
    );
    this.registrarEvento(
      criarEvento(EventosOrdemServico.ORCAMENTO_APROVADO, this.id, agora, {
        codigo: this.codigo,
        clienteId: this.clienteId,
        pecas: this.pecasNecessarias(),
      }),
    );
  }

  /** Rejeição do cliente: a OS é encerrada sem execução e o veículo segue para entrega. */
  rejeitarOrcamento(agora: Date = new Date(), motivo?: string): void {
    this.exigirStatus(StatusOrdemServico.AGUARDANDO_APROVACAO, 'rejeitar o orçamento');
    this.props.orcamento = this.orcamentoAtual().rejeitar(agora);
    const observacao = motivo?.trim()
      ? `Orçamento rejeitado pelo cliente: ${motivo.trim()}`
      : 'Orçamento rejeitado pelo cliente';
    this.transicionar(StatusOrdemServico.FINALIZADA, agora, observacao);
    this.registrarEvento(
      criarEvento(EventosOrdemServico.ORCAMENTO_REJEITADO, this.id, agora, {
        codigo: this.codigo,
        clienteId: this.clienteId,
        motivo: motivo?.trim() || null,
      }),
    );
  }

  finalizar(agora: Date = new Date(), observacao?: string): void {
    this.exigirStatus(StatusOrdemServico.EM_EXECUCAO, 'finalizar a ordem de serviço');
    this.props.fimExecucao = agora;
    this.transicionar(StatusOrdemServico.FINALIZADA, agora, observacao ?? 'Serviços concluídos');
  }

  entregar(agora: Date = new Date(), observacao?: string): void {
    this.exigirStatus(StatusOrdemServico.FINALIZADA, 'entregar o veículo');
    this.props.entregueEm = agora;
    this.transicionar(
      StatusOrdemServico.ENTREGUE,
      agora,
      observacao ?? 'Veículo entregue ao cliente',
    );
  }

  // ---------- Regras internas ----------

  private transicionar(novo: StatusOrdemServico, agora: Date, observacao?: string): void {
    const atual = this.props.status;
    if (!TRANSICOES_PERMITIDAS[atual].includes(novo))
      throw new TransicaoStatusInvalidaError(atual, novo);
    this.props.status = novo;
    this.props.historico.push(HistoricoStatus.registrar(novo, agora, observacao));
    this.registrarEvento(
      criarEvento(EventosOrdemServico.STATUS_ALTERADO, this.id, agora, {
        codigo: this.codigo,
        clienteId: this.clienteId,
        de: atual,
        para: novo,
      }),
    );
  }

  private exigirStatus(esperado: StatusOrdemServico, acao: string): void {
    if (this.props.status !== esperado) {
      throw new DomainError(
        `Não é possível ${acao} com a OS em "${DESCRICAO_STATUS[this.props.status]}" (esperado: "${DESCRICAO_STATUS[esperado]}")`,
        'STATUS_INCOMPATIVEL',
      );
    }
  }

  private garantirItensEditaveis(): void {
    const editaveis = [StatusOrdemServico.RECEBIDA, StatusOrdemServico.EM_DIAGNOSTICO];
    if (!editaveis.includes(this.props.status)) {
      throw new DomainError(
        `Itens só podem ser alterados antes do envio do orçamento (status atual: "${DESCRICAO_STATUS[this.props.status]}")`,
        'ITENS_NAO_EDITAVEIS',
      );
    }
  }

  private orcamentoAtual(): Orcamento {
    // Invariante: AGUARDANDO_APROVACAO sempre possui orçamento (gerado em enviarOrcamento).
    return this.props.orcamento as Orcamento;
  }
}
