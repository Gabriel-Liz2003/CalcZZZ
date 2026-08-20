# Skill timings

Baseline: **Zenless Zone Zero 3.1** — verified 2026-08-20.

## Why timings are a separate data layer

The Agents DPS dataset contains skill multipliers, Daze, Anomaly Buildup, Energy and kit text, but its 841 skill definitions do not ship animation durations or hit timestamps. CalcZZZ therefore stores timing provenance independently from the game-value source.

## Sources

### ZSim measured/simulator data

Primary public timing source:

- repository: `ZSim-Dev/ZSim`
- file: `zsim/data/skill.csv`
- pinned revision: `e248e9f149a6b889290579d8e673e132be9bde31`
- relevant fields: `ticks`, `hit_times`, `tick_list`, `swap_cancel_ticks`
- conversion: `seconds = ticks / 60`

`src/engine/timings.ts` matches a CalcZZZ skill only when CID, skill category and Lv.12 damage multiplier agree within the configured tolerance. A weak/ambiguous match is rejected rather than silently assigned.

ZSim does **not** currently contain every agent through the CalcZZZ 3.1/Sigrid boundary. Therefore its timing data cannot honestly be used as a complete 3.1 frame-data source.

### Estimated fallback

When no measured match is available, `estimatedTiming()` supplies a deterministic category-based duration and distributes hit timestamps across the action. These records are always tagged:

```json
{
  "confidence": "estimated",
  "verified": false
}
```

Estimated timings exist so Rotation Builder remains executable and never produces a zero-duration/NaN rotation. They are **not frame data** and must not be presented as measured values.

## Updating the data

Given the three CalcZZZ source JSON files:

```bash
npm run update-data -- \
  ./zzz-agents-dps-v3.1-sigrid.json \
  ./zzz-wengines-dps-v3.1.json \
  ./zzz-drive-discs-dps-v3.1.json \
  --online
```

Or use a locally downloaded ZSim CSV:

```bash
npm run update-data -- agents.json wengines.json discs.json ./skill.csv
```

The script writes:

```text
public/data/calczzz-game-data-v3.1.json
```

and reports exact counts for agents, W-Engines, Drive Discs, skills, measured timings and estimated timings.

## Required rule for new releases

Never turn an estimated timing into `verified: true` simply because it looks plausible. A timing becomes measured only when it can be tied to a reproducible source or measurement, with source/revision recorded in `timingMeta`.
