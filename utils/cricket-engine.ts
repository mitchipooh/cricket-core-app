
import { Team, Player, MatchFixture, MatchState, BallEvent, Standing, PointsConfig, Organization, MatchReportSubmission } from '../types';

/**
 * Generates a Round Robin schedule for a list of teams.
 */
export const generateRoundRobin = (teams: Team[], tournamentId?: string, groupId?: string): MatchFixture[] => {
  const fixtures: MatchFixture[] = [];
  const n = teams.length;
  const teamPool = [...teams];
  if (n % 2 !== 0) teamPool.push({ id: 'BYE', name: 'BYE', players: [] });

  const numRounds = teamPool.length - 1;
  const half = teamPool.length / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < half; i++) {
      const teamA = teamPool[i];
      const teamB = teamPool[teamPool.length - 1 - i];

      if (teamA.id !== 'BYE' && teamB.id !== 'BYE') {
        fixtures.push({
          id: `match-${Date.now()}-${round}-${i}`,
          tournamentId,
          groupId,
          stage: 'Group',
          teamAId: teamA.id,
          teamBId: teamB.id,
          teamAName: teamA.name,
          teamBName: teamB.name,
          date: new Date(Date.now() + round * 86400000).toISOString().split('T')[0],
          venue: 'Arena ' + (i + 1),
          status: 'Scheduled',
          format: 'T20' // Default, can be overridden
        });
      }
    }
    // Rotate pool
    const last = teamPool.pop()!;
    teamPool.splice(1, 0, last);
  }
  return fixtures;
};

/**
 * Generates Knockout Stage Fixtures (Semi-Finals & Final)
 */
export const generateKnockouts = (qualifiedTeams: Standing[], tournamentId: string, format: string = 'T20'): MatchFixture[] => {
  if (qualifiedTeams.length < 4) return [];

  const finalId = `match-final-${Date.now()}`;
  const sf1Id = `match-sf1-${Date.now()}`;
  const sf2Id = `match-sf2-${Date.now()}`;

  // 1 vs 4
  const sf1: MatchFixture = {
    id: sf1Id,
    tournamentId,
    stage: 'Semi-Final',
    relatedMatchId: finalId,
    teamAId: qualifiedTeams[0].teamId,
    teamBId: qualifiedTeams[3].teamId,
    teamAName: qualifiedTeams[0].teamName,
    teamBName: qualifiedTeams[3].teamName,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    venue: 'Main Stadium',
    status: 'Scheduled',
    format: format as any
  };

  // 2 vs 3
  const sf2: MatchFixture = {
    id: sf2Id,
    tournamentId,
    stage: 'Semi-Final',
    relatedMatchId: finalId,
    teamAId: qualifiedTeams[1].teamId,
    teamBId: qualifiedTeams[2].teamId,
    teamAName: qualifiedTeams[1].teamName,
    teamBName: qualifiedTeams[2].teamName,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    venue: 'Main Stadium',
    status: 'Scheduled',
    format: format as any
  };

  // Final (Placeholder)
  const final: MatchFixture = {
    id: finalId,
    tournamentId,
    stage: 'Final',
    teamAId: 'TBD',
    teamBId: 'TBD',
    teamAName: 'Winner SF1',
    teamBName: 'Winner SF2',
    date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    venue: 'Grand Oval',
    status: 'Scheduled',
    format: format as any
  };

  return [sf1, sf2, final];
};

/**
 * Calculate Standings for a group based on fixtures
 */
