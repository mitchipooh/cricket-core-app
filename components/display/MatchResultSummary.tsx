import React, { useMemo } from 'react';
import { MatchState, Team, Player } from '../../types.ts';
import { getBattingStats, getBowlingStats } from '../../scoring/MatchSelectors.ts';
import { calculateMVP } from '../scoring/logic/MVPCalculator.ts';
import { buildBattingCard } from '../../scorer/scorecard/buildBattingCard.ts';
import { buildBowlingCard } from '../../scorer/scorecard/buildBowlingCard.ts';
import { generateMatchPDF } from '../scoring/logic/generateMatchPDF.ts';

interface MatchResultSummaryProps {
    matchState: MatchState;
    teamA: Team;
    teamB: Team;
    format?: string;
    onExit: () => void;
    onViewScorecard: () => void;
}


export const MatchResultSummary: React.FC<MatchResultSummaryProps> = ({ matchState, teamA, teamB, format = 'Cricket Match', onExit, onViewScorecard }) => {

    // 4. PDF Generation
    // 4. PDF Generation
    const handleDownloadPDF = () => {
        generateMatchPDF(matchState, teamA, teamB, format);
    };
    const result = useMemo(() => {
        const scoreA = matchState.inningsScores.find(i => i.teamId === teamA.id)?.score || 0;
        const scoreB = matchState.inningsScores.find(i => i.teamId === teamB.id)?.score || 0;
        const wicketsB = matchState.inningsScores.find(i => i.teamId === teamB.id)?.wickets || 0;

        let text = "Match Concluded";
        let subText = "Scores Level";
        let winnerId = null;

        if (scoreA > scoreB) {
            text = `${teamA.name} Win`;
            subText = `by ${scoreA - scoreB} runs`;
            winnerId = teamA.id;
        } else if (scoreB > scoreA) {
            text = `${teamB.name} Win`;
            subText = `by ${10 - wicketsB} wickets`;
            winnerId = teamB.id;
        } else {
            text = "Match Tied";
        }
        return { text, subText, winnerId };
    }, [matchState, teamA, teamB]);

    // 2. MVP
    const mvp = useMemo(() => {
        const allPlayers = [...teamA.players, ...teamB.players];
        const ranked = calculateMVP(matchState, allPlayers);
        const top = ranked[0];
        const player = allPlayers.find(p => p.id === top.playerId);
        return { player, stats: top.stats, points: top.points };
    }, [matchState, teamA, teamB]);

    // 3. Innings Summaries (Top 3 Batters, Top 3 Bowlers)
    // 3. Innings Summaries (Top 3 Batters, Top 3 Bowlers)
    const getInningsSummary = (teamId: string, inningsNum: number) => {
        const team = teamId === teamA.id ? teamA : teamB;
        const oppTeam = teamId === teamA.id ? teamB : teamA;

        // Calculate Score from History (More robust than inningsScores)
        // Note: We use empty strings for striker/nonStriker as we just need the totals
        const battingCard = buildBattingCard(matchState.history, team.players, inningsNum, '', '');
        const score = battingCard.totalScore;

        // Top 3 Batters
        const batters = battingCard.rows
            .sort((a, b) => b.runs - a.runs)
            .slice(0, 3)
            .filter(b => b.balls > 0)
            .map(row => {
                const p = team.players.find(pl => pl.name === row.name) || { name: row.name, id: 'unknown' } as Player;
                return { p, s: { runs: row.runs, balls: row.balls } };
            });

        // Top 3 Bowlers (from opposition)
        // usage of getBowlingStats is fine, or we could use buildBowlingCard
        const bowlers = oppTeam.players
            .map(p => ({ p, s: getBowlingStats(p.id, matchState.history, inningsNum) }))
            .sort((a, b) => b.s.wickets - a.s.wickets || a.s.runs - b.s.runs)
            .slice(0, 3)
            .filter(b => parseFloat(b.s.overs) > 0);

        return { team, score, batters, bowlers };
    };

    // Determine Innings logic
    // If completed, we should have history for both.
    const firstBall = matchState.history.find(b => b.innings === 1);
    const firstStrikerId = firstBall?.strikerId;
    // Check which team the first striker belongs to
    // If no history (e.g. 0 balls bowled), fallback to battingTeamId
    let firstBatTeamId = matchState.battingTeamId;
    if (firstStrikerId) {
        if (teamA.players.some(p => p.id === firstStrikerId)) firstBatTeamId = teamA.id;
        else if (teamB.players.some(p => p.id === firstStrikerId)) firstBatTeamId = teamB.id;
    }

    // If we can't determine from players (shouldn't happen), check inningsScores fallback
    if (!firstBall && matchState.inningsScores.length > 0) {
        const log = matchState.inningsScores.find(i => i.innings === 1);
        if (log) firstBatTeamId = log.teamId;
    }

    const secondBatTeamId = firstBatTeamId === teamA.id ? teamB.id : teamA.id;

    const summary1 = getInningsSummary(firstBatTeamId, 1);
    const summary2 = getInningsSummary(secondBatTeamId, 2);

    return (
        <div className="fixed inset-0 bg-gray-100 z-[200] overflow-y-auto">
            <div className="max-w-md mx-auto min-h-screen bg-gray-50 shadow-2xl relative">

                {/* Header */}
                <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <img src="/logo.jpg" alt="Logo" className="h-8 w-8 object-contain" />
                        <div>
                            <h1 className="text-sm font-black text-gray-800 uppercase tracking-tight">Match Result</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format}</p>
                        </div>
                    </div>
                    <button onClick={onExit} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">
                        ❌
                    </button>
                </div>

                <div className="p-4 space-y-6">

                    {/* Innings 1 Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-teal-600 p-3 flex justify-between items-center text-white">
                            <div className="font-bold text-sm tracking-wide">{summary1.team.name}</div>
                            <div className="font-black text-lg">{summary1.score}</div>
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                                {summary1.batters.map((b, i) => (
                                    <div key={i} className="flex justify-between p-1 bg-gray-50 rounded">
                                        <span className="truncate w-20 font-medium">{b.p.name}</span>
                                        <span className="font-bold">{b.s.runs} <span className="text-gray-400 font-normal">({b.s.balls})</span></span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                {summary1.bowlers.map((b, i) => (
                                    <div key={i} className="flex justify-between p-1 bg-gray-50 rounded">
                                        <span className="truncate w-20 font-medium">{b.p.name}</span>
                                        <span className="font-bold">{b.s.wickets}-{b.s.runs} <span className="text-gray-400 font-normal">({b.s.overs})</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Innings 2 Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-orange-500 p-3 flex justify-between items-center text-white">
                            <div className="font-bold text-sm tracking-wide">{summary2.team.name}</div>
                            <div className="font-black text-lg">{summary2.score}</div>
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                                {summary2.batters.map((b, i) => (
                                    <div key={i} className="flex justify-between p-1 bg-gray-50 rounded">
                                        <span className="truncate w-20 font-medium">{b.p.name}</span>
                                        <span className="font-bold">{b.s.runs} <span className="text-gray-400 font-normal">({b.s.balls})</span></span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                {summary2.bowlers.map((b, i) => (
                                    <div key={i} className="flex justify-between p-1 bg-gray-50 rounded">
                                        <span className="truncate w-20 font-medium">{b.p.name}</span>
                                        <span className="font-bold">{b.s.wickets}-{b.s.runs} <span className="text-gray-400 font-normal">({b.s.overs})</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Result Banner */}
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 rounded-2xl text-center text-white shadow-lg">
                        <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{result.text}</h2>
                        <p className="text-sm font-bold opacity-90 uppercase tracking-widest">{result.subText}</p>
                    </div>

                    {/* MVP Section */}
                    {mvp.player && (
                        <div className="text-center">
                            <div className="inline-block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Man of the Match</div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 text-left">
                                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                    <img src={mvp.player.photoUrl || `https://ui-avatars.com/api/?name=${mvp.player.name}`} className="w-full h-full object-cover" />
                                </div >
                                <div>
                                    <div className="font-black text-gray-800">{mvp.player.name}</div>
                                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                                        {mvp.stats.runs > 0 && <span className="mr-2">🏏 {mvp.stats.runs}</span>}
                                        {mvp.stats.wickets > 0 && <span>⚾ {mvp.stats.wickets}</span>}
                                    </div>
                                </div>
                                <div className="ml-auto text-right">
                                    <div className="text-xl font-black text-teal-600 leading-none">{Math.round(mvp.points)}</div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">PTS</div>
                                </div>
                            </div >
                        </div >
                    )}

                    <div className="flex flex-col gap-3">
                        <button onClick={handleDownloadPDF} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20">
                            Download PDF Scorebook
                        </button>
                        <button onClick={onViewScorecard} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl uppercase text-xs tracking-widest hover:bg-slate-50">
                            View Full Scorecard
                        </button>
                        <button onClick={onExit} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl uppercase text-xs tracking-widest">
                            Return to Dashboard
                        </button>
                    </div>

                </div >
            </div >
        </div >
    );
};
