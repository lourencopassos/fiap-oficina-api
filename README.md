# Oficina Mecânica: Sistema Integrado de Atendimento e Execução de Serviços

> **FIAP Pós-Tech SOAT (Software Architecture): Tech Challenge, Fase 1**
> MVP do back-end monolítico com Domain-Driven Design.

| | |
|---|---|
| **Documentação DDD (FigJam)** | <https://www.figma.com/board/OSi3ythINp208qJgHLLyOh> |
| **Exports do board (PDF)** | [board completo](docs/ddd/board-completo.pdf) · [Event Storming](docs/ddd/event-storming.pdf) · [diagramas](docs/ddd/diagramas.pdf) |
| **Vídeo da entrega (YouTube)** | _`<inserir link do vídeo>`_ |
| **Event Storming** (3 fluxos) | [docs/ddd/event-storming.md](docs/ddd/event-storming.md) |
| **Diagramas DDD** | [docs/ddd/diagramas.md](docs/ddd/diagramas.md) |
| **Linguagem ubíqua e glossário** | [docs/ddd/linguagem-ubiqua.md](docs/ddd/linguagem-ubiqua.md) |
| **Evidência de cobertura de testes** | [docs/qualidade/cobertura-testes.md](docs/qualidade/cobertura-testes.md) |
| **Relatório de vulnerabilidades** | [docs/seguranca/relatorio-vulnerabilidades.md](docs/seguranca/relatorio-vulnerabilidades.md) |

---

## 1. Objetivo do projeto

Uma oficina mecânica de médio porte controla atendimento, diagnóstico, execução e entrega de veículos com anotações manuais e planilhas. Isso causa erros de priorização, falhas no controle de peças, dificuldade para acompanhar o status dos serviços, perda de histórico e ineficiência nos orçamentos.

Este projeto entrega a **primeira versão (MVP) do back-end** do sistema que organiza esse fluxo: gestão de **ordens de serviço, clientes, veículos, serviços e peças/insumos**, orçamento automático, aprovação pelo cliente via API e acompanhamento em tempo real, com foco em **DDD, qualidade de software e segurança**.

## 2. Descrição resumida da solução

- **Abertura da OS:** o cliente é identificado por **CPF/CNPJ**, o veículo é localizado ou cadastrado pela **placa** (marca, modelo, ano) e são incluídos **serviços** e **peças/insumos**.
- **Orçamento automático:** calculado a partir dos itens, com preço congelado no momento da inclusão, e enviado ao cliente.
- **Aprovação/rejeição:** o cliente decide pela **API pública** (código da OS + CPF/CNPJ) ou o atendente registra a decisão. Na aprovação, as peças são **baixadas do estoque na mesma transação** que inicia a execução.
- **Status com regras de transição:** *Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue*. As mudanças acontecem automaticamente conforme as ações, e cada uma fica registrada no histórico.
- **Acompanhamento pelo cliente:** status, orçamento e linha do tempo, com documento mascarado.
- **Gestão administrativa:** CRUD de clientes, veículos, serviços, peças/insumos (com **controle de estoque** e movimentações), usuários com perfis, listagem e detalhe de OS, e **tempo médio de execução** geral e por serviço.
- **Segurança:** JWT nas APIs administrativas, perfis de acesso, validação de CPF/CNPJ e placa, rate limit nas rotas públicas e hardening HTTP.

## 3. Arquitetura

**Monólito modular em camadas com DDD tático.** Cada *bounded context* é um módulo NestJS com quatro camadas, e as dependências apontam sempre para o domínio:

```
            ┌──────────────────────────────────────────────┐
  HTTP  ──▶ │ interfaces/http   controllers, DTOs, guards   │
            ├──────────────────────────────────────────────┤
            │ application       casos de uso, portas, views │
            ├──────────────────────────────────────────────┤
            │ domain            agregados, VOs, eventos,    │  ◀── sem dependência de framework/ORM
            │                   interfaces de repositório   │
            ├──────────────────────────────────────────────┤
            │ infrastructure    Prisma, JWT, bcrypt, logs   │ ──▶ PostgreSQL
            └──────────────────────────────────────────────┘
```

