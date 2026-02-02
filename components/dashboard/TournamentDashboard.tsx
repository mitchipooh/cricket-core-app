
import React, { useState, useMemo } from 'react';
import { Tournament, MatchFixture, Organization, Team, Standing } from '../../types.ts';
import { PointsTable } from '../display/PointsTable.tsx';
import { buildPointsTable } from '../../competition/buildPointsTable.ts';
import { CompletedMatch, MatchResult } from '../../competition/types.ts';
import { BracketView } from '../competition/BracketView.tsx';
import { generateKnockouts } from '../../utils/cricket-engine.ts';

interface TournamentDashboardProps {
    tournament: Tournament;
    organization: Organization;
    onBack: () => void;
    onStartMatch: (match: MatchFixture) => void;
    onGenerateFixtures: () => void;
    onAddGroup: (tournamentId: string, groupName: string) => void;
    onUpdateGroupTeams: (tournamentId: string, groupId: string, teamIds: string[]) => void;
    onViewTeam: (teamId: string) => void;
    onViewMatch: (match: MatchFixture) => void;
    allOrganizations?: Organization[]; // For fetching affiliated teams
}

type TrnTab = 'OVERVIEW' | 'GROUPS' | 'FIXTURES' | 'STANDINGS' | 'BRACKET';
type FixtureSubTab = 'LIVE' | 'SCHEDULED' | 'COMPLETED';

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({
    tournament, organization, onBack, onStartMatch, onGenerateFixtures,
    onAddGroup, onUpdateGroupTeams, onViewTeam, onViewMatch, allOrganizations = []
}) => {
    const [activeTab, setActiveTab] = useState<TrnTab>('OVERVIEW');
    const [activeFixtureTab, setActiveFixtureTab] = useState<FixtureSubTab>('SCHEDULED');
    const [newGroupName, setNewGroupName] = useState('');

    // Manage Teams Modal State
    const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

    const activeFixtures = organization.fixtures.filter(f => f.tournamentId === tournament.id);

    /* =====================
       Standings Logic
    ===================== */
    const groupStandings = useMemo(() => {
        // 1. Map existing MatchFixtures to CompletedMatch interface for the points table engine
        const completedMatches: CompletedMatch[] = activeFixtures
            .filter(f => f.status === 'Completed' && f.savedState)
            .map(f => {
                const state = f.savedState!;
                const teamAScoreData = state.inningsScores.find(i => i.teamId === f.teamAId) || (state.innings === 1 && state.battingTeamId === f.teamAId ? { score: state.score, wickets: state.wickets, overs: '0.0' } : { score: 0, wickets: 0, overs: '0.0' });
                const teamBScoreData = state.inningsScores.find(i => i.teamId === f.teamBId) || (state.innings === 2 && state.battingTeamId === f.teamBId ? { score: state.score, wickets: state.wickets, overs: '0.0' } : { score: 0, wickets: 0, overs: '0.0' });

                const scoreA = typeof teamAScoreData.score === 'number' ? teamAScoreData.score : parseInt(teamAScoreData.score as any);
                const scoreB = typeof teamBScoreData.score === 'number' ? teamBScoreData.score : parseInt(teamBScoreData.score as any);

                let result: MatchResult = 'NO_RESULT';
                if (scoreA > scoreB) result = 'HOME_WIN';
                else if (scoreB > scoreA) result = 'AWAY_WIN';
                else if (scoreA === scoreB && scoreA > 0) result = 'TIE';

                return {
                    matchId: f.id,
                    teamAId: f.teamAId,
                    teamBId: f.teamBId,
                    teamAName: f.teamAName,
                    teamBName: f.teamBName,
                    teamAScore: scoreA,
                    teamAWkts: teamAScoreData.wickets,
                    teamAOvers: parseFloat(teamAScoreData.overs),
                    teamBScore: scoreB,
                    teamBWkts: teamBScoreData.wickets,
                    teamBOvers: parseFloat(teamBScoreData.overs),
                    result
                };
            });

        // 2. Group by tournament groups
        return tournament.groups.map(group => {
            const groupMatches = completedMatches.filter(m => {
                // If fixture has explicit group ID
                const fixture = activeFixtures.find(f => f.id === m.matchId);
                if (fixture?.groupId === group.id) return true;

                // Fallback: Check if both teams are in this group
                const groupTeamIds = group.teams.map(t => t.id);
                return groupTeamIds.includes(m.teamAId) && groupTeamIds.includes(m.teamBId);
            });

            return {
                group,
                rows: buildPointsTable(groupMatches, group.teams)
            };
        });
    }, [activeFixtures, tournament.groups]);

    // Consolidate all available teams (Own + Affiliated)
    const availableTeams = useMemo(() => {
        // Own Teams
        let teams = [...organization.memberTeams];

        // Affiliated (Child) Teams
        if (organization.childOrgIds && organization.childOrgIds.length > 0) {
            const childOrgs = allOrganizations.filter(o => organization.childOrgIds?.includes(o.id));
            childOrgs.forEach(child => {
                teams = [...teams, ...child.memberTeams];
            });
        }
        return teams;
    }, [organization, allOrganizations]);

    const openTeamManager = (groupId: string) => {
        const group = tournament.groups.find(g => g.id === groupId);
        if (group) {
            setSelectedTeamIds(new Set(group.teams.map(t => t.id)));
            setManagingGroupId(groupId);
        }
    };

    const toggleTeamSelection = (teamId: string) => {
        const next = new Set(selectedTeamIds);
        if (next.has(teamId)) next.delete(teamId);
        else next.add(teamId);
        setSelectedTeamIds(next);
    };

    const saveTeamSelection = () => {
        if (managingGroupId) {
            onUpdateGroupTeams(tournament.id, managingGroupId, Array.from(selectedTeamIds));
            setManagingGroupId(null);
        }
    };

    const handleGenerateKnockouts = () => {
        // 1. Flatten all standings to find global top 4 (simplistic logic)
        // In a real app, this would be Top 2 from G1 and Top 2 from G2
        const allRows = groupStandings.flatMap(g => g.rows).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
        if (allRows.length < 4) {
            alert("Need at least 4 teams with standings data to generate Semi-Finals.");
            return;
        }

        const qualifiedTeams: Standing[] = allRows.slice(0, 4).map(row => ({
            teamId: row.teamId,
            teamName: row.teamName,
            played: row.played,
            won: row.won,
            lost: row.lost,
            drawn: row.nr,
            tied: row.tied,
            points: row.points,
            nrr: row.nrr,
            runsFor: row.runsFor,
            oversFor: row.oversFor,
            runsAgainst: row.runsAgainst,
            oversAgainst: row.oversAgainst
        }));

        const newFixtures = generateKnockouts(qualifiedTeams, tournament.id, tournament.format);
        alert("Knockout Generation Logic linked. (Requires parent state update implementation)");
    };

    const displayedFixtures = activeFixtures.filter(f => {
        if (activeFixtureTab === 'LIVE') return f.status === 'Live';
        if (activeFixtureTab === 'SCHEDULED') return f.status === 'Scheduled';
        return f.status === 'Completed';
    });

    return (
        <div className="animate-in slide-in-from-bottom-8 duration-500 pb-20">
            <div className="flex items-center gap-6 mb-10">
                <button onClick={onBack} className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-black transition-all shadow-sm">←</button>
                <div className="flex items-center gap-4">
                    <img src="/logo.jpg" alt="Logo" className="w-16 h-16 object-contain drop-shadow-sm rounded-xl bg-white p-1 border border-slate-100" />
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{tournament.name}</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{tournament.format} • <span className="text-indigo-500">{tournament.status}</span></p>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
                {(['OVERVIEW', 'GROUPS', 'FIXTURES', 'STANDINGS', 'BRACKET'] as TrnTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-4 rounded-3xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeTab === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-900'}`}>{tab}</button>
                ))}
            </div>

            {activeTab === 'OVERVIEW' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm col-span-2">
                        <h3 className="text-xl font-black mb-4">Season Status</h3>
                        <p className="text-slate-500 leading-relaxed">Competition in the {tournament.name} is currently {tournament.status?.toLowerCase()}. Tracking results across {tournament.groups.length} active groups.</p>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Total Fixtures</div>
                        <div className="text-5xl font-black">{activeFixtures.length}</div>
                    </div>
                </div>
            )}

            {activeTab === 'GROUPS' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="New Group Name (e.g. Group A)"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold outline-none w-full"
                        />
                        <button
                            onClick={() => { if (newGroupName) { onAddGroup(tournament.id, newGroupName); setNewGroupName(''); } }}
                            disabled={!newGroupName}
                            className="bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg w-full md:w-auto transition-all"
                        >
                            + Create Group
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {tournament.groups.map(group => (
                            <div key={group.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">{group.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{group.teams.length} Teams</p>
                                    </div>
                                    <button
                                        onClick={() => openTeamManager(group.id)}
                                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                                    >
                                        Manage Squads
                                    </button>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    {group.teams.length === 0 ? (
                                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs font-bold text-slate-400">
                                            No teams assigned yet.
                                        </div>
                                    ) : (
                                        group.teams.map(team => (
                                            <button
                                                key={team.id}
                                                onClick={() => onViewTeam(team.id)}
                                                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm">🛡️</div>
                                                <span className="font-bold text-slate-700 text-sm">{team.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                                <div className="absolute -bottom-6 -right-6 text-9xl opacity-[0.03] select-none pointer-events-none">🛡️</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'FIXTURES' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            {(['SCHEDULED', 'LIVE', 'COMPLETED'] as const).map(ft => (
                                <button
                                    key={ft}
                                    onClick={() => setActiveFixtureTab(ft)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFixtureTab === ft ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                                >
                                    {ft}
                                </button>
                            ))}
                        </div>
                        <button onClick={onGenerateFixtures} className="bg-white border border-slate-200 text-slate-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-all">Auto Generate</button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {displayedFixtures.map(f => (
                            <div key={f.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex flex-col gap-1 w-full md:w-auto text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">{new Date(f.date).toLocaleDateString()}</span>
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{f.venue}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 px-1.5 rounded">{f.format}</span>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-4 text-lg"><span className="font-black text-slate-900">{f.teamAName}</span><span className="text-xs font-bold text-slate-300">VS</span><span className="font-black text-slate-900">{f.teamBName}</span></div>
                                    {f.status === 'Live' && <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 animate-pulse">Live Score: {f.teamAScore || '0/0'} - {f.teamBScore || '0/0'}</div>}
                                    {f.status === 'Completed' && <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 bg-indigo-50 inline-block px-2 py-1 rounded">Match Completed</div>}
                                    {f.result && <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">{f.result}</div>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onStartMatch(f)} className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg min-w-[120px]">
                                        {f.status === 'Live' ? 'Resume Scoring' : f.status === 'Completed' ? 'View Card' : 'Start Match'}
                                    </button>
                                    <button onClick={() => onViewMatch(f)} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 transition-all">
                                        Scorecard
                                    </button>
                                </div>
                            </div>
                        ))}
                        {displayedFixtures.length === 0 && (
                            <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">
                                No {activeFixtureTab.toLowerCase()} fixtures found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'STANDINGS' && (
                <div className="space-y-12 animate-in slide-in-from-right-8 pb-10">
                    {groupStandings.map(({ group, rows }) => (
                        <div key={group.id}>
                            <div className="flex items-center gap-3 mb-6 px-4">
                                <h3 className="text-2xl font-black text-slate-900">{group.name}</h3>
                                <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{rows.length} Teams</span>
                            </div>
                            <PointsTable rows={rows} onViewTeam={onViewTeam} />
                        </div>
                    ))}
                    {groupStandings.length === 0 && (
                        <div className="p-20 text-center flex flex-col items-center gap-4 opacity-20">
                            <span className="text-4xl">📊</span>
                            <p className="text-[10px] font-black uppercase tracking-widest">No groups defined</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'BRACKET' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-end">
                        <button
                            onClick={handleGenerateKnockouts}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 shadow-lg transition-all"
                        >
                            Auto-Generate Knockouts
                        </button>
                    </div>
                    <BracketView fixtures={activeFixtures} onViewMatch={onViewMatch} />
                </div>
            )}

            {/* TEAM MANAGER MODAL */}
            {managingGroupId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setManagingGroupId(null)}>
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-2xl font-black text-slate-900">Select Teams</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                Adding to {tournament.groups.find(g => g.id === managingGroupId)?.name}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {/* OWN TEAMS */}
                            <div className="mb-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Internal Squads</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {organization.memberTeams.map(team => {
                                        const isSelected = selectedTeamIds.has(team.id);
                                        return (
                                            <button
                                                key={team.id}
                                                onClick={() => toggleTeamSelection(team.id)}
                                                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isSelected ? 'bg-indigo-200' : 'bg-slate-50'}`}>
                                                        🛡️
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={`font-black text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{team.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{team.players.length} Players</div>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-slate-400'}`}>
                                                    {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AFFILIATED TEAMS */}
                            {availableTeams.length > organization.memberTeams.length && (
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Affiliated Club Teams</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {availableTeams.filter(t => !organization.memberTeams.some(mt => mt.id === t.id)).map(team => {
                                            const isSelected = selectedTeamIds.has(team.id);
                                            return (
                                                <button
                                                    key={team.id}
                                                    onClick={() => toggleTeamSelection(team.id)}
                                                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${isSelected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isSelected ? 'bg-emerald-200' : 'bg-slate-50'}`}>
                                                            🤝
                                                        </div>
                                                        <div className="text-left">
                                                            <div className={`font-black text-sm ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>{team.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Affiliated</div>
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-200 group-hover:border-slate-400'}`}>
                                                        {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setManagingGroupId(null)} className="px-6 py-4 text-slate-400 font-black uppercase text-xs hover:text-slate-600">Cancel</button>
                            <button onClick={saveTeamSelection} className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-500 transition-all">
                                Update Group ({selectedTeamIds.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

