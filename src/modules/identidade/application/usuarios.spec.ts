import { FakeGeradorToken, FakeHasherSenha, InMemoryUsuarioRepository } from '@test/fakes';
import {
  ConflitoError,
  CredenciaisInvalidasError,
  RecursoNaoEncontradoError,
} from '../../../shared/application/errors';
import { Role } from '../domain/role';
import { AutenticarUsuarioUseCase } from './autenticar-usuario.use-case';
import { UsuariosService, validarPoliticaSenha } from './usuarios.service';

describe('Identidade - aplicação', () => {
  let repo: InMemoryUsuarioRepository;
  let service: UsuariosService;
  let autenticar: AutenticarUsuarioUseCase;

  beforeEach(() => {
    repo = new InMemoryUsuarioRepository();
    const hasher = new FakeHasherSenha();
    service = new UsuariosService(repo, hasher);
    autenticar = new AutenticarUsuarioUseCase(repo, hasher, new FakeGeradorToken());
  });

  const criarAdmin = () =>
    service.criar({
      nome: 'Admin',
      email: 'admin@oficina.com',
      senha: 'Admin@123',
      role: Role.ADMIN,
    });

  describe('política de senha', () => {
    it.each(['curta1', 'semnumeros', '12345678', ''])('rejeita "%s"', (s) => {
      expect(() => validarPoliticaSenha(s)).toThrow('Senha deve ter');
    });
    it('aceita senha forte', () => expect(() => validarPoliticaSenha('Senha123')).not.toThrow());
  });

  describe('UsuariosService', () => {
    it('cria usuário com senha hasheada e sem expor o hash', async () => {
      const view = await criarAdmin();
      expect(view).toEqual({
        id: expect.any(String),
        nome: 'Admin',
        email: 'admin@oficina.com',
        role: Role.ADMIN,
        ativo: true,
      });
      expect((await repo.buscarPorId(view.id))!.senhaHash).toBe('hash:Admin@123');
    });

    it('impede e-mail duplicado (case-insensitive)', async () => {
      await criarAdmin();
      await expect(
        service.criar({
          nome: 'Outro',
          email: 'ADMIN@oficina.com',
          senha: 'Senha123',
          role: Role.ATENDENTE,
        }),
      ).rejects.toBeInstanceOf(ConflitoError);
    });

    it('lista, obtém, atualiza e remove', async () => {
      const admin = await criarAdmin();
      const atendente = await service.criar({
        nome: 'Ana',
        email: 'ana@oficina.com',
        senha: 'Senha123',
        role: Role.ATENDENTE,
      });
      expect(await service.listar()).toHaveLength(2);
      expect((await service.obter(atendente.id)).nome).toBe('Ana');

      const atualizado = await service.atualizar(
        atendente.id,
        { role: Role.MECANICO, senha: 'NovaSenha1' },
        admin.id,
      );
      expect(atualizado.role).toBe(Role.MECANICO);
      expect((await repo.buscarPorId(atendente.id))!.senhaHash).toBe('hash:NovaSenha1');

      await service.remover(atendente.id, admin.id);
      await expect(service.obter(atendente.id)).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
    });

    it('valida política ao trocar senha', async () => {
      const admin = await criarAdmin();
      const outro = await service.criar({
        nome: 'Ana',
        email: 'ana@oficina.com',
        senha: 'Senha123',
        role: Role.ATENDENTE,
      });
      await expect(service.atualizar(outro.id, { senha: 'fraca' }, admin.id)).rejects.toThrow(
        'Senha deve ter',
      );
    });

    it('impede o admin de se desativar, se rebaixar ou se remover', async () => {
      const admin = await criarAdmin();
      await expect(service.atualizar(admin.id, { ativo: false }, admin.id)).rejects.toThrow(
        'não pode desativar',
      );
      await expect(service.atualizar(admin.id, { role: Role.ATENDENTE }, admin.id)).rejects.toThrow(
        'rebaixar',
      );
      await expect(service.remover(admin.id, admin.id)).rejects.toThrow('remover a si mesmo');
      expect((await service.atualizar(admin.id, { nome: 'Chefe' }, admin.id)).nome).toBe('Chefe');
    });

    it('retorna 404 para usuário inexistente', async () => {
      await expect(service.remover('nao-existe')).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
    });
  });

  describe('AutenticarUsuarioUseCase', () => {
    it('emite token para credenciais válidas', async () => {
      const admin = await criarAdmin();
      const r = await autenticar.executar(' Admin@Oficina.com ', 'Admin@123');
      expect(r).toEqual({
        accessToken: `token-${admin.id}-ADMIN`,
        tokenType: 'Bearer',
        expiresIn: 3600,
        usuario: admin,
      });
    });

    it.each([
      ['senha errada', 'admin@oficina.com', 'errada'],
      ['e-mail inexistente', 'ninguem@oficina.com', 'Admin@123'],
    ])('rejeita %s com a mesma mensagem genérica', async (_, email, senha) => {
      await criarAdmin();
      await expect(autenticar.executar(email, senha)).rejects.toThrow(
        new CredenciaisInvalidasError(),
      );
    });

    it('rejeita usuário inativo', async () => {
      const admin = await criarAdmin();
      const u = (await repo.buscarPorId(admin.id))!;
      u.atualizar({ ativo: false });
      await expect(autenticar.executar('admin@oficina.com', 'Admin@123')).rejects.toBeInstanceOf(
        CredenciaisInvalidasError,
      );
    });
  });
});
