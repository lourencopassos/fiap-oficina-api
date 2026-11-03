-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ATENDENTE', 'MECANICO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "TipoPeca" AS ENUM ('PECA', 'INSUMO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "StatusOrdemServico" AS ENUM ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE');

-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoItemOrdemServico" AS ENUM ('SERVICO', 'PECA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco_centavos" INTEGER NOT NULL,
    "tempo_estimado_minutos" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPeca" NOT NULL,
    "unidade" TEXT NOT NULL,
    "preco_centavos" INTEGER NOT NULL,
    "quantidade_estoque" INTEGER NOT NULL,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pecas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" UUID NOT NULL,
    "peca_id" UUID NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "ordem_servico_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "veiculo_id" UUID NOT NULL,
    "status" "StatusOrdemServico" NOT NULL,
    "observacao" TEXT,
    "orcamento_status" "StatusOrcamento",
    "orcamento_valor_servicos_centavos" INTEGER,
    "orcamento_valor_pecas_centavos" INTEGER,
    "orcamento_enviado_em" TIMESTAMP(3),
    "orcamento_respondido_em" TIMESTAMP(3),
    "inicio_execucao" TIMESTAMP(3),
    "fim_execucao" TIMESTAMP(3),
    "entregue_em" TIMESTAMP(3),
    "criada_em" TIMESTAMP(3) NOT NULL,
    "atualizada_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_ordem_servico" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "tipo" "TipoItemOrdemServico" NOT NULL,
    "referencia_id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario_centavos" INTEGER NOT NULL,

    CONSTRAINT "itens_ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status_ordem_servico" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "status" "StatusOrdemServico" NOT NULL,
    "observacao" TEXT,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historico_status_ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "veiculos_cliente_id_idx" ON "veiculos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_nome_key" ON "servicos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "pecas_codigo_key" ON "pecas"("codigo");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_peca_id_idx" ON "movimentacoes_estoque"("peca_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_codigo_key" ON "ordens_servico"("codigo");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- CreateIndex
CREATE INDEX "ordens_servico_cliente_id_idx" ON "ordens_servico"("cliente_id");

-- CreateIndex
CREATE INDEX "itens_ordem_servico_ordem_servico_id_idx" ON "itens_ordem_servico"("ordem_servico_id");

-- CreateIndex
CREATE UNIQUE INDEX "historico_status_ordem_servico_ordem_servico_id_sequencia_key" ON "historico_status_ordem_servico"("ordem_servico_id", "sequencia");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_peca_id_fkey" FOREIGN KEY ("peca_id") REFERENCES "pecas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_ordem_servico" ADD CONSTRAINT "historico_status_ordem_servico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariantes reforçadas no banco (defesa em profundidade)
ALTER TABLE "pecas" ADD CONSTRAINT "pecas_quantidade_estoque_nao_negativa" CHECK ("quantidade_estoque" >= 0);
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_quantidade_positiva" CHECK ("quantidade" > 0);
