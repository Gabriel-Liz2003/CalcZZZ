# CalcZZZ — Fórmulas e fontes

Data baseline: **Zenless Zone Zero 3.1**  
Última revisão: **2026-08-20**

## Dano padrão

Estrutura implementada:

```text
Standard DMG = Base DMG
             × DMG Bonus Multiplier
             × CRIT Multiplier
             × DEF Multiplier
             × RES Multiplier
             × DMG Taken Multiplier
             × Stun Multiplier
```

Onde:

```text
Base DMG = Scaling Stat × Skill Multiplier
DMG Bonus Multiplier = 1 + Total DMG Bonus
Average CRIT Multiplier = 1 + CRIT Rate × CRIT DMG
```

A UI também expõe Non-CRIT, CRIT e Expected separadamente.

## DEF

Para o MVP:

```text
Effective DEF = max(
  Enemy DEF
  × (1 - DEF Reduction)
  × (1 - PEN Ratio)
  × (1 - DEF Ignore)
  - Flat PEN,
  0
)

DEF Multiplier = Level Factor / (Effective DEF + Level Factor)
```

O Level Factor usado para agente nível 60 é **794**.

> Observação: DEF Reduction, DEF Ignore e PEN precisam continuar sendo validados para casos especiais que alterem a ordem/forma de aplicação. O motor mantém cada campo separado para permitir ajustes sem espalhar lógica na UI.

## RES

```text
RES Multiplier = 1 - Enemy RES + RES Reduction + RES Ignore
```

## Stun

Quando o alvo não está Stunned, o multiplicador é `1`.
Quando está Stunned, usa-se o Stun DMG Multiplier configurado no inimigo/preset.

## Attribute Anomaly

Estrutura implementada:

```text
Anomaly DMG = Anomaly Base DMG
            × Anomaly Proficiency Multiplier
            × Anomaly Level Multiplier
            × DMG Bonus Multiplier
            × DEF Multiplier
            × RES Multiplier
            × DMG Taken Multiplier
            × Stun Multiplier
```

O motor já aceita os multiplicadores de Anomaly como parâmetro. O suporte a contribuição ponderada de múltiplos agentes para a mesma Anomaly ainda é um item da próxima etapa.

Multiplicadores de referência documentados pela comunidade/wiki:

- Burn: 50% por proc, 20 procs
- Shock: 125% por proc, 10 procs
- Corruption: 62.5% por proc, 20 procs
- Shatter: 500%
- Assault: 713%

## Dialyn usada no MVP

Dados usados no MVP:

- Lv.60 ATK: 758
- CRIT Rate: 19.4%
- CRIT DMG: 50%
- EX Special: Rock Lv.12: 808.8%
- EX Special: Scissors Lv.12: 1050.7%
- EX Special: Paper! Lv.12: 1403.5%
- Additional Ability `External Line`: quando há outro agente Attack ou Rupture, Dialyn ganha +50% CRIT DMG em EX Special; usar EX Special/Ultimate concede ao time +40% DMG por 15s.

## Fontes

1. Zenless Zone Zero Wiki — Damage: https://zenless-zone-zero.fandom.com/wiki/Damage
2. Zenless Zone Zero Wiki — Dialyn: https://zenless-zone-zero.fandom.com/wiki/Dialyn
3. Zenless Zone Zero Wiki — Additional Ability: External Line: https://zenless-zone-zero.fandom.com/wiki/Additional_Ability%3A_External_Line
4. HoYoLAB — Version 3.1 “The Long Goodbye” Update Announcement: https://www.hoyolab.com/article/46037106

## Política de dados

Nenhum número de personagem deve ser colocado diretamente nos componentes visuais. Dados de agentes, skills e efeitos ficam em `src/data/`; o cálculo fica em `src/engine/`. Um dado de jogo deve conter, sempre que possível, versão, fonte e data da última revisão.
