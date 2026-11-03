import {
  CPF_VALIDO,
  CPF_VALIDO_2,
  FakeNotificadorCliente,
  FakeOrdemServicoConsultas,
  FakePublicadorEventos,
  FakeUnidadeDeTrabalho,
  InMemoryClienteRepository,
  InMemoryOrdemServicoRepository,
  InMemoryPecaRepository,
  InMemoryServicoRepository,
  InMemoryVeiculoRepository,
} from '@test/fakes';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { DomainError } from '../../../shared/domain/domain-error';
import { ClientesService } from '../../cadastro/application/clientes.service';
import { VeiculosService } from '../../cadastro/application/veiculos.service';
import { ServicosService } from '../../catalogo/application/servicos.service';
import { EstoqueService } from '../../estoque/application/estoque.service';
import { PecasService } from '../../estoque/application/pecas.service';
import { EstoqueInsuficienteError, TipoPeca } from '../../estoque/domain/peca';
import { EventosOrdemServico } from '../domain/eventos';
import { StatusOrcamento } from '../domain/orcamento';
import { StatusOrdemServico as S } from '../domain/status-ordem-servico';
import { AbrirOrdemServicoUseCase } from './abrir-ordem-servico.use-case';
import { AlterarStatusOrdemServicoUseCase } from './alterar-status.use-case';
import {
  calcularTempoMedio,
  CalcularTempoMedioExecucaoUseCase,
} from './calcular-tempo-medio.use-case';
import { ConsultarOrdensServicoUseCase } from './consultar-ordens-servico.use-case';
import { GerenciarItensOrdemServicoUseCase } from './gerenciar-itens.use-case';
import { NotificarClientePolicy } from './notificar-cliente.policy';
import { OrdemServicoSuporte } from './ordem-servico.suporte';
import { ResponderOrcamentoUseCase } from './responder-orcamento.use-case';

/** Monta o contexto de Atendimento com todos os colaboradores reais e repositórios em memória. */
function montarContexto() {
  const clientesRepo = new InMemoryClienteRepository();
  const veiculosRepo = new InMemoryVeiculoRepository();
  const pecasRepo = new InMemoryPecaRepository();
  const osRepo = new InMemoryOrdemServicoRepository();
  const uow = new FakeUnidadeDeTrabalho();
  const publicador = new FakePublicadorEventos();
  const consultasFake = new FakeOrdemServicoConsultas();

  const clientes = new ClientesService(clientesRepo);
  const veiculos = new VeiculosService(veiculosRepo, clientesRepo);
  const servicos = new ServicosService(new InMemoryServicoRepository());
  const pecas = new PecasService(pecasRepo);
  const estoque = new EstoqueService(pecasRepo, uow);
  const suporte = new OrdemServicoSuporte(
    osRepo,
    uow,
    publicador,
    clientes,
    veiculos,
    servicos,
    pecas,
  );

  return {
    clientes,
    veiculos,
    servicos,
    pecas,
    osRepo,
    uow,
    publicador,
    consultasFake,
    abrir: new AbrirOrdemServicoUseCase(suporte),
    itens: new GerenciarItensOrdemServicoUseCase(suporte),
    status: new AlterarStatusOrdemServicoUseCase(suporte),
    orcamento: new ResponderOrcamentoUseCase(suporte, estoque),
    consultas: new ConsultarOrdensServicoUseCase(suporte, consultasFake),
    metricas: new CalcularTempoMedioExecucaoUseCase(consultasFake),
  };
}

