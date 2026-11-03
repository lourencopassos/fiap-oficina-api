import { DomainError } from '../../../shared/domain/domain-error';
import { EventosOrdemServico } from './eventos';
import { ItemOrdemServico, TipoItemOrdemServico } from './item-ordem-servico';
import { Orcamento, StatusOrcamento } from './orcamento';
import {
  gerarCodigoOrdemServico,
  OrdemServico,
  TransicaoStatusInvalidaError,
} from './ordem-servico';
import { StatusOrdemServico as S, TRANSICOES_PERMITIDAS } from './status-ordem-servico';

const T0 = new Date('2026-10-01T08:00:00Z');
const minutos = (m: number) => new Date(T0.getTime() + m * 60_000);

const servico = (id = 'srv-1', preco = 8000, quantidade = 1) => ({
  tipo: TipoItemOrdemServico.SERVICO,
  referenciaId: id,
  descricao: `Serviço ${id}`,
  quantidade,
  precoUnitarioCentavos: preco,
});

const peca = (id = 'pc-1', preco = 3500, quantidade = 2) => ({
  tipo: TipoItemOrdemServico.PECA,
  referenciaId: id,
  descricao: `Peça ${id}`,
  quantidade,
  precoUnitarioCentavos: preco,
});

const abrir = () =>
  OrdemServico.abrir({ clienteId: 'cli', veiculoId: 'vei', observacao: ' barulho ' }, T0);

/** OS com itens e orçamento enviado, pronta para aprovação. */
const aguardandoAprovacao = () => {
  const os = abrir();
  os.adicionarItem(servico(), minutos(1));
  os.adicionarItem(peca(), minutos(1));
  os.enviarOrcamento(minutos(10));
  os.extrairEventos();
  return os;
};

