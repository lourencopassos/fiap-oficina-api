/* Dublês em memória das portas (repositórios, transação, eventos) para testes unitários. */
import { PublicadorEventos } from '../../src/shared/application/publicador-eventos';
import { UnidadeDeTrabalho } from '../../src/shared/application/unidade-de-trabalho';
import { DomainEvent } from '../../src/shared/domain/domain-event';
import { Entity } from '../../src/shared/domain/entity';
import {
  GeradorToken,
  HasherSenha,
  UsuarioAutenticado,
} from '../../src/modules/identidade/application/portas';
import { Usuario } from '../../src/modules/identidade/domain/usuario';
import { UsuarioRepository } from '../../src/modules/identidade/domain/usuario.repository';
import { Cliente } from '../../src/modules/cadastro/domain/cliente';
import {
  ClienteRepository,
  VeiculoRepository,
} from '../../src/modules/cadastro/domain/repositories';
import { Veiculo } from '../../src/modules/cadastro/domain/veiculo';
import { Servico } from '../../src/modules/catalogo/domain/servico';
import { ServicoRepository } from '../../src/modules/catalogo/domain/servico.repository';
import { MovimentacaoEstoque } from '../../src/modules/estoque/domain/movimentacao-estoque';
import { Peca } from '../../src/modules/estoque/domain/peca';
import { FiltroPecas, PecaRepository } from '../../src/modules/estoque/domain/peca.repository';
import { OrdemServico } from '../../src/modules/atendimento/domain/ordem-servico';
import { OrdemServicoRepository } from '../../src/modules/atendimento/domain/ordem-servico.repository';
import {
  ExecucaoConcluida,
  FiltroOrdensServico,
  OrdemServicoConsultas,
  ResumoOrdemServico,
} from '../../src/modules/atendimento/application/consultas';
import { NotificadorCliente } from '../../src/modules/atendimento/application/notificador-cliente';

class Armazem<T extends Entity<unknown>> {
  readonly itens = new Map<string, T>();
  salvar(e: T) {
    this.itens.set(e.id, e);
  }
  porId(id: string) {
    return this.itens.get(id) ?? null;
  }
  todos() {
    return [...this.itens.values()];
  }
  remover(id: string) {
    this.itens.delete(id);
  }
}

export class FakeUnidadeDeTrabalho extends UnidadeDeTrabalho {
  execucoes = 0;
  async executar<T>(trabalho: () => Promise<T>): Promise<T> {
    this.execucoes++;
    return trabalho();
  }
}

export class FakePublicadorEventos extends PublicadorEventos {
  publicados: DomainEvent[] = [];
  async publicar(eventos: DomainEvent[]): Promise<void> {
    this.publicados.push(...eventos);
  }
  nomes(): string[] {
    return this.publicados.map((e) => e.nome);
  }
}

export class FakeHasherSenha extends HasherSenha {
  async gerar(senha: string) {
    return `hash:${senha}`;
  }
  async comparar(senha: string, hash: string) {
    return hash === `hash:${senha}`;
  }
}

export class FakeGeradorToken extends GeradorToken {
  async gerar(u: UsuarioAutenticado) {
    return { token: `token-${u.id}-${u.role}`, expiraEmSegundos: 3600 };
  }
}

export class InMemoryUsuarioRepository extends UsuarioRepository {
  readonly db = new Armazem<Usuario>();
  async buscarPorId(id: string) {
    return this.db.porId(id);
  }
  async buscarPorEmail(email: string) {
    return this.db.todos().find((u) => u.email === email) ?? null;
  }
  async listar() {
    return this.db.todos();
  }
  async salvar(u: Usuario) {
    this.db.salvar(u);
  }
  async remover(id: string) {
    this.db.remover(id);
  }
}

export class InMemoryClienteRepository extends ClienteRepository {
  readonly db = new Armazem<Cliente>();
  async buscarPorId(id: string) {
    return this.db.porId(id);
  }
  async buscarPorDocumento(documento: string) {
    return this.db.todos().find((c) => c.documento.valor === documento) ?? null;
  }
  async listar(filtro?: { nome?: string }) {
    return this.db
      .todos()
      .filter((c) => !filtro?.nome || c.nome.toLowerCase().includes(filtro.nome.toLowerCase()));
  }
  async salvar(c: Cliente) {
    this.db.salvar(c);
  }
  async remover(id: string) {
    this.db.remover(id);
  }
}

export class InMemoryVeiculoRepository extends VeiculoRepository {
  readonly db = new Armazem<Veiculo>();
  async buscarPorId(id: string) {
    return this.db.porId(id);
  }
  async buscarPorPlaca(placa: string) {
    return this.db.todos().find((v) => v.placa.valor === placa) ?? null;
  }
  async listar(filtro?: { clienteId?: string }) {
    return this.db.todos().filter((v) => !filtro?.clienteId || v.clienteId === filtro.clienteId);
  }
  async salvar(v: Veiculo) {
    this.db.salvar(v);
  }
  async remover(id: string) {
    this.db.remover(id);
  }
}

