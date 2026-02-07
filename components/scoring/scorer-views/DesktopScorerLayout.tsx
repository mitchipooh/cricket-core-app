import React from 'react';
import { ScorerLayoutProps } from './types';
import { OverRateTimer } from '../OverRateTimer';
import { ScoringPad } from '../ScoringPad';
import { FullMatchScorecard } from '../../display/FullMatchScorecard.tsx';
import { PitchView } from '../../analytics/PitchView.tsx';
import { FieldView } from '../../analytics/FieldView.tsx';
import { OverFeed } from '../OverFeed';
import { CoachCopilot } from '../CoachCopilot';

export const DesktopScorerLayout: React.FC<ScorerLayoutProps> = ({
    match, engine, teams, battingTeam, bowlingTeam,
    stats, timer, pad, wicket,
    onExit, setLayoutMode, isAuthorized,
    handlers, modals
}) => {
    const teamA = teams.find(t => t.id === match.teamAId);
    const teamB = teams.find(t => t.id === match.teamBId);

    const striker = battingTeam?.players.find(p => p.id === engine.state.strikerId);
    const nonStriker = battingTeam?.players.find(p => p.id === engine.state.nonStrikerId);
    const bowler = bowlingTeam?.players.find(p => p.id === engine.state.bowlerId);

    // Helpers to access ball history for pitch/wagon
    const last24Balls = engine.state.history.slice(0, 24);
    const pitchDeliveries = last24Balls.filter(b => b.pitchCoords).map(b => ({ coords: b.pitchCoords!, color: b.isWicket ? 'red' : 'yellow' as const }));
    const wagonShots = last24Balls.filter(b => b.shotCoords).map(b => ({ coords: b.shotCoords!, color: b.runs >= 4 ? 'green' : 'white' as const }));

    return (
        <div className="h-full bg-slate-950 text-white flex flex-col w-full">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center shadow-lg z-20">
                <div className="flex items-center gap-4 min-w-[200px]">
                    {onExit && <button onClick={onExit} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700">←</button>}
                    <div>
                        <h1 className="text-sm font-black uppercase text-white">{battingTeam?.name} vs {bowlingTeam?.name}</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{match.format} • {stats.overs} Overs</p>
                    </div>
                </div>

                <div className="flex-1 flex justify-center">
                    <OverRateTimer
                        elapsedSeconds={timer.elapsedSeconds}
                        actualOvers={timer.actualOvers}
                        expectedOvers={timer.expectedOvers}
                        behindRate={timer.behindRate}
                    />
                </div>

                <div className="flex items-center gap-4 min-w-[200px] justify-end">
                    <div className="text-center">
                        <div className="text-3xl font-black text-white leading-none">{engine.state.score}/{engine.state.wickets}</div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">CRR {stats.runRate}</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <button onClick={() => setLayoutMode('PHONE')} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Switch to Mobile View">📱</button>
                    <button onClick={handlers.openScoreboardWindow} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500">
                        Popout Board
                    </button>
                    <button onClick={handlers.handleManualSave} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-lg hover:bg-emerald-500 transition-colors" title="Save Game">
                        💾
                    </button>
                    <button onClick={() => {
                        if (confirm('Are you sure you want to end this match? This will finalize the result.')) {
                            handlers.handleManualConclude();
                        }
                    }} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-lg hover:bg-red-500 transition-colors" title="End Match">
                        🏁
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-12 gap-0">
                <div className="col-span-3 border-r border-slate-800 bg-slate-925 flex flex-col">
                    <div className="flex-1 p-2">
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
                            onSubRequest={() => modals.setShowSubModal(true)}
                            matchFormat={match.format}
                            onEndGame={handlers.handleManualConclude}
                            onAnalyticsClick={() => modals.setShowShotModal(true)}
                            onBroadcasterMode={() => modals.setShowBroadcaster(true)}
                            autoAnalytics={modals.autoAnalytics}
                            onToggleAnalytics={() => modals.setAutoAnalytics(!modals.autoAnalytics)}
                            onOfficialsClick={() => modals.setShowOfficialsModal(true)}
                            onUndo={engine.undoBall}
                            readOnly={!isAuthorized || engine.state.isCompleted}
                            compact={true}
                        />
                    </div>
                    <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">On Strike</div>
                        <div className="flex justify-between items-center bg-slate-800 p-2 rounded-lg mb-2 border border-indigo-500/30">
                            <span className="text-xs font-bold text-white truncate max-w-[100px]">{striker?.name}</span>
                            <span className="text-xs font-mono text-indigo-400">{stats.batterStats[engine.state.strikerId]?.runs || 0}({stats.batterStats[engine.state.strikerId]?.balls || 0})</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700">
                            <span className="text-xs font-bold text-slate-400 truncate max-w-[100px]">{nonStriker?.name}</span>
                            <span className="text-xs font-mono text-slate-500">{stats.batterStats[engine.state.nonStrikerId]?.runs || 0}({stats.batterStats[engine.state.nonStrikerId]?.balls || 0})</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Bowler</div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-white">{bowler?.name}</span>
                                <span className="text-xs font-mono text-emerald-400">{stats.bowlerStats[engine.state.bowlerId]?.wickets || 0}-{stats.bowlerStats[engine.state.bowlerId]?.runs || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-5 border-r border-slate-800 bg-slate-950 overflow-y-auto custom-scrollbar p-4">
                    {teamA && teamB && <FullMatchScorecard matchState={engine.state} teamA={teamA} teamB={teamB} />}
                </div>

                <div className="col-span-4 bg-slate-900 flex flex-col overflow-hidden">
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 text-center">Pitch Map (Last 24 Balls)</h4>
                            <PitchView deliveries={pitchDeliveries as any} readonly />
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 text-center">Wagon Wheel</h4>
                            <FieldView shots={wagonShots as any} readonly />
                        </div>
                    </div>
                    <div className="h-1/3 border-t border-slate-800 bg-slate-950">
                        <OverFeed matchState={engine.state} battingTeam={battingTeam} bowlingTeam={bowlingTeam} onEditBall={engine.editBall} />
                    </div>
                </div>
            </div>

            <CoachCopilot matchState={engine.state} battingTeam={battingTeam} bowlingTeam={bowlingTeam} />
        </div>
    );
};

