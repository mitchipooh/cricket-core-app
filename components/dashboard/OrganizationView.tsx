
import React, { useState, useMemo } from 'react';
import { Organization, UserProfile, PlayerWithContext, OrgMember, OrgApplication, Team, Player } from '../../types.ts';
import { Can } from '../common/Can.tsx';
import { PlayerProfileModal } from '../modals/PlayerProfileModal.tsx';
import { EditOrgModal } from '../modals/EditOrgModal.tsx';
import { BulkActionModal } from '../modals/BulkActionModal.tsx';
import { AddPlayerModal } from '../modals/AddPlayerModal.tsx';
import { UserProfileModal } from '../modals/UserProfileModal.tsx';
import { AddMemberModal } from '../modals/AddMemberModal.tsx';

interface OrganizationViewProps {
    organization: Organization;
    userRole: UserProfile['role'];
    onBack: () => void;
    onViewTournament: (id: string) => void;
    onViewPlayer: (player: PlayerWithContext) => void;
    onRequestAddTeam: () => void;
    onRequestAddTournament: () => void;
    players: PlayerWithContext[];
    onViewTeam: (teamId: string) => void;
    isFollowed: boolean;
    onToggleFollow: () => void;
    globalUsers: UserProfile[];
    onAddMember: (member: OrgMember) => void;
    onUpdateOrg?: (id: string, data: Partial<Organization>) => void;
    onProcessApplication?: (orgId: string, appId: string, action: 'APPROVED' | 'REJECTED' | 'REVIEW', role?: 'Administrator' | 'Scorer' | 'Player') => void;
    allOrganizations?: Organization[]; // Passed to check for affiliations
    currentUserProfile?: UserProfile | null;
}

type OrgTab = 'SQUADS' | 'PLAYERS' | 'TOURNAMENTS' | 'MEMBERS' | 'REQUESTS' | 'AFFILIATIONS' | 'OFFICIALS' | 'ACCESS';

