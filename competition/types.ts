
export type MatchResult =
  | 'HOME_WIN'
  | 'AWAY_WIN'
  | 'TIE'
  | 'NO_RESULT'
  | 'ABANDONED';

export interface CompletedMatch {
  matchId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamAWkts: number;
  teamAOvers: number;
  teamBScore: number;
  teamBWkts: number;
  teamBOvers: number;
  result: MatchResult;
  margin?: string;
}

export interface PointsRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  drawn: number;
  nr: number;
  points: number;
  bonusPoints: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  nrr: number;
}
