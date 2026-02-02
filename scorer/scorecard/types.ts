
import { BallEvent } from '../../types.ts';

export interface BattingCardRow {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  scoringSequence: string[]; 
  dismissal?: string;
  bowlerName?: string; // Who took the wicket
  isOut: boolean;
  atCrease: boolean;
}

export interface BowlingCardRow {
  playerId: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  balls: number;
  oversHistory: BallEvent[][]; // Array of Overs, each containing Array of Balls
}