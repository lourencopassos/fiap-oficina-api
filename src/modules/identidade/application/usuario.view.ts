import { Role } from '../domain/role';
import { Usuario } from '../domain/usuario';

export interface UsuarioView {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
}

export const paraUsuarioView = (u: Usuario): UsuarioView => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  role: u.role,
  ativo: u.ativo,
});
