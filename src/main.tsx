import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { dialyn, dialynAdditionalAbility, GAME_DATA_VERSION, LAST_UPDATED, trainingAttacker } from './data/agents';
import { calculateStandardDamage } from './engine/damage';
import { activateEffect } from './engine/effects';
import { simulateRotation } from './engine/rotation';
import type { EnemyState } from './engine/types';
import './styles.css';

const trainingEnemy: EnemyState = {
  def: 794,
  res: 0.1,
  resReduction: 0,
  defReduction: 0,
  defIgnore: 0,
  dmgTaken: 0,
  stunned: false,
  stunMultiplier: 1.5,
};

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

function App() {
  const [atk, setAtk] = useState(3000);
  const [critRate, setCritRate] = useState(70);
  const [critDmg, setCritDmg] = useState(140);
  const [stunned, setStunned] = useState(false);
  const [teamBuff, setTeamBuff] = useState(true);

  const result = useMemo(() => {
    const stats = { ...trainingAttacker.stats, atk, critRate: critRate / 100, critDmg: critDmg / 100 };
    return calculateStandardDamage(stats, { ...trainingEnemy, stunned }, 10.507);
  }, [atk, critRate, critDmg, stunned]);

  const rotation = useMemo(() => {
    const team = [dialyn, trainingAttacker];
    const steps = [
      { agent: dialyn, skill: dialyn.skills[0], triggerEffects: teamBuff ? [dialynAdditionalAbility] : [] },
      { agent: dialyn, skill: dialyn.skills[1] },
      { agent: trainingAttacker, skill: trainingAttacker.skills[0] },
      { agent: dialyn, skill: dialyn.skills[2] },
    ];
    return simulateRotation(team, trainingEnemy, steps, teamBuff ? [] : [activateEffect({ ...dialynAdditionalAbility, value: 0 }, dialyn.id, 0)]);
  }, [teamBuff]);

  return (
    <main className="shell">
      <header>
        <div>
          <span className="eyebrow">THEORYCRAFT TOOL</span>
          <h1>CalcZZZ</h1>
          <p>Dano auditável, efeitos condicionais e rotações com timeline.</p>
        </div>
        <div className="version">Game Data v{GAME_DATA_VERSION}<small>Atualizado em {LAST_UPDATED}</small></div>
      </header>

      <section className="grid">
        <article className="card controls">
          <h2>Damage Calculator</h2>
          <label>ATK <input type="number" value={atk} onChange={(e) => setAtk(Number(e.target.value))} /></label>
          <label>CRIT Rate % <input type="number" value={critRate} onChange={(e) => setCritRate(Number(e.target.value))} /></label>
          <label>CRIT DMG % <input type="number" value={critDmg} onChange={(e) => setCritDmg(Number(e.target.value))} /></label>
          <label className="check"><input type="checkbox" checked={stunned} onChange={(e) => setStunned(e.target.checked)} /> Inimigo Stunned</label>
          <p className="hint">Skill de referência: Dialyn EX Special: Scissors Lv.12 — 1050,7%.</p>
        </article>

        <article className="card hero">
          <span>DANO ESPERADO</span>
          <strong>{fmt(result.expected)}</strong>
          <div className="mini"><b>Non-CRIT {fmt(result.nonCrit)}</b><b>CRIT {fmt(result.crit)}</b></div>
        </article>
      </section>

      <section className="grid lower">
        <article className="card">
          <h2>Como esse dano foi calculado?</h2>
          <dl>
            <div><dt>Base Damage</dt><dd>{fmt(result.baseDamage)}</dd></div>
            <div><dt>DMG Bonus</dt><dd>×{result.dmgBonusMultiplier.toFixed(3)}</dd></div>
            <div><dt>DEF Modifier</dt><dd>×{result.defMultiplier.toFixed(3)}</dd></div>
            <div><dt>Resistance</dt><dd>×{result.resMultiplier.toFixed(3)}</dd></div>
            <div><dt>Stun</dt><dd>×{result.stunMultiplier.toFixed(3)}</dd></div>
          </dl>
        </article>

        <article className="card">
          <div className="row"><h2>Rotation DPS</h2><label className="check"><input type="checkbox" checked={teamBuff} onChange={(e) => setTeamBuff(e.target.checked)} /> Dialyn Additional Ability</label></div>
          <div className="metrics"><div><span>DPS</span><strong>{fmt(rotation.dps)}</strong></div><div><span>Total</span><strong>{fmt(rotation.totalDamage)}</strong></div><div><span>Duração</span><strong>{rotation.duration.toFixed(1)}s</strong></div></div>
          <ol className="timeline">{rotation.timeline.map((item, index) => <li key={index}><time>{item.time.toFixed(1)}s</time><span>{item.label}</span><b>{fmt(item.damage)}</b></li>)}</ol>
          <div className={teamBuff ? 'status active' : 'status inactive'}>{teamBuff ? '🟢 Additional Ability ativa: há um agente Attack no time.' : '🔴 Buff desativado manualmente para comparação.'}</div>
        </article>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
