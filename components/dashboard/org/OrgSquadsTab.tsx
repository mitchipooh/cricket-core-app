import React from 'react';
import { Organization, Team, UserProfile } from '../../../types';

interface OrgSquadsTabProps {
    organization: Organization;
    isMainAdmin: boolean;
    isCouncilAdmin: boolean;
    isOrgAdmin: boolean;
    isLockdown: boolean;
    isActive: boolean;
    focusMyTeam: boolean;
    myTeam: Team | null;
    isClub: boolean;
    affiliatedTeams: any[];
    onLinkTeam: () => void;
    onBulkAddTeams: () => void;
    onRequestAddTeam: () => void;
    onViewTeam: (teamId: string) => void;
    onRemoveTeam?: (orgId: string, teamId: string) => void;
    onUpdateOrg?: (id: string, data: Partial<Organization>) => void;
    onSelectHubTeam?: (teamId: string) => void;
    onAddPlayer: (team: Team) => void;
    onBulkImportPlayers: (team: Team) => void;
    onEditTeam: (team: Team) => void;
    canEditTeam: (teamId: string) => boolean;
}

export const OrgSquadsTab: React.FC<OrgSquadsTabProps> = ({
    organization, isMainAdmin, isCouncilAdmin, isOrgAdmin, isLockdown, isActive,
    focusMyTeam, myTeam, isClub, affiliatedTeams,
    onLinkTeam, onBulkAddTeams, onRequestAddTeam, onViewTeam, onRemoveTeam, onUpdateOrg,
    onSelectHubTeam, onAddPlayer, onBulkImportPlayers, onEditTeam, canEditTeam
}) => {
    if (!isActive) return null;

    return (
        <div className="space-y-6">
            {(isMainAdmin || isCouncilAdmin) && !isLockdown && (
                <div className="flex justify-end gap-2">
                    <button onClick={onLinkTeam} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all shadow-sm">
                        🔗 Link Existing Team
                    </button>
                    <button onClick={onBulkAddTeams} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">
                        + Bulk Add Teams
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(isMainAdmin || isCouncilAdmin) && !isLockdown && (
                    <button onClick={onRequestAddTeam} className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 hover:bg-white hover:border-indigo-400 hover:shadow-lg transition-all text-slate-400 hover:text-indigo-600 gap-4 min-h-[200px] bg-slate-50/50">
                        <span className="text-5xl font-thin">+</span><span className="text-xs font-black uppercase tracking-widest">Register {isClub ? 'Squad' : 'Team'}</span>
                    </button>
                )}
                {/* Team Grid: Show all teams for admins (UNLESS focused), ONLY myTeam for team admins */}
                {((isOrgAdmin || isMainAdmin || isCouncilAdmin) && !focusMyTeam ? organization.memberTeams : (myTeam ? [myTeam] : [])).map(team => (
                    <div
                        key={team.id}
                        className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:shadow-xl hover:shadow-slate-100 transition-all group flex flex-col relative"
                    >
                        {/* X Remove Button */}
                        {(isMainAdmin || isCouncilAdmin) && (onRemoveTeam || onUpdateOrg) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Remove ${team.name} from ${organization.name}?`)) {
                                        if (onRemoveTeam) {
                                            // Preferred: Use dedicated removal handler (cleanups junction table)
                                            onRemoveTeam(organization.id, team.id);
                                        } else if (onUpdateOrg) {
                                            // Fallback: Update organization (manual cleanup needed)
                                            const updated = { ...organization, memberTeams: organization.memberTeams.filter(t => t.id !== team.id) };
                                            onUpdateOrg(organization.id, updated);
                                        }
                                    }
                                }}
                                className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-red-500 text-slate-400 hover:text-white rounded-full flex items-center justify-center font-black text-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                                title="Remove from organization"
                            >
                                ×
                            </button>
                        )}

                        {/* Team Header - Clickable to View Details */}
                        <div onClick={() => onViewTeam(team.id)} className="cursor-pointer">
                            <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">{team.name}</h3>
                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">📍 {team.location || 'Home Ground'}</p>
                        </div>

                        {/* Player List at a Glance */}
                        <div className="mt-4 mb-4 flex-1">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                {team.players.length} Player{team.players.length !== 1 ? 's' : ''}
                            </div>
                            {team.players.length > 0 ? (
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {team.players.map((player, idx) => (
                                        <div key={player.id} className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-400 font-mono text-[10px] w-5">{idx + 1}.</span>
                                            <span className="text-slate-700 font-medium truncate">{player.name}</span>
                                            <span className="text-[9px] text-slate-400 ml-auto flex-shrink-0">{player.role}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-300 text-xs italic">No players yet</div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {(isCouncilAdmin || canEditTeam(team.id)) && onUpdateOrg && (
                            <div className="flex gap-2 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                {!isLockdown && (
                                    <>
                                        <button
                                            onClick={() => onAddPlayer(team)}
                                            className="flex-1 py-2 bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-indigo-600"
                                        >
                                            + Add Player
                                        </button>
                                        <button
                                            onClick={() => onBulkImportPlayers(team)}
                                            className="flex-1 py-2 bg-slate-50 text-slate-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-emerald-600"
                                        >
                                            + Bulk Import
                                        </button>
                                    </>
                                )}
                                {onSelectHubTeam && (isOrgAdmin || isCouncilAdmin) && (
                                    <button
                                        onClick={() => onSelectHubTeam(team.id)}
                                        className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-indigo-50 hover:border-indigo-600"
                                        title="Open Team Hub"
                                    >
                                        ⚡ Hub
                                    </button>
                                )}
                                <button
                                    onClick={() => onEditTeam(team)}
                                    className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-slate-100 hover:border-indigo-600"
                                    title="Edit Team Info"
                                >
                                    ✏️
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
    );
};
