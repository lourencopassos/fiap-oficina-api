import { DomainError } from '../../../shared/domain/domain-error';
import { Entity } from '../../../shared/domain/entity';
import { Email } from '../../../shared/domain/value-objects/email';
import { Role } from './role';

interface UsuarioProps {
  nome: string;
  email: Email;
  senhaHash: string;
  role: Role;
  ativo: boolean;
}

/** Funcionário da oficina com acesso às APIs administrativas. */
export class Usuario extends Entity<UsuarioProps> {
  static criar(dados: { nome: string; email: string; senhaHash: string; role: Role }): Usuario {
    return new Usuario({
      nome: Usuario.validarNome(dados.nome),
      email: Email.criar(dados.email),
      senhaHash: dados.senhaHash,
      role: dados.role,
      ativo: true,
    });
  }

  static restaurar(
    id: string,
    dados: { nome: string; email: string; senhaHash: string; role: Role; ativo: boolean },
  ): Usuario {
    return new Usuario({ ...dados, email: Email.criar(dados.email) }, id);
  }

  get nome(): string {
    return this.props.nome;
  }
  get email(): string {
    return this.props.email.valor;
  }
  get senhaHash(): string {
    return this.props.senhaHash;
  }
  get role(): Role {
    return this.props.role;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }

  atualizar(dados: { nome?: string; role?: Role; ativo?: boolean }): void {
    if (dados.nome !== undefined) this.props.nome = Usuario.validarNome(dados.nome);
    if (dados.role !== undefined) this.props.role = dados.role;
    if (dados.ativo !== undefined) this.props.ativo = dados.ativo;
  }

  alterarSenha(novoHash: string): void {
    this.props.senhaHash = novoHash;
  }

  private static validarNome(nome: string): string {
    const limpo = (nome ?? '').trim();
    if (limpo.length < 2) throw new DomainError('Nome do usuário é obrigatório');
    return limpo;
  }
}
