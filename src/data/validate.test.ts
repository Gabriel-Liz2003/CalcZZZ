import { describe,expect,it } from 'vitest';
import { agents } from './agents';
import { driveDiscs } from './discs';
import { wengines } from './wengines';
import { validateGameData } from './validate';
describe('game data validation',()=>{it('não possui inconsistências graves',()=>{const issues=validateGameData(agents,wengines,driveDiscs);expect(issues.filter(i=>i.severity==='error')).toEqual([])})});