| Bounded context | Papel | Principais elementos |
|---|---|---|
| `atendimento` | **Core domain** | Agregado `OrdemServico` (itens, `Orcamento`, histórico, máquina de estados), eventos de domínio, política de notificação, métricas |
| `cadastro` | Suporte | `Cliente` (VO `Documento`), `Veiculo` (VO `Placa`) |
| `catalogo` | Suporte | `Servico` (preço de tabela, tempo estimado) |
| `estoque` | Suporte | `Peca` (peça/insumo, saldo, mínimo), `MovimentacaoEstoque` |
| `identidade` | Genérico | `Usuario`, `Role`, JWT, guards |
| `shared` | Shared kernel | `Entity`, `AggregateRoot`, `DomainEvent`, VOs `Documento`, `Placa`, `Dinheiro`, `Email`, `UnidadeDeTrabalho` |

Decisões arquiteturais relevantes:

- **Domínio puro:** as entidades não conhecem NestJS nem Prisma. Os repositórios são **classes abstratas no domínio** (portas), com adaptadores Prisma na infraestrutura e mappers explícitos.
- **Transações:** a porta `UnidadeDeTrabalho` delimita a transação. A implementação usa `@nestjs-cls/transactional`, que propaga o cliente transacional do Prisma pelo contexto da requisição. Os fluxos críticos (abrir OS, incluir itens, mudar status, aprovar com baixa de estoque, entrada de estoque) são atômicos.
- **Concorrência de estoque:** a baixa usa um `UPDATE ... WHERE quantidade_estoque >= n` atômico, com um `CHECK (quantidade_estoque >= 0)` no banco como segunda barreira.
- **Eventos de domínio:** são acumulados no agregado e **publicados após o commit** (EventEmitter). A política `NotificarClientePolicy` reage a eles por meio da porta `NotificadorCliente`, que no MVP é um adaptador de log.
- **CQRS leve:** listagens e métricas usam um *read model* (`OrdemServicoConsultas`) com queries otimizadas, sem reconstruir agregados.

Mais detalhes:
- [docs/ddd/event-storming.md](docs/ddd/event-storming.md): Event Storming da criação da OS, do acompanhamento e da gestão de peças, com atores, comandos, eventos, políticas, read models e hotspots;
- [docs/ddd/diagramas.md](docs/ddd/diagramas.md): camadas, mapa de contextos, modelo de domínio, máquina de estados, sequência transacional da aprovação e modelo de dados;
- [docs/ddd/linguagem-ubiqua.md](docs/ddd/linguagem-ubiqua.md): linguagem ubíqua, glossário e relação documentação ↔ código.

## 4. Tecnologias utilizadas

| Categoria | Tecnologia |
|---|---|
| Linguagem / runtime | TypeScript 5, Node.js 22 (mínimo 22.19) |
| Framework | NestJS 11 |
| Banco de dados | PostgreSQL 16 |
| ORM / migrations | Prisma 6 |
| Transações | nestjs-cls + @nestjs-cls/transactional |
| Autenticação | JWT (@nestjs/jwt, HS256) + bcrypt |
| Validação | class-validator / class-transformer + Value Objects do domínio |
| Documentação da API | OpenAPI 3 / Swagger UI (@nestjs/swagger) |
| Segurança HTTP | helmet, @nestjs/throttler (rate limit) |
| Testes | Jest, Supertest, Testcontainers (PostgreSQL) |
| Qualidade | ESLint, Prettier |
| Containers | Docker (multi-stage, usuário não-root), Docker Compose |
| CI / segurança | GitHub Actions, npm audit, Trivy (fs + imagem) |

## 5. Pré-requisitos

