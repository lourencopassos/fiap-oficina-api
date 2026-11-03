import { Injectable } from '@nestjs/common';
import { ConflitoError, RecursoNaoEncontradoError } from '../../../shared/application/errors';
import { Documento } from '../../../shared/domain/value-objects/documento';
import { Cliente, DadosCliente } from '../domain/cliente';
import { ClienteRepository } from '../domain/repositories';
import { ClienteView, paraClienteView } from './views';

@Injectable()
export class ClientesService {
  constructor(private readonly clientes: ClienteRepository) {}

  async criar(input: DadosCliente): Promise<ClienteView> {
    const cliente = Cliente.criar(input);
    if (await this.clientes.buscarPorDocumento(cliente.documento.valor)) {
      throw new ConflitoError('Já existe um cliente com este CPF/CNPJ');
    }
    await this.clientes.salvar(cliente);
    return paraClienteView(cliente);
  }

  async listar(filtro?: { nome?: string }): Promise<ClienteView[]> {
    return (await this.clientes.listar(filtro)).map(paraClienteView);
  }

  async obter(id: string): Promise<ClienteView> {
    return paraClienteView(await this.buscar(id));
  }

  /** Identificação do cliente por CPF/CNPJ (com ou sem máscara). */
  async obterPorDocumento(documento: string): Promise<ClienteView> {
    const doc = Documento.criar(documento);
    const cliente = await this.clientes.buscarPorDocumento(doc.valor);
    if (!cliente) throw new RecursoNaoEncontradoError('Cliente com documento', doc.mascarado);
    return paraClienteView(cliente);
  }

  async atualizar(
    id: string,
    input: { nome?: string; email?: string | null; telefone?: string | null },
  ): Promise<ClienteView> {
    const cliente = await this.buscar(id);
    cliente.atualizar(input);
    await this.clientes.salvar(cliente);
    return paraClienteView(cliente);
  }

  async remover(id: string): Promise<void> {
    await this.buscar(id);
    await this.clientes.remover(id);
  }

  private async buscar(id: string): Promise<Cliente> {
    const cliente = await this.clientes.buscarPorId(id);
    if (!cliente) throw new RecursoNaoEncontradoError('Cliente', id);
    return cliente;
  }
}
