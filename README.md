# CalcZZZ

Calculadora de DPS/theorycraft para **Zenless Zone Zero** com motor matemático separado da UI, efeitos declarativos, timeline de combate, comparação, presets e auditoria do cálculo.

**Game Data Version:** 3.1  
**Last verified:** 2026-08-20

> Precisão é rastreável por dado. Definições com `meta.verified=false` aparecem como não verificadas e não devem ser tratadas como reprodução perfeita do jogo.

## Executar

```bash
npm install
npm run dev
```

Build/testes:

```bash
npm run lint
npm run typecheck
npm run validate-data
npm test
npm run build
```

## Funcionalidades

- Damage Engine com ATK, multiplicador da skill, DMG Bonus, CRIT, DEF/DEF Reduction/DEF Ignore, PEN/PEN Ratio, RES/RES Reduction/RES Ignore, Vulnerability, Stun e multiplicador especial.
- Effect Engine genérico com Trigger, Condition, Target, Modifier, Duration, Stack, Cooldown, Reapply, Snapshot metadata e Source.
- Targets: `SELF`, `ACTIVE_CHARACTER`, `TEAM`, `SPECIFIC_CHARACTER`, `ENEMY`.
- Condições combináveis com AND/OR/NOT e regras de composição, inimigo, campo, stacks, energia, ação anterior e janela temporal.
- Timeline com skills, hits, switches, waits, expiração de buffs e Anomaly.
- Anomaly buildup, contribuição ponderada por agente, AP/AM e Disorder no motor; coeficientes sem revalidação online são marcados como não verificados.
- Editor de build, stats manuais, W-Engine/Refinement, Drive Disc 2pc/4pc, Mindscape infrastructure e skill levels.
- Rotation Builder: adicionar, remover, reordenar, duplicar, limpar e salvar.
- Resultados: Total Damage, DPS, duração, dano por personagem/skill, buff uptime, field time, CRIT/Anomaly contribution e timeline.
- Comparação Team A × Team B.
- LocalStorage: save/load/rename/duplicate/delete.
- Import/Export JSON versionado.
- URL compartilhável por estado base64url.
- Error Boundary e validação de dados.
- UI responsiva.

## Dados reais vs fixtures

O agente **Dialyn** usa os dados verificados que já estavam auditados no projeto para ZZZ 3.1: stats base usados, três EX Specials e Additional Ability. O projeto mantém também fixtures determinísticas (`Training *`) para regressão matemática. Elas são explicitamente marcadas como **não sendo personagens/W-Engines/Drive Discs do jogo**.

O navegador/web externo ficou indisponível durante esta etapa. Por isso, nenhum número novo foi inventado para preencher personagens, Mindscapes, W-Engines ou Drive Discs que não puderam ser revalidados. Consulte `docs/SOURCES.md` e `docs/LIMITATIONS.md`.

## Arquitetura

```text
React UI
  ↓
Build Resolver / Presets / Share State
  ↓
Rotation Simulator
  ↓
Effect Engine + Condition Engine + Anomaly Engine
  ↓
Damage Engine
  ↓
Versioned Game Data
```

Documentação:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/FORMULAS.md`](docs/FORMULAS.md)
- [`docs/ADDING_AGENT.md`](docs/ADDING_AGENT.md)
- [`docs/SOURCES.md`](docs/SOURCES.md)
- [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md)
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md)
