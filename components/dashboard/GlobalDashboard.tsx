
import React, { useState } from 'react';
import { Organization, UserProfile, MatchFixture, PlayerWithContext } from '../../types.ts';
import { OrgCard } from '../admin/OrgCard.tsx';
import { Can } from '../common/Can.tsx';
import { ApplicationModal } from '../modals/ApplicationModal.tsx';

interface GlobalDashboardProps {
  organizations: Organization[];
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSelectOrg: (id: string) => void;
  onRequestDeleteOrg: (org: Organization) => void;
  onRequestCreateOrg: () => void;
  onViewOrg?: (orgId: string) => void;
  onRequestQuickMatch: () => void;
  onOpenMediaStudio: () => void;
  fixtures: MatchFixture[];
  topBatsmen: PlayerWithContext[];
  topBowlers: PlayerWithContext[];
  onStartMatch: (match: MatchFixture) => void;
  onViewMatch: (match: MatchFixture) => void;
  onViewTeam: (teamId: string) => void;
  currentUserId?: string;
  onApplyForOrg?: (orgId: string) => void;
  onUpgradeProfile?: () => void;
  following?: { teams: string[], players: string[], orgs: string[] };
  onToggleFollow?: (type: 'TEAM' | 'PLAYER' | 'ORG', id: string) => void;
  onRequestCaptainHub?: () => void;
  onRequestMatchReports?: () => void;
  showCaptainHub?: boolean;
  onOpenCaptainHub?: () => void;
  onCreateUser?: (user: UserProfile, password: string) => Promise<{ success: boolean; userId?: string; error?: { message: string } }>;
  globalUsers?: UserProfile[]; // NEW
}

