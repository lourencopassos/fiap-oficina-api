# Diagramas: Oficina Mecânica

Diagramas da solução entregue, em [Mermaid](https://mermaid.js.org/), que o GitHub renderiza direto. Os mesmos diagramas estão no [board do FigJam](https://www.figma.com/board/OSi3ythINp208qJgHLLyOh), à direita dos fluxos de Event Storming. A exportação em PDF fica em [diagramas.pdf](diagramas.pdf).

> Para exportar sem redesenhar: cole o bloco no [Mermaid Live Editor](https://mermaid.live) e use *Actions → PNG/SVG*. O diagrama de classes (seção 3) aparece no FigJam como flowchart de agregados, porque o FigJam não importa diagramas de classe.

| # | Diagrama | Para que serve |
|---|---|---|
| 1 | [Arquitetura em camadas](#1-arquitetura-em-camadas-monólito-modular) | Como o monólito está organizado |
| 2 | [Mapa de contextos](#2-mapa-de-contextos-bounded-contexts) | Bounded contexts e como se relacionam |
| 3 | [Modelo de domínio](#3-modelo-de-domínio-agregados-entidades-e-objetos-de-valor) | Agregados, entidades e objetos de valor |
| 4 | [Máquina de estados da OS](#4-máquina-de-estados-da-ordem-de-serviço) | Status e regras de transição |
| 5 | [Sequência: aprovação do orçamento](#5-sequência-aprovação-do-orçamento-transação-e-eventos) | Transação, baixa de estoque e eventos |
| 6 | [Modelo de dados](#6-modelo-de-dados-postgresql) | Tabelas e relacionamentos no PostgreSQL |

---

## 1. Arquitetura em camadas (monólito modular)

Cada bounded context é um módulo NestJS com as mesmas quatro camadas. As dependências apontam **para o domínio**, que não conhece framework nem ORM.

```mermaid
flowchart TB
  cliente(["Cliente / Funcionário<br/>HTTP + JSON"])

  subgraph MONOLITO["oficina-api (um processo, um deploy)"]
    direction TB
    subgraph I["interfaces/http"]
      i1["Controllers · DTOs · Guards JWT/Roles · Swagger"]
    end
    subgraph A["application"]
      a1["Casos de uso · Serviços de aplicação · Políticas · Views"]
    end
    subgraph D["domain"]
      d1["Agregados · Entidades · Value Objects<br/>Eventos de domínio · Portas (repositórios abstratos)"]
    end
    subgraph INF["infrastructure"]
      n1["Repositórios Prisma · JWT · bcrypt · EventEmitter · Notificador (log)"]
    end
    I --> A --> D
    INF -. "implementa portas" .-> D
    A -. "usa portas" .-> INF
  end

  db[("PostgreSQL 16")]
  cliente --> I
  INF --> db
```

| Camada | Pasta | Conteúdo |
|---|---|---|
| Interfaces | `src/modules/*/interfaces/http` | Controllers REST, DTOs com `class-validator`, guards |
| Aplicação | `src/modules/*/application` | Casos de uso (`*.use-case.ts`), serviços, políticas, views |
| Domínio | `src/modules/*/domain`, `src/shared/domain` | Regras de negócio puras, sem dependência de framework |
| Infraestrutura | `src/modules/*/infrastructure`, `src/shared/infrastructure` | Prisma, transações (CLS), JWT, eventos |

---

## 2. Mapa de contextos (bounded contexts)

```mermaid
flowchart LR
  subgraph CORE["Core domain"]
    AT["<b>Atendimento</b><br/>OrdemServico · Orcamento<br/>HistoricoStatus"]
  end
  subgraph SUP["Supporting"]
    CAD["<b>Cadastro</b><br/>Cliente · Veiculo"]
    CAT["<b>Catálogo</b><br/>Servico"]
    EST["<b>Estoque</b><br/>Peca · MovimentacaoEstoque"]
  end
  subgraph GEN["Generic"]
    ID["<b>Identidade</b><br/>Usuario · Role · JWT"]
  end
  SK[("<b>Shared Kernel</b><br/>Documento · Placa<br/>Dinheiro · Email")]

  CAD -- "U → D<br/>Customer/Supplier" --> AT
  CAT -- "U → D<br/>Customer/Supplier<br/>(preço congelado)" --> AT
  EST -- "U → D<br/>Customer/Supplier<br/>(baixa na aprovação)" --> AT
  ID -. "protege /admin/*" .-> AT & CAD & CAT & EST
  SK --- AT & CAD & CAT & EST

  classDef core fill:#FFA94D,stroke:#D9480F,color:#000
  classDef sup fill:#74C0FC,stroke:#1971C2,color:#000
  classDef gen fill:#CED4DA,stroke:#495057,color:#000
  classDef sk fill:#8CE99A,stroke:#2B8A3E,color:#000
  class AT core
  class CAD,CAT,EST sup
  class ID gen
  class SK sk
```

| Contexto | Tipo | Relação com Atendimento | Integração no código |
|---|---|---|---|
| **Atendimento** | Core | | `src/modules/atendimento` |
| **Cadastro** | Supporting | Upstream (fornecedor) | `ClientesService`, `VeiculosService` |
| **Catálogo** | Supporting | Upstream; o preço vira *snapshot* no item da OS | `ServicosService` |
| **Estoque** | Supporting | Upstream; baixa síncrona na mesma transação | `PecasService`, `EstoqueService` |
| **Identidade** | Generic | Transversal (autenticação/autorização) | `JwtAuthGuard`, `RolesGuard` |
| **Shared Kernel** | | Compartilhado por todos | `src/shared/domain` |

*U → D = upstream → downstream.* Por ser um monólito, a integração é por chamada em processo, nunca por acesso direto às tabelas de outro contexto.

---

## 3. Modelo de domínio: agregados, entidades e objetos de valor

```mermaid
classDiagram
  direction LR

  class OrdemServico {
    <<AggregateRoot>>
    codigo
    status: StatusOrdemServico
    criadaEm
    inicioExecucao
    fimExecucao
    entregueEm
    +abrir()$
    +adicionarItem()
    +removerItem()
    +iniciarDiagnostico()
    +enviarOrcamento() Orcamento
    +aprovarOrcamento()
    +rejeitarOrcamento()
    +finalizar()
    +entregar()
    +tempoExecucaoMinutos()
  }
  class ItemOrdemServico {
    <<Entity>>
    tipo: SERVICO ou PECA
    referenciaId
    descricao
    quantidade
    precoUnitario: Dinheiro
    +subtotal() Dinheiro
  }
  class Orcamento {
    <<ValueObject>>
    valorServicos: Dinheiro
    valorPecas: Dinheiro
    status: PENDENTE, APROVADO ou REJEITADO
    enviadoEm
    respondidoEm
    +gerar(itens)$
    +valorTotal() Dinheiro
  }
  class HistoricoStatus {
    <<ValueObject>>
    status
    ocorridoEm
    observacao
  }
  class StatusOrdemServico {
    <<enumeration>>
    RECEBIDA
    EM_DIAGNOSTICO
    AGUARDANDO_APROVACAO
    EM_EXECUCAO
    FINALIZADA
    ENTREGUE
  }

  class Cliente {
    <<AggregateRoot>>
    nome
    documento: Documento
    email: Email
    telefone
  }
  class Veiculo {
    <<AggregateRoot>>
    placa: Placa
    marca
    modelo
    ano
    clienteId
  }
  class Servico {
    <<AggregateRoot>>
    nome
    preco: Dinheiro
    tempoEstimadoMinutos
    ativo
  }
  class Peca {
    <<AggregateRoot>>
    codigo
    nome
    tipo: PECA ou INSUMO
    preco: Dinheiro
    quantidadeEstoque
    estoqueMinimo
    +darEntrada()
    +darBaixa()
    +abaixoDoMinimo()
  }
  class MovimentacaoEstoque {
    <<Entity>>
    tipo: ENTRADA ou SAIDA
    quantidade
    motivo
    ordemServicoId
  }

  class Documento {
    <<ValueObject>>
    CPF ou CNPJ validado
  }
  class Placa {
    <<ValueObject>>
    padrão antigo ou Mercosul
  }
  class Dinheiro {
    <<ValueObject>>
    valor em centavos
  }

  OrdemServico "1" *-- "0..*" ItemOrdemServico : itens
  OrdemServico "1" *-- "0..1" Orcamento : orçamento
  OrdemServico "1" *-- "1..*" HistoricoStatus : histórico
  OrdemServico --> StatusOrdemServico
  OrdemServico ..> Cliente : clienteId
  OrdemServico ..> Veiculo : veiculoId
  ItemOrdemServico ..> Servico : referenciaId (SERVICO)
  ItemOrdemServico ..> Peca : referenciaId (PECA)
  Veiculo ..> Cliente : clienteId
  Peca "1" *-- "0..*" MovimentacaoEstoque : movimentações
  Cliente --> Documento
  Veiculo --> Placa
```

**Leitura do diagrama:**
- Linha cheia com losango (`*--`): **composição** dentro do agregado. Só a raiz é acessada de fora e é persistida junto.
- Linha tracejada (`..>`): **referência por identidade** a outro agregado (só o `id`, nunca o objeto). É assim que agregados se referenciam em DDD.
- As invariantes de cada agregado estão em [linguagem-ubiqua.md §4](linguagem-ubiqua.md#4-agregados-entidades-e-objetos-de-valor).

---

## 4. Máquina de estados da Ordem de Serviço

```mermaid
stateDiagram-v2
  direction LR
  [*] --> RECEBIDA: Abrir OS
  RECEBIDA --> EM_DIAGNOSTICO: Iniciar diagnóstico ou 1º item incluído (automático)
  EM_DIAGNOSTICO --> AGUARDANDO_APROVACAO: Enviar orçamento (gerado automaticamente)
  AGUARDANDO_APROVACAO --> EM_EXECUCAO: Aprovar orçamento (+ baixa de estoque)
  AGUARDANDO_APROVACAO --> FINALIZADA: Rejeitar orçamento (sem execução)
  EM_EXECUCAO --> FINALIZADA: Finalizar
  FINALIZADA --> ENTREGUE: Entregar veículo
  ENTREGUE --> [*]

  note right of EM_DIAGNOSTICO
    Itens só podem ser incluídos ou
    removidos em RECEBIDA e EM_DIAGNOSTICO
  end note
```

| De | Para | Comando | Quem |
|---|---|---|---|
| — | Recebida | Abrir OS | Atendente |
| Recebida | Em diagnóstico | Iniciar diagnóstico / incluir 1º item | Mecânico (ou automático) |
| Em diagnóstico | Aguardando aprovação | Enviar orçamento | Mecânico / Atendente |
| Aguardando aprovação | Em execução | Aprovar orçamento | Cliente (API pública) / Atendente |
| Aguardando aprovação | Finalizada | Rejeitar orçamento | Cliente (API pública) / Atendente |
| Em execução | Finalizada | Finalizar | Mecânico |
| Finalizada | Entregue | Entregar veículo | Atendente |

Qualquer outra transição é recusada com `TransicaoStatusInvalidaError` (HTTP 422). Código: `TRANSICOES_PERMITIDAS` em `atendimento/domain/status-ordem-servico.ts`.

---

## 5. Sequência: aprovação do orçamento (transação e eventos)

O fluxo mais sensível: a mudança de status e a baixa de estoque precisam ser **atômicas**, e o cliente só é notificado **depois do commit**.

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant API as AcompanhamentoController
  participant UC as ResponderOrcamentoUseCase
  participant UOW as UnidadeDeTrabalho
  participant OS as OrdemServico (agregado)
  participant EST as EstoqueService
  participant DB as PostgreSQL
  participant POL as NotificarClientePolicy

  C->>API: POST /public/ordens-servico/{codigo}/orcamento/aprovar<br/>{ documento }
  API->>UC: aprovarPeloCliente(codigo, documento)
  UC->>UOW: executar(...)
  UOW->>DB: BEGIN
  UC->>DB: carregar OS e conferir titular (código + documento)
  UC->>OS: aprovarOrcamento()
  OS-->>OS: valida status, muda para EM_EXECUCAO,<br/>registra eventos (ainda não publicados)
  UC->>EST: baixarParaOrdemServico(peças)
  loop para cada peça
    EST->>DB: UPDATE pecas SET qtd = qtd - n<br/>WHERE id = ? AND qtd >= n
    alt saldo suficiente
      EST->>DB: INSERT movimentacao (SAIDA)
    else saldo insuficiente
      EST-->>UC: EstoqueInsuficienteError
      UOW->>DB: ROLLBACK (OS continua AGUARDANDO_APROVACAO)
      UC-->>API: 422
    end
  end
  UC->>DB: salvar OS (status, orçamento, histórico)
  UOW->>DB: COMMIT
  UC->>POL: publicar eventos (após o commit)
  POL-->>C: "Sua OS está agora: Em execução"
  UC-->>API: AcompanhamentoView
  API-->>C: 200 OK
```

Testes que comprovam esse comportamento (`test/e2e/oficina.e2e-spec.ts`):
- *falha de estoque na 2ª peça desfaz a baixa da 1ª e mantém a OS aguardando (rollback)*
- *aprovações concorrentes não deixam o estoque negativo*

---

## 6. Modelo de dados (PostgreSQL)

```mermaid
erDiagram
  CLIENTES ||--o{ VEICULOS : possui
  CLIENTES ||--o{ ORDENS_SERVICO : solicita
  VEICULOS ||--o{ ORDENS_SERVICO : "é atendido em"
  ORDENS_SERVICO ||--o{ ITENS_ORDEM_SERVICO : contém
  ORDENS_SERVICO ||--|{ HISTORICO_STATUS_ORDEM_SERVICO : registra
  PECAS ||--o{ MOVIMENTACOES_ESTOQUE : movimenta
  SERVICOS ||..o{ ITENS_ORDEM_SERVICO : "referenciado por"
  PECAS ||..o{ ITENS_ORDEM_SERVICO : "referenciado por"

  CLIENTES {
    uuid id PK
    string nome
    string documento UK "CPF/CNPJ só dígitos"
    string email
  }
  VEICULOS {
    uuid id PK
    uuid cliente_id FK
    string placa UK
    string marca
    string modelo
    int ano
  }
  SERVICOS {
    uuid id PK
    string nome UK
    int preco_centavos
    boolean ativo
  }
  PECAS {
    uuid id PK
    string codigo UK
    string tipo "PECA | INSUMO"
    int quantidade_estoque "CHECK >= 0"
    int estoque_minimo
  }
  MOVIMENTACOES_ESTOQUE {
    uuid id PK
    uuid peca_id FK
    string tipo "ENTRADA | SAIDA"
    int quantidade
    uuid ordem_servico_id
  }
  ORDENS_SERVICO {
    uuid id PK
    string codigo UK
    uuid cliente_id FK
    uuid veiculo_id FK
    string status
    string orcamento_status
    timestamp inicio_execucao
    timestamp fim_execucao
  }
  ITENS_ORDEM_SERVICO {
    uuid id PK
    uuid ordem_servico_id FK
    string tipo "SERVICO ou PECA"
    uuid referencia_id
    int quantidade "CHECK > 0"
    int preco_unitario_centavos
  }
  HISTORICO_STATUS_ORDEM_SERVICO {
    uuid id PK
    uuid ordem_servico_id FK
    int sequencia
    string status
    timestamp ocorrido_em
  }
```

Os atributos mostrados são os principais; o esquema completo está em `prisma/schema.prisma` e `prisma/migrations/`. A tabela de usuários (contexto Identidade) é independente e foi omitida. A justificativa do PostgreSQL está no [README §9](../../README.md#9-banco-de-dados-decisão-e-justificativa).