export class InMemoryServicoRepository extends ServicoRepository {
  readonly db = new Armazem<Servico>();
  async buscarPorId(id: string) {
    return this.db.porId(id);
  }
  async buscarPorNome(nome: string) {
    return this.db.todos().find((s) => s.nome === nome) ?? null;
  }
  async listar(filtro?: { apenasAtivos?: boolean }) {
    return this.db.todos().filter((s) => !filtro?.apenasAtivos || s.ativo);
  }
  async salvar(s: Servico) {
    this.db.salvar(s);
  }
  async remover(id: string) {
    this.db.remover(id);
  }
}

export class InMemoryPecaRepository extends PecaRepository {
  readonly db = new Armazem<Peca>();
  readonly movimentacoes: MovimentacaoEstoque[] = [];
  async buscarPorId(id: string) {
    const p = this.db.porId(id);
    // Retorna cópia, como um repositório real (evita aliasing entre leituras).
    return p
      ? Peca.restaurar(p.id, {
          codigo: p.codigo,
          nome: p.nome,
          tipo: p.tipo,
          unidade: p.unidade,
          precoCentavos: p.preco.centavos,
          quantidadeEstoque: p.quantidadeEstoque,
          estoqueMinimo: p.estoqueMinimo,
        })
      : null;
  }
  async buscarPorCodigo(codigo: string) {
    return this.db.todos().find((p) => p.codigo === codigo) ?? null;
  }
  async listar(filtro?: FiltroPecas) {
    return this.db
      .todos()
      .filter((p) => !filtro?.tipo || p.tipo === filtro.tipo)
      .filter((p) => !filtro?.abaixoDoMinimo || p.abaixoDoMinimo);
  }
  async salvar(p: Peca) {
    const atual = this.db.porId(p.id);
    // Saldo só é gravado na criação (igual ao repositório Prisma).
    if (atual && atual.quantidadeEstoque !== p.quantidadeEstoque) {
      const ajustada = Peca.restaurar(p.id, {
        codigo: p.codigo,
        nome: p.nome,
        tipo: p.tipo,
        unidade: p.unidade,
        precoCentavos: p.preco.centavos,
        quantidadeEstoque: atual.quantidadeEstoque,
        estoqueMinimo: p.estoqueMinimo,
      });
      this.db.salvar(ajustada);
      return;
    }
    this.db.salvar(p);
  }
  async remover(id: string) {
    this.db.remover(id);
  }
  async ajustarSaldo(pecaId: string, delta: number) {
    const p = this.db.porId(pecaId);
    if (!p || p.quantidadeEstoque + delta < 0) return false;
    if (delta > 0) p.darEntrada(delta);
    else if (delta < 0) p.darBaixa(-delta);
    return true;
  }
  async registrarMovimentacao(m: MovimentacaoEstoque) {
    this.movimentacoes.push(m);
  }
  async listarMovimentacoes(pecaId: string) {
    return this.movimentacoes.filter((m) => m.pecaId === pecaId);
  }
}

export class InMemoryOrdemServicoRepository extends OrdemServicoRepository {
  readonly db = new Armazem<OrdemServico>();
  salvamentos = 0;
  async buscarPorId(id: string) {
    return this.db.porId(id);
  }
  async buscarPorCodigo(codigo: string) {
    return this.db.todos().find((o) => o.codigo === codigo) ?? null;
  }
  async salvar(os: OrdemServico) {
    this.salvamentos++;
    this.db.salvar(os);
  }
}

export class FakeOrdemServicoConsultas extends OrdemServicoConsultas {
  resumos: ResumoOrdemServico[] = [];
  execucoes: ExecucaoConcluida[] = [];
  ultimoFiltro?: FiltroOrdensServico;
  ultimoPeriodo?: { de?: Date; ate?: Date };
  async listar(filtro: FiltroOrdensServico) {
    this.ultimoFiltro = filtro;
    return this.resumos;
  }
  async listarExecucoesConcluidas(periodo: { de?: Date; ate?: Date }) {
    this.ultimoPeriodo = periodo;
    return this.execucoes;
  }
}

export class FakeNotificadorCliente extends NotificadorCliente {
  mensagens: Parameters<NotificadorCliente['notificar']>[0][] = [];
  falhar = false;
  async notificar(m: Parameters<NotificadorCliente['notificar']>[0]) {
    if (this.falhar) throw new Error('canal indisponível');
    this.mensagens.push(m);
  }
}

/** Documentos válidos para testes. */
export const CPF_VALIDO = '52998224725';
export const CPF_VALIDO_2 = '11144477735';
export const CNPJ_VALIDO = '11222333000181';
