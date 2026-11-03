import { Role } from './role';
import { Usuario } from './usuario';

describe('Usuario', () => {
  const novo = () =>
    Usuario.criar({
      nome: ' Maria ',
      email: 'MARIA@oficina.com',
      senhaHash: 'h',
      role: Role.ATENDENTE,
    });

  it('cria ativo com nome e e-mail normalizados', () => {
    const u = novo();
    expect(u.nome).toBe('Maria');
    expect(u.email).toBe('maria@oficina.com');
    expect(u.ativo).toBe(true);
    expect(u.role).toBe(Role.ATENDENTE);
    expect(u.senhaHash).toBe('h');
  });

  it('exige nome', () => {
    expect(() =>
      Usuario.criar({ nome: ' ', email: 'a@b.com', senhaHash: 'h', role: Role.ADMIN }),
    ).toThrow('Nome');
  });

  it('atualiza parcialmente e altera senha', () => {
    const u = novo();
    u.atualizar({ role: Role.MECANICO });
    u.atualizar({ nome: 'Maria Souza', ativo: false });
    u.alterarSenha('novo');
    expect([u.nome, u.role, u.ativo, u.senhaHash]).toEqual([
      'Maria Souza',
      Role.MECANICO,
      false,
      'novo',
    ]);
  });

  it('restaura preservando id', () => {
    const u = Usuario.restaurar('id-1', {
      nome: 'Ana',
      email: 'ana@x.com',
      senhaHash: 'h',
      role: Role.ADMIN,
      ativo: false,
    });
    expect(u.id).toBe('id-1');
    expect(u.ativo).toBe(false);
  });
});
