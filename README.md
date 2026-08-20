# CalcZZZ

Calculadora de DPS/theorycraft para **Zenless Zone Zero**, construída para separar dados do jogo, regras condicionais e matemática de combate da interface.

**Baseline atual dos dados:** ZZZ 3.1 — *The Long Goodbye*  
**Última revisão:** 20/08/2026

## Estado do MVP

Já implementado no branch `feat/mvp-calculator`:

- React + TypeScript + Vite;
- engine de dano padrão auditável;
- Non-CRIT, CRIT e Expected Damage;
- DEF, PEN, PEN Ratio, RES, RES Reduction, DMG Taken e Stun;
- base de Attribute Anomaly;
- engine de efeitos com duração, alvo, condição e stacks;
- timeline de rotação e cálculo de DPS;
- regra real da Additional Ability da Dialyn;
- dataset versionado inicial da Dialyn;
- UI responsiva;
- testes unitários para dano, CRIT, DEF/PEN, RES, Stun, Anomaly e buffs temporários;
- documentação das fórmulas e fontes;
- workflow de CI para `npm test` + `npm run build`.

## Executar localmente

```bash
npm install
npm run dev
```

Abrir o endereço exibido pelo Vite.

## Testes

```bash
npm test
npm run build
```

## Arquitetura

```text
UI
↓
Rotation Simulator
↓
Effect Engine
↓
Damage Engine
↓
Versioned Game Data
```

Arquivos principais:

```text
src/
  data/
    agents.ts
  engine/
    damage.ts
    effects.ts
    rotation.ts
    types.ts
    damage.test.ts
  main.tsx
  styles.css

docs/
  FORMULAS.md
```

## Próximas etapas

O MVP ainda não representa a aplicação final. Os próximos blocos são:

1. decompor o banco em `agents/`, `w-engines/`, `drive-discs/`, `enemies/` e `rotations/`;
2. adicionar builds completas, skill levels e Mindscapes;
3. implementar W-Engines e Drive Discs como efeitos declarativos;
4. adicionar contribuição ponderada de múltiplos agentes em Anomaly/Disorder;
5. expandir a timeline com troca de personagem, buffs expirando, energia, stacks e cooldowns;
6. adicionar comparação Build A × Build B e Team A × Team B;
7. LocalStorage + import/export JSON + URL compartilhável;
8. expandir o banco de agentes preservando fonte, versão e data;
9. validar resultados contra testes observados no jogo.

Veja [`docs/FORMULAS.md`](docs/FORMULAS.md) para fórmulas, fontes e premissas do motor.
