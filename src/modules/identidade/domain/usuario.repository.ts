import { Usuario } from './usuario';

export abstract class UsuarioRepository {
  abstract buscarPorId(id: string): Promise<Usuario | null>;
  abstract buscarPorEmail(email: string): Promise<Usuario | null>;
  abstract listar(): Promise<Usuario[]>;
  abstract salvar(usuario: Usuario): Promise<void>;
  abstract remover(id: string): Promise<void>;
}