export const calculateStandings = (teams: Team[], fixtures: MatchFixture[], pointsConfig: PointsConfig): Standing[] => {
  const standingsMap: Record<string, Standing> = {};

  // Initialize
  teams.forEach(t => {
    standingsMap[t.id] = {
      teamId: t.id,
      teamName: t.name,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      tied: 0,
      points: 0,
      nrr: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0
    };
  });

  fixtures.forEach(match => {
    if (match.status !== 'Completed' || !match.winnerId || match.stage !== 'Group') return;

    const tA = standingsMap[match.teamAId];
    const tB = standingsMap[match.teamBId];

    if (!tA || !tB) return; // Team might have been deleted

    tA.played++;
    tB.played++;

    if (match.winnerId === match.teamAId) {
      tA.won++;
      tA.points += pointsConfig.win;
      tB.lost++;
      tB.points += pointsConfig.loss;
    } else if (match.winnerId === match.teamBId) {
      tB.won++;
      tB.points += pointsConfig.win;
      tA.lost++;
      tA.points += pointsConfig.loss;
    } else if (match.winnerId === 'TIE') {
      tA.tied++;
      tB.tied++;
      tA.points += pointsConfig.tie;
      tB.points += pointsConfig.tie;
    } else {
      tA.drawn++;
      tB.drawn++;
      tA.points += pointsConfig.noResult;
      tB.points += pointsConfig.noResult;
    }

    // TODO: Advanced NRR calculation
  });

  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });
};

/**
 * DLS Resource Table approximation logic.
 * In a real production environment, this would use the official ICC DLS standard table.
 */
export const calculateDLSTarget = (
  firstInningsTotal: number,
  oversLost: number,
  wicketsDown: number,
  totalOvers: number = 20
): number => {
  // Simple resource percentage calculation for demonstration
  const resourceLeft = (totalOvers - oversLost) / totalOvers;
  const wicketPenalty = 1 - (wicketsDown * 0.05); // Rough heuristic
  const adjustedTarget = Math.ceil(firstInningsTotal * resourceLeft * wicketPenalty) + 1;
  return adjustedTarget;
};

/**
 * Standard Cricket logic for over progression.
 */
export const isLegalBall = (extraType?: string): boolean => {
  return extraType !== 'Wide' && extraType !== 'NoBall';
};

export const getOverString = (balls: number): string => {
  const overs = Math.floor(balls / 6);
  const remainder = balls % 6;
  return `${overs}.${remainder}`;
};

/**
 * Updates player statistics based on a verified match report.
 */
export const updatePlayerStatsFromReport = (orgs: Organization[], report: MatchReportSubmission): Organization[] => {
  return orgs.map(org => ({
    ...org,
    memberTeams: org.memberTeams.map(team => ({
      ...team,
      players: team.players.map(player => {
        const perf = report.playerPerformances.find(p => p.playerId === player.id);
        if (!perf) return player;

        return {
          ...player,
          stats: {
            ...player.stats,
            matches: player.stats.matches + 1,
            runs: player.stats.runs + perf.runs,
            ballsFaced: player.stats.ballsFaced + perf.balls,
            wickets: player.stats.wickets + perf.wickets,
            ballsBowled: player.stats.ballsBowled + (perf.overs * 6), // Simplified
            runsConceded: player.stats.runsConceded + perf.runsConceded,
            catches: player.stats.catches + perf.catches,
            stumpings: player.stats.stumpings + perf.stumpings,
            runOuts: player.stats.runOuts + perf.runOuts,
            fours: player.stats.fours + perf.fours,
            sixes: player.stats.sixes + perf.sixes,
            maidens: player.stats.maidens + perf.maidens,
            highestScore: Math.max(player.stats.highestScore || 0, perf.runs),
            hundreds: player.stats.hundreds + (perf.runs >= 100 ? 1 : 0),
            fifties: player.stats.fifties + (perf.runs >= 50 && perf.runs < 100 ? 1 : 0),
            ducks: player.stats.ducks + (perf.runs === 0 ? 1 : 0),
            threeWickets: player.stats.threeWickets + (perf.wickets >= 3 && perf.wickets < 5 ? 1 : 0),
            fiveWickets: player.stats.fiveWickets + (perf.wickets >= 5 ? 1 : 0),
          }
        };
      })
    })),
    fixtures: org.fixtures.map(f => {
      if (f.id === report.matchId) {
        return {
          ...f,
          reportSubmission: { ...report, status: 'VERIFIED' }
        };
      }
      return f;
    })
  }));
};
