import { TipoDocumento } from '../../../shared/domain/value-objects/documento';
import { Cliente } from '../domain/cliente';
import { Veiculo } from '../domain/veiculo';

export interface ClienteView {
  id: string;
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumento;
  email: string | null;
  telefone: string | null;
}

export interface VeiculoView {
  id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export const paraClienteView = (c: Cliente): ClienteView => ({
  id: c.id,
  nome: c.nome,
  documento: c.documento.formatado,
  tipoDocumento: c.documento.tipo,
  email: c.email ?? null,
  telefone: c.telefone ?? null,
});

export const paraVeiculoView = (v: Veiculo): VeiculoView => ({
  id: v.id,
  clienteId: v.clienteId,
  placa: v.placa.valor,
  marca: v.marca,
  modelo: v.modelo,
  ano: v.ano,
});