describe('Atendimento - casos de uso da Ordem de Serviço', () => {
  let ctx: ReturnType<typeof montarContexto>;
  let clienteId: string;
  let trocaOleoId: string;
  let alinhamentoId: string;
  let filtroId: string;

  beforeEach(async () => {
    ctx = montarContexto();
    clienteId = (await ctx.clientes.criar({ nome: 'João', documento: CPF_VALIDO })).id;
    trocaOleoId = (await ctx.servicos.criar({ nome: 'Troca de óleo', precoCentavos: 8000 })).id;
    alinhamentoId = (await ctx.servicos.criar({ nome: 'Alinhamento', precoCentavos: 12000 })).id;
    filtroId = (
      await ctx.pecas.criar({
        codigo: 'FLT',
        nome: 'Filtro de óleo',
        tipo: TipoPeca.PECA,
        unidade: 'UN',
        precoCentavos: 3500,
        quantidadeEstoque: 5,
      })
    ).id;
  });

  const abrirComItens = (pecasQtd = 2) =>
    ctx.abrir.executar({
      documentoCliente: '529.982.247-25',
      veiculo: { placa: 'BRA2E19', marca: 'VW', modelo: 'Gol', ano: 2020 },
      servicos: [{ servicoId: trocaOleoId }],
      pecas: [{ pecaId: filtroId, quantidade: pecasQtd }],
      observacao: 'Revisão',
    });

  const saldoFiltro = async () => (await ctx.pecas.obter(filtroId)).quantidadeEstoque;

  describe('AbrirOrdemServicoUseCase', () => {
    it('identifica cliente por documento, cadastra veículo e inclui itens com preço do catálogo', async () => {
      const os = await abrirComItens();
      expect(os.status).toBe(S.EM_DIAGNOSTICO);
      expect(os.cliente).toEqual({ id: clienteId, nome: 'João', documento: '529.982.247-25' });
      expect(os.veiculo).toMatchObject({ placa: 'BRA2E19', marca: 'VW' });
      expect(os.itens.map((i) => [i.descricao, i.quantidade, i.subtotalCentavos])).toEqual([
        ['Troca de óleo', 1, 8000],
        ['Filtro de óleo', 2, 7000],
      ]);
      expect(os.valorTotalItensCentavos).toBe(15000);
      expect(ctx.uow.execucoes).toBe(1);
      expect(ctx.publicador.nomes()).toContain(EventosOrdemServico.ABERTA);
    });

    it('reutiliza veículo já cadastrado do mesmo cliente', async () => {
      const v = await ctx.veiculos.criar({
        clienteId,
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
      });
      const os = await ctx.abrir.executar({
        documentoCliente: CPF_VALIDO,
        veiculo: { placa: 'abc-1234' },
      });
      expect(os.veiculo.id).toBe(v.id);
      expect(os.status).toBe(S.RECEBIDA);
      expect(os.itens).toEqual([]);
    });

    it('recusa veículo de outro cliente', async () => {
      const outro = await ctx.clientes.criar({ nome: 'Maria', documento: CPF_VALIDO_2 });
      await ctx.veiculos.criar({
        clienteId: outro.id,
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
      });
      await expect(
        ctx.abrir.executar({ documentoCliente: CPF_VALIDO, veiculo: { placa: 'ABC1234' } }),
      ).rejects.toBeInstanceOf(ConflitoError);
    });

    it('exige dados do veículo novo', async () => {
      await expect(
        ctx.abrir.executar({ documentoCliente: CPF_VALIDO, veiculo: { placa: 'ABC1234' } }),
      ).rejects.toThrow('informe marca, modelo e ano');
    });

    it('exige cliente cadastrado', async () => {
      await expect(
        ctx.abrir.executar({
          documentoCliente: '11.222.333/0001-81',
          veiculo: { placa: 'ABC1234' },
        }),
      ).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
    });

    it('não permite serviço inativo', async () => {
      await ctx.servicos.atualizar(trocaOleoId, { ativo: false });
      await expect(abrirComItens()).rejects.toThrow('inativo');
    });
  });

  describe('GerenciarItensOrdemServicoUseCase', () => {
    it('adiciona serviços e peças, e remove itens', async () => {
      const aberta = await ctx.abrir.executar({
        documentoCliente: CPF_VALIDO,
        veiculo: { placa: 'BRA2E19', marca: 'VW', modelo: 'Gol', ano: 2020 },
      });
      let os = await ctx.itens.adicionarServico(aberta.id, alinhamentoId);
      expect(os.status).toBe(S.EM_DIAGNOSTICO);
      os = await ctx.itens.adicionarPeca(aberta.id, filtroId, 1);
      expect(os.itens).toHaveLength(2);
      os = await ctx.itens.removerItem(aberta.id, os.itens[0].id);
      expect(os.itens).toHaveLength(1);
    });

    it('retorna 404 para OS inexistente', async () => {
      await expect(ctx.itens.adicionarServico('nao-existe', trocaOleoId)).rejects.toBeInstanceOf(
        RecursoNaoEncontradoError,
      );
    });
  });

  describe('fluxo de orçamento e status', () => {
    it('ciclo completo: envio, aprovação com baixa de estoque, finalização e entrega', async () => {
      const aberta = await abrirComItens(2);

      const aguardando = await ctx.status.enviarOrcamento(aberta.id);
      expect(aguardando.status).toBe(S.AGUARDANDO_APROVACAO);
      expect(aguardando.orcamento).toMatchObject({
        status: StatusOrcamento.PENDENTE,
        valorTotalCentavos: 15000,
        valorTotal: 150,
      });

      const execucao = await ctx.orcamento.aprovarPorId(aberta.id);
      expect(execucao.status).toBe(S.EM_EXECUCAO);
      expect(await saldoFiltro()).toBe(3);

      const finalizada = await ctx.status.finalizar(aberta.id, 'OK');
      expect(finalizada.status).toBe(S.FINALIZADA);
      expect(finalizada.tempoExecucaoMinutos).toBe(0);

      const entregue = await ctx.status.entregar(aberta.id);
      expect(entregue.status).toBe(S.ENTREGUE);
      expect(entregue.historico).toHaveLength(6);
      expect(ctx.publicador.nomes()).toEqual(
        expect.arrayContaining([
          EventosOrdemServico.ORCAMENTO_ENVIADO,
          EventosOrdemServico.ORCAMENTO_APROVADO,
        ]),
      );
    });

    it('iniciar diagnóstico manualmente', async () => {
      const aberta = await ctx.abrir.executar({
        documentoCliente: CPF_VALIDO,
        veiculo: { placa: 'BRA2E19', marca: 'VW', modelo: 'Gol', ano: 2020 },
      });
      expect((await ctx.status.iniciarDiagnostico(aberta.id, 'Analisando')).status).toBe(
        S.EM_DIAGNOSTICO,
      );
    });

    it('aprovação falha sem estoque e não altera a OS', async () => {
      const aberta = await abrirComItens(9);
      await ctx.status.enviarOrcamento(aberta.id);
      const salvamentosAntes = ctx.osRepo.salvamentos;

      await expect(ctx.orcamento.aprovarPorId(aberta.id)).rejects.toBeInstanceOf(
        EstoqueInsuficienteError,
      );
      expect(ctx.osRepo.salvamentos).toBe(salvamentosAntes);
      expect(await saldoFiltro()).toBe(5);
    });

    it('rejeição encerra a OS sem mexer no estoque', async () => {
      const aberta = await abrirComItens();
      await ctx.status.enviarOrcamento(aberta.id);
      const os = await ctx.orcamento.rejeitarPorId(aberta.id, 'Caro');
      expect(os.status).toBe(S.FINALIZADA);
      expect(os.orcamento!.status).toBe(StatusOrcamento.REJEITADO);
      expect(await saldoFiltro()).toBe(5);
    });

    it('transição inválida gera erro de domínio', async () => {
      const aberta = await abrirComItens();
      await expect(ctx.status.finalizar(aberta.id)).rejects.toBeInstanceOf(DomainError);
      await expect(ctx.status.entregar(aberta.id)).rejects.toBeInstanceOf(DomainError);
    });
  });

  describe('acesso do cliente (código + documento)', () => {
    it('acompanha, aprova e rejeita com documento correto; dados sensíveis mascarados', async () => {
      const aberta = await abrirComItens();
      await ctx.status.enviarOrcamento(aberta.id);

      const ident = { codigo: aberta.codigo.toLowerCase(), documento: '529.982.247-25' };
      const visao = await ctx.consultas.acompanhar(ident);
      expect(visao).toMatchObject({
        codigo: aberta.codigo,
        status: S.AGUARDANDO_APROVACAO,
        statusDescricao: 'Aguardando aprovação',
        cliente: { nome: 'João', documento: '***.982.247-**' },
      });
      expect(visao.itens[0]).not.toHaveProperty('referenciaId');

      const aprovada = await ctx.orcamento.aprovarPeloCliente(ident);
      expect(aprovada.status).toBe(S.EM_EXECUCAO);
    });

    it('cliente pode rejeitar', async () => {
      const aberta = await abrirComItens();
      await ctx.status.enviarOrcamento(aberta.id);
      const r = await ctx.orcamento.rejeitarPeloCliente(
        { codigo: aberta.codigo, documento: CPF_VALIDO },
        'Depois',
      );
      expect(r.status).toBe(S.FINALIZADA);
      expect(r.historico.at(-1)!.observacao).toContain('Depois');
    });

    it.each([
      ['documento de outra pessoa', CPF_VALIDO_2, false],
      ['documento inválido', '123', false],
      ['código inexistente', CPF_VALIDO, true],
    ])('responde 404 para %s', async (_, documento, codigoErrado) => {
      const aberta = await abrirComItens();
      const codigo = codigoErrado ? 'OS-NAOEXIST' : aberta.codigo;
      await expect(ctx.consultas.acompanhar({ codigo, documento })).rejects.toBeInstanceOf(
        RecursoNaoEncontradoError,
      );
    });
  });

  describe('consultas e métricas', () => {
    it('lista via read model e detalha por id', async () => {
      const aberta = await abrirComItens();
      ctx.consultasFake.resumos = [];
      await ctx.consultas.listar({ status: [S.EM_DIAGNOSTICO] });
      expect(ctx.consultasFake.ultimoFiltro).toEqual({ status: [S.EM_DIAGNOSTICO] });
      await ctx.consultas.listar();
      expect(ctx.consultasFake.ultimoFiltro).toEqual({});
      expect((await ctx.consultas.detalhar(aberta.id)).codigo).toBe(aberta.codigo);
      await expect(ctx.consultas.detalhar('nao-existe')).rejects.toBeInstanceOf(
        RecursoNaoEncontradoError,
      );
    });

    it('calcula tempo médio geral e por serviço', async () => {
      const t = (m: number) => new Date(Date.UTC(2026, 9, 1, 8, m));
      ctx.consultasFake.execucoes = [
        {
          ordemServicoId: '1',
          inicioExecucao: t(0),
          fimExecucao: t(30),
          servicos: [{ servicoId: 'a', descricao: 'Troca' }],
        },
        {
          ordemServicoId: '2',
          inicioExecucao: t(0),
          fimExecucao: t(90),
          servicos: [
            { servicoId: 'a', descricao: 'Troca' },
            { servicoId: 'b', descricao: 'Alinhamento' },
          ],
        },
      ];
      const de = new Date('2026-01-01');
      const r = await ctx.metricas.executar({ de });
      expect(ctx.consultasFake.ultimoPeriodo).toEqual({ de });
      expect(r).toEqual({
        periodo: { de, ate: null },
        totalOrdensConsideradas: 2,
        tempoMedioMinutos: 60,
        porServico: [
          { servicoId: 'a', servico: 'Troca', quantidadeOrdens: 2, tempoMedioMinutos: 60 },
          { servicoId: 'b', servico: 'Alinhamento', quantidadeOrdens: 1, tempoMedioMinutos: 90 },
        ],
      });
    });

    it('sem execuções concluídas, média é nula', async () => {
      expect(calcularTempoMedio([])).toEqual({
        totalOrdensConsideradas: 0,
        tempoMedioMinutos: null,
        porServico: [],
      });
      expect((await ctx.metricas.executar()).periodo).toEqual({ de: null, ate: null });
    });

    it('desempata serviços pelo nome', () => {
      const d = new Date(0);
      const r = calcularTempoMedio([
        {
          ordemServicoId: '1',
          inicioExecucao: d,
          fimExecucao: d,
          servicos: [{ servicoId: 'z', descricao: 'Zeta' }],
        },
        {
          ordemServicoId: '2',
          inicioExecucao: d,
          fimExecucao: d,
          servicos: [{ servicoId: 'a', descricao: 'Alfa' }],
        },
      ]);
      expect(r.porServico.map((s) => s.servico)).toEqual(['Alfa', 'Zeta']);
    });
  });
});

