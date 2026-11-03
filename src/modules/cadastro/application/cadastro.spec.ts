import { CPF_VALIDO, InMemoryClienteRepository, InMemoryVeiculoRepository } from '@test/fakes';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { ClientesService } from './clientes.service';
import { VeiculosService } from './veiculos.service';

describe('Cadastro - aplicação', () => {
  let clientesRepo: InMemoryClienteRepository;
  let clientes: ClientesService;
  let veiculos: VeiculosService;

  beforeEach(() => {
    clientesRepo = new InMemoryClienteRepository();
    clientes = new ClientesService(clientesRepo);
    veiculos = new VeiculosService(new InMemoryVeiculoRepository(), clientesRepo);
  });

  const criarCliente = () =>
    clientes.criar({ nome: 'João', documento: '529.982.247-25', email: 'joao@x.com' });

  describe('ClientesService', () => {
    it('cria e retorna documento formatado', async () => {
      const c = await criarCliente();
      expect(c).toMatchObject({
        nome: 'João',
        documento: '529.982.247-25',
        tipoDocumento: 'CPF',
        email: 'joao@x.com',
        telefone: null,
      });
    });

    it('impede documento duplicado, com ou sem máscara', async () => {
      await criarCliente();
      await expect(clientes.criar({ nome: 'Outro', documento: CPF_VALIDO })).rejects.toBeInstanceOf(
        ConflitoError,
      );
    });

    it('identifica o cliente pelo documento', async () => {
      const c = await criarCliente();
      expect((await clientes.obterPorDocumento(CPF_VALIDO)).id).toBe(c.id);
      await expect(clientes.obterPorDocumento('111.444.777-35')).rejects.toThrow('***.444.777-**');
    });

    it('lista com filtro, atualiza e remove', async () => {
      const c = await criarCliente();
      await clientes.criar({ nome: 'Maria', documento: '111.444.777-35' });
      expect(await clientes.listar({ nome: 'mar' })).toHaveLength(1);
      expect(await clientes.listar()).toHaveLength(2);
      expect((await clientes.atualizar(c.id, { telefone: '11987654321' })).telefone).toBe(
        '11987654321',
      );
      expect((await clientes.obter(c.id)).telefone).toBe('11987654321');
      await clientes.remover(c.id);
      await expect(clientes.obter(c.id)).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
    });
  });

  describe('VeiculosService', () => {
    it('cadastra veículo para cliente existente', async () => {
      const c = await criarCliente();
      const v = await veiculos.criar({
        clienteId: c.id,
        placa: 'abc-1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
      });
      expect(v).toMatchObject({ placa: 'ABC1234', clienteId: c.id });
      expect((await veiculos.buscarPorPlaca('ABC1234'))!.id).toBe(v.id);
      expect(await veiculos.buscarPorPlaca('XYZ9999')).toBeNull();
    });

    it('exige cliente existente e placa única', async () => {
      await expect(
        veiculos.criar({
          clienteId: 'nao-existe',
          placa: 'ABC1234',
          marca: 'Fiat',
          modelo: 'Uno',
          ano: 2010,
        }),
      ).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
      const c = await criarCliente();
      await veiculos.criar({
        clienteId: c.id,
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
      });
      await expect(
        veiculos.criar({
          clienteId: c.id,
          placa: 'ABC-1234',
          marca: 'Fiat',
          modelo: 'Uno',
          ano: 2010,
        }),
      ).rejects.toBeInstanceOf(ConflitoError);
    });

    it('lista por cliente, transfere dono, atualiza e remove', async () => {
      const c1 = await criarCliente();
      const c2 = await clientes.criar({ nome: 'Maria', documento: '111.444.777-35' });
      const v = await veiculos.criar({
        clienteId: c1.id,
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2010,
      });
      expect(await veiculos.listar({ clienteId: c2.id })).toHaveLength(0);

      await expect(veiculos.atualizar(v.id, { clienteId: 'nao-existe' })).rejects.toBeInstanceOf(
        RecursoNaoEncontradoError,
      );
      const atualizado = await veiculos.atualizar(v.id, { clienteId: c2.id, modelo: 'Mobi' });
      expect(atualizado).toMatchObject({ clienteId: c2.id, modelo: 'Mobi' });
      expect(await veiculos.listar({ clienteId: c2.id })).toHaveLength(1);
      expect((await veiculos.obter(v.id)).modelo).toBe('Mobi');

      await veiculos.remover(v.id);
      await expect(veiculos.obter(v.id)).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
    });
  });
});
