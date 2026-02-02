import React, { useState } from 'react';
import { ScorerLayoutProps } from './types';
import { ScoringPad } from '../ScoringPad';
import { FullMatchScorecard } from '../../display/FullMatchScorecard.tsx';
import { MatchResultSummary } from '../../display/MatchResultSummary.tsx';
import { MatchState, BallEvent } from '../../../types';

export const MobileScorerLayout: React.FC<ScorerLayoutProps> = ({
    match, engine, teams, battingTeam, bowlingTeam,
    stats, pad, wicket, rules, timer,
    onExit, setLayoutMode, isAuthorized,
    handlers, modals, onEditPlayer, onBallClick,
    mobileTab, setMobileTab
}) => {
    // const [mobileTab, setMobileTab] = useState<'SCORING' | 'SCORECARD' | 'BALLS' | 'INFO' | 'SUMMARY'>('SCORING'); // Lifted to parent

    const striker = battingTeam?.players.find(p => p.id === engine.state.strikerId);
    const nonStriker = battingTeam?.players.find(p => p.id === engine.state.nonStrikerId);
    const bowler = bowlingTeam?.players.find(p => p.id === engine.state.bowlerId);

    // Safety check for teams
    const teamA = teams.find(t => t.id === match.teamAId);
    const teamB = teams.find(t => t.id === match.teamBId);

    // Ball history helpers for BALLS tab
    const reversedHistory = [...engine.state.history].reverse();

    // Helper to calculate runs needed
    const runsNeeded = engine.state.target ? engine.state.target - engine.state.score : 0;
    const ballsRemaining = (rules.totalOversAllowed * 6) - engine.state.totalBalls;

    return (
        <div className="h-full bg-white text-slate-900 flex flex-col w-full relative">
            {/* 1. Header & Tabs */}
            <div className="bg-white border-b border-gray-200 shrink-0 sticky top-0 z-50">
                <div className="flex justify-between items-center p-4 pb-2">
                    <button onClick={onExit} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200">←</button>
                    <span className="font-bold text-gray-900 text-lg">Match Centre</span>
                    <div className="flex gap-2">
                        <button
                            onClick={engine.undoBall}
                            disabled={!engine.canUndo}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${engine.canUndo ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-gray-100 text-gray-300'}`}
                        >
                            ↩️
                        </button>
                        <button onClick={() => setLayoutMode('DESKTOP')} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200">🖥️</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-around items-center px-4">
                    {['SCORING', 'SCORECARD', 'BALLS', 'INFO'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setMobileTab(tab as any)}
                            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${mobileTab === tab ? 'text-teal-700 border-teal-700' : 'text-gray-400 border-transparent'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 relative bg-gray-50">
                {mobileTab === 'SCORING' && (
                    <div className="h-full flex flex-col">
                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2 space-y-2 no-scrollbar">

                            {/* Match Summary Section - Compacted (approx 25% smaller) */}
                            <div className="text-center">
                                <div className="flex justify-between items-center mb-1">
                                    <h2 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{battingTeam?.name}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                            ⏱️ {(() => {
                                                const s = timer?.elapsedSeconds || 0;
                                                const m = Math.floor(s / 60);
                                                const sec = s % 60;
                                                return `${m}:${sec.toString().padStart(2, '0')}`;
                                            })()}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{engine.state.innings === 1 ? '1st Innings' : '2nd Innings'}</span>
                                    </div>
                                </div>

                                {/* SCORE DISPLAY - Reduced Size */}
                                <div className="text-5xl font-black text-teal-900 mb-1 leading-none tracking-tight">
                                    {engine.state.score}-{engine.state.wickets}
                                </div>

                                {/* MATCH STATS ROW - Compacted */}
                                <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-600 mb-2">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-gray-400 uppercase">Ex</span>
                                        <span>{engine.state.history.filter(b => b.innings === engine.state.innings && b.extraRuns && b.extraRuns > 0).reduce((acc, b) => acc + (b.extraRuns || 0), 0)}</span>
                                    </div>
                                    <div className="h-6 w-px bg-gray-300"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-gray-400 uppercase">Ov</span>
                                        <span>{Math.floor(engine.state.totalBalls / 6)}.{engine.state.totalBalls % 6} <span className="text-gray-400 font-normal">/ {rules.totalOversAllowed}</span></span>
                                    </div>
                                    <div className="h-6 w-px bg-gray-300"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-gray-400 uppercase">CRR</span>
                                        <span>{stats.runRate}</span>
                                    </div>
                                </div>

                                {/* CHASE EQUATION */}
                                {engine.state.innings === 2 && (
                                    <div className="bg-orange-50 rounded-lg p-1.5 border border-orange-100 inline-block min-w-[80%]">
                                        <div className="flex justify-center gap-3 text-[9px] font-bold text-orange-800 uppercase mb-0.5">
                                            <span>Target {engine.state.target}</span>
                                            <span>Req RR {stats.requiredRate}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-orange-600">
                                            Need {runsNeeded} runs of {ballsRemaining} balls
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Batting Table - Ensuring Names are Visible */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="flex bg-gray-50 p-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <div className="flex-1 flex items-center gap-1">
                                        <span className="text-orange-500">✏️</span> Batsman
                                    </div>
                                    <div className="w-8 text-center">R</div>
                                    <div className="w-8 text-center">B</div>
                                    <div className="w-6 text-center">4s</div>
                                    <div className="w-6 text-center">6s</div>
                                    <div className="w-10 text-center">SR</div>
                                </div>
                                {/* Render explicit Striker/NonStriker rows if IDs are set, even if player not found */}
                                {[engine.state.strikerId, engine.state.nonStrikerId].filter(Boolean).map(id => {
                                    const p = battingTeam?.players.find(pl => pl.id === id);
                                    const name = p?.name || 'Unknown Batter';
                                    const s = stats.batterStats[id] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
                                    const isStriker = id === engine.state.strikerId;

                                    // Determine role for click handler
                                    const role = isStriker ? 'striker' : 'nonStriker';

                                    return (
                                        <div key={id} className="flex items-center p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors min-h-[40px]">
                                            <div onClick={() => pad.openBatterActions(isStriker ? 'striker' : 'nonStriker')} className="flex-1 font-bold text-gray-800 text-xs flex items-center cursor-pointer">
                                                {isStriker
                                                    ? <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm truncate max-w-[120px] block">{name}</span>
                                                    : <span className="pl-1 truncate max-w-[120px] block">{name}</span>
                                                }
                                            </div>

                                            {/* Edit Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditPlayer(isStriker ? '@striker' : '@nonStriker');
                                                }}
                                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full mr-1 transition-colors"
                                            >
                                                ✏️
                                            </button>

                                            <div className={`w-8 text-center font-bold text-xs ${isStriker ? 'text-teal-700' : 'text-gray-900'}`}>{s.runs}</div>
                                            <div className="w-8 text-center text-[10px] text-gray-500 font-bold">{s.balls}</div>
                                            <div className="w-6 text-center text-[10px] text-gray-400">{s.fours}</div>
                                            <div className="w-6 text-center text-[10px] text-gray-400">{s.sixes}</div>
                                            <div className="w-10 text-center text-[9px] text-gray-500 font-mono">{s.strikeRate}</div>
                                        </div>
                                    );
                                })}
                                {/* Fallback if no batters selected yet */}
                                {(!engine.state.strikerId && !engine.state.nonStrikerId) && (
                                    <div className="p-4 text-center text-[10px] text-gray-400 italic">
                                        No batters at crease. Select Play/Start Match.
                                    </div>
                                )}
                            </div>

                            {/* Bowling Table */}
                            {engine.state.bowlerId && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="flex bg-gray-50 p-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                        <div className="flex-1 flex items-center gap-1">
                                            <span className="text-teal-600">✏️</span> Bowler
                                        </div>
                                        <div className="w-8 text-center">O</div>
                                        <div className="w-8 text-center">M</div>
                                        <div className="w-8 text-center">R</div>
                                        <div className="w-6 text-center">W</div>
                                        <div className="w-10 text-center">Eco</div>
                                    </div>
                                    {(() => {
                                        const bId = engine.state.bowlerId;
                                        const p = bowlingTeam?.players.find(pl => pl.id === bId);
                                        const name = p?.name || 'Unknown Bowler';
                                        const s = stats.bowlerStats[bId] || { overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 };

                                        return (
                                            <div className="flex items-center p-2 min-h-[40px]">
                                                <div onClick={() => pad.startBowlerReplacement('correction')} className="flex-1 font-bold text-gray-800 text-xs pl-1 truncate cursor-pointer">{name}</div>

                                                {/* Edit Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditPlayer('bowler');
                                                    }}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full mr-1 transition-colors"
                                                >
                                                    ✏️
                                                </button>

                                                <div className="w-8 text-center text-[10px] text-gray-500 font-bold">{s.overs}</div>
                                                <div className="w-8 text-center text-[10px] text-gray-400">{s.maidens}</div>
                                                <div className="w-8 text-center text-[10px] text-gray-400">{s.runs}</div>
                                                <div className="w-6 text-center font-black text-xs text-teal-700">{s.wickets}</div>
                                                <div className="w-10 text-center text-[9px] text-gray-500 font-mono">{s.economy}</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Recent Activity Strip (Horizontal) */}
                        <div className="shrink-0 bg-white border-y border-gray-200 py-3 relative shadow-inner z-10">
                            <div className="flex items-center gap-3 px-4 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-black text-gray-400 uppercase shrink-0 sticky left-0 bg-white pr-2">Recent</span>
                                {engine.state.history.slice(-12).reverse().map((b, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border ${b.isWicket ? 'bg-red-500 text-white border-red-600' : (b.runs >= 4 ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-100 text-gray-600 border-gray-200')}`}>
                                        {b.isWicket ? 'W' : b.runs + (b.extraRuns || 0)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Section: Keypad */}
                        <div className="shrink-0 bg-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] z-20 rounded-t-3xl mt-[-10px] relative border-t border-gray-300">
                            <div className="pb-safe pt-2 h-56">
                                <ScoringPad
                                    padView={pad.padView}
                                    striker={striker}
                                    nonStriker={nonStriker}
                                    bowlingTeam={bowlingTeam}
                                    onRun={handlers.handleRun}
                                    onCommitExtra={handlers.handleCommitExtra}
                                    onStartWicket={wicket.start}
                                    onNav={pad.setPadView}
                                    onBack={pad.resetPad}
                                    onMediaCapture={() => modals.setIsCameraOpen(true)}
                                    onDeclare={engine.declareInnings}
                                    onEndInnings={engine.concludeInnings}
                                    onSubRequest={() => modals.setShowSubModal(true)}
                                    onEndGame={handlers.handleManualConclude}
                                    onAnalyticsClick={() => modals.setShowShotModal(true)}
                                    onBroadcasterMode={() => modals.setShowBroadcaster(true)}
                                    matchFormat={match.format}
                                    autoAnalytics={modals.autoAnalytics}
                                    onToggleAnalytics={() => modals.setAutoAnalytics(!modals.autoAnalytics)}
                                    onOfficialsClick={() => modals.setShowOfficialsModal(true)}
                                    readOnly={!isAuthorized || engine.state.isCompleted}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Scorecard Tab */}
                {mobileTab === 'SCORECARD' && (
                    <div className="p-4 bg-gray-50 min-h-full">
                        {teamA && teamB && <FullMatchScorecard matchState={engine.state} teamA={teamA} teamB={teamB} />}
                    </div>
                )}

                {/* Balls Tab */}
                {mobileTab === 'SUMMARY' && (
                    <div className="h-full overflow-y-auto no-scrollbar relative">
                        <MatchResultSummary
                            matchState={engine.state}
                            teamA={teamA!}
                            teamB={teamB!}
                            format={match.format}
                            onExit={() => setMobileTab('SCORING')}
                            onViewScorecard={() => setMobileTab('SCORECARD')}
                        />
                    </div>
                )}

                {mobileTab === 'BALLS' && (
                    <div className="p-4 space-y-2 overflow-y-auto h-full bg-gray-50">
                        {reversedHistory.map((b, i) => {
                            // Helper to find player details
                            const getPlayer = (id: string) => teams.flatMap(t => t.players).find(p => p.id === id);
                            const bowler = getPlayer(b.bowlerId);
                            const striker = getPlayer(b.strikerId);
                            const isExtra = b.extraType && b.extraType !== 'None';

                            return (
                                <div
                                    key={i}
                                    onClick={() => onBallClick && onBallClick(b)}
                                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                >
                                    {/* Left: Over & Context */}
                                    <div className="flex flex-col items-center min-w-[3rem] border-r border-gray-100 pr-3 mr-3">
                                        <div className="text-xs font-black text-gray-700">
                                            {b.over}.{b.ballNumber}
                                        </div>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${b.innings === 1 ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                            Inn {b.innings}
                                        </span>
                                    </div>

                                    {/* Middle: Action Context */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                                            {bowler?.name?.split(' ').pop() || 'Unknown'} to
                                        </div>
                                        <div className="text-xs font-bold text-gray-900 truncate">
                                            {striker?.name || 'Unknown Batter'}
                                        </div>
                                        {b.isWicket && (
                                            <div className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                WICKET ({b.wicketType})
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Score Result */}
                                    <div className="flex flex-col items-end gap-1 text-right pl-2">
                                        <div className={`text-lg font-black leading-none ${b.isWicket ? 'text-red-500' : (b.runs >= 4 ? 'text-teal-600' : 'text-gray-800')}`}>
                                            {b.runs + (b.extraRuns || 0)}
                                        </div>
                                        {isExtra && (
                                            <div className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1 rounded uppercase">
                                                {b.extraType} {b.extraRuns ? `+${b.extraRuns}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

