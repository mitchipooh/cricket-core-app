import React from 'react';

/**
 * Cricket-Core 2026 Management System
 * Created by mitchipoohdevs
 */

export type Notification = {
  id: string;
  type: 'ALERT' | 'MESSAGE' | 'INVITE';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionLink?: string;
};

export type Sponsor = {
  id: string;
  name: string;
  logoUrl: string;
  website?: string;
  isActive: boolean;
  placements: ('MEDIA_TOP' | 'MEDIA_BOTTOM' | 'SCOREBOARD_TOP' | 'SCOREBOARD_BOTTOM')[];
};

export type UserProfile = {
  id: string;
  name: string;
  handle: string;
  email?: string;
  password?: string;
  googleId?: string;
  avatarUrl?: string;
  role: 'Administrator' | 'Scorer' | 'Umpire' | 'Fan' | 'Coach' | 'Player' | 'Captain' | 'Guest';
  createdAt: number;
  joinedClubIds?: string[];
  notifications?: Notification[];
  scorerDetails?: {
    isHireable: boolean;
    hourlyRate?: number;
    experienceYears?: number;
    bio?: string;
  };
  coachDetails?: {
    level: string;
    specialty: 'Batting' | 'Bowling' | 'Fielding' | 'General';
    experienceYears: number;
  };
  playerDetails?: {
    battingStyle: 'Right-hand' | 'Left-hand';
    bowlingStyle: string;
    primaryRole: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
    lookingForClub: boolean;
    isHireable: boolean;
    bio?: string;
    phone?: string;
    jerseyNumber?: number;
  };
};

export type CareerPhase = {
  teamId: string;
  teamName: string;
  startYear: number;
  endYear?: number;
};

export type PlayerDetails = {
  battingStyle: 'Right-hand' | 'Left-hand';
  bowlingStyle: string;
  primaryRole: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  lookingForClub: boolean;
  isHireable: boolean;
};

export type Player = {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  photoUrl?: string;
  bio?: string;
  highlightVideoUrl?: string;
  careerHistory?: CareerPhase[];
  playerDetails?: PlayerDetails;
  stats: {
    runs: number;
    wickets: number;
    ballsFaced: number;
    ballsBowled: number;
    runsConceded: number;
    matches: number;
    catches: number;
    runOuts: number;
    stumpings: number;
    highestScore?: number;
    bestBowling?: string;
    fours: number;
    sixes: number;
    hundreds: number;
    fifties: number;
    ducks: number;
    threeWickets: number;
    fiveWickets: number;
    maidens: number;
  };
};

export interface PlayerMatchPerformance {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs: number;
  maidens: number;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface MatchReportSubmission {
  id: string;
  matchId: string;
  submittedBy: string; // User ID of the captain
  timestamp: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  scorecardPhotoUrl?: string;
  teamAScore: number;
  teamAWickets: number;
  teamAOvers: string;
  teamBScore: number;
  teamBWickets: number;
  teamBOvers: string;
  playerPerformances: PlayerMatchPerformance[];
  adminFeedback?: string;
  umpires?: string[];
  umpireRatings?: Record<string, { rating: number; comment?: string }>;
  facilityRating?: { pitch: number; outfield: number; facilities: number; comment?: string };
  spiritRating?: { rating: number; comment?: string };
}

export type IssueType = 'PROTEST' | 'GAME_ISSUE' | 'FEEDBACK';
export type IssueStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface GameIssue {
  id: string;
  matchId?: string;
  lodgedBy: string; // User ID
  teamId: string;
  type: IssueType;
  title: string;
  description: string;
  status: IssueStatus;
  evidenceUrls?: string[];
  timestamp: number;
  adminComments?: string[];
  resolution?: 'UPHELD' | 'DISMISSED' | 'ACKNOWLEDGED';
  adminResponse?: string;
  resolvedAt?: number;
}

export type WicketType =
  | 'Bowled'
  | 'Caught'
  | 'LBW'
  | 'Run Out'
  | 'Stumped'
  | 'Hit Wicket'
  | 'Handled Ball'
  | 'Obstructing Field'
  | 'Timed Out'
  | 'Retired Out'
  | 'Retired Hurt';

export interface WicketEvent {
  type: 'WICKET';
  wicketType: WicketType;
  batterId: string;
  bowlerId?: string;
  fielderId?: string;
}

export type PlayerWithContext = Player & {
  teamName: string;
  teamId: string;
  orgId: string;
  orgName: string;
};

export type Team = {
  id: string;
  // orgId removed - teams now belong to multiple orgs via junction table
  name: string;
  logoUrl?: string;
  location?: string;
  management?: string;
  players: Player[];
};

export type Group = {
  id: string;
  name: string;
  teams: Team[];
};

export type TournamentFormat = 'Test' | 'T10' | 'T20' | '40-over' | '50-over';

export type PointsConfig = {
  win: number;
  loss: number;
  tie: number;
  noResult: number;
  bonusBatting?: number;
  bonusBowling?: number;
};

export type Standing = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  tied: number;
  points: number;
  nrr: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
};

export type Tournament = {
  id: string;
  name: string;
  format: TournamentFormat;
  groups: Group[];
  pointsConfig: PointsConfig;
  overs: number;
  status?: 'Upcoming' | 'Ongoing' | 'Completed';
  teamIds?: string[]; // Added teamIds for linking
  orgId?: string; // Added orgId ref
};