export const OrganizationView: React.FC<OrganizationViewProps> = ({
    organization, userRole, onBack, onViewTournament, onViewPlayer,
    onRequestAddTeam, onRequestAddTournament, players, onViewTeam,
    isFollowed, onToggleFollow, globalUsers, onAddMember, onUpdateOrg, onProcessApplication,
    allOrganizations = [], currentUserProfile
}) => {
    const [activeTab, setActiveTab] = useState<OrgTab>('SQUADS');
    const [playerSearch, setPlayerSearch] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithContext | null>(null);

    // Member Management State
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [viewingMember, setViewingMember] = useState<OrgMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Bulk Actions & Team Management
    const [bulkAction, setBulkAction] = useState<'TEAMS' | 'PLAYERS' | null>(null);
    const [viewingActionsFor, setViewingActionsFor] = useState<OrgMember | null>(null); // For permission editing
    const [targetTeam, setTargetTeam] = useState<Team | null>(null);
    const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);

    // Direct Add Player by ID
    const [addPlayerId, setAddPlayerId] = useState('');

    // Application Approval State
    const [appToApprove, setAppToApprove] = useState<OrgApplication | null>(null);

    // Affiliation State
    const [affiliationSearch, setAffiliationSearch] = useState('');

    const pendingApps = useMemo(() => organization.applications?.filter(a => a.status === 'PENDING' || a.status === 'REVIEW') || [], [organization.applications]);

    const isOrgAdmin = organization.members.some(m => m.userId === currentUserProfile?.id && m.role === 'Administrator') || userRole === 'Administrator';

    const isClub = organization.type === 'CLUB';

    // Resolve Affiliated Teams
    const affiliatedTeams = useMemo(() => {
        if (!organization.childOrgIds || organization.childOrgIds.length === 0) return [];
        const childOrgs = allOrganizations.filter(o => organization.childOrgIds?.includes(o.id));
        return childOrgs.flatMap(o => o.memberTeams.map(t => ({ ...t, orgName: o.name })));
    }, [organization.childOrgIds, allOrganizations]);

    // Officials Logic
    const officials = useMemo(() => organization.members.filter(m => m.role === 'Umpire' || m.role === 'Match Official'), [organization.members]);

    const getOfficialStats = (userId: string) => {
        return organization.fixtures.filter(f => f.umpires?.includes(userId)).length;
    };

    const handlePlayerClick = (p: PlayerWithContext) => {
        setSelectedPlayer(p);
        onViewPlayer(p);
    };

    const handleManualAddMember = (user: UserProfile, role: string, targetTeamId?: string) => {
        // 1. Add to Org Members
        const newMember: OrgMember = {
            userId: user.id,
            name: user.name,
            handle: user.handle,
            role: role as any,
            addedAt: Date.now()
        };

        // We need to use onUpdateOrg to persist this properly if we want to do both member + team update
        if (onUpdateOrg) {
            let updatedMembers = [...organization.members, newMember];
            let updatedTeams = organization.memberTeams;

            // 2. If Player and Team Selected, add to Squad
            if (role === 'Player' && targetTeamId) {
                const newPlayer: Player = {
                    id: user.id,
                    name: user.name,
                    role: user.playerDetails?.primaryRole || 'All-rounder',
                    photoUrl: user.avatarUrl,
                    stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 }
                };
                updatedTeams = updatedTeams.map(t => t.id === targetTeamId ? { ...t, players: [...t.players, newPlayer] } : t);
            }

            onUpdateOrg(organization.id, { members: updatedMembers, memberTeams: updatedTeams });
        } else {
            onAddMember(newMember);
        }
    };

    const finalizeApplication = (role?: 'Administrator' | 'Scorer' | 'Player') => {
        if (appToApprove && onProcessApplication) {
            onProcessApplication(organization.id, appToApprove.id, 'APPROVED', role);
            setAppToApprove(null);
        }
    };

    const handleAddSinglePlayer = (name: string, role: string) => {
        if (!onUpdateOrg || !targetTeam) return;

        const newPlayer: Player = {
            id: `pl-${Date.now()}`,
            name: name,
            role: role as any,
            stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 }
        };

        const updatedTeams = organization.memberTeams.map(t =>
            t.id === targetTeam.id ? { ...t, players: [...t.players, newPlayer] } : t
        );

        onUpdateOrg(organization.id, { memberTeams: updatedTeams });
        setTargetTeam(null);
    };

    const handleAddPlayerByID = () => {
        if (!onUpdateOrg || !addPlayerId) return;

        const user = globalUsers.find(u => u.id === addPlayerId);

        if (user) {
            if (organization.memberTeams.length === 0) {
                alert("Please create a team/squad first.");
                return;
            }
            const targetTeamId = organization.memberTeams[0].id;

            const newPlayer: Player = {
                id: user.id,
                name: user.name,
                role: user.playerDetails?.primaryRole || 'All-rounder',
                photoUrl: user.avatarUrl,
                stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 }
            };

            const updatedTeams = organization.memberTeams.map(t =>
                t.id === targetTeamId ? { ...t, players: [...t.players, newPlayer] } : t
            );

            onUpdateOrg(organization.id, { memberTeams: updatedTeams });
            setAddPlayerId('');
            alert(`${user.name} added to ${organization.memberTeams[0].name}.`);
        } else {
            alert("User ID not found in global directory.");
        }
    };

    const handleBulkData = (data: string[]) => {
        if (!onUpdateOrg) return;

        if (bulkAction === 'TEAMS') {
            const newTeams = data.map(name => ({
                id: `tm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: name.trim(),
                players: []
            }));
            const updatedMemberTeams = [...organization.memberTeams, ...newTeams];
            onUpdateOrg(organization.id, { memberTeams: updatedMemberTeams });
        } else if (bulkAction === 'PLAYERS') {
            let targetId = targetTeam?.id;

            if (!targetId) {
                if (organization.memberTeams.length === 0) {
                    const newTeam = { id: `tm-gen-${Date.now()}`, name: 'General Squad', players: [] };
                    organization.memberTeams.push(newTeam);
                    targetId = newTeam.id;
                } else {
                    targetId = organization.memberTeams[0].id;
                }
            }

            const newPlayers = data.map((line, idx) => {
                const [name, roleRaw] = line.split('-').map(s => s.trim());
                const role = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'].includes(roleRaw) ? roleRaw : 'All-rounder';

                return {
                    id: `pl-bulk-${Date.now()}-${idx}`,
                    name: name,
                    role: role as any,
                    stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 }
                };
            });

            const updatedTeams = organization.memberTeams.map(t =>
                t.id === targetId ? { ...t, players: [...t.players, ...newPlayers] } : t
            );

            onUpdateOrg(organization.id, { memberTeams: updatedTeams });
        }
        setBulkAction(null);
        setTargetTeam(null);
    };

    const availableTabs: OrgTab[] = ['SQUADS', 'PLAYERS', 'TOURNAMENTS', 'MEMBERS', 'OFFICIALS'];
    if (isOrgAdmin) {
        availableTabs.push('REQUESTS');
        availableTabs.push('AFFILIATIONS');
        availableTabs.push('ACCESS');
    }

    const parentOrgs = allOrganizations.filter(o => organization.parentOrgIds?.includes(o.id));
    const incomingAffiliations = pendingApps.filter(a => a.type === 'ORG_AFFILIATE');
    const userRequests = pendingApps.filter(a => a.type !== 'USER_JOIN'); // Fix: Show USER_JOIN requests in REQUESTS tab if needed, logic might be specific

    return (
        <div className="animate-in slide-in-from-right-8 duration-500">
            <UserProfileModal member={viewingMember} isOpen={!!viewingMember} onClose={() => setViewingMember(null)} allOrganizations={allOrganizations} />

            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                onClose={() => setIsAddMemberModalOpen(false)}
                globalUsers={globalUsers}
                orgTeams={organization.memberTeams}
                existingMemberIds={organization.members.map(m => m.userId)}
                onAdd={handleManualAddMember}
            />

            <PlayerProfileModal
                isOpen={!!selectedPlayer}
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                isFollowed={false}
                onToggleFollow={() => { }}
                onUpdatePlayer={(isOrgAdmin || selectedPlayer?.id === currentUserProfile?.id) && onUpdateOrg ? (updatedPlayer) => {
                    const teams = organization.memberTeams.map(t => {
                        if (t.id === selectedPlayer?.teamId) {
                            return {
                                ...t,
                                players: t.players.map(p => p.id === selectedPlayer.id ? { ...p, ...updatedPlayer } : p)
                            };
                        }
                        return t;
                    });
                    onUpdateOrg(organization.id, { memberTeams: teams });
                    setSelectedPlayer(prev => prev ? { ...prev, ...updatedPlayer } : null);
                } : undefined}
            />

            {isEditModalOpen && onUpdateOrg && (
                <EditOrgModal
                    organization={organization}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={onUpdateOrg}
                />
            )}

            {bulkAction && (
                <BulkActionModal
                    isOpen={true}
                    mode={bulkAction}
                    onClose={() => { setBulkAction(null); setTargetTeam(null); }}
                    onConfirm={handleBulkData}
                    currentUserPassword={currentUserProfile?.password}
                />
            )}

            <AddPlayerModal
                isOpen={isAddPlayerModalOpen}
                teamName={targetTeam?.name || ''}
                onClose={() => { setIsAddPlayerModalOpen(false); setTargetTeam(null); }}
                onSave={handleAddSinglePlayer}
            />

            <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-10">
                <div className="flex items-center gap-4 md:gap-6 w-full">
                    <button onClick={onBack} className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-black transition-all shadow-sm">←</button>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-white p-1 rounded-2xl shadow-md border border-slate-100">
                            {organization.logoUrl ? (
                                <img src={organization.logoUrl} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-300 text-2xl">{organization.name.charAt(0)}</div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight truncate">{organization.name}</h1>
                                {isClub && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest align-middle whitespace-nowrap">Club</span>}
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
                                {isClub ? 'Club Management' : 'League Operations'} • {organization.memberTeams.length + affiliatedTeams.length} {isClub ? 'Teams' : 'Squads'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 md:gap-3 mt-4 md:mt-0 w-full md:w-auto justify-end">
                    {isOrgAdmin && onUpdateOrg && (
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center text-xl transition-all"
                            title="Settings"
                        >
                            ⚙️
                        </button>
                    )}
                    <button onClick={onToggleFollow} className={`px-4 md:px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${isFollowed ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {isFollowed ? `Following ✓` : `Follow`}
                    </button>
                </div>
            </div>

            <div className="bg-white p-1 rounded-2xl flex w-full gap-1 mb-6 md:mb-10 border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                {availableTabs.map(tab => {
                    const count = tab === 'REQUESTS' ? userRequests.length : tab === 'AFFILIATIONS' ? incomingAffiliations.length : 0;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab === 'TOURNAMENTS' && isClub ? 'LEAGUES' : tab}
                            {count > 0 && (
                                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px]">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'SQUADS' && (
                <div className="space-y-6">
                    {isOrgAdmin && (
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setBulkAction('TEAMS')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Bulk Add Teams</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Can role={userRole} perform="team:add">
                            <button onClick={onRequestAddTeam} className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 hover:bg-white hover:border-indigo-400 hover:shadow-lg transition-all text-slate-400 hover:text-indigo-600 gap-4 min-h-[200px] bg-slate-50/50">
                                <span className="text-5xl font-thin">+</span><span className="text-xs font-black uppercase tracking-widest">Register {isClub ? 'Squad' : 'Team'}</span>
                            </button>
                        </Can>
                        {organization.memberTeams.map(team => (
                            <div
                                key={team.id}
                                onClick={() => onViewTeam(team.id)}
                                className="bg-white border border-slate-200 p-8 rounded-[2rem] hover:shadow-xl hover:shadow-slate-100 transition-all cursor-pointer group flex flex-col h-full"
                            >
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{team.name}</h3>
                                    <p className="text-xs text-indigo-500 font-bold uppercase mt-1 tracking-wider">📍 {team.location || 'Home Ground'}</p>
                                    <div className="mt-8 pt-6 border-t border-slate-100"><span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{team.players.length} Roster</span></div>
                                </div>

                                {isOrgAdmin && onUpdateOrg && (
                                    <div className="mt-6 flex gap-2 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => { setTargetTeam(team); setIsAddPlayerModalOpen(true); }}
                                            className="flex-1 py-2 bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-indigo-600"
                                        >
                                            + Add Player
                                        </button>
                                        <button
                                            onClick={() => { setTargetTeam(team); setBulkAction('PLAYERS'); }}
                                            className="flex-1 py-2 bg-slate-50 text-slate-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-emerald-600"
                                        >
                                            + Bulk Import
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {affiliatedTeams.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-slate-200">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Affiliated Club Teams</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {affiliatedTeams.map(team => (
                                    <div
                                        key={team.id}
                                        onClick={() => onViewTeam(team.id)}
                                        className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem] hover:bg-white hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                                    >
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-2xl font-black text-slate-700 group-hover:text-emerald-600 transition-colors">{team.name}</h3>
                                                <div className="text-xl">🤝</div>
                                            </div>
                                            <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">From {team.orgName || 'Affiliate'}</p>
                                            <div className="mt-8 pt-6 border-t border-slate-200"><span className="text-xs font-mono text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">{team.players.length} Players</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'PLAYERS' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                        <div className="flex gap-2">
                            <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder={`Search ${isClub ? 'club' : 'organizational'} roster...`} className="flex-1 bg-slate-50 border-none outline-none p-4 rounded-xl font-bold text-sm" />
                            {isOrgAdmin && (
                                <button onClick={() => setBulkAction('PLAYERS')} className="bg-slate-900 text-white px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 shadow-lg">Bulk Import</button>
                            )}
                        </div>
                        {isOrgAdmin && (
                            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <input
                                    value={addPlayerId}
                                    onChange={e => setAddPlayerId(e.target.value)}
                                    placeholder="Add Player by User ID..."
                                    className="flex-1 bg-white border-none outline-none px-4 py-3 rounded-lg font-mono text-xs"
                                />
                                <button onClick={handleAddPlayerByID} className="bg-indigo-600 text-white px-4 py-3 rounded-lg font-black uppercase text-xs tracking-widest hover:bg-indigo-500">Add</button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {players.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => handlePlayerClick(p)} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-indigo-400 transition-all flex items-center gap-4 group hover:shadow-lg">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg overflow-hidden border border-slate-200 group-hover:border-indigo-300"><img src={p.photoUrl || `https://ui-avatars.com/api/?name=${p.name}&background=random`} alt={p.name} className="w-full h-full object-cover" /></div>
                                <div><div className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{p.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase">{p.teamName}</div><div className="text-[9px] font-bold text-indigo-400 uppercase mt-0.5">{p.role}</div></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MEMBERS TAB */}
            {activeTab === 'MEMBERS' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Registered Members</h3>
                        {isOrgAdmin && (
                            <button
                                onClick={() => setIsAddMemberModalOpen(true)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 shadow-lg transition-all"
                            >
                                + Add Member
                            </button>
                        )}
                    </div>

                    {/* Group members by role for clearer display */}
                    {['Administrator', 'Scorer', 'Umpire', 'Coach', 'Player'].map(role => {
                        const roleMembers = organization.members.filter(m => m.role === role);
                        if (roleMembers.length === 0) return null;

                        return (
                            <div key={role} className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">{role}s</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {roleMembers.map(member => (
                                        <div
                                            key={member.userId}
                                            onClick={() => setViewingMember(member)}
                                            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md ${role === 'Administrator' ? 'bg-purple-600' :
                                                    role === 'Scorer' ? 'bg-teal-500' :
                                                        role === 'Umpire' ? 'bg-amber-500' :
                                                            'bg-slate-800'
                                                    }`}>
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                                                    <p className="text-xs font-bold text-slate-400">{member.handle}</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                                View
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {organization.members.length === 0 && (
                        <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-bold uppercase text-xs">
                            No members found. Add some to get started.
                        </div>
                    )}
                </div>
            )}

            {/* OFFICIALS TAB */}
            {activeTab === 'OFFICIALS' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Official Panel</h3>
                        {isOrgAdmin && (
                            <button
                                onClick={() => setIsAddMemberModalOpen(true)}
                                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-700"
                            >
                                + Register Official
                            </button>
                        )}
                    </div>
                    {officials.length === 0 ? (
                        <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-bold uppercase text-xs">
                            No officials registered. Use the 'Add Member' feature to add Umpires.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {officials.map(member => (
                                <div
                                    key={member.userId}
                                    onClick={() => setViewingMember(member)}
                                    className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900">{member.name}</h4>
                                            <p className="text-xs font-bold text-slate-400">{member.role}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-indigo-600">{getOfficialStats(member.userId)}</div>
                                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Games</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ACCESS CONTROL TAB */}
            {activeTab === 'ACCESS' && (
                <AccessControlPanel organization={organization} onUpdateOrg={onUpdateOrg} />
            )}

            {/* Role Selection / Approval Modal */}
            {appToApprove && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-slate-900 mb-2">Accept Application</h3>
                        <p className="text-slate-500 text-xs mb-6">Approve <span className="font-bold text-slate-900">{appToApprove.applicantName}</span>. They will be notified.</p>
                        <div className="space-y-3">
                            <button onClick={() => finalizeApplication('Player')} className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group">
                                <div className="font-black text-slate-900 group-hover:text-indigo-700">Add as Player</div>
                                <div className="text-[10px] text-slate-400 group-hover:text-indigo-600/70">Assign to team roster.</div>
                            </button>
                            <button onClick={() => finalizeApplication('Scorer')} className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group">
                                <div className="font-black text-slate-900 group-hover:text-teal-700">Scorer / Staff</div>
                                <div className="text-[10px] text-slate-400 group-hover:text-teal-600/70">Can score matches.</div>
                            </button>
                        </div>
                        <button onClick={() => setAppToApprove(null)} className="mt-6 w-full py-3 text-slate-400 font-black uppercase text-xs hover:text-slate-600">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface AccessControlPanelProps {
    organization: Organization;
    onUpdateOrg?: (id: string, data: Partial<Organization>) => void;
}

const AccessControlPanel: React.FC<AccessControlPanelProps> = ({ organization, onUpdateOrg }) => {
    const [subTab, setSubTab] = useState<'ALL' | 'ADMINS' | 'CAPTAINS' | 'SCORERS' | 'UMPIRES' | 'COACHES'>('ALL');
    const [search, setSearch] = useState('');
    const [editingMember, setEditingMember] = useState<OrgMember | null>(null);

    // Helpers
    const filterRole = (role: OrgMember['role'] | 'ALL_ROLES') => {
        return organization.members.filter(m => (role === 'ALL_ROLES' || m.role === role) &&
            (m.name.toLowerCase().includes(search.toLowerCase()) || m.handle.toLowerCase().includes(search.toLowerCase()))
        );
    };

    const getMembers = () => {
        switch (subTab) {
            case 'ADMINS': return filterRole('Administrator');
            case 'CAPTAINS': return organization.members.filter(m => m.role === 'Player' && m.permissions?.canSubmitReport).filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
            case 'SCORERS': return filterRole('Scorer');
            case 'UMPIRES': return filterRole('Umpire');
            case 'COACHES': return filterRole('Coach');
            default: return organization.members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        }
    };

    const togglePermission = (perm: string) => {
        if (!editingMember || !onUpdateOrg) return;

        const currentPerms = editingMember.permissions || {};
        const newPerms = { ...currentPerms, [perm]: !currentPerms[perm] };

        const updatedMembers = organization.members.map(m => m.userId === editingMember.userId ? { ...m, permissions: newPerms } : m);
        onUpdateOrg(organization.id, { members: updatedMembers });
        setEditingMember({ ...editingMember, permissions: newPerms });
    };

    const filteredMembers = getMembers();

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header & Search */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Access Control Center</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Manage Privileges & Permissions</p>
                    </div>
                    <div className="w-full md:w-auto">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Find user..."
                            className="bg-slate-50 px-5 py-3 rounded-xl border-none outline-none font-bold text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                    </div>
                </div>

                {/* Sub Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {['ALL', 'ADMINS', 'CAPTAINS', 'SCORERS', 'UMPIRES', 'COACHES'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setSubTab(tab as any); setEditingMember(null); }}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${subTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List View */}
                <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredMembers.map(member => (
                        <div
                            key={member.userId}
                            onClick={() => setEditingMember(member)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${editingMember?.userId === member.userId ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs ${member.role === 'Administrator' ? 'bg-purple-500' :
                                    member.role === 'Scorer' ? 'bg-teal-500' :
                                        'bg-slate-400'
                                    }`}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{member.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredMembers.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs uppercase">No users found.</div>
                    )}
                </div>

                {/* Editor View */}
                <div className="lg:col-span-2">
                    {editingMember ? (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl sticky top-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black">
                                    {editingMember.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{editingMember.name}</h2>
                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{editingMember.role} • {editingMember.handle}</p>
                                    {/* Mock Password Display */}
                                    <div className="flex gap-2 mt-1">
                                        {editingMember.role === 'Administrator' && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Default PW: admin</span>}
                                        {editingMember.role === 'Coach' && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Default PW: coach</span>}
                                        {editingMember.role === 'Scorer' && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Default PW: scorer</span>}
                                        {editingMember.role === 'Umpire' && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Default PW: umpire</span>}
                                        {editingMember.role === 'Player' && editingMember.permissions?.canSubmitReport && (
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Default PW: Captain</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-6">Permissions</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['canEditOrg', 'canManageMembers', 'canEditSquad', 'canSubmitReport', 'canViewReports', 'view_protests', 'canScoreMatch', 'canEditScorecard', 'canOfficiate'].map(perm => (
                                    <div key={perm} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{perm.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                                            <p className="text-[10px] text-slate-400">Allow user to {perm.replace('can', '').toLowerCase()}...</p>
                                        </div>
                                        <button
                                            onClick={() => togglePermission(perm)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all ${editingMember.permissions?.[perm] ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${editingMember.permissions?.[perm] ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex items-center justify-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                            <div className="text-center opacity-50">
                                <span className="text-4xl">👆</span>
                                <p className="font-black text-slate-400 uppercase text-xs tracking-widest mt-4">Select a user to manage permissions</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

