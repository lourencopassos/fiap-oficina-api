# Evidência de testes e cobertura

## Critério

O PDF exige cobertura mínima de **80% nos domínios críticos**. Neste projeto, "domínios críticos" são as camadas de **domínio** e **aplicação** de todos os bounded contexts, além do shared kernel. É ali que ficam as regras de negócio:

```js
// jest.config.js
collectCoverageFrom: ['src/shared/domain/**', 'src/modules/*/domain/**', 'src/modules/*/application/**'],
coverageThreshold: { global: { statements: 80, branches: 80, functions: 80, lines: 80 } },
```

O gate é aplicado automaticamente: `npm run test:cov` **falha** se qualquer métrica ficar abaixo de 80%, e o CI executa esse comando em todo PR.

## Resultado: testes unitários (`npm run test:cov`)

**14 suítes, 159 testes, todos passando.**

| Contexto / camada | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| atendimento / application | 100.0% | 93.5% | 100.0% | 100.0% |
| atendimento / domain | 99.4% | 93.5% | 98.3% | 99.4% |
| cadastro / application | 100.0% | 100.0% | 100.0% | 100.0% |
| cadastro / domain | 100.0% | 91.7% | 100.0% | 100.0% |
| catalogo / application | 100.0% | 100.0% | 100.0% | 100.0% |
| catalogo / domain | 100.0% | 92.0% | 100.0% | 100.0% |
| estoque / application | 100.0% | 100.0% | 100.0% | 100.0% |
| estoque / domain | 100.0% | 87.2% | 100.0% | 100.0% |
| identidade / application | 100.0% | 100.0% | 100.0% | 100.0% |
| identidade / domain | 100.0% | 87.5% | 100.0% | 100.0% |
| shared / domain | 98.9% | 97.6% | 100.0% | 98.9% |
| **Total** | **99.76%** | **94%** | **99.64%** | **99.74%** |

O relatório HTML detalhado é gerado em `coverage/lcov-report/index.html`.

## Testes de integração (`npm run test:e2e`)

Executados contra a **API real + PostgreSQL real** (Testcontainers localmente, ou service container no CI). Usam as migrations reais do projeto.

**22 testes, todos passando:**

- Infraestrutura: health check com banco e documento OpenAPI publicado.
- Autenticação: 401 sem token ou com token inválido; login inválido com mensagem genérica; roles (mecânico recebe 403 no catálogo e em usuários).
- Validação: CPF/CNPJ inválido (400), campos não permitidos (400), placa inválida (400), cliente duplicado (409).
- **Fluxo principal da OS:** abertura com identificação por CPF e cadastro do veículo → inclusão de serviço → transição inválida bloqueada (422) → orçamento gerado e enviado → consulta pública (404 com documento de outra pessoa; documento mascarado) → aprovação pelo cliente com baixa de estoque → finalização e entrega → listagem/detalhe → tempo médio → cliente com OS não pode ser removido (409).
- **Transações:** falha de estoque na 2ª peça **desfaz** a baixa da 1ª e mantém a OS aguardando (rollback real no PostgreSQL).
- **Concorrência:** duas aprovações simultâneas disputando o mesmo estoque resultam em 200 + 422 e saldo nunca negativo.
- Rejeição pelo cliente (estoque intacto) e entrada de estoque com movimentação.
