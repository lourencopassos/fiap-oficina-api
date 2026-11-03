import { FakeUnidadeDeTrabalho, InMemoryPecaRepository } from '@test/fakes';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { TipoMovimentacao } from '../domain/movimentacao-estoque';
import { EstoqueInsuficienteError, TipoPeca } from '../domain/peca';
import { EstoqueService } from './estoque.service';
import { PecasService } from './pecas.service';

describe('Estoque - aplicação', () => {
  let repo: InMemoryPecaRepository;
  let pecas: PecasService;
  let estoque: EstoqueService;
  let uow: FakeUnidadeDeTrabalho;

  beforeEach(() => {
    repo = new InMemoryPecaRepository();
    uow = new FakeUnidadeDeTrabalho();
    pecas = new PecasService(repo);
    estoque = new EstoqueService(repo, uow);
  });

  const criarFiltro = (quantidadeEstoque = 5) =>
    pecas.criar({
      codigo: 'FLT-1',
      nome: 'Filtro',
      tipo: TipoPeca.PECA,
      unidade: 'UN',
      precoCentavos: 3500,
      quantidadeEstoque,
      estoqueMinimo: 2,
    });

  describe('PecasService', () => {
    it('CRUD com código único e saldo inicial padrão 0', async () => {
      const filtro = await criarFiltro();
      expect(filtro).toMatchObject({
        codigo: 'FLT-1',
        quantidadeEstoque: 5,
        preco: 35,
        abaixoDoMinimo: false,
      });
      await expect(criarFiltro()).rejects.toBeInstanceOf(ConflitoError);

      const oleo = await pecas.criar({
        codigo: 'OLEO',
        nome: 'Óleo',
        tipo: TipoPeca.INSUMO,
        unidade: 'L',
        precoCentavos: 4500,
      });
      expect(oleo).toMatchObject({ quantidadeEstoque: 0, estoqueMinimo: 0, abaixoDoMinimo: true });
      expect(await pecas.listar({ tipo: TipoPeca.INSUMO })).toHaveLength(1);
      expect(await pecas.listar({ abaixoDoMinimo: true })).toHaveLength(1);

      await expect(pecas.atualizar(oleo.id, { codigo: 'flt-1' })).rejects.toBeInstanceOf(
        ConflitoError,
      );
      expect(
        (await pecas.atualizar(oleo.id, { codigo: 'OLEO', precoCentavos: 5000 })).precoCentavos,
      ).toBe(5000);
      expect((await pecas.obter(oleo.id)).nome).toBe('Óleo');

      await pecas.remover(oleo.id);
      await expect(pecas.obter(oleo.id)).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
    });
  });

  describe('EstoqueService', () => {
    it('registra entrada com movimentação, dentro de transação', async () => {
      const filtro = await criarFiltro();
      const r = await estoque.registrarEntrada(filtro.id, 10, '  ');
      expect(r.quantidadeEstoque).toBe(15);
      expect((await pecas.obter(filtro.id)).quantidadeEstoque).toBe(15);
      expect(uow.execucoes).toBe(1);
      const [mov] = await estoque.listarMovimentacoes(filtro.id);
      expect(mov).toMatchObject({
        tipo: TipoMovimentacao.ENTRADA,
        quantidade: 10,
        motivo: 'Entrada manual de estoque',
        ordemServicoId: null,
      });
    });

    it('baixa peças da OS e registra saída', async () => {
      const filtro = await criarFiltro(5);
      await estoque.baixarParaOrdemServico([{ pecaId: filtro.id, quantidade: 3 }], 'os-1');
      expect((await pecas.obter(filtro.id)).quantidadeEstoque).toBe(2);
      expect(repo.movimentacoes[0]).toMatchObject({
        tipo: TipoMovimentacao.SAIDA,
        ordemServicoId: 'os-1',
        quantidade: 3,
      });
    });

    it('falha com estoque insuficiente', async () => {
      const filtro = await criarFiltro(1);
      await expect(
        estoque.baixarParaOrdemServico([{ pecaId: filtro.id, quantidade: 2 }], 'os-1'),
      ).rejects.toBeInstanceOf(EstoqueInsuficienteError);
    });

    it('falha se o banco recusar a baixa por concorrência', async () => {
      const filtro = await criarFiltro(5);
      jest.spyOn(repo, 'ajustarSaldo').mockResolvedValueOnce(false);
      await expect(
        estoque.baixarParaOrdemServico([{ pecaId: filtro.id, quantidade: 2 }], 'os-1'),
      ).rejects.toThrow('Estoque insuficiente');
      expect(repo.movimentacoes).toHaveLength(0);
    });

    it('retorna 404 para peça inexistente', async () => {
      await expect(estoque.registrarEntrada('nao-existe', 1)).rejects.toBeInstanceOf(
        RecursoNaoEncontradoError,
      );
      await expect(estoque.listarMovimentacoes('nao-existe')).rejects.toBeInstanceOf(
        RecursoNaoEncontradoError,
      );
    });
  });
});
