import { DomainError } from '../../../shared/domain/domain-error';
import { Entity } from '../../../shared/domain/entity';
import { Documento } from '../../../shared/domain/value-objects/documento';
import { Email } from '../../../shared/domain/value-objects/email';

interface ClienteProps {
  nome: string;
  documento: Documento;
  email?: Email;
  telefone?: string;
}

export interface DadosCliente {
  nome: string;
  documento: string;
  email?: string | null;
  telefone?: string | null;
}

/** Pessoa física (CPF) ou jurídica (CNPJ) dona de veículos atendidos pela oficina. */
export class Cliente extends Entity<ClienteProps> {
  static criar(dados: DadosCliente): Cliente {
    return new Cliente(Cliente.montar(dados));
  }

  static restaurar(id: string, dados: DadosCliente): Cliente {
    return new Cliente(Cliente.montar(dados), id);
  }

  get nome(): string {
    return this.props.nome;
  }
  get documento(): Documento {
    return this.props.documento;
  }
  get email(): string | undefined {
    return this.props.email?.valor;
  }
  get telefone(): string | undefined {
    return this.props.telefone;
  }

  /** O documento identifica o cliente e não pode ser alterado. */
  atualizar(dados: { nome?: string; email?: string | null; telefone?: string | null }): void {
    const novo = Cliente.montar({
      nome: dados.nome ?? this.props.nome,
      documento: this.props.documento.valor,
      email: dados.email === undefined ? this.email : dados.email,
      telefone: dados.telefone === undefined ? this.telefone : dados.telefone,
    });
    this.props = novo;
  }

  private static montar(dados: DadosCliente): ClienteProps {
    const nome = (dados.nome ?? '').trim();
    if (nome.length < 2) throw new DomainError('Nome do cliente é obrigatório');
    return {
      nome,
      documento: Documento.criar(dados.documento),
      email: dados.email ? Email.criar(dados.email) : undefined,
      telefone: dados.telefone ? Cliente.normalizarTelefone(dados.telefone) : undefined,
    };
  }

  private static normalizarTelefone(telefone: string): string {
    const digitos = telefone.replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 11)
      throw new DomainError('Telefone inválido (informe DDD + número)');
    return digitos;
  }
}
