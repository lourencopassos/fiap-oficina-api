import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/app.setup';
import { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';

const CPF = '529.982.247-25';
const CPF_OUTRO = '111.444.777-35';

describe('API da Oficina (integração com PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let tokenAdmin: string;

  const auth = (token = tokenAdmin) => ({ Authorization: `Bearer ${token}` });

  const login = async (email: string, senha: string) => {
    const res = await http.post('/auth/login').send({ email, senha }).expect(200);
    return res.body.accessToken as string;
  };

  const criarPeca = async (codigo: string, quantidadeEstoque: number, precoCentavos = 3500) =>
    (
      await http
        .post('/admin/pecas')
        .set(auth())
        .send({
          codigo,
          nome: `Peça ${codigo}`,
          tipo: 'PECA',
          unidade: 'UN',
          precoCentavos,
          quantidadeEstoque,
        })
        .expect(201)
    ).body;

  const saldo = async (pecaId: string) =>
    (await http.get(`/admin/pecas/${pecaId}`).set(auth()).expect(200)).body
      .quantidadeEstoque as number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configurarApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    await prisma.usuario.create({
      data: {
        id: randomUUID(),
        nome: 'Admin',
        email: 'admin@oficina.com',
        senhaHash: await bcrypt.hash('Admin@123', 10),
        role: 'ADMIN',
      },
    });
    tokenAdmin = await login('admin@oficina.com', 'Admin@123');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('infraestrutura', () => {
    it('health check verifica o banco', async () => {
      await http.get('/health').expect(200, { status: 'ok', banco: 'ok' });
    });

    it('expõe documentação OpenAPI', async () => {
      const res = await http.get('/docs-json').expect(200);
      expect(res.body.paths).toHaveProperty('/admin/ordens-servico');
      expect(res.body.components.securitySchemes).toHaveProperty('bearer');
    });
  });

  describe('autenticação e autorização', () => {
    it('rotas administrativas exigem JWT', async () => {
      await http.get('/admin/clientes').expect(401);
      await http.get('/admin/clientes').set(auth('token-invalido')).expect(401);
    });

    it('login com credenciais inválidas retorna 401 genérico', async () => {
      const res = await http
        .post('/auth/login')
        .send({ email: 'admin@oficina.com', senha: 'errada' })
        .expect(401);
      expect(res.body.mensagem).toBe('Credenciais inválidas');
    });

    it('aplica perfis (roles): mecânico não gerencia catálogo nem usuários', async () => {
      await http
        .post('/admin/usuarios')
        .set(auth())
        .send({ nome: 'Mecânico', email: 'mec@oficina.com', senha: 'Mecanico1', role: 'MECANICO' })
        .expect(201);
      const tokenMecanico = await login('mec@oficina.com', 'Mecanico1');

      await http.get('/admin/servicos').set(auth(tokenMecanico)).expect(200);
      await http
        .post('/admin/servicos')
        .set(auth(tokenMecanico))
        .send({ nome: 'X', precoCentavos: 1 })
        .expect(403);
      await http.get('/admin/usuarios').set(auth(tokenMecanico)).expect(403);
    });
  });

  describe('validação de dados sensíveis', () => {
    it('rejeita CPF/CNPJ inválido e campos desconhecidos', async () => {
      const res = await http
        .post('/admin/clientes')
        .set(auth())
        .send({ nome: 'João', documento: '123.456.789-00' })
        .expect(400);
      expect(JSON.stringify(res.body.mensagem)).toContain('CPF ou CNPJ');
      await http
        .post('/admin/clientes')
        .set(auth())
        .send({ nome: 'João', documento: CPF, admin: true })
        .expect(400);
    });

    it('rejeita placa inválida', async () => {
      const cliente = (
        await http
          .post('/admin/clientes')
          .set(auth())
          .send({ nome: 'Placa Teste', documento: '11.222.333/0001-81' })
          .expect(201)
      ).body;
      await http
        .post('/admin/veiculos')
        .set(auth())
        .send({ clienteId: cliente.id, placa: 'AB-12', marca: 'Fiat', modelo: 'Uno', ano: 2010 })
        .expect(400);
    });
  });

  describe('fluxo principal da Ordem de Serviço', () => {
    let clienteId: string;
    let trocaOleoId: string;
    let alinhamentoId: string;
    let filtro: { id: string };
    let osId: string;
    let codigo: string;

    beforeAll(async () => {
      clienteId = (
        await http
          .post('/admin/clientes')
          .set(auth())
          .send({ nome: 'João da Silva', documento: CPF })
          .expect(201)
      ).body.id;
      trocaOleoId = (
        await http
          .post('/admin/servicos')
          .set(auth())
          .send({ nome: 'Troca de óleo', precoCentavos: 8000 })
          .expect(201)
      ).body.id;
      alinhamentoId = (
        await http
          .post('/admin/servicos')
          .set(auth())
          .send({ nome: 'Alinhamento', precoCentavos: 12000 })
          .expect(201)
      ).body.id;
      filtro = await criarPeca('FLT-001', 5);
    });

    it('impede cliente duplicado (409)', async () => {
      await http
        .post('/admin/clientes')
        .set(auth())
        .send({ nome: 'Outro', documento: '52998224725' })
        .expect(409);
    });

    it('abre a OS identificando o cliente pelo CPF e cadastrando o veículo', async () => {
      const res = await http
        .post('/admin/ordens-servico')
        .set(auth())
        .send({
          documentoCliente: CPF,
          veiculo: { placa: 'BRA2E19', marca: 'Volkswagen', modelo: 'Gol', ano: 2020 },
          servicos: [{ servicoId: trocaOleoId }],
          pecas: [{ pecaId: filtro.id, quantidade: 2 }],
        })
        .expect(201);
      osId = res.body.id;
      codigo = res.body.codigo;
      expect(res.body).toMatchObject({
        status: 'EM_DIAGNOSTICO',
        cliente: { id: clienteId },
        veiculo: { placa: 'BRA2E19' },
      });
      expect(res.body.valorTotalItensCentavos).toBe(8000 + 2 * 3500);
    });

    it('inclui mais um serviço durante o diagnóstico', async () => {
      const res = await http
        .post(`/admin/ordens-servico/${osId}/servicos`)
        .set(auth())
        .send({ servicoId: alinhamentoId })
        .expect(200);
      expect(res.body.itens).toHaveLength(3);
    });

    it('bloqueia transição inválida (finalizar antes da aprovação)', async () => {
      const res = await http
        .post(`/admin/ordens-servico/${osId}/finalizar`)
        .set(auth())
        .send({})
        .expect(422);
      expect(res.body.codigo).toBe('STATUS_INCOMPATIVEL');
    });

    it('gera e envia o orçamento automaticamente', async () => {
      const res = await http
        .post(`/admin/ordens-servico/${osId}/orcamento/enviar`)
        .set(auth())
        .expect(200);
      expect(res.body.status).toBe('AGUARDANDO_APROVACAO');
      expect(res.body.orcamento).toMatchObject({
        status: 'PENDENTE',
        valorServicosCentavos: 20000,
        valorPecasCentavos: 7000,
        valorTotalCentavos: 27000,
      });
    });

    it('cliente consulta a OS pela API pública somente com o próprio documento', async () => {
      await http
        .get(`/public/ordens-servico/${codigo}`)
        .query({ documento: CPF_OUTRO })
        .expect(404);
      const res = await http
        .get(`/public/ordens-servico/${codigo}`)
        .query({ documento: '52998224725' })
        .expect(200);
      expect(res.body).toMatchObject({
        codigo,
        status: 'AGUARDANDO_APROVACAO',
        cliente: { documento: '***.982.247-**' },
      });
      expect(res.body.historico.map((h: { status: string }) => h.status)).toEqual([
        'RECEBIDA',
        'EM_DIAGNOSTICO',
        'AGUARDANDO_APROVACAO',
      ]);
    });

    it('cliente aprova: execução iniciada e estoque baixado na mesma transação', async () => {
      const res = await http
        .post(`/public/ordens-servico/${codigo}/orcamento/aprovar`)
        .send({ documento: CPF })
        .expect(200);
      expect(res.body.status).toBe('EM_EXECUCAO');
      expect(await saldo(filtro.id)).toBe(3);
      const movs = (
        await http.get(`/admin/pecas/${filtro.id}/movimentacoes`).set(auth()).expect(200)
      ).body;
      expect(movs[0]).toMatchObject({ tipo: 'SAIDA', quantidade: 2, ordemServicoId: osId });
    });

    it('finaliza e entrega, registrando histórico e tempo de execução', async () => {
      await http
        .post(`/admin/ordens-servico/${osId}/finalizar`)
        .set(auth())
        .send({ observacao: 'Serviços concluídos' })
        .expect(200);
      const res = await http
        .post(`/admin/ordens-servico/${osId}/entregar`)
        .set(auth())
        .send({})
        .expect(200);
      expect(res.body.status).toBe('ENTREGUE');
      expect(res.body.tempoExecucaoMinutos).toEqual(expect.any(Number));
      expect(res.body.historico).toHaveLength(6);
    });

    it('lista e detalha ordens de serviço', async () => {
      const lista = (
        await http
          .get('/admin/ordens-servico')
          .query({ status: 'ENTREGUE' })
          .set(auth())
          .expect(200)
      ).body;
      expect(lista).toEqual([
        expect.objectContaining({
          id: osId,
          codigo,
          cliente: { id: clienteId, nome: 'João da Silva' },
        }),
      ]);
      const detalhe = (await http.get(`/admin/ordens-servico/${osId}`).set(auth()).expect(200))
        .body;
      expect(detalhe.orcamento.status).toBe('APROVADO');
    });

    it('calcula o tempo médio de execução', async () => {
      const res = await http.get('/admin/metricas/tempo-medio-execucao').set(auth()).expect(200);
      expect(res.body.totalOrdensConsideradas).toBe(1);
      expect(res.body.porServico.map((s: { servico: string }) => s.servico).sort()).toEqual([
        'Alinhamento',
        'Troca de óleo',
      ]);
    });

    it('não remove cliente com OS vinculada (409)', async () => {
      await http.delete(`/admin/clientes/${clienteId}`).set(auth()).expect(409);
    });
  });

  describe('transações e regras de estoque', () => {
    const abrirEEnviar = async (pecas: { pecaId: string; quantidade: number }[], placa: string) => {
      const os = (
        await http
          .post('/admin/ordens-servico')
          .set(auth())
          .send({
            documentoCliente: CPF_OUTRO,
            veiculo: { placa, marca: 'Fiat', modelo: 'Uno', ano: 2012 },
            pecas,
          })
          .expect(201)
      ).body;
      await http.post(`/admin/ordens-servico/${os.id}/orcamento/enviar`).set(auth()).expect(200);
      return os;
    };

    beforeAll(async () => {
      await http
        .post('/admin/clientes')
        .set(auth())
        .send({ nome: 'Maria', documento: CPF_OUTRO })
        .expect(201);
    });

    it('falha de estoque na 2ª peça desfaz a baixa da 1ª e mantém a OS aguardando (rollback)', async () => {
      const pecaA = await criarPeca('PC-A', 10);
      const pecaB = await criarPeca('PC-B', 1);
      const os = await abrirEEnviar(
        [
          { pecaId: pecaA.id, quantidade: 3 },
          { pecaId: pecaB.id, quantidade: 5 },
        ],
        'ABC1234',
      );

      const res = await http
        .post(`/admin/ordens-servico/${os.id}/orcamento/aprovar`)
        .set(auth())
        .expect(422);
      expect(res.body.codigo).toBe('ESTOQUE_INSUFICIENTE');

      expect(await saldo(pecaA.id)).toBe(10);
      expect(await saldo(pecaB.id)).toBe(1);
      const atual = (await http.get(`/admin/ordens-servico/${os.id}`).set(auth()).expect(200)).body;
      expect(atual.status).toBe('AGUARDANDO_APROVACAO');
      expect(atual.orcamento.status).toBe('PENDENTE');
    });

    it('aprovações concorrentes não deixam o estoque negativo', async () => {
      const peca = await criarPeca('PC-CONC', 3);
      const os1 = await abrirEEnviar([{ pecaId: peca.id, quantidade: 2 }], 'CON1A11');
      const os2 = await abrirEEnviar([{ pecaId: peca.id, quantidade: 2 }], 'CON2B22');

      const respostas = await Promise.all([
        http.post(`/admin/ordens-servico/${os1.id}/orcamento/aprovar`).set(auth()),
        http.post(`/admin/ordens-servico/${os2.id}/orcamento/aprovar`).set(auth()),
      ]);
      expect(respostas.map((r) => r.status).sort()).toEqual([200, 422]);
      expect(await saldo(peca.id)).toBe(1);
    });

    it('cliente rejeita: OS encerrada sem execução e estoque intacto', async () => {
      const peca = await criarPeca('PC-REJ', 4);
      const os = await abrirEEnviar([{ pecaId: peca.id, quantidade: 2 }], 'REJ1C23');
      const res = await http
        .post(`/public/ordens-servico/${os.codigo}/orcamento/rejeitar`)
        .send({ documento: CPF_OUTRO, motivo: 'Vou pensar' })
        .expect(200);
      expect(res.body.status).toBe('FINALIZADA');
      expect(res.body.orcamento.status).toBe('REJEITADO');
      expect(await saldo(peca.id)).toBe(4);
    });

    it('entrada de estoque registra movimentação', async () => {
      const peca = await criarPeca('PC-ENT', 0);
      const res = await http
        .post(`/admin/pecas/${peca.id}/entradas`)
        .set(auth())
        .send({ quantidade: 7, motivo: 'NF 123' })
        .expect(201);
      expect(res.body.quantidadeEstoque).toBe(7);
      const abaixo = (
        await http.get('/admin/pecas').query({ abaixoDoMinimo: true }).set(auth()).expect(200)
      ).body;
      expect(abaixo.every((p: { abaixoDoMinimo: boolean }) => p.abaixoDoMinimo)).toBe(true);
    });
  });
});
