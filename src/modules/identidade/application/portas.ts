import { Role } from '../domain/role';

export abstract class HasherSenha {
  abstract gerar(senha: string): Promise<string>;
  abstract comparar(senha: string, hash: string): Promise<boolean>;
}

export interface UsuarioAutenticado {
  id: string;
  email: string;
  role: Role;
}

export abstract class GeradorToken {
  abstract gerar(usuario: UsuarioAutenticado): Promise<{ token: string; expiraEmSegundos: number }>;
}
