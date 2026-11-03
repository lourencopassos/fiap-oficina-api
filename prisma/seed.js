/* eslint-disable */
// Seed idempotente: cria o usuário administrador e um catálogo inicial de demonstração.
// Em JavaScript puro para rodar no container de produção sem ts-node.
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SERVICOS = [
  { nome: 'Troca de óleo', descricao: 'Troca do óleo do motor', precoCentavos: 8000, tempoEstimadoMinutos: 30 },
  { nome: 'Alinhamento', descricao: 'Alinhamento de direção', precoCentavos: 12000, tempoEstimadoMinutos: 45 },
  { nome: 'Balanceamento', descricao: 'Balanceamento das 4 rodas', precoCentavos: 10000, tempoEstimadoMinutos: 40 },
  { nome: 'Revisão de freios', descricao: 'Inspeção e troca de pastilhas', precoCentavos: 18000, tempoEstimadoMinutos: 90 },
  { nome: 'Diagnóstico eletrônico', descricao: 'Leitura de falhas via scanner', precoCentavos: 15000, tempoEstimadoMinutos: 60 },
];

const PECAS = [
  { codigo: 'OLEO-5W30-1L', nome: 'Óleo de motor 5W30 (1L)', tipo: 'INSUMO', unidade: 'L', precoCentavos: 4500, quantidadeEstoque: 40, estoqueMinimo: 10 },
  { codigo: 'FLT-OLEO-001', nome: 'Filtro de óleo', tipo: 'PECA', unidade: 'UN', precoCentavos: 3500, quantidadeEstoque: 15, estoqueMinimo: 5 },
  { codigo: 'PAST-FREIO-DIA', nome: 'Jogo de pastilhas de freio dianteiras', tipo: 'PECA', unidade: 'JG', precoCentavos: 16000, quantidadeEstoque: 6, estoqueMinimo: 2 },
  { codigo: 'FLUIDO-DOT4', nome: 'Fluido de freio DOT4 (500ml)', tipo: 'INSUMO', unidade: 'UN', precoCentavos: 3800, quantidadeEstoque: 12, estoqueMinimo: 4 },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@oficina.com').toLowerCase();
  const senha = process.env.ADMIN_SENHA || 'Admin@123';
  const nome = process.env.ADMIN_NOME || 'Administrador';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (!existente) {
    await prisma.usuario.create({
      data: { id: randomUUID(), nome, email, senhaHash: await bcrypt.hash(senha, 10), role: 'ADMIN' },
    });
    console.log(`[seed] Usuário administrador criado: ${email}`);
  } else {
    console.log(`[seed] Usuário administrador já existe: ${email}`);
  }

  for (const s of SERVICOS) {
    await prisma.servico.upsert({ where: { nome: s.nome }, update: {}, create: { id: randomUUID(), ...s } });
  }
  for (const p of PECAS) {
    await prisma.peca.upsert({ where: { codigo: p.codigo }, update: {}, create: { id: randomUUID(), ...p } });
  }
  console.log(`[seed] Catálogo garantido: ${SERVICOS.length} serviços, ${PECAS.length} peças/insumos`);
}

main()
  .catch((e) => {
    console.error('[seed] Falha:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
