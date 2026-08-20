# Arquitetura

## Separação de responsabilidades

`src/data/` contém somente definições e metadados. `src/engine/` contém a matemática e não importa React. `src/state/` contém persistência. `src/main.tsx` apenas compõe estado e apresenta resultados derivados do motor.

## Fluxo de cálculo

1. `resolveBuild` parte dos stats do agente, aplica main/substats, W-Engine e Drive Discs.
2. `collectBuildEffects` reúne Core, Additional Ability, Mindscapes, W-Engine e sets.
3. `createCombatState` inicializa tempo, personagem ativo, enemy, efeitos, recursos e Anomaly.
4. `triggerEffects` avalia trigger + condition + cooldown e cria/atualiza efeitos ativos.
5. `applyActiveEffects` resolve target e aplica modifiers ao atacante/inimigo.
6. `calculateStandardDamage` produz um `DamageBreakdown` único, usado pela UI.
7. `simulateRotation` avança a timeline pelos `hit.at` e `duration`, contabilizando field time, uptime e dano.
8. `addAnomalyBuildup` mantém contribuição ponderada e aplica proc/Disorder quando o threshold é atingido.

## Extensibilidade

Adicionar agente, W-Engine ou Drive Disc não exige editar Damage Engine. Mecânicas expressáveis como trigger/condition/modifier são declarativas. Mecânicas genuinamente únicas podem ganhar um handler isolado no simulador sem duplicar a fórmula básica.
