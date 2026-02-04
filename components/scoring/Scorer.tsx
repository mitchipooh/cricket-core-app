
import React, { useState, useEffect, useMemo } from 'react';
import { MatchFixture, Team, Organization, UserProfile, MediaPost, MatchState, BallEvent } from '../../types';
import { useMatchEngine } from '../../scoring/hooks/useMatchEngine.ts';
import { useScoringPad } from '../../scoring/hooks/useScoringPad.ts';
import { useMatchRules } from '../../scoring/hooks/useMatchRules.ts';
import { useDerivedStats } from '../../scoring/hooks/useDerivedStats.ts';
import { useWicketFlow } from '../../scoring/hooks/useWicketFlow.ts';
import { useInningsOverRateTimer } from '../../scoring/hooks/useInningsOverRateTimer.ts';

// Views
import { DesktopScorerLayout } from './scorer-views/DesktopScorerLayout.tsx';
import { MobileScorerLayout } from './scorer-views/MobileScorerLayout.tsx';
import { MatchResultSummary } from '../display/MatchResultSummary.tsx';
import { FullMatchScorecard } from '../display/FullMatchScorecard.tsx';
import { BroadcasterView } from '../media/BroadcasterView.tsx';

// Modals
import { ShotEntryModal } from '../analytics/ShotEntryModal.tsx';
import { WicketModal } from '../modals/WicketModal.tsx';
import { EndOfOverModal } from '../modals/EndOfOverModal.tsx';
import { InningsBreakModal } from '../modals/InningsBreakModal.tsx';
import { MatchStartModal } from '../modals/MatchStartModal.tsx';
import { NewBatterModal } from '../modals/NewBatterModal.tsx';
import { PlayerEditModal } from '../modals/PlayerEditModal.tsx';
import { BallCorrectionModal } from '../modals/BallCorrectionModal.tsx';
import { CameraModal } from '../modals/CameraModal.tsx';
import { OfficialsModal } from '../modals/OfficialsModal.tsx';
import { checkEndOfInnings } from '../../scoring/engines/inningsEngine.ts';
import { generateMatchPDF } from './logic/generateMatchPDF.ts';

interface ScorerProps {
    match: MatchFixture;
    teams: Team[];
    userRole: UserProfile['role'];
    organizations: Organization[];
    onUpdateOrgs: (orgs: Organization[]) => void;
    onUpdateMatchState: (matchId: string, newState: MatchState, finalStatus?: MatchFixture['status']) => void;
    onComplete: () => void;
    onRequestNewMatch: () => void;
    onAddMediaPost: (post: MediaPost) => void;
    onExit: () => void;
    currentUserId: string;
}

