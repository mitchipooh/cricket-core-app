
import { MatchResult } from './types.ts';

export interface PointsConfig {
  win: number;
  loss: number;
  tie: number;
  nr: number;
}

const DEFAULT_CONFIG: PointsConfig = {
  win: 2,
  loss: 0,
  tie: 1,
  nr: 1
};

export function calculatePoints(result: MatchResult, side: 'A' | 'B', config: PointsConfig = DEFAULT_CONFIG): number {
  switch (result) {
    case 'TIE':
      return config.tie;
    case 'NO_RESULT':
    case 'ABANDONED':
      return config.nr;
    case 'HOME_WIN':
      return side === 'A' ? config.win : config.loss;
    case 'AWAY_WIN':
      return side === 'B' ? config.win : config.loss;
    default:
      return 0;
  }
}
