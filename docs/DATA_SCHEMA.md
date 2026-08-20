# Data schema

Todos os dados externos usam `gameVersion`, `source`, `lastVerified`, `verified` e `notes?`.

Principais entidades:

- `AgentDefinition`: stats, skills, core effects, additional ability, mindscapes.
- `SkillDefinition`: tipo, atributo, duração, custo e `hits[]` com timing/multiplier/buildup.
- `EffectDefinition`: trigger, target, modifiers, condition, duration, stack, cooldown, reapply, snapshot.
- `WEngineDefinition`: base ATK, advanced stat, refinement scaling e effects.
- `DriveDiscDefinition`: effects 2pc e 4pc.
- `EnemyState`: DEF, RES por atributo, reductions, stun e debuffs.
- `RotationConfig`: lista ordenada de skill/switch/wait.

`src/data/validate.ts` detecta skill sem hits, multiplier inválido, duration negativa, stacks inválidos e `SPECIFIC_CHARACTER` sem id.
