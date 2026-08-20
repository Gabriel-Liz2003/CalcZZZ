# CalcZZZ

Calculadora de DPS/theorycraft para **Zenless Zone Zero** com motor matemático separado da UI, efeitos declarativos, timeline de combate, comparação, presets e auditoria do cálculo.

**Game Data Version:** 3.1  
**Dataset boundary:** Sigrid  
**Last verified:** 2026-08-20

> Precisão é rastreável por dado. Timings e efeitos não confirmados nunca devem ser apresentados como medidos/verificados.

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

## Atualizar banco de dados

CalcZZZ agora aceita como upstream os três datasets estruturados de Agents, W-Engines e Drive Discs. O normalizador não acopla o motor ao formato externo.

```bash
npm run update-data -- \
  ./zzz-agents-dps-v3.1-sigrid.json \
  ./zzz-wengines-dps-v3.1.json \
  ./zzz-drive-discs-dps-v3.1.json \
  --online
```

`--online` sincroniza os timings públicos disponíveis no `ZSim-Dev/ZSim` (`ticks`/`tick_list`). Também é possível passar um `skill.csv` local como quarto argumento.

O script gera `public/data/calczzz-game-data-v3.1.json`, valida todas as skills e informa separadamente quantos timings são medidos e quantos ainda usam fallback estimado.

## Dataset 3.1

Os arquivos de origem desta revisão contêm:

- **58 Agents**;
- **841 definições de skills**;
- **95 W-Engines**, com progressão Lv.0–60 e Refinement 1–5;
- **30 Drive Disc sets**, além de tabelas de main/substats.

Core Passive, Additional Ability, Mindscapes e efeitos complexos preservam `handlerHint`/`requiresCustomHandler` para que regras únicas sejam implementadas sem duplicar a fórmula de dano.

## Skill timings

`src/engine/timings.ts` implementa duas camadas:

1. **ZSim / measured** — match somente quando CID, categoria e multiplicador Lv.12 são compatíveis;
2. **estimated fallback** — duração determinística por categoria para manter a simulação executável quando não existe frame data público para aquele agente.

O fallback é sempre `verified: false`. Consulte [`docs/TIMINGS.md`](docs/TIMINGS.md).

## Funcionalidades do motor

- Damage Engine com ATK, multiplicador da skill, DMG Bonus, CRIT, DEF/DEF Reduction/DEF Ignore, PEN/PEN Ratio, RES/RES Reduction/RES Ignore, Vulnerability, Stun e multiplicador especial.
- Effect Engine genérico com Trigger, Condition, Target, Modifier, Duration, Stack, Cooldown, Reapply, Snapshot metadata e Source.
- Targets: `SELF`, `ACTIVE_CHARACTER`, `TEAM`, `SPECIFIC_CHARACTER`, `ENEMY`.
- Condições combináveis com AND/OR/NOT e regras de composição, inimigo, campo, stacks, energia, ação anterior e janela temporal.
- Energy, Daze, Stun temporal e Chain window no Combat State.
- Anomaly buildup, contribuição ponderada, AP/AM, efeitos temporais e Disorder.
- Timeline com skills, hits, switches, waits e expiração de buffs.
- Build resolver separado em Base Stats → Static Stats → Combat Stats.
- Editor de build, W-Engine/Refinement, Drive Disc, Mindscape e skill levels.
- Rotation Builder e cálculo de burst/sustained DPS.
- LocalStorage, Import/Export JSON e URL compartilhável.
- Error Boundary e validação de dados.

## Arquitetura

```text
External versioned JSON
  ↓
update-data / normalizer / timing enrichment
  ↓
Versioned CalcZZZ Game Data
  ↓
Build Resolver
  ↓
Rotation Simulator
  ↓
Effect + Condition + Anomaly + Combat State
  ↓
Damage Engine
  ↓
React UI / standalone consumer
```

Documentação:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/FORMULAS.md`](docs/FORMULAS.md)
- [`docs/ADDING_AGENT.md`](docs/ADDING_AGENT.md)
- [`docs/SOURCES.md`](docs/SOURCES.md)
- [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md)
- [`docs/TIMINGS.md`](docs/TIMINGS.md)
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md)