describe('OrdemServico (agregado)', () => {
  describe('abertura', () => {
    it('nasce Recebida, com código público, histórico e eventos', () => {
      const os = abrir();
      expect(os.status).toBe(S.RECEBIDA);
      expect(os.codigo).toMatch(/^OS-[A-HJ-NP-Z2-9]{8}$/);
      expect(os.observacao).toBe('barulho');
      expect(os.criadaEm).toEqual(T0);
      expect(os.historico.map((h) => h.status)).toEqual([S.RECEBIDA]);
      expect(os.extrairEventos().map((e) => e.nome)).toEqual([
        EventosOrdemServico.ABERTA,
        EventosOrdemServico.STATUS_ALTERADO,
      ]);
    });

    it('gera códigos distintos', () => {
      const codigos = new Set(Array.from({ length: 200 }, gerarCodigoOrdemServico));
      expect(codigos.size).toBe(200);
    });

    it('observação vazia vira indefinida', () => {
      expect(
        OrdemServico.abrir({ clienteId: 'c', veiculoId: 'v', observacao: '   ' }).observacao,
      ).toBeUndefined();
    });
  });

  describe('itens e diagnóstico', () => {
    it('incluir o primeiro item leva automaticamente a Em diagnóstico', () => {
      const os = abrir();
      os.adicionarItem(servico(), minutos(1));
      expect(os.status).toBe(S.EM_DIAGNOSTICO);
      expect(os.historico.map((h) => h.status)).toEqual([S.RECEBIDA, S.EM_DIAGNOSTICO]);
    });

    it('permite iniciar o diagnóstico explicitamente, com observação', () => {
      const os = abrir();
      os.iniciarDiagnostico(minutos(5), 'Verificando freios');
      expect(os.status).toBe(S.EM_DIAGNOSTICO);
      expect(os.historico[1].observacao).toBe('Verificando freios');
    });

    it('soma quantidade de itens repetidos e calcula total', () => {
      const os = abrir();
      os.adicionarItem(peca('pc-1', 3500, 2));
      os.adicionarItem(peca('pc-1', 3500, 1));
      os.adicionarItem(servico('srv-1', 8000));
      expect(os.itens).toHaveLength(2);
      expect(os.itens.find((i) => i.tipo === TipoItemOrdemServico.PECA)!.quantidade).toBe(3);
      expect(os.valorTotalItens.centavos).toBe(3 * 3500 + 8000);
      expect(os.pecasNecessarias()).toEqual([{ pecaId: 'pc-1', quantidade: 3 }]);
    });

    it('remove itens', () => {
      const os = abrir();
      const item = os.adicionarItem(servico());
      os.removerItem(item.id);
      expect(os.itens).toHaveLength(0);
      expect(() => os.removerItem('inexistente')).toThrow('Item não encontrado');
    });

    it('valida quantidade e descrição do item', () => {
      const os = abrir();
      expect(() => os.adicionarItem(peca('p', 100, 0))).toThrow('inteiro positivo');
      expect(() => os.adicionarItem({ ...servico(), descricao: ' ' })).toThrow('Descrição');
      const item = os.adicionarItem(servico());
      expect(() => item.acrescentar(-1)).toThrow('inteiro positivo');
    });

    it('bloqueia alteração de itens após o envio do orçamento', () => {
      const os = aguardandoAprovacao();
      expect(() => os.adicionarItem(servico('srv-2'))).toThrow('Itens só podem ser alterados');
      expect(() => os.removerItem(os.itens[0].id)).toThrow('Itens só podem ser alterados');
    });
  });

  describe('orçamento', () => {
    it('é gerado automaticamente a partir dos itens', () => {
      const os = abrir();
      os.adicionarItem(servico('srv-1', 8000));
      os.adicionarItem(servico('srv-2', 12000));
      os.adicionarItem(peca('pc-1', 3500, 2));
      const orcamento = os.enviarOrcamento(minutos(10));

      expect(orcamento.valorServicos.centavos).toBe(20000);
      expect(orcamento.valorPecas.centavos).toBe(7000);
      expect(orcamento.valorTotal.centavos).toBe(27000);
      expect(orcamento.status).toBe(StatusOrcamento.PENDENTE);
      expect(os.status).toBe(S.AGUARDANDO_APROVACAO);
      expect(os.extrairEventos().map((e) => e.nome)).toContain(
        EventosOrdemServico.ORCAMENTO_ENVIADO,
      );
    });

    it('não pode ser enviado sem itens', () => {
      const os = abrir();
      os.iniciarDiagnostico();
      expect(() => os.enviarOrcamento()).toThrow('sem itens');
    });

    it('não pode ser enviado fora do diagnóstico', () => {
      expect(() => abrir().enviarOrcamento()).toThrow('Não é possível enviar o orçamento');
    });

    it('aprovação inicia a execução e registra o instante', () => {
      const os = aguardandoAprovacao();
      os.aprovarOrcamento(minutos(30));
      expect(os.status).toBe(S.EM_EXECUCAO);
      expect(os.orcamento!.status).toBe(StatusOrcamento.APROVADO);
      expect(os.orcamento!.respondidoEm).toEqual(minutos(30));
      expect(os.inicioExecucao).toEqual(minutos(30));
      const aprovado = os
        .extrairEventos()
        .find((e) => e.nome === EventosOrdemServico.ORCAMENTO_APROVADO)!;
      expect(aprovado.payload.pecas).toEqual([{ pecaId: 'pc-1', quantidade: 2 }]);
    });

    it('rejeição encerra a OS sem execução, registrando o motivo', () => {
      const os = aguardandoAprovacao();
      os.rejeitarOrcamento(minutos(30), ' caro ');
      expect(os.status).toBe(S.FINALIZADA);
      expect(os.orcamento!.status).toBe(StatusOrcamento.REJEITADO);
      expect(os.inicioExecucao).toBeUndefined();
      expect(os.tempoExecucaoMinutos).toBeNull();
      expect(os.historico.at(-1)!.observacao).toBe('Orçamento rejeitado pelo cliente: caro');
      expect(os.extrairEventos().map((e) => e.nome)).toContain(
        EventosOrdemServico.ORCAMENTO_REJEITADO,
      );
    });

    it('rejeição sem motivo', () => {
      const os = aguardandoAprovacao();
      os.rejeitarOrcamento();
      expect(os.historico.at(-1)!.observacao).toBe('Orçamento rejeitado pelo cliente');
    });

    it('não pode ser respondido duas vezes', () => {
      const os = aguardandoAprovacao();
      os.aprovarOrcamento();
      expect(() => os.aprovarOrcamento()).toThrow(DomainError);
      expect(() => os.rejeitarOrcamento()).toThrow(DomainError);
    });

    it('VO Orcamento impede resposta repetida', () => {
      const item = ItemOrdemServico.criar(servico());
      const aprovado = Orcamento.gerar([item], T0).aprovar(T0);
      expect(() => aprovado.rejeitar(T0)).toThrow('Orçamento já foi respondido');
    });
  });

  describe('ciclo completo e tempo de execução', () => {
    it('Recebida -> Em diagnóstico -> Aguardando -> Em execução -> Finalizada -> Entregue', () => {
      const os = aguardandoAprovacao();
      os.aprovarOrcamento(minutos(30));
      os.finalizar(minutos(120), 'Tudo certo');
      expect(os.status).toBe(S.FINALIZADA);
      expect(os.tempoExecucaoMinutos).toBe(90);
      os.entregar(minutos(200));
      expect(os.status).toBe(S.ENTREGUE);
      expect(os.entregueEm).toEqual(minutos(200));
      expect(os.historico.map((h) => h.status)).toEqual([
        S.RECEBIDA,
        S.EM_DIAGNOSTICO,
        S.AGUARDANDO_APROVACAO,
        S.EM_EXECUCAO,
        S.FINALIZADA,
        S.ENTREGUE,
      ]);
    });

    it('OS rejeitada pode ser entregue (devolução do veículo)', () => {
      const os = aguardandoAprovacao();
      os.rejeitarOrcamento();
      os.entregar();
      expect(os.status).toBe(S.ENTREGUE);
    });
  });

  describe('transições inválidas', () => {
    it.each([
      ['finalizar sem execução', (os: OrdemServico) => os.finalizar()],
      ['entregar sem finalizar', (os: OrdemServico) => os.entregar()],
      ['aprovar sem orçamento', (os: OrdemServico) => os.aprovarOrcamento()],
      ['rejeitar sem orçamento', (os: OrdemServico) => os.rejeitarOrcamento()],
    ])('bloqueia %s', (_, acao) => {
      expect(() => acao(abrir())).toThrow(DomainError);
    });

    it('não reinicia diagnóstico nem volta status', () => {
      const os = aguardandoAprovacao();
      expect(() => os.iniciarDiagnostico()).toThrow(TransicaoStatusInvalidaError);
    });

    it('OS entregue é estado final', () => {
      const os = aguardandoAprovacao();
      os.rejeitarOrcamento();
      os.entregar();
      expect(TRANSICOES_PERMITIDAS[S.ENTREGUE]).toEqual([]);
      expect(() => os.entregar()).toThrow(DomainError);
    });
  });

  it('restaura estado persistido sem gerar eventos', () => {
    const original = aguardandoAprovacao();
    const restaurada = OrdemServico.restaurar(original.id, {
      codigo: original.codigo,
      clienteId: original.clienteId,
      veiculoId: original.veiculoId,
      status: original.status,
      itens: [...original.itens],
      orcamento: original.orcamento,
      historico: [...original.historico],
      criadaEm: original.criadaEm,
    });
    expect(restaurada.status).toBe(S.AGUARDANDO_APROVACAO);
    expect(restaurada.extrairEventos()).toHaveLength(0);
    restaurada.aprovarOrcamento();
    expect(restaurada.status).toBe(S.EM_EXECUCAO);
  });
});