export const Scorer: React.FC<ScorerProps> = ({
    match,
    teams,
    userRole,
    onUpdateMatchState,
    onComplete,
    onAddMediaPost,
    onExit,
    currentUserId,
    organizations
}) => {
    const [layoutMode, setLayoutMode] = useState<'DESKTOP' | 'PHONE'>(window.innerWidth > 1024 ? 'DESKTOP' : 'PHONE');

    // -- State Initialization --
    const initialMatchState: MatchState = match.savedState || {
        battingTeamId: match.teamAId,
        bowlingTeamId: match.teamBId,
        score: 0,
        wickets: 0,
        totalBalls: 0,
        strikerId: match.initialPlayers?.strikerId || '',
        nonStrikerId: match.initialPlayers?.nonStrikerId || '',
        bowlerId: match.initialPlayers?.bowlerId || '',
        innings: 1,
        history: [],
        inningsScores: [],
        isCompleted: false,
        matchTimer: { startTime: null, totalAllowances: 0, isPaused: false, lastPauseTime: null },
        umpires: match.umpires || []
    };

    const engine = useMatchEngine(initialMatchState);
    const pad = useScoringPad();
    const wicket = useWicketFlow();

    const battingTeam = teams.find(t => t.id === engine.state.battingTeamId);
    const bowlingTeam = teams.find(t => t.id === engine.state.bowlingTeamId);

    const rules = useMatchRules(match, engine.state, bowlingTeam);
    const stats = useDerivedStats(engine.state, rules.totalOversAllowed, battingTeam, bowlingTeam);

    const timer = useInningsOverRateTimer(
        engine.state.matchTimer.startTime,
        engine.state.totalBalls,
        !engine.state.isCompleted && !engine.state.matchTimer.isPaused
    );

    // -- UI State --
    const [showBroadcaster, setShowBroadcaster] = useState(false);
    const [showShotModal, setShowShotModal] = useState(false);
    const [showStartModal, setShowStartModal] = useState(!engine.state.strikerId && !match.savedState);
    const [showSubModal, setShowSubModal] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [autoAnalytics, setAutoAnalytics] = useState(false);
    const [showOfficialsModal, setShowOfficialsModal] = useState(false);
    const [mobileTab, setMobileTab] = useState<'SCORING' | 'SCORECARD' | 'BALLS' | 'INFO' | 'SUMMARY'>('SCORING');

    const [inningsBreak, setInningsBreak] = useState<{ open: boolean; reason: string | null }>({ open: false, reason: null });

    const [correctionTarget, setCorrectionTarget] = useState<'bowler' | '@striker' | '@nonStriker' | null>(null);
    const [editingBall, setEditingBall] = useState<BallEvent | null>(null);
    const [newBatterTarget, setNewBatterTarget] = useState<'Striker' | 'NonStriker' | null>(null);
    const [postMatchView, setPostMatchView] = useState<'SUMMARY' | 'SCORECARD'>('SUMMARY');

    const isAuthorized = userRole === 'Scorer' || userRole === 'Administrator' || (userRole === 'Umpire' && match.umpires?.includes(currentUserId));

    // Determine available officials from the relevant organization
    const availableOfficials = useMemo(() => {
        // Find org for this fixture
        const hostOrg = organizations.find(o => o.fixtures.some(f => f.id === match.id));
        if (!hostOrg) return [];

        return hostOrg.members
            .filter(m => m.role === 'Umpire' || m.role === 'Match Official')
            .map(m => ({ id: m.userId, name: m.name, handle: m.handle, role: 'Umpire', createdAt: m.addedAt } as UserProfile));
    }, [organizations, match.id]);

    useEffect(() => {
        onUpdateMatchState(match.id, engine.state);
    }, [engine.state, match.id]);

    useEffect(() => {
        const reason = checkEndOfInnings(engine.state, rules.totalOversAllowed, battingTeam?.players.length, match.allowFlexibleSquad, match.format);
        if (reason) {
            setInningsBreak({ open: true, reason });
        } else if (!engine.state.isCompleted && !showStartModal) {
            // Auto-prompt for new batter if someone is missing and innings is NOT over
            if (!engine.state.strikerId) setNewBatterTarget('Striker');
            else if (!engine.state.nonStrikerId) setNewBatterTarget('NonStriker');
        }
    }, [engine.state, rules.totalOversAllowed, battingTeam, match, showStartModal]);

    const handleRun = (runs: number) => {
        engine.applyBall({ runs });
        if (autoAnalytics) setShowShotModal(true);
    };

    const handleCommitExtra = (type: string, runs: number, isOffBat?: boolean) => {
        let extraType: 'Wide' | 'NoBall' | 'Bye' | 'LegBye' | 'None' = 'None';
        if (type === 'Wide') extraType = 'Wide';
        if (type === 'NoBall') extraType = 'NoBall';
        if (type === 'Bye') extraType = 'Bye';
        if (type === 'LegBye') extraType = 'LegBye';

        engine.applyBall({
            extraType,
            extraRuns: runs,
            runs: isOffBat ? runs : 0,
            batRuns: isOffBat ? runs : 0
        });
        pad.resetPad();
    };

    const startNextInnings = () => {
        if (match.format === 'Test' && engine.state.innings < 4) {
            const lead = 0;
            const followOn = false;
            engine.endInnings(false);
            engine.startInnings(engine.state.bowlingTeamId, engine.state.battingTeamId, undefined, followOn);
        } else if (match.format !== 'Test' && engine.state.innings < 2) {
            engine.endInnings(false);
            engine.startInnings(engine.state.bowlingTeamId, engine.state.battingTeamId, engine.state.score + 1);
        } else if (match.format === 'Test' && engine.state.innings === 1) {
            engine.endInnings(false);
            engine.startInnings(engine.state.bowlingTeamId, engine.state.battingTeamId, engine.state.score + 1);
        }
        setInningsBreak({ open: false, reason: null });
        setShowStartModal(true);
    };

    // Calculate Lead/Trail message
    const leadMessage = useMemo(() => {
        if (!engine.state.testConfig || !engine.state.lead) return null;
        const msg = engine.state.lead > 0
            ? `${battingTeam?.name} leads by ${engine.state.lead}`
            : `${battingTeam?.name} trails by ${Math.abs(engine.state.lead)}`;
        return msg;
    }, [engine.state.lead, battingTeam]);

    const handleMatchFinish = () => {
        engine.endInnings(true);
        // Persist final status as 'Completed'
        onUpdateMatchState(match.id, engine.state, 'Completed');
        onComplete();
    };

    const handleManualConclude = () => {
        engine.endInnings(true);
        onUpdateMatchState(match.id, engine.state, 'Completed');
        onComplete();
    };

    const enforceFollowOn = () => {
        engine.startInnings(engine.state.battingTeamId, engine.state.bowlingTeamId, undefined, true);
        setInningsBreak({ open: false, reason: null });
    };

    const handleManualSave = () => {
        onUpdateMatchState(match.id, engine.state);
        alert('Game Saved Successfully!');
    };

    const canEnforceFollowOn = match.format === 'Test' && engine.state.innings === 2;

    const handleAnalyticsSave = (pitch?: { x: number, y: number }, shot?: { x: number, y: number }) => {
        if (engine.state.history.length > 0) {
            engine.editBall(engine.state.history[0].timestamp, { pitchCoords: pitch, shotCoords: shot });
        }
    };

    const openScoreboardWindow = () => {
        const width = 800;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
            `${window.location.origin}${window.location.pathname}?mode=scoreboard`,
            'ScoreboardWindow',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    };

    const handleUpdateOfficials = (newUmpires: string[]) => {
        engine.updateMetadata({ umpires: newUmpires });
    };

    useEffect(() => {
        const channel = new BroadcastChannel('cricket_sync_channel');
        channel.postMessage({
            type: 'UPDATE',
            state: engine.state,
            teams: { batting: battingTeam, bowling: bowlingTeam }
        });
        return () => channel.close();
    }, [engine.state, battingTeam, bowlingTeam]);

    const getLastBall = () => engine.state.history[0];

    const striker = battingTeam?.players.find(p => p.id === engine.state.strikerId);
    const nonStriker = battingTeam?.players.find(p => p.id === engine.state.nonStrikerId);

    // Filter out dismissed players
    const dismissedPlayerIds = new Set(
        engine.state.history
            .filter(b => b.innings === engine.state.innings && b.isWicket && b.outPlayerId)
            .map(b => b.outPlayerId!)
    );

    // Determine Squad IDs for strict selection
    const battingSquadIds = (battingTeam?.id === match.teamAId ? match.teamASquadIds : match.teamBSquadIds) || [];
    const bowlingSquadIds = (bowlingTeam?.id === match.teamAId ? match.teamASquadIds : match.teamBSquadIds) || [];
    const isStrictSquad = !match.allowFlexibleSquad;

    const selectableBatters = battingTeam?.players.filter(p =>
        // Not At Crease
        p.id !== engine.state.strikerId &&
        p.id !== engine.state.nonStrikerId &&
        // Not Dismissed
        !dismissedPlayerIds.has(p.id) &&
        // In Squad (if strict)
        (!isStrictSquad || battingSquadIds.length === 0 || battingSquadIds.includes(p.id))
    ) || [];

    const selectableBowlers = bowlingTeam?.players.filter(p =>
        // In Squad (if strict)
        (!isStrictSquad || bowlingSquadIds.length === 0 || bowlingSquadIds.includes(p.id))
    ) || [];

    const availableBatters = selectableBatters;

    // --- FIX: END OF OVER LOGIC ---
    const currentOverIndex = Math.floor(engine.state.totalBalls / 6);
    const hasSelectedBowlerForThisOver = engine.state.history.some(b =>
        b.innings === engine.state.innings && // Filter by current innings
        b.over === currentOverIndex &&
        b.commentary?.startsWith('EVENT: New Bowler')
    );
    const needsBowlerChange = engine.state.totalBalls > 0 && engine.state.totalBalls % 6 === 0 && !engine.state.isCompleted && !hasSelectedBowlerForThisOver;

    if (engine.state.isCompleted) {
        if (postMatchView === 'SCORECARD') {
            return (
                <div className="h-full bg-slate-950">
                    <FullMatchScorecard
                        matchState={engine.state}
                        teamA={teams.find(t => t.id === match.teamAId)!}
                        teamB={teams.find(t => t.id === match.teamBId)!}
                        onBack={() => setPostMatchView('SUMMARY')}
                    />
                </div>
            );
        }
        return (
            <MatchResultSummary
                matchState={engine.state}
                teamA={teams.find(t => t.id === match.teamAId)!}
                teamB={teams.find(t => t.id === match.teamBId)!}
                format={match.format}
                onExit={onExit}
                onViewScorecard={() => setPostMatchView('SCORECARD')}
            />
        );
    }

    // Shared Props for children
    const layoutProps = {
        match, engine, teams, battingTeam, bowlingTeam,
        stats, timer, pad, wicket, rules,
        onExit, layoutMode, setLayoutMode, isAuthorized: userRole === 'Scorer' || userRole === 'Administrator',
        onComplete,
        handlers: {
            handleRun,
            handleCommitExtra,
            handleMatchFinish,
            handleManualConclude,
            handleManualSave,
            openScoreboardWindow,
            handleUpdateOfficials,
            handleAnalyticsSave
        },
        modals: {
            setIsCameraOpen,
            setShowSubModal,
            setShowBroadcaster,
            setShowOfficialsModal,
            setShowShotModal,
            autoAnalytics,
            setAutoAnalytics
        },
        onEditPlayer: setCorrectionTarget,
        onBallClick: setEditingBall,
        mobileTab,
        setMobileTab
    };

    return (
        <div className="h-full w-full">
            {layoutMode === 'DESKTOP'
                ? <DesktopScorerLayout {...layoutProps} />
                : <MobileScorerLayout {...layoutProps} />
            }

            {/* Test Match Status Overlay (Optional) */}
            {match.format === 'Test' && (
                <div className="fixed top-20 right-4 z-40 bg-slate-900/80 backdrop-blur text-white text-[10px] p-2 rounded-lg border border-slate-700 pointer-events-none">
                    <div className="font-bold uppercase tracking-widest text-indigo-400">Day {engine.state.currentDay || 1}</div>
                    <div className="font-mono text-xs">{leadMessage}</div>
                </div>
            )}

            {/* GLOBAL MODALS */}
            <ShotEntryModal isOpen={showShotModal} onClose={() => setShowShotModal(false)} onSave={handleAnalyticsSave} existingPitch={getLastBall()?.pitchCoords} existingShot={getLastBall()?.shotCoords} />

            <WicketModal
                open={wicket.isOpen}
                batters={[striker!, nonStriker!].filter(Boolean)}
                fielders={selectableBowlers}
                wicketType={wicket.wicketType}
                outPlayerId={wicket.outPlayerId}
                fielderId={wicket.fielderId}
                onSelectType={wicket.setWicketType}
                onSelectOutPlayer={wicket.setOutPlayerId}
                onSelectFielder={wicket.setFielderId}
                onConfirm={() => { engine.recordWicket({ type: 'WICKET', wicketType: wicket.wicketType!, batterId: wicket.outPlayerId!, fielderId: wicket.fielderId || undefined }); wicket.reset(); }}
                onCancel={wicket.reset}
            />

            <EndOfOverModal
                isOpen={needsBowlerChange && isAuthorized}
                overNumber={Math.floor(engine.state.totalBalls / 6) + 1}
                bowlingTeamName={bowlingTeam?.name || ''}
                currentBowlerId={engine.state.bowlerId}
                bowlers={selectableBowlers}
                getAvailability={rules.getBowlerAvailability}
                onSelectBowler={(id) => engine.applyBall({ commentary: 'EVENT: New Bowler', bowlerId: id } as BallEvent)}
            />

            <InningsBreakModal
                isOpen={inningsBreak.open}
                title={match.format === 'Test' && engine.state.innings === 4 && inningsBreak.reason !== 'Target Chased' ? "Match Drawn?" : "Innings Over"}
                reason={inningsBreak.reason || ''}
                battingTeamName={battingTeam?.name || ''}
                score={`${engine.state.score}/${engine.state.wickets}`}
                isMatchOver={engine.state.innings === (match.format === 'Test' ? 4 : 2) && match.format !== 'Test'}
                onNextInnings={startNextInnings}
                onFinishMatch={handleMatchFinish}
                canEnforceFollowOn={canEnforceFollowOn}
                onEnforceFollowOn={enforceFollowOn}
                onViewScorecard={() => {
                    setInningsBreak(prev => ({ ...prev, open: false }));
                    if (window.innerWidth <= 1024) setMobileTab('SCORECARD');
                    // For Desktop, we might need to handle view switching differently if needed, 
                    // but usually scorecard is always visible or accessible. 
                    // Assuming Mobile context primarily for this modal flow.
                }}
                leadMessage={leadMessage}
                onDownloadPDF={() => {
                    const teamA = teams.find(t => t.id === match.teamAId);
                    const teamB = teams.find(t => t.id === match.teamBId);
                    if (teamA && teamB) {
                        generateMatchPDF(engine.state, teamA, teamB, match.format || 'Cricket Match');
                    }
                }}
            />

            <MatchStartModal
                isOpen={showStartModal}
                battingPlayers={selectableBatters}
                bowlingPlayers={selectableBowlers}
                onConfirm={(sId, nsId, bId) => {
                    // 1. Immediate State Update (Crucial for UI)
                    engine.updateMetadata({ strikerId: sId, nonStrikerId: nsId, bowlerId: bId });

                    // 2. Record Event (Logged in history)
                    setTimeout(() => {
                        engine.applyBall({
                            commentary: 'EVENT: Match Started',
                            strikerId: sId,
                            nonStrikerId: nsId,
                            bowlerId: bId,
                            innings: engine.state.innings
                        } as any);
                    }, 50);

                    setShowStartModal(false);
                }}
            />

            {pad.padView === 'bowler_replacement_select' && (
                <NewBatterModal
                    isOpen={true}
                    teamName={bowlingTeam?.name || ''}
                    availableBatters={selectableBowlers.filter(p => p.id !== engine.state.bowlerId)}
                    targetRole="Striker"
                    onSelect={(id) => { engine.replaceBowlerMidOver(id); pad.resetPad(); setCorrectionTarget(null); }}
                />
            )}

            {newBatterTarget && !showStartModal && isAuthorized && (
                <NewBatterModal
                    isOpen={true}
                    teamName={battingTeam?.name || ''}
                    availableBatters={availableBatters}
                    targetRole={newBatterTarget}
                    onSelect={(id) => { engine.applyBall({ commentary: `EVENT: New Batter (${newBatterTarget})`, [newBatterTarget.toLowerCase() + 'Id']: id } as any); setNewBatterTarget(null); }}
                />
            )}

            <CameraModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onUpload={(url, type) => {
                    onAddMediaPost({ id: Date.now().toString(), type, contentUrl: url, authorName: 'Scorer', caption: 'Match Moment', timestamp: Date.now(), likes: 0, shares: 0, comments: [] });
                    setIsCameraOpen(false);
                }}
            />

            {showBroadcaster && <BroadcasterView matchState={engine.state} battingTeam={battingTeam} bowlingTeam={bowlingTeam} onClose={() => setShowBroadcaster(false)} />}

            <OfficialsModal
                isOpen={showOfficialsModal}
                onClose={() => setShowOfficialsModal(false)}
                currentUmpires={engine.state.umpires || []}
                availableOfficials={availableOfficials}
                onSave={handleUpdateOfficials}
            />

            {correctionTarget && (
                <PlayerEditModal
                    isOpen={true}
                    onClose={() => setCorrectionTarget(null)}
                    teamName={correctionTarget === 'bowler' ? bowlingTeam?.name || '' : battingTeam?.name || ''}
                    currentPlayerId={correctionTarget === 'bowler' ? engine.state.bowlerId : (correctionTarget === '@striker' ? engine.state.strikerId : engine.state.nonStrikerId)}
                    currentPlayerName={
                        (correctionTarget === 'bowler'
                            ? bowlingTeam?.players?.find(p => p.id === engine.state.bowlerId)?.name
                            : battingTeam?.players?.find(p => p.id === (correctionTarget === '@striker' ? engine.state.strikerId : engine.state.nonStrikerId))?.name
                        ) || 'Unknown Player'
                    }
                    role={correctionTarget === 'bowler' ? 'Bowler' : (correctionTarget === '@striker' ? 'Striker' : 'NonStriker')}
                    availablePlayers={correctionTarget === 'bowler' ? selectableBowlers : availableBatters}
                    onReplace={(oldId, newId, role) => {
                        engine.correctPlayerIdentity(oldId, newId, role);
                        setCorrectionTarget(null);
                    }}
                    onRetire={(playerId, type) => {
                        engine.retireBatter(playerId, type);
                        setCorrectionTarget(null);
                        // Trigger new batter modal immediately
                        setTimeout(() => {
                            setNewBatterTarget(correctionTarget === '@striker' ? 'Striker' : 'NonStriker');
                        }, 100);
                    }}
                    onInjury={(newPlayerId) => {
                        engine.replaceBowlerMidOver(newPlayerId);
                        setCorrectionTarget(null);
                    }}
                />
            )}

            <BallCorrectionModal
                isOpen={!!editingBall}
                onClose={() => setEditingBall(null)}
                ball={editingBall}
                onSave={(updates) => {
                    if (editingBall) {
                        engine.editBall(editingBall.timestamp, updates);
                    }
                }}
            />
        </div>
    );
};