describe('NotificarClientePolicy', () => {
  const evento = (nome: string, payload: Record<string, unknown>) => ({
    nome,
    aggregateId: 'os',
    ocorridoEm: new Date(),
    payload,
  });

  it('notifica envio de orçamento com valor formatado e mudanças de status', async () => {
    const notificador = new FakeNotificadorCliente();
    const policy = new NotificarClientePolicy(notificador);
    await policy.quandoOrcamentoEnviado(
      evento(EventosOrdemServico.ORCAMENTO_ENVIADO, {
        codigo: 'OS-1',
        clienteId: 'c',
        valorTotalCentavos: 15050,
      }),
    );
    await policy.quandoStatusAlterado(
      evento(EventosOrdemServico.STATUS_ALTERADO, {
        codigo: 'OS-1',
        clienteId: 'c',
        de: S.AGUARDANDO_APROVACAO,
        para: S.EM_EXECUCAO,
      }),
    );
    expect(notificador.mensagens[0].texto).toMatch(/R\$\s?150,50/);
    expect(notificador.mensagens[1].texto).toContain('Em execução');
  });

  it('falha de notificação não propaga erro', async () => {
    const notificador = new FakeNotificadorCliente();
    notificador.falhar = true;
    const policy = new NotificarClientePolicy(notificador);
    await expect(
      policy.quandoStatusAlterado(
        evento(EventosOrdemServico.STATUS_ALTERADO, {
          codigo: 'OS-1',
          clienteId: 'c',
          de: null,
          para: S.RECEBIDA,
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
