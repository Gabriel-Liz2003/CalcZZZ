# Fórmulas

## Dano padrão

```text
BaseDamage = ATK × SkillMultiplier
Damage = BaseDamage
       × (1 + DMGBonus)
       × DEFMultiplier
       × RESMultiplier
       × (1 + Vulnerability)
       × StunMultiplier
       × SpecialMultiplier
```

CRIT:

```text
CritDamage = NonCrit × (1 + CritDMG)
Expected = NonCrit × (1 - CritRate) + CritDamage × CritRate
```

CRIT Rate é limitado a `[0, 1]` no cálculo esperado.

## DEF

Para atacante de nível 60, a implementação preservada usa fator `794`:

```text
ReducedDEF = EnemyDEF × (1 - DEFReduction)
IgnoredDEF = ReducedDEF × (1 - DEFIgnore)
RatioDEF   = IgnoredDEF × (1 - PENRatio)
EffectiveDEF = max(0, RatioDEF - PEN)
DEFMultiplier = 794 / (794 + EffectiveDEF)
```

Reduction, Ignore, PEN Ratio e PEN ficam separados.

## RES

`effectiveRes = enemyRes - resReduction - resIgnore`.

- RES negativa: `1 - RES/2`
- `0 ≤ RES < 0.75`: `1 - RES`
- RES alta: `1 / (1 + 5×RES)`

## Anomaly

```text
Buildup = BaseBuildup × AM / 100
```

Quando threshold é atingido, cada agente contribui proporcionalmente ao buildup. ATK e AP são ponderados pela contribuição.

Os coeficientes em `src/data/anomalies.ts` permanecem `verified:false` até nova revalidação externa.

## Arredondamento

O motor mantém precisão dupla durante etapas intermediárias e arredonda somente para exibição. Uma política interna do jogo deve ser adicionada somente após confirmação e teste de regressão.
