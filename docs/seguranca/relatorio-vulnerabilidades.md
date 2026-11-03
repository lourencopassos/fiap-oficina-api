# Relatório de análise de vulnerabilidades (dependências)

- **Gerado em:** 2026-11-03T00:01:29.595Z
- **Ferramenta:** `npm audit` (base GitHub Advisory Database), gerado por `npm run audit:report`
- **Dependências analisadas:** 864 (prod: 179, dev: 686)

## Resumo

| Escopo | Crítica | Alta | Moderada | Baixa | Total |
|---|---|---|---|---|---|
| **Produção** (`--omit=dev`, o que vai na imagem Docker) | 0 | 0 | 0 | 0 | 0 |
| Árvore completa (inclui build e testes) | 0 | 0 | 36 | 4 | 40 |

> No total da árvore completa, o `npm audit` conta cada pacote da cadeia que depende de um pacote vulnerável. Abaixo estão só os **pacotes vulneráveis de origem**.

## Achados (pacotes vulneráveis de origem)

| Pacote | Severidade | Versões afetadas | Versões instaladas | Advisory |
|---|---|---|---|---|
| `deepmerge` | low | `>=4.2.0 <=4.3.1` | deepmerge@4.3.1 | [deepmerge mergeObject() allows prototype poisoning of returned objects](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) |
| `glob` | moderate | `>=9.0.0 <=14.0.1` | glob@13.0.6, glob@7.2.3, glob@10.5.0 | [Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) |
| `minimatch` | moderate | `<11.0.1` | minimatch@3.1.5, minimatch@10.2.6, minimatch@9.0.9, minimatch@5.1.9 | [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

## Análise de risco

**Todos os achados estão em dependências de desenvolvimento** (ferramentas de build e teste, como `jest`, `ts-jest` e `@nestjs/cli`), que **não fazem parte do artefato entregue**:

- A imagem Docker instala só as dependências de produção (`npm ci --omit=dev` no estágio `deps` do `Dockerfile`), e nela o `npm audit --omit=dev` retorna **0 vulnerabilidades**.
- Os pacotes vulneráveis só rodam na máquina do desenvolvedor e no CI, sobre o código do próprio repositório. Não processam entrada de usuários da API.

**Por que não foram corrigidos agora:** a correção exige trocar de versão *major* dessas ferramentas (ex.: `npm audit fix --force` instalaria o `@nestjs/cli` 12, e o `glob`/`minimatch` corrigidos têm API incompatível com a usada pelo Jest 29). Em alguns casos ainda não existe versão corrigida publicada. O risco é **aceito e monitorado**: o gate do CI (`npm audit --audit-level=high`) bloqueia qualquer achado alto ou crítico, e o upgrade das ferramentas de teste e build fica para a próxima fase.

## Correções aplicadas (overrides de dependências transitivas)

Versões vulneráveis de dependências transitivas foram fixadas em versões corrigidas via `overrides` no `package.json`:

- `multer`: `2.5.0`
- `@nestjs/swagger`: `{"js-yaml":"5.5.0"}`
- `@prisma/config`: `{"deepmerge-ts":"8.0.2"}`

## Análises complementares no CI

O pipeline (`.github/workflows/ci.yml`, job **seguranca**) executa a cada PR:

1. `npm audit --audit-level=high`: falha o build com vulnerabilidade alta/crítica;
2. **Trivy (filesystem)**: vulnerabilidades, segredos commitados e más configurações (Dockerfile, compose);
3. **Trivy (imagem Docker)**: vulnerabilidades do sistema operacional e runtime da imagem final.

Os relatórios do Trivy ficam disponíveis como artefato `relatorios-seguranca` em cada execução.