type FixtureTab = 'LIVE' | 'SCHEDULED' | 'COMPLETED' | 'MY_HISTORY';
type FormatFilter = 'ALL' | 'Test' | 'T20' | 'T10' | 'ODI';

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
  organizations, profile, onUpdateProfile, onSelectOrg, onRequestDeleteOrg, onRequestCreateOrg,
  onRequestQuickMatch, onOpenMediaStudio, fixtures, topBatsmen, topBowlers,
  onStartMatch, onViewMatch, onViewTeam, currentUserId, onApplyForOrg, onUpgradeProfile,
  following, onToggleFollow, onRequestCaptainHub, showCaptainHub, onRequestMatchReports, onOpenCaptainHub,
  onViewOrg, onCreateUser, globalUsers = [] // NEW
}) => {
  const [activeFixtureTab, setActiveFixtureTab] = useState<FixtureTab>('LIVE');
  const [activeFormat, setActiveFormat] = useState<FormatFilter>('ALL');
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Safety check
  if (!profile) return <div className="p-10 text-center font-bold text-slate-400">Loading Profile...</div>;

  // Access Logic
  const myOrgs = organizations.filter(org => org.members.some(m => m.userId === currentUserId));
  // Filter discovery to only show PUBLIC organizations (or ones user is already in)
  const discoverOrgs = organizations.filter(org => org.isPublic !== false && !org.members.some(m => m.userId === currentUserId));

  // Match Official Resume Feature
  const liveMatches = fixtures.filter(f => f.status === 'Live');

  // Filter fixtures based on format AND public visibility
  const filteredByFormat = fixtures.filter(f => {
    // Check if parent org is public or user is member
    // Note: fixtures don't carry orgId directly in this architecture, we have to look it up or rely on filtered list passed down.
    // Assuming `fixtures` passed to GlobalDashboard are already "global".
    // We need to filter out private org fixtures from the public view.

    // Find Org for this fixture
    const hostOrg = organizations.find(o => o.fixtures.some(fx => fx.id === f.id));
    if (hostOrg && hostOrg.isPublic === false) {
      // Only show private org matches to members
      const isMember = hostOrg.members.some(m => m.userId === currentUserId);
      if (!isMember) return false;
    }

    switch (activeFormat) {
      case 'ALL': return true;
      case 'Test': return f.format === 'Test';
      case 'T20': return f.format === 'T20';
      case 'T10': return f.format === 'T10';
      case 'ODI': return f.format === '40-over' || f.format === '50-over';
      default: return false;
    }
  });

  // Filter based on Tab
  const currentFixtures = filteredByFormat.filter(f => {
    if (activeFixtureTab === 'MY_HISTORY') {
      // Only show matches scored by this user
      return f.scorerId === currentUserId;
    }
    if (activeFixtureTab === 'LIVE') return f.status === 'Live';
    if (activeFixtureTab === 'SCHEDULED') return f.status === 'Scheduled';
    if (activeFixtureTab === 'COMPLETED') return f.status === 'Completed';
    return true;
  });

  const isAdminOrScorer = profile.role === 'Administrator' || profile.role === 'Scorer';
  const isUmpire = profile.role === 'Umpire';
  const isScorer = profile.role === 'Scorer';
  const isFan = profile.role === 'Fan';
  const isPlayer = profile.role === 'Player';
  const isGuest = profile.role === 'Guest';

  const formatOptions: { key: FormatFilter; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All Formats', icon: '🏏' },
    { key: 'Test', label: 'Test Match', icon: '⏳' },
    { key: 'T20', label: 'T20 Series', icon: '⚡' },
    { key: 'T10', label: 'T10 League', icon: '🔥' },
    { key: 'ODI', label: 'One Day', icon: '📅' },
  ];

  // Helper to check if user can claim a specific match
  const canClaimMatch = (match: MatchFixture) => {
    if (!isAdminOrScorer && !isUmpire) return false;
    if (match.status === 'Completed') return false;

    const hostOrg = organizations.find(org => org.fixtures.some(fx => fx.id === match.id));
    if (!hostOrg) return true;

    const isMember = hostOrg.members.some(m => m.userId === currentUserId);
    return isMember;
  };

  const getOrgNameForFixture = (matchId: string) => {
    const org = organizations.find(o => o.fixtures.some(f => f.id === matchId));
    return org ? org.name : 'Central Zone';
  };

  const fixtureTabs: FixtureTab[] = ['LIVE', 'SCHEDULED', 'COMPLETED'];
  if (isScorer) fixtureTabs.push('MY_HISTORY');

  const handleApplyClick = (orgId: string) => {
    if (isGuest && onUpgradeProfile) {
      alert("Please create a profile to apply to organizations.");
      onUpgradeProfile();
    } else if (onApplyForOrg) {
      onApplyForOrg(orgId);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        organizations={organizations.filter(org => org.isPublic !== false)}
        onApply={handleApplyClick}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter">
            {isFan || isGuest ? 'Fun Hub' : 'Command Center'}
          </h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] mt-2">
            {isFan || isGuest ? 'Fan Zone & Live Games' : isPlayer ? 'Player Hub' : 'Global Operations'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
          <Can role={profile.role} perform="fixture:generate">
            <button onClick={onRequestQuickMatch} className="flex-1 md:flex-none bg-emerald-500 text-white px-3 md:px-6 lg:px-8 py-2.5 md:py-3 lg:py-4 rounded-lg md:rounded-xl font-black uppercase text-[9px] md:text-[10px] lg:text-xs tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-400 hover:scale-105 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
              <span>⚡</span> Quick Match
            </button>
          </Can>
          {(isFan || isPlayer || isGuest) && onUpgradeProfile && (
            <button onClick={onUpgradeProfile} className="flex-1 md:flex-none bg-indigo-600 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-500 hover:scale-105 transition-all whitespace-nowrap">
              {isGuest ? 'Create Profile' : 'Upgrade Profile'}
            </button>
          )}
          <button onClick={onOpenMediaStudio} className="flex-1 md:flex-none bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl shadow-pink-200 hover:shadow-pink-300 hover:scale-105 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
            <span>🔴</span> Media Studio
          </button>
          {showCaptainHub && onOpenCaptainHub && (
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={onOpenCaptainHub} className="flex-1 md:flex-none bg-indigo-600 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-500 hover:scale-105 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                <span>🎖️</span> Captain's Hub
              </button>
              <button onClick={onRequestMatchReports} className="flex-1 md:flex-none bg-slate-900 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 hover:scale-105 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                <span>📋</span> Reports
              </button>
            </div>
          )}
          <Can role={profile.role} perform="org:create">
            <button onClick={onRequestCreateOrg} className="flex-1 md:flex-none bg-slate-900 text-white hover:bg-slate-800 px-4 md:px-8 py-3 md:py-4 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl whitespace-nowrap">+ New Org</button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <div className="space-y-6 md:space-y-8">

          {/* MATCH OFFICIAL RESUME SECTION */}
          {(isUmpire || isScorer) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-black text-yellow-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Active Assignments
              </h3>
              {liveMatches.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {liveMatches.map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-2xl border border-yellow-100 flex items-center justify-between">
                      <div>
                        <div className="font-black text-sm text-slate-900">{m.teamAName} vs {m.teamBName}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{m.venue}</div>
                      </div>
                      <button
                        onClick={() => onStartMatch(m)}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-yellow-600 transition-all"
                      >
                        Resume
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-700/60 text-xs font-bold uppercase tracking-widest">No live matches to officiate currently.</p>
              )}
            </div>
          )}

          {/* MY ORGANIZATIONS */}
          {!isFan && !isGuest && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> My Organizations</h3>
              <div className="grid grid-cols-1 gap-3">
                {myOrgs.length > 0 ? (
                  myOrgs.map(org => (
                    <OrgCard
                      key={org.id}
                      org={org}
                      userRole={profile.role}
                      onOpen={onSelectOrg}
                      onDeleteRequest={onRequestDeleteOrg}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">You are not a member of any organization.</p>
                  </div>
                )}
                <Can role={profile.role} perform="org:create">
                  <button onClick={onRequestCreateOrg} className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 hover:bg-slate-50 hover:border-indigo-300 transition-all text-slate-400 hover:text-indigo-600 gap-4 group min-h-[250px]">
                    <span className="text-5xl font-thin group-hover:scale-110 transition-transform">+</span>
                    <span className="text-xs font-black uppercase tracking-widest">Register New Org</span>
                  </button>
                </Can>
              </div>
            </div>
          )}

          {/* DISCOVER ORGANIZATIONS */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-300"></span> {isPlayer ? 'Find Clubs' : 'Discover'}</h3>
              {!isFan && !isGuest && (
                <button onClick={() => setShowApplicationModal(true)} className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:underline">Find More</button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {discoverOrgs.slice(0, 3).map(org => {
                const isFollowing = following?.orgs.includes(org.id);

                return (
                  <div key={org.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] opacity-75 hover:opacity-100 transition-all relative overflow-hidden group">
                    <button onClick={() => onViewOrg && onViewOrg(org.id)} className="text-left w-full hover:underline group-hover:text-indigo-600 transition-colors">
                      <h4 className="font-black text-lg text-slate-900">{org.name}</h4>
                    </button>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${org.type === 'GOVERNING_BODY' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {org.type === 'GOVERNING_BODY' ? 'Governing Body' : 'Club'}
                      </span>
                      <span className="text-xs text-slate-500">{org.country || 'Global'}</span>
                    </div>

                    {isFan || isGuest ? (
                      <button
                        onClick={() => onToggleFollow && onToggleFollow('ORG', org.id)}
                        className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {isFollowing ? 'Following ✓' : 'Follow'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApplyClick(org.id)}
                        className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        {isPlayer && org.type === 'CLUB' ? 'Join Club' : 'Apply to Join'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - GLOBAL MATCHES & STATS */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-xl shadow-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Matches</h3>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar max-w-[200px]">
                {fixtureTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFixtureTab(tab)}
                    className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeFixtureTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab === 'MY_HISTORY' ? 'MY GAMES' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Boxes Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {formatOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setActiveFormat(opt.key)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${activeFormat === opt.key
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200'
                    }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-tighter">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] md:max-h-[600px] custom-scrollbar pr-2">
              {currentFixtures.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <span className="text-3xl opacity-20">📭</span>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No {activeFormat !== 'ALL' ? activeFormat : ''} {activeFixtureTab.toLowerCase()} matches</p>
                </div>
              ) : (
                currentFixtures.map(f => {
                  const isClaimable = canClaimMatch(f);
                  const orgName = getOrgNameForFixture(f.id);

                  return (
                    <div key={f.id} className={`p-4 rounded-2xl border transition-all ${f.status === 'Live' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <div className="flex items-center gap-2">
                          <span className={f.status === 'Live' ? 'text-red-500 animate-pulse' : ''}>{f.status === 'Live' ? '● LIVE NOW' : new Date(f.date).toLocaleDateString()}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-indigo-500 truncate max-w-[80px]">{orgName}</span>
                        </div>
                        <span className={f.status === 'Live' ? 'text-slate-500' : 'text-slate-400'}>{f.venue}</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <button onClick={() => onViewTeam(f.teamAId)} className={`font-black text-xs hover:underline ${f.status === 'Live' ? 'text-white' : 'text-slate-800'}`}>{f.teamAName}</button>
                        <span className="text-[10px] font-bold text-slate-300">VS</span>
                        <button onClick={() => onViewTeam(f.teamBId)} className={`font-black text-xs hover:underline ${f.status === 'Live' ? 'text-white' : 'text-slate-800'}`}>{f.teamBName}</button>
                      </div>
                      {f.status === 'Live' && (
                        <div className="mt-2 text-center text-white font-black text-sm tracking-tight bg-white/10 rounded py-1">
                          {f.teamAScore || '0/0'} - {f.teamBScore || '0/0'}
                        </div>
                      )}
                      {f.status === 'Completed' && (
                        <div className="mt-2 text-center text-slate-500 font-bold text-[10px] bg-slate-200/50 rounded py-1">
                          Result: {f.result || 'Match Concluded'}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        {isClaimable && (
                          <button onClick={() => onStartMatch(f)} className={`flex-1 py-2 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${f.status === 'Live' ? 'bg-red-600 border-red-600 text-white hover:bg-red-500' : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500'}`}>
                            {f.status === 'Live' ? 'Resume Scoring' : 'Claim Match'}
                          </button>
                        )}
                        {!isClaimable && f.status !== 'Completed' && !isFan && !isGuest && (
                          <div className="flex-1 py-2 border border-slate-200 bg-slate-100 text-slate-400 text-[9px] font-bold uppercase rounded-lg text-center flex items-center justify-center cursor-not-allowed">
                            Restricted
                          </div>
                        )}
                        <button onClick={() => onViewMatch(f)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase rounded-lg hover:bg-slate-50">
                          Scorecard
                        </button>
                      </div>
                    </div>
                  )
                }))}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-xl shadow-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Global Leaders</h3>
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Orange Cap</div>
                {topBatsmen.slice(0, 3).map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{p.name}</span>
                      <button onClick={() => onViewTeam(p.teamId)} className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded hover:bg-slate-200">{p.teamName}</button>
                    </div>
                    <span className="font-black text-slate-900">{p.stats.runs}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">Purple Cap</div>
                {topBowlers.slice(0, 3).map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{p.name}</span>
                      <button onClick={() => onViewTeam(p.teamId)} className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded hover:bg-slate-200">{p.teamName}</button>
                    </div>
                    <span className="font-black text-slate-900">{p.stats.wickets}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