export type OrgMember = {
  userId: string;
  name: string;
  handle: string;
  role: 'Administrator' | 'Scorer' | 'Umpire' | 'Coach' | 'Player' | 'Captain' | 'Match Official';
  addedAt: number;
  permissions?: Record<string, boolean>;
};

export type OrgApplication = {
  id: string;
  type: 'USER_JOIN' | 'ORG_AFFILIATE';
  applicantId: string;
  applicantName: string;
  applicantHandle?: string;
  applicantImage?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEW';
  targetRole?: 'Player' | 'Umpire' | 'Coach' | 'Scorer';
  targetTeamId?: string;
  timestamp: number;
};

export type Organization = {
  id: string;
  name: string;
  type: 'GOVERNING_BODY' | 'CLUB';
  createdBy?: string; // User ID of creator - ROBUST ownership tracking
  description?: string;
  logoUrl?: string;
  address?: string;
  establishedYear?: number;
  country?: string;
  groundLocation?: string;
  isPublic?: boolean;
  allowUserContent?: boolean;
  parentOrgIds?: string[];
  childOrgIds?: string[];
  tournaments: Tournament[];
  groups: Group[];
  memberTeams: Team[];
  fixtures: MatchFixture[];
  members: OrgMember[];
  applications: OrgApplication[];
  sponsors?: Sponsor[];
};

export type Coordinates = { x: number; y: number };

export type BallEvent = {
  timestamp: number;
  over: number;
  ballNumber: number;
  strikerId: string;
  nonStrikerId?: string;
  bowlerId: string;
  runs: number;
  batRuns?: number;
  extraRuns?: number;
  extraType?: 'Wide' | 'NoBall' | 'Bye' | 'LegBye' | 'None';
  isWicket: boolean;
  wicketType?: string;
  dismissalType?: string;
  creditBowler?: boolean;
  outPlayerId?: string;
  fielderId?: string;
  assistFielderId?: string;
  commentary: string;
  innings: number;
  teamScoreAtBall?: number;
  pitchCoords?: Coordinates;
  shotCoords?: Coordinates;
};

export type TestMatchConfig = {
  maxDays: number;
  oversPerDay: number;
  lastHourOvers: number;
  followOnMargin: number;
};

export type MatchState = {
  testConfig?: TestMatchConfig;
  battingTeamId: string;
  bowlingTeamId: string;
  score: number;
  wickets: number;
  totalBalls: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  innings: number;
  target?: number;
  history: BallEvent[];
  inningsScores: { innings: number; teamId: string; score: number; wickets: number; overs: string }[];
  isCompleted: boolean;
  isSuperOver?: boolean;
  isFollowOnEnforced?: boolean;

  // Test Match Metadata
  currentDay?: number;
  oversToday?: number;
  lead?: number; // Positive = batting team leads, Negative = batting team trails
  tossWinnerId?: string;
  tossDecision?: 'Bat' | 'Bowl';
  umpires?: string[];
  teamASquadIds?: string[];
  teamBSquadIds?: string[];
  matchTimer: {
    startTime: number | null;
    totalAllowances: number;
    isPaused: boolean;
    lastPauseTime: number | null;
  };
  adjustments?: {
    oversLost: number;
    isLastHour: boolean;
    dayNumber: number;
    session: string;
    declared: boolean;
    concluded?: boolean;
  }
};

export type MatchFixture = {
  id: string;
  tournamentId?: string;
  groupId?: string;
  stage?: 'Group' | 'Semi-Final' | 'Final' | 'Qualifier' | 'Eliminator';
  relatedMatchId?: string;
  format?: TournamentFormat;
  customOvers?: number;
  followOnMargin?: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  date: string;
  venue: string;
  status: 'Scheduled' | 'Live' | 'Completed';
  isOfficial?: boolean;
  isArchived?: boolean;
  result?: string;
  winnerId?: string;
  teamAScore?: string;
  teamBScore?: string;
  tossWinnerId?: string;
  tossDecision?: 'Bat' | 'Bowl';
  umpires?: string[];
  scorerId?: string;
  teamASquadIds?: string[];
  teamBSquadIds?: string[];
  savedState?: MatchState;
  allowFlexibleSquad?: boolean;
  initialPlayers?: {
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
  };
  reportSubmission?: MatchReportSubmission;
};

export type ExtrasBreakdown = {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
  total: number;
};

export type FallOfWicket = {
  score: number;
  wicketNumber: number;
  over: string;
  batterName: string;
};

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
  bowlerName?: string;
  isOut: boolean;
  atCrease: boolean;
}

export interface InningsStats {
  rows: BattingCardRow[];
  extras: ExtrasBreakdown;
  totalScore: string;
  overs: string;
  runRate: string;
  fow: FallOfWicket[];
  didNotBat: Player[];
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface MediaPost {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'LIVE_STATUS' | 'NEWS';
  authorName: string;
  authorAvatar?: string;
  title?: string;
  contentUrl?: string;
  caption: string;
  timestamp: number;
  likes: number;
  shares: number;
  comments: Comment[];
  matchId?: string;
  sponsorId?: string;
}

