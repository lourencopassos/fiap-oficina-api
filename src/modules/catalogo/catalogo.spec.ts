import { InMemoryServicoRepository } from '@test/fakes';
import { ConflitoError, RecursoNaoEncontradoError } from '../../shared/application/errors';
import { ServicosService } from './application/servicos.service';
import { Servico } from './domain/servico';

describe('Servico', () => {
  it('cria ativo por padrão', () => {
    const s = Servico.criar({
      nome: ' Alinhamento ',
      precoCentavos: 12000,
      tempoEstimadoMinutos: 45,
      descricao: '  ',
    });
    expect([s.nome, s.preco.centavos, s.tempoEstimadoMinutos, s.ativo, s.descricao]).toEqual([
      'Alinhamento',
      12000,
      45,
      true,
      undefined,
    ]);
  });

  it.each([
    [{ nome: 'A', precoCentavos: 100 }, 'Nome do serviço'],
    [{ nome: 'Troca', precoCentavos: -1 }, 'negativo'],
    [{ nome: 'Troca', precoCentavos: 100, tempoEstimadoMinutos: 0 }, 'Tempo estimado'],
  ])('valida (%#)', (dados, msg) => {
    expect(() => Servico.criar(dados)).toThrow(msg);
  });

  it('atualiza parcialmente, inclusive limpando campos opcionais', () => {
    const s = Servico.restaurar('id', {
      nome: 'Troca',
      descricao: 'x',
      precoCentavos: 100,
      tempoEstimadoMinutos: 10,
      ativo: true,
    });
    s.atualizar({ precoCentavos: 200, ativo: false, descricao: null, tempoEstimadoMinutos: null });
    expect([s.preco.centavos, s.ativo, s.descricao, s.tempoEstimadoMinutos, s.nome]).toEqual([
      200,
      false,
      undefined,
      undefined,
      'Troca',
    ]);
  });
});

describe('ServicosService', () => {
  let service: ServicosService;
  beforeEach(() => (service = new ServicosService(new InMemoryServicoRepository())));

  it('CRUD completo com nome único', async () => {
    const s = await service.criar({ nome: 'Troca de óleo', precoCentavos: 8000 });
    expect(s).toMatchObject({
      preco: 80,
      precoCentavos: 8000,
      ativo: true,
      descricao: null,
      tempoEstimadoMinutos: null,
    });
    await expect(service.criar({ nome: 'Troca de óleo', precoCentavos: 1 })).rejects.toBeInstanceOf(
      ConflitoError,
    );

    const outro = await service.criar({ nome: 'Alinhamento', precoCentavos: 1, ativo: false });
    expect(await service.listar({ apenasAtivos: true })).toHaveLength(1);
    expect(await service.listar()).toHaveLength(2);

    await expect(service.atualizar(outro.id, { nome: 'Troca de óleo' })).rejects.toBeInstanceOf(
      ConflitoError,
    );
    expect((await service.atualizar(outro.id, { nome: 'Alinhamento 3D', ativo: true })).nome).toBe(
      'Alinhamento 3D',
    );
    expect((await service.atualizar(outro.id, { nome: 'Alinhamento 3D' })).nome).toBe(
      'Alinhamento 3D',
    );
    expect((await service.obter(s.id)).nome).toBe('Troca de óleo');

    await service.remover(s.id);
    await expect(service.obter(s.id)).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
  });
});