- **Docker** 20+ e **Docker Compose** v2, para a execução completa (recomendado); **ou**
- **Node.js 22.19+** e **npm 10+**, com um **PostgreSQL 14+** acessível, para rodar sem Docker. O repositório tem um `.nvmrc`: com o [nvm](https://github.com/nvm-sh/nvm), basta `nvm install && nvm use`.
  > Node 20 não é suportado: os testes de integração usam o Testcontainers 12, que exige Node 22.19 ou superior.

## 6. Execução

### Opção A: Docker Compose (recomendado)

```bash
cp .env.example .env          # ajuste senhas e o JWT_SECRET
docker compose up --build
```

A API sobe em **http://localhost:3000**. Na inicialização, o container aplica as migrations e executa o seed (usuário admin + catálogo de demonstração).

### Opção B: localmente com Node.js

```bash
cp .env.example .env          # aponte DATABASE_URL para seu PostgreSQL
npm ci
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # admin + catálogo de demonstração
npm run start:dev             # http://localhost:3000
```

Dica: para subir só o banco via Docker, use `docker compose up -d db`.

## 7. Testes

```bash
npm test               # testes unitários
npm run test:cov       # unitários + relatório de cobertura (falha se < 80%)
npm run test:e2e       # integração: API + PostgreSQL real
npm run lint           # análise estática
```

Os testes de integração precisam de um banco **vazio**:

- **Com Docker disponível:** basta rodar `npm run test:e2e`. Um PostgreSQL efêmero é criado via **Testcontainers**.
- **Sem Docker:** crie um banco vazio e informe-o em `E2E_DATABASE_URL`:

  ```bash
  E2E_DATABASE_URL="postgresql://usuario:senha@localhost:5432/oficina_e2e" npm run test:e2e
  ```

Resultado atual: **159 testes unitários** (cobertura de 99,7% de statements e 94% de branches nos domínios críticos) e **22 testes de integração**. Veja [docs/qualidade/cobertura-testes.md](docs/qualidade/cobertura-testes.md).

## 8. Documentação da API (Swagger)

- **Swagger UI:** http://localhost:3000/docs
- **OpenAPI JSON:** http://localhost:3000/docs-json

Para chamar rotas `/admin/*` no Swagger: execute `POST /auth/login`, copie o `accessToken`, clique em **Authorize** e cole o token.

| Grupo | Rotas principais |
|---|---|
| Autenticação | `POST /auth/login` |
| Usuários (ADMIN) | `/admin/usuarios` (CRUD) |
| Clientes | `/admin/clientes` (CRUD), `GET /admin/clientes/documento/{cpfCnpj}` |
| Veículos | `/admin/veiculos` (CRUD) |
| Serviços | `/admin/servicos` (CRUD) |
| Peças e insumos | `/admin/pecas` (CRUD), `POST /admin/pecas/{id}/entradas`, `GET /admin/pecas/{id}/movimentacoes` |
| Ordens de serviço | `POST/GET /admin/ordens-servico`, `GET /{id}`, `POST /{id}/diagnostico`, `/{id}/servicos`, `/{id}/pecas`, `DELETE /{id}/itens/{itemId}`, `POST /{id}/orcamento/enviar`, `/{id}/orcamento/aprovar`, `/{id}/orcamento/rejeitar`, `/{id}/finalizar`, `/{id}/entregar` |
| Métricas | `GET /admin/metricas/tempo-medio-execucao?de=&ate=` |
| **Cliente (público)** | `GET /public/ordens-servico/{codigo}?documento=`, `POST /public/ordens-servico/{codigo}/orcamento/aprovar`, `POST .../orcamento/rejeitar` |
| Health | `GET /health` |

### Roteiro rápido (curl)

```bash
# 1. Login
TOKEN=$(curl -s localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"Admin@123"}' | jq -r .accessToken)

# 2. Cadastrar cliente
curl -s localhost:3000/admin/clientes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"João da Silva","documento":"529.982.247-25"}'

# 3. Abrir OS (IDs de serviço/peça em GET /admin/servicos e GET /admin/pecas)
curl -s localhost:3000/admin/ordens-servico -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"documentoCliente":"52998224725","veiculo":{"placa":"BRA2E19","marca":"VW","modelo":"Gol","ano":2020},
       "servicos":[{"servicoId":"<id>"}],"pecas":[{"pecaId":"<id>","quantidade":1}]}'

# 4. Enviar orçamento → 5. cliente consulta e aprova (sem token)
curl -s -X POST localhost:3000/admin/ordens-servico/<id>/orcamento/enviar -H "Authorization: Bearer $TOKEN"
curl -s "localhost:3000/public/ordens-servico/<codigo>?documento=52998224725"
curl -s localhost:3000/public/ordens-servico/<codigo>/orcamento/aprovar -H 'Content-Type: application/json' \
  -d '{"documento":"52998224725"}'
```

## 9. Banco de dados: decisão e justificativa

**PostgreSQL** foi escolhido por:

1. **Transações ACID:** os fluxos centrais (aprovar o orçamento e baixar o estoque, abrir a OS com veículo e itens) exigem atomicidade. Uma aprovação não pode iniciar a execução sem que as peças tenham sido reservadas, nem baixar parte das peças.
2. **Integridade relacional:** o domínio é naturalmente relacional (cliente → veículos → ordens de serviço → itens; peça → movimentações). Chaves estrangeiras com `RESTRICT` impedem remover um cliente ou veículo com histórico, e `UNIQUE` garante CPF/CNPJ, placa e código de peça únicos.
3. **Concorrência segura:** bloqueio por linha e `UPDATE` condicional evitam *overselling* de estoque em aprovações simultâneas (comprovado em teste de integração). Um `CHECK` reforça o saldo não negativo.
4. **Consultas analíticas:** agregações como o tempo médio de execução e filtros por status são simples e eficientes em SQL, com índices em `status` e `cliente_id`.
5. **Ecossistema e operação:** é open source, maduro e disponível como serviço gerenciado em todas as nuvens (RDS, Cloud SQL, Azure), com suporte de primeira classe no Prisma (migrations versionadas em `prisma/migrations`).

Um banco orientado a documentos encaixaria bem no agregado OS isoladamente, mas complicaria as garantias transacionais **entre agregados** (OS ↔ estoque), que são o ponto mais sensível do negócio.

## 10. Usuários, credenciais de demonstração e autenticação

O seed cria um administrador **para demonstração**, com credenciais configuráveis no `.env`:

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | `admin@oficina.com` (`ADMIN_EMAIL`) | `Admin@123` (`ADMIN_SENHA`) |

> Troque essas credenciais em qualquer ambiente que não seja de demonstração. Novos usuários (perfis `ATENDENTE` e `MECANICO`) são criados pelo admin em `POST /admin/usuarios`.

**Procedimento:**

1. `POST /auth/login` com `{ "email", "senha" }` retorna `{ accessToken, expiresIn, usuario }`.
2. Envie o header `Authorization: Bearer <accessToken>` em todas as rotas `/admin/*`.
3. Rotas `/public/*` (cliente) não usam JWT: a autorização é o par **código da OS + CPF/CNPJ do titular**. Qualquer divergência retorna 404, sem revelar se a OS existe.

| Perfil | Permissões |
|---|---|
| `ADMIN` | Acesso total (usuários, catálogo, estoque, métricas e todas as operações) |
| `ATENDENTE` | Clientes, veículos, abertura de OS, orçamento, registro de aprovação/rejeição e entrega |
| `MECANICO` | Consulta de cadastros, diagnóstico, inclusão de itens, envio de orçamento e finalização |

**Controles de segurança:** senhas com bcrypt e política mínima (8+ caracteres, letras e números); JWT HS256 com segredo de pelo menos 32 caracteres validado na inicialização; mensagens de login genéricas; rate limit no login e nas rotas públicas; `helmet`; `ValidationPipe` com whitelist (rejeita campos extras); CPF/CNPJ mascarado nas respostas públicas e nos logs; nenhum segredo versionado (`.env` no `.gitignore`).

## 11. Estrutura de diretórios

```
.
├── src/
│   ├── main.ts / app.module.ts / app.setup.ts   # bootstrap, Swagger, helmet, pipes
│   ├── config/                                  # validação de variáveis de ambiente
│   ├── health/                                  # health check (API + banco)
│   ├── shared/
│   │   ├── domain/            # Entity, AggregateRoot, DomainEvent, DomainError, VOs
│   │   ├── application/       # portas: UnidadeDeTrabalho, PublicadorEventos, erros
│   │   └── infrastructure/    # Prisma, transações (CLS), eventos, filtro de erros, validators
│   └── modules/
│       ├── atendimento/       # CORE: OrdemServico, orçamento, status, métricas, API pública
│       ├── cadastro/          # clientes e veículos
│       ├── catalogo/          # serviços
│       ├── estoque/           # peças/insumos e movimentações
│       └── identidade/        # usuários, JWT, roles
│           └── (cada módulo)  domain/ · application/ · infrastructure/ · interfaces/http/
├── prisma/
│   ├── schema.prisma          # modelo de dados
│   ├── migrations/            # migrations versionadas
│   └── seed.js                # admin + catálogo de demonstração (idempotente)
├── test/
│   ├── fakes/                 # dublês em memória para testes unitários
│   └── e2e/                   # testes de integração (Supertest + PostgreSQL)
├── docs/
│   ├── ddd/                   # event storming, diagramas, linguagem ubíqua
│   │   ├── *.pdf              # exports do FigJam: board completo, event storming, diagramas
│   │   └── diagramas/         # um PDF por diagrama (01 a 06)
│   ├── qualidade/             # evidência de cobertura
│   └── seguranca/             # relatório de vulnerabilidades
├── .github/workflows/ci.yml   # lint, build, testes, cobertura, audit, Trivy
├── Dockerfile                 # build multi-stage, usuário não-root, healthcheck
├── docker-compose.yml         # PostgreSQL + API
└── .env.example               # modelo de configuração (sem segredos reais)
```

Os testes unitários ficam ao lado do código (`*.spec.ts`).

## 12. Análise de vulnerabilidades

- `npm run audit:report` regera [docs/seguranca/relatorio-vulnerabilidades.md](docs/seguranca/relatorio-vulnerabilidades.md). Resultado atual:
  - **Dependências de produção** (o que vai na imagem Docker): **0 vulnerabilidades**. As transitivas vulneráveis foram corrigidas via `overrides`.
  - **Ferramentas de build/teste** (dev): 3 advisories de origem, de severidade moderada ou baixa (`glob`, `minimatch`, `deepmerge`, puxados por Jest e Nest CLI). Não entram na imagem, e o risco aceito está justificado no relatório.
- O CI executa `npm audit --audit-level=high` e **Trivy** (filesystem: dependências, segredos e misconfig; e imagem Docker). Os relatórios ficam publicados como artefato de cada execução.

## 13. Fluxo de contribuição

A branch `main` é protegida: toda alteração entra por **Pull Request**, com o pipeline de CI verde (lint, build, testes com cobertura de 80% ou mais, integração e segurança).

## 14. Links da entrega

- **Documentação DDD (FigJam):** <https://www.figma.com/board/OSi3ythINp208qJgHLLyOh> (PDFs: [board completo](docs/ddd/board-completo.pdf), [Event Storming](docs/ddd/event-storming.pdf), [diagramas](docs/ddd/diagramas.pdf))
- **Vídeo (YouTube):** _`<inserir link>`_
