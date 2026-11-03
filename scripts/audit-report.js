/* eslint-disable */
// Gera docs/seguranca/relatorio-vulnerabilidades.md a partir do `npm audit --json`.
// Analisa separadamente as dependências de PRODUÇÃO (o que vai na imagem Docker)
// e a árvore completa (inclui ferramentas de build/teste).
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const auditar = (args = '') => {
  let bruto;
  try {
    bruto = execSync(`npm audit --json ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (e) {
    bruto = e.stdout; // npm audit retorna exit code != 0 quando encontra vulnerabilidades
  }
  return JSON.parse(bruto);
};

const completo = auditar();
const producao = auditar('--omit=dev');
const pkg = require('../package.json');

const resumo = (audit) => {
  const v = audit.metadata?.vulnerabilities ?? {};
  return `| ${v.critical ?? 0} | ${v.high ?? 0} | ${v.moderate ?? 0} | ${v.low ?? 0} | ${v.total ?? 0} |`;
};

/** Advisories de origem (os pacotes vulneráveis de fato, não a cadeia de dependentes). */
const advisories = (audit) => {
  const mapa = new Map();
  for (const [nome, info] of Object.entries(audit.vulnerabilities ?? {})) {
    for (const via of info.via) {
      if (typeof via === 'string') continue;
      const atual = mapa.get(via.url) ?? { ...via, pacote: nome, afetados: new Set() };
      mapa.set(via.url, atual);
    }
  }
  // Conta quantos pacotes da árvore dependem (direta ou indiretamente) de cada advisory.
  for (const [nome, info] of Object.entries(audit.vulnerabilities ?? {})) {
    for (const a of mapa.values())
      if (info.via.includes(a.pacote) || nome === a.pacote) a.afetados.add(nome);
  }
  return [...mapa.values()];
};

const instaladas = (pacote) => {
  try {
    const saida = execSync(`npm ls ${pacote} --all --parseable --long`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(saida.match(new RegExp(`${pacote}@[0-9][^:\\s]*`, 'g')) ?? [])].join(', ');
  } catch (e) {
    return (
      [...new Set((e.stdout ?? '').match(new RegExp(`${pacote}@[0-9][^:\\s]*`, 'g')) ?? [])].join(
        ', ',
      ) || 'n/d'
    );
  }
};

const origem = advisories(completo);
const totalProd = producao.metadata?.vulnerabilities?.total ?? 0;
const totalGeral = completo.metadata?.vulnerabilities?.total ?? 0;
const deps = completo.metadata?.dependencies ?? {};

const tabelaOrigem = origem.length
  ? `| Pacote | Severidade | Versões afetadas | Versões instaladas | Advisory |\n|---|---|---|---|---|\n` +
    origem
      .map(
        (a) =>
          `| \`${a.pacote}\` | ${a.severity} | \`${a.range}\` | ${instaladas(a.pacote)} | [${a.title}](${a.url}) |`,
      )
      .join('\n')
  : 'Nenhuma vulnerabilidade conhecida.';

const overrides = Object.entries(pkg.overrides ?? {}).map(
  ([k, val]) => `- \`${k}\`: \`${typeof val === 'string' ? val : JSON.stringify(val)}\``,
);

const analiseRisco =
  totalGeral === 0
    ? ''
    : totalProd === 0
      ? `## Análise de risco

**Todos os achados estão em dependências de desenvolvimento** (ferramentas de build e teste, como \`jest\`, \`ts-jest\` e \`@nestjs/cli\`), que **não fazem parte do artefato entregue**:

- A imagem Docker instala só as dependências de produção (\`npm ci --omit=dev\` no estágio \`deps\` do \`Dockerfile\`), e nela o \`npm audit --omit=dev\` retorna **0 vulnerabilidades**.
- Os pacotes vulneráveis só rodam na máquina do desenvolvedor e no CI, sobre o código do próprio repositório. Não processam entrada de usuários da API.

**Por que não foram corrigidos agora:** a correção exige trocar de versão *major* dessas ferramentas (ex.: \`npm audit fix --force\` instalaria o \`@nestjs/cli\` 12, e o \`glob\`/\`minimatch\` corrigidos têm API incompatível com a usada pelo Jest 29). Em alguns casos ainda não existe versão corrigida publicada. O risco é **aceito e monitorado**: o gate do CI (\`npm audit --audit-level=high\`) bloqueia qualquer achado alto ou crítico, e o upgrade das ferramentas de teste e build fica para a próxima fase.
`
      : `## Análise de risco

**Atenção:** há ${totalProd} vulnerabilidade(s) em dependências de **produção**. Elas devem ser corrigidas (atualização ou \`overrides\`) antes da entrega.
`;

const md = `# Relatório de análise de vulnerabilidades (dependências)

- **Gerado em:** ${new Date().toISOString()}
- **Ferramenta:** \`npm audit\` (base GitHub Advisory Database), gerado por \`npm run audit:report\`
- **Dependências analisadas:** ${deps.total ?? 'n/d'} (prod: ${deps.prod ?? 'n/d'}, dev: ${deps.dev ?? 'n/d'})

## Resumo

| Escopo | Crítica | Alta | Moderada | Baixa | Total |
|---|---|---|---|---|---|
| **Produção** (\`--omit=dev\`, o que vai na imagem Docker) ${resumo(producao)}
| Árvore completa (inclui build e testes) ${resumo(completo)}

> No total da árvore completa, o \`npm audit\` conta cada pacote da cadeia que depende de um pacote vulnerável. Abaixo estão só os **pacotes vulneráveis de origem**.

## Achados (pacotes vulneráveis de origem)

${tabelaOrigem}

${analiseRisco}
## Correções aplicadas (overrides de dependências transitivas)

Versões vulneráveis de dependências transitivas foram fixadas em versões corrigidas via \`overrides\` no \`package.json\`:

${overrides.join('\n') || '- (nenhum)'}

## Análises complementares no CI

O pipeline (\`.github/workflows/ci.yml\`, job **seguranca**) executa a cada PR:

1. \`npm audit --audit-level=high\`: falha o build com vulnerabilidade alta/crítica;
2. **Trivy (filesystem)**: vulnerabilidades, segredos commitados e más configurações (Dockerfile, compose);
3. **Trivy (imagem Docker)**: vulnerabilidades do sistema operacional e runtime da imagem final.

Os relatórios do Trivy ficam disponíveis como artefato \`relatorios-seguranca\` em cada execução.
`;

const destino = path.join(__dirname, '..', 'docs', 'seguranca', 'relatorio-vulnerabilidades.md');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, md);
console.log(
  `Relatório gerado em ${path.relative(process.cwd(), destino)} (produção: ${totalProd}, árvore completa: ${totalGeral})`,
);
