import type { RotationConfig } from '../../engine/types';
export const defaultRotation: RotationConfig = { id: 'default', name: 'Dialyn → Attacker', actions: [
  { id: 'a1', type: 'skill', agentId: 'dialyn', skillId: 'ex-rock' },
  { id: 'a2', type: 'switch', agentId: 'training-attacker' },
  { id: 'a3', type: 'skill', agentId: 'training-attacker', skillId: 'test-hit' },
  { id: 'a4', type: 'skill', agentId: 'training-attacker', skillId: 'test-ult' },
] };
