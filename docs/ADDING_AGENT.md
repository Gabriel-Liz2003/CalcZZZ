# Adicionando um agente

1. Crie `src/data/agents/<id>.ts`.
2. Preencha `AgentDefinition` com `meta` em cada bloco de dados.
3. Skills devem conter hits separados quando timing/hit count afetar buffs, CRIT ou Anomaly.
4. Core/Additional/Mindscapes devem usar `EffectDefinition` sempre que possível.
5. Adicione o agente a `src/data/agents/index.ts`.
6. Rode `npm run validate-data`, `npm test`, `npm run build`.

Exemplo reduzido:

```ts
export const agent: AgentDefinition = {
  id: 'agent-id', name: 'Agent', rarity: 'S', attribute: 'Physical',
  specialty: 'Attack', faction: 'Faction', maxLevel: 60,
  baseStats: { /* stats confirmados */ },
  skills: [{ id: 'basic-1', name: 'Basic', type: 'Basic', level: 12,
    attribute: 'Physical', duration: 1.2,
    hits: [{ multiplier: 0.5, at: 0.25 }, { multiplier: 0.8, at: 0.72 }], meta }],
  coreEffects: [{ id: 'core-buff', name: 'Core', description: '...', sourceType: 'agent',
    trigger: 'onEXSpecial', target: 'SELF', modifiers: [{ stat: 'dmgBonus', value: 0.2 }],
    duration: 10, maxStacks: 2, reapply: 'refresh', condition: { op: 'characterIsActive' }, meta }],
  mindscapes: [], meta
};
```

Não coloque multiplicadores ou regras específicas dentro de componentes React.
