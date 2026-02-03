
/**
 * Cricket-Core 2026 Management System
 * Created by mitchipoohdevs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/common/Layout.tsx';
import { AdminCenter } from './components/admin/AdminCenter.tsx';
import { MatchSetup } from './components/setup/MatchSetup.tsx';
import { StatsAnalytics } from './components/analytics/StatsAnalytics.tsx';
import { ProfileSetup } from './components/setup/ProfileSetup.tsx';
import { MediaCenter } from './components/media/MediaCenter.tsx';
import { TeamProfileModal } from './components/modals/TeamProfileModal.tsx';
import { PlayerProfileModal } from './components/modals/PlayerProfileModal.tsx';
import { ApplicationModal } from './components/modals/ApplicationModal.tsx';
import { PlayerCareer } from './components/dashboard/PlayerCareer.tsx';
import { ScoreboardWindow } from './components/display/ScoreboardWindow.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { Organization, Team, MatchFixture, UserProfile, Player, MatchState, Group, Tournament, MediaPost, PlayerWithContext, OrgMember, OrgApplication, MatchReportSubmission, GameIssue } from './types.ts';
import { OrganizationView } from './components/dashboard/OrganizationView.tsx';
import { useData } from './contexts/DataProvider.tsx';
import { Scorer } from './components/scoring/Scorer.tsx';
import { CaptainsProfile } from './components/captains/CaptainsProfile.tsx';
import { PlayerRegistry } from './components/search/PlayerRegistry.tsx'; // Import Registry
import { ReportVerification } from './components/admin/ReportVerification.tsx';
import { useAuth } from './hooks/useAuth';
import { LoginModal } from './components/auth/LoginModal';
import { updatePlayerStatsFromReport } from './utils/cricket-engine.ts';

// Re-defining for local use if needed, though mostly handled by Provider default
const MOCK_GUEST_PROFILE: UserProfile = { id: 'guest', name: 'Visitor', handle: 'guest', role: 'Guest', createdAt: Date.now() };

const App: React.FC = () => {
    // --- STANDALONE SCOREBOARD ROUTE CHECK ---
    const urlParams = new URLSearchParams(window.location.search);
    const isScoreboardMode = urlParams.get('mode') === 'scoreboard';

    if (isScoreboardMode) {
        return <ScoreboardWindow />;
    }

    // --- APP LOADING STATE ---
    const [isAppLoading, setIsAppLoading] = useState(true);

    // --- CONTEXT DATA ---
    const {
        orgs, standaloneMatches, mediaPosts, profile, settings, following,
        setOrgs, setStandaloneMatches, setMediaPosts,
        updateProfile, updateSettings, updateFollowing,
        syncNow
    } = useData();

    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('cc_theme') as 'dark' | 'light') || 'light');

    const [activeTab, setActiveTab] = useState<'home' | 'setup' | 'scorer' | 'stats' | 'media' | 'career' | 'my_club' | 'captain_hub' | 'registry'>('media');
    const [activeMatch, setActiveMatch] = useState<MatchFixture | null>(null);
    const [pendingSetupFixture, setPendingSetupFixture] = useState<MatchFixture | null>(null);
    const [viewMatchId, setViewMatchId] = useState<string | null>(null);
    const [viewingTeamId, setViewingTeamId] = useState<string | null>(null);
    const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [isApplyingForOrg, setIsApplyingForOrg] = useState(false);
    const [issues, setIssues] = useState<GameIssue[]>([]);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
    const [profileSetupMode, setProfileSetupMode] = useState<'CREATE' | 'LOGIN'>('CREATE');

    // Auth integration
    const { user, loading: authLoading, getUserProfile, signOut } = useAuth();

    // Sync Supabase auth with app profile
    useEffect(() => {
        if (user && !authLoading) {
            getUserProfile().then(authProfile => {
                if (authProfile) {
                    updateProfile(authProfile);
                }
            });
        }
        /* 
           DISABLE AUTO-LOGOUT: 
           Since we support handle-based "Lite" login which doesn't have a Supabase Auth session,
           we shouldn't force logout just because `user` is null. DataProvider handles persistence.
        */
        // else if (!user && !authLoading && profile.role !== 'Guest') {
        //     // User logged out, reset to guest
        //     updateProfile({ id: 'guest', name: 'Visitor', handle: 'guest', role: 'Guest', createdAt: Date.now() });
        // }
    }, [user, authLoading]);

    // --- INITIALIZATION EFFECT ---
    useEffect(() => {
        const logoSrc = window.wpApiSettings?.plugin_url
            ? `${window.wpApiSettings.plugin_url}logo.jpg`
            : 'logo.jpg';
        const img = new Image();
        img.src = logoSrc;
        const timer = setTimeout(() => {
            setIsAppLoading(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    // Initialize Central Zone if no orgs exist
    // DISABLED: Now loading from Supabase with 24 teams
    // useEffect(() => {
    //     if (orgs.length === 0) {
    //         const centralZone: Organization = {
    //             id: 'org-central-zone',
    //             name: 'Central Zone',
    //             type: 'GOVERNING_BODY',
    //             country: 'Global',
    //             description: 'The primary governing body for the Cricket-Core League.',
    //             isPublic: true,
    //             allowUserContent: true,
    //             tournaments: [],
    //             groups: [],
    //             memberTeams: [],
    //             fixtures: [],
    //             members: [],
    //             applications: [],
    //             sponsors: [],
    //             establishedYear: 2026
    //         };
    //         setOrgs([centralZone]);
    //     }
    // }, [orgs.length]);

    // --- AUTO ARCHIVE LOGIC ---
    useEffect(() => {
        const archiveThreshold = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 Days Ago
        let needsUpdate = false;

        const newStandalone = standaloneMatches.map(m => {
            if (m.status === 'Completed' && !m.isArchived && new Date(m.date).getTime() < archiveThreshold) {
                needsUpdate = true;
                return { ...m, isArchived: true };
            }
            return m;
        });

        const newOrgs = orgs.map(org => ({
            ...org,
            fixtures: org.fixtures.map(f => {
                if (f.status === 'Completed' && !f.isArchived && new Date(f.date).getTime() < archiveThreshold) {
                    needsUpdate = true;
                    return { ...f, isArchived: true };
                }
                return f;
            })
        }));

        if (needsUpdate) {
            setStandaloneMatches(newStandalone);
            setOrgs(newOrgs);
            // Push handled by setters
            console.log("Auto-archived old matches.");
        }
    }, [standaloneMatches, orgs]);

    // --- ACTIVE MATCH SYNC ---
    // If cloud updates the active match (e.g. another scorer), we should reflect it.
    useEffect(() => {
        if (activeMatch) {
            const cloudMatch = (standaloneMatches || []).find(m => m.id === activeMatch.id) ||
                (orgs || []).flatMap(o => o.fixtures).find(f => f.id === activeMatch.id);
            if (cloudMatch && cloudMatch.savedState && JSON.stringify(cloudMatch.savedState) !== JSON.stringify(activeMatch.savedState)) {
                // Only update if fundamentally different state to avoid jitter?
                // Ideally we just update.
                setActiveMatch(cloudMatch);
            }
        }
    }, [standaloneMatches, orgs, activeMatch?.id]);

    useEffect(() => {
        if (profile?.role === 'Guest' && !['media', 'scorer', 'setup'].includes(activeTab)) {
            setActiveTab('media');
        }
    }, [profile, activeTab]);

    useEffect(() => { localStorage.setItem('cc_theme', theme); if (theme === 'light') document.body.classList.add('light-theme'); else document.body.classList.remove('light-theme'); }, [theme]);

    // Derived Data
    const allTeams = useMemo(() => {
        const teamsMap = new Map<string, Team>();
        orgs.forEach(org => org.memberTeams.forEach(team => teamsMap.set(team.id, team)));
        return Array.from(teamsMap.values());
    }, [orgs]);

    const allPlayers = useMemo((): PlayerWithContext[] => {
        return orgs.flatMap(org =>
            org.memberTeams.flatMap(t =>
                t.players.map(p => ({ ...p, teamName: t.name, teamId: t.id, orgId: org.id, orgName: org.name }))
            )
        );
    }, [orgs]);

    const allFixtures = useMemo(() => {
        return [...standaloneMatches, ...orgs.flatMap(o => o.fixtures)];
    }, [standaloneMatches, orgs]);

    const myTeam = useMemo(() => {
        if (!profile || profile.role !== 'Player') return null;
        return allTeams.find(t => t.players.some(p => p.id === profile.id));
    }, [profile, allTeams]);

    const viewMatch = useMemo(() => {
        return allFixtures.find(f => f.id === viewMatchId);
    }, [viewMatchId, allFixtures]);

    const hireableScorers = useMemo(() => {
        if (profile && profile.role === 'Scorer' && profile.scorerDetails?.isHireable) {
            return [profile];
        }
        return [];
    }, [profile]);

    const toggleFollowing = (type: 'TEAM' | 'PLAYER' | 'ORG', id: string) => {
        if (profile?.role === 'Guest') { setEditingProfile(true); return; }

        const list = type === 'TEAM' ? following.teams : type === 'PLAYER' ? following.players : following.orgs;
        const newList = list.includes(id) ? list.filter(x => x !== id) : [...list, id];

        updateFollowing({
            ...following,
            [type === 'TEAM' ? 'teams' : type === 'PLAYER' ? 'players' : 'orgs']: newList
        });
    };

    // --- SCOREBOARD SYNC UPDATE ---
    useEffect(() => {
        if (activeMatch && activeMatch.savedState && 'BroadcastChannel' in window) {
            try {
                const hostOrg = orgs.find(o => o.fixtures.some(f => f.id === activeMatch.id));
                const channel = new BroadcastChannel('cricket_sync_channel');

                const teamA = allTeams.find(t => t.id === activeMatch.teamAId);
                const teamB = allTeams.find(t => t.id === activeMatch.teamBId);

                channel.postMessage({
                    type: 'UPDATE',
                    state: activeMatch.savedState,
                    teams: { batting: teamA, bowling: teamB },
                    sponsors: hostOrg?.sponsors || []
                });
            } catch (e) {
                console.warn("BroadcastChannel error", e);
            }
        }
    }, [activeMatch, orgs, allTeams]);

    const handleSetupComplete = (newMatch: MatchFixture) => {
        let nextMatches = [...standaloneMatches];
        let nextOrgs = [...orgs];
        const matchWithScorer = { ...newMatch, scorerId: profile?.id };
        if (pendingSetupFixture) {
            const updatedMatch = { ...matchWithScorer, id: pendingSetupFixture.id };
            nextMatches = nextMatches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
            nextOrgs = nextOrgs.map(org => ({
                ...org,
                fixtures: org.fixtures.map(f => f.id === updatedMatch.id ? updatedMatch : f)
            }));
            setActiveMatch(updatedMatch);
            setPendingSetupFixture(null);
        } else {
            const quickMatch = { ...matchWithScorer, isOfficial: matchWithScorer.isOfficial ?? false };
            nextMatches = [quickMatch, ...nextMatches];
            setActiveMatch(quickMatch);
        }
        setStandaloneMatches(nextMatches);
        setOrgs(nextOrgs);
        setActiveTab('scorer');
    };

    const handleUpdateMatchState = (matchId: string, newState: MatchState, finalStatus?: MatchFixture['status']) => {
        const getScore = (tid: string) => {
            const inn = newState.inningsScores.find(i => i.teamId === tid);
            if (inn) return `${inn.score}/${inn.wickets}`;
            if (newState.battingTeamId === tid) return `${newState.score}/${newState.wickets}`;
            return '0/0';
        };

        const updateFixture = (f: MatchFixture): MatchFixture => {
            if (f.id === matchId) {
                return {
                    ...f,
                    savedState: newState,
                    status: finalStatus || (newState.isCompleted ? 'Completed' : 'Live'),
                    teamAScore: getScore(f.teamAId),
                    teamBScore: getScore(f.teamBId)
                };
            }
            return f;
        };

        const nextMatches = standaloneMatches.map(updateFixture);
        const nextOrgs = orgs.map(org => ({
            ...org,
            fixtures: org.fixtures.map(updateFixture)
        }));

        setStandaloneMatches(nextMatches);
        setOrgs(nextOrgs);
    };

    const handleCreateOrg = (orgData: Partial<Organization>) => {
        const newOrg: Organization = {
            id: `org-${Date.now()}`, name: orgData.name || 'Untitled', type: orgData.type || 'CLUB',
            description: '', address: '', country: orgData.country || '', groundLocation: '',
            establishedYear: new Date().getFullYear(), logoUrl: '', tournaments: [], groups: [],
            memberTeams: [], fixtures: [], members: profile ? [{ userId: profile.id, name: profile.name, handle: profile.handle, role: 'Administrator', addedAt: Date.now() }] : [],
            applications: [], isPublic: true, allowUserContent: true, sponsors: []
        };
        const nextOrgs = [...orgs, newOrg];
        setOrgs(nextOrgs);
    };

    const handleAddTeam = (orgId: string, teamData: Omit<Team, 'id'>) => {
        const newTeam: Team = { ...teamData, id: `tm-${Date.now()}`, players: [] };
        const nextOrgs = orgs.map(org => org.id === orgId ? { ...org, memberTeams: [...org.memberTeams, newTeam] } : org);
        setOrgs(nextOrgs);
    };

    const handleQuickCreateTeam = (name: string, playerNames: string[]) => {
        let targetOrg = orgs.find(o => o.name === 'Quick Play Teams');
        const newPlayers: Player[] = playerNames.map((pName, index) => ({
            id: `pl-${Date.now()}-${index}`,
            name: pName,
            role: 'All-rounder',
            stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 }
        }));
        if (newPlayers.length === 0) {
            for (let i = 1; i <= 12; i++) {
                newPlayers.push({ id: `pl-auto-${Date.now()}-${i}`, name: `Player ${i}`, role: i === 12 ? 'Bowler' : i < 3 ? 'Batsman' : 'All-rounder', stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 } });
            }
        }
        const newTeam: Team = { id: `tm-${Date.now()}`, name: name, players: newPlayers };
        if (!targetOrg) {
            const newOrg: Organization = { id: `org-qp-${Date.now()}`, name: 'Quick Play Teams', type: 'CLUB', memberTeams: [newTeam], tournaments: [], groups: [], fixtures: [], members: profile ? [{ userId: profile.id, name: profile.name, handle: profile.handle, role: 'Administrator', addedAt: Date.now() }] : [], applications: [], country: 'Global', groundLocation: 'Virtual', establishedYear: new Date().getFullYear(), logoUrl: '', isPublic: false, sponsors: [] };
            const nextOrgs = [...orgs, newOrg];
            setOrgs(nextOrgs);
        } else {
            const nextOrgs = orgs.map(o => o.id === targetOrg!.id ? { ...o, memberTeams: [...o.memberTeams, newTeam] } : o);
            setOrgs(nextOrgs);
        }
    };

    const handleAddMediaPost = (post: MediaPost) => {
        const nextPosts = [post, ...mediaPosts];
        setMediaPosts(nextPosts);
    };

    const handleDeleteMediaPost = (postId: string) => {
        const nextPosts = mediaPosts.filter(p => p.id !== postId);
        setMediaPosts(nextPosts);
    };

    const handleApplyForOrg = (orgId: string) => {
        if (!profile || profile.role === 'Guest') { setEditingProfile(true); return; }

        const nextOrgs = orgs.map(org => {
            if (org.id === orgId) {
                const newApp: OrgApplication = {
                    id: `app-${Date.now()}`,
                    type: 'USER_JOIN',
                    applicantId: profile.id,
                    applicantName: profile.name,
                    applicantHandle: profile.handle,
                    applicantImage: profile.avatarUrl,
                    status: 'PENDING',
                    timestamp: Date.now()
                };
                return { ...org, applications: [...(org.applications || []), newApp] };
            }
            return org;
        });
        setOrgs(nextOrgs);
        alert('Application Sent!');
        setIsApplyingForOrg(false);
    };

    const handleProcessApplication = (orgId: string, appId: string, action: 'APPROVED' | 'REJECTED' | 'REVIEW', role?: 'Administrator' | 'Scorer' | 'Player') => {
        const parentOrg = orgs.find(o => o.id === orgId);
        const app = parentOrg?.applications.find(a => a.id === appId);

        if (!parentOrg || !app) return;

        const isAffiliation = app.type === 'ORG_AFFILIATE';
        const childOrgId = app.applicantId;

        const updatedOrgs = orgs.map(org => {
            if (org.id === orgId) {
                const updatedApps = org.applications.map(a => a.id === appId ? { ...a, status: action } : a);
                let newChildIds = org.childOrgIds || [];
                if (action === 'APPROVED' && isAffiliation && !newChildIds.includes(childOrgId)) {
                    newChildIds = [...newChildIds, childOrgId];
                }

                let newMembers = org.members;
                let updatedTeams = org.memberTeams;

                if (action === 'APPROVED' && !isAffiliation && role) {
                    if (!org.members.some(m => m.userId === app.applicantId)) {
                        newMembers = [...org.members, {
                            userId: app.applicantId,
                            name: app.applicantName,
                            handle: app.applicantHandle || '',
                            role: role as any,
                            addedAt: Date.now()
                        }];
                    }
                    if (role === 'Player' && org.memberTeams.length > 0) {
                        const firstTeam = org.memberTeams[0];
                        const newPlayer: Player = {
                            id: app.applicantId,
                            name: app.applicantName,
                            role: 'All-rounder',
                            photoUrl: app.applicantImage,
                            stats: { runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, matches: 0, catches: 0, runOuts: 0, stumpings: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0, threeWickets: 0, fiveWickets: 0, maidens: 0 }
                        };
                        updatedTeams = org.memberTeams.map(t => t.id === firstTeam.id ? { ...t, players: [...t.players, newPlayer] } : t);
                    }
                }
                return { ...org, applications: updatedApps, childOrgIds: newChildIds, members: newMembers, memberTeams: updatedTeams };
            }

            if (org.id === childOrgId && action === 'APPROVED' && isAffiliation) {
                const newParentIds = org.parentOrgIds || [];
                if (!newParentIds.includes(orgId)) {
                    return { ...org, parentOrgIds: [...newParentIds, orgId] };
                }
            }
            return org;
        });

        setOrgs(updatedOrgs);

        if (!isAffiliation && action === 'APPROVED' && profile?.id === app.applicantId) {
            if (profile.joinedClubIds?.includes(orgId)) return;
            const updatedProfile = {
                ...profile,
                joinedClubIds: [...(profile.joinedClubIds || []), orgId],
                notifications: [...(profile.notifications || []), {
                    id: `notif-${Date.now()}`,
                    type: 'ALERT',
                    title: 'Application Accepted',
                    message: `You have been accepted into ${parentOrg.name}.`,
                    timestamp: Date.now(),
                    read: false
                }] as any
            };
            updateProfile(updatedProfile);
        }
    };

    const handleSubmitMatchReport = (report: MatchReportSubmission) => {
        const nextOrgs = orgs.map(org => {
            const hasMatch = org.fixtures.some(f => f.id === report.matchId);
            if (!hasMatch) return org;
            return {
                ...org,
                fixtures: org.fixtures.map(f => f.id === report.matchId ? { ...f, reportSubmission: report } : f)
            };
        });
        setOrgs(nextOrgs);
        alert('Match Report Submitted for Admin Verification!');
    };

    const handleVerifyReport = (reportId: string) => {
        const fixture = allFixtures.find(f => f.reportSubmission?.id === reportId);
        if (!fixture || !fixture.reportSubmission) return;

        const updatedOrgs = updatePlayerStatsFromReport(orgs, fixture.reportSubmission);
        setOrgs(updatedOrgs);
        setViewMatchId(null);
        alert('Match Verified! Player stats have been updated.');
    };

    const handleRejectReport = (reportId: string, feedback: string) => {
        const nextOrgs = orgs.map(org => ({
            ...org,
            fixtures: org.fixtures.map(f => {
                if (f.reportSubmission?.id === reportId) {
                    return {
                        ...f,
                        reportSubmission: { ...f.reportSubmission, status: 'REJECTED' as const, adminFeedback: feedback }
                    };
                }
                return f;
            })
        }));
        setOrgs(nextOrgs);
        setViewMatchId(null);
        alert('Report Rejected.');
    };

    const handleSwitchProfile = (type: 'ADMIN' | 'SCORER' | 'FAN' | 'COACH' | 'UMPIRE' | 'PLAYER' | 'GUEST' | 'CAPTAIN') => {
        const base = { id: `dev-${type.toLowerCase()}-${Date.now()}`, createdAt: Date.now() };
        let newProfile: UserProfile;

        switch (type) {
            case 'ADMIN':
                newProfile = {
                    ...base,
                    name: 'Central Zone Admin',
                    handle: '@cz_admin',
                    role: 'Administrator',
                    joinedClubIds: ['org-central-zone']
                };

                // Ensure Central Zone exists and user is a member
                const czExists = orgs.find(o => o.id === 'org-central-zone');
                if (czExists) {
                    // Add user to members if not present
                    if (!czExists.members.some(m => m.userId === newProfile.id)) {
                        const updatedOrgs = orgs.map(o => o.id === 'org-central-zone' ? {
                            ...o,
                            members: [...o.members, {
                                userId: newProfile.id,
                                name: newProfile.name,
                                handle: newProfile.handle,
                                role: 'Administrator' as const,
                                addedAt: Date.now()
                            }]
                        } : o);
                        setOrgs(updatedOrgs);
                    }
                } else {
                    // Create Central Zone if missing
                    setOrgs([...orgs, {
                        id: 'org-central-zone',
                        name: 'Central Zone',
                        type: 'GOVERNING_BODY',
                        country: 'Global',
                        isPublic: true,
                        allowUserContent: true,
                        tournaments: [],
                        groups: [],
                        memberTeams: [],
                        fixtures: [],
                        members: [{
                            userId: newProfile.id,
                            name: newProfile.name,
                            handle: newProfile.handle,
                            role: 'Administrator' as const,
                            addedAt: Date.now()
                        }],
                        applications: [],
                        sponsors: [],
                        establishedYear: 2026
                    }]);
                }
                break;
            case 'SCORER': newProfile = { ...base, name: 'Dev Scorer', handle: '@dev_scorer', role: 'Scorer', scorerDetails: { isHireable: true, experienceYears: 5 } }; break;
            case 'PLAYER': newProfile = { ...base, name: 'Dev Player', handle: '@dev_player', role: 'Player', playerDetails: { battingStyle: 'Right-hand', bowlingStyle: 'Leg-break', primaryRole: 'All-rounder', lookingForClub: true, isHireable: false } }; break;
            case 'CAPTAIN':
                newProfile = { ...base, id: 'dev-captain-fixed', name: 'Dev Captain', handle: '@the_captain', role: 'Player', playerDetails: { battingStyle: 'Right-hand', bowlingStyle: 'Medium-fast', primaryRole: 'Batsman', lookingForClub: false, isHireable: false } };
                // Ensure they are in a team to activate Captain's Hub
                if (allTeams.length > 0) {
                    const firstTeam = allTeams[0];
                    let updatedOrgs = [...orgs];
                    let changed = false;

                    // 1. Ensure Player is in Team
                    if (!firstTeam.players.some(p => p.id === newProfile.id)) {
                        updatedOrgs = updatedOrgs.map(org => {
                            if (org.memberTeams.some(t => t.id === firstTeam.id)) {
                                return {
                                    ...org,
                                    memberTeams: org.memberTeams.map(t => t.id === firstTeam.id ? {
                                        ...t,
                                        players: [...t.players, {
                                            id: newProfile.id, name: newProfile.name, role: 'Batsman' as const,
                                            stats: { runs: 1250, wickets: 12, ballsFaced: 1100, ballsBowled: 240, runsConceded: 180, matches: 45, catches: 15, runOuts: 2, stumpings: 0, fours: 120, sixes: 45, hundreds: 2, fifties: 8, ducks: 1, threeWickets: 1, fiveWickets: 0, maidens: 4 }
                                        }]
                                    } : t)
                                };
                            }
                            return org;
                        });
                        changed = true;
                    }

                    // 2. Ensure Completed Fixture Pending Report
                    const hasPendingReport = allFixtures.some(f =>
                        (f.teamAId === firstTeam.id || f.teamBId === firstTeam.id) &&
                        f.status === 'Completed' &&
                        !f.reportSubmission
                    );

                    if (!hasPendingReport) {
                        const mockFixtureId = `fixture-mock-pending-${Date.now()}`;
                        updatedOrgs = updatedOrgs.map(org => {
                            if (org.memberTeams.some(t => t.id === firstTeam.id)) {
                                return {
                                    ...org,
                                    fixtures: [...org.fixtures, {
                                        id: mockFixtureId,
                                        teamAId: firstTeam.id,
                                        teamBId: 'mock-opp-1',
                                        teamAName: firstTeam.name,
                                        teamBName: 'Challengers XI',
                                        date: new Date(Date.now() - 86400000).toISOString(),
                                        venue: 'Demo Ground',
                                        status: 'Completed',
                                        type: 'T20',
                                        isOfficial: true,
                                        oversPerInnings: 20
                                    }]
                                };
                            }
                            return org;
                        });
                        changed = true;
                    }

                    if (changed) {
                        setOrgs(updatedOrgs);
                    }
                }
                break;
            case 'GUEST': newProfile = MOCK_GUEST_PROFILE; break;
            default: newProfile = { ...base, name: `Dev ${type}`, handle: `@dev_${type.toLowerCase()}`, role: type as any };
        }
        updateProfile(newProfile);
        setActiveTab(type === 'CAPTAIN' ? 'captain_hub' : 'home');
    };

    const handleProfileComplete = async (p: UserProfile) => {
        updateProfile(p);
        setEditingProfile(false);
        setActiveTab('home');
    };

    if (isAppLoading) {
        const logoSrc = window.wpApiSettings?.plugin_url ? `${window.wpApiSettings.plugin_url}logo.svg` : 'logo.svg';
        return (
            <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999] animate-in fade-in duration-500">
                <div className="flex flex-col items-center mb-12">
                    <div className="relative w-32 h-32 mb-6">
                        <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 rounded-full animate-pulse"></div>
                        <img src={logoSrc} className="w-full h-full object-contain relative z-10 drop-shadow-2xl" alt="Cricket Core" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">CRICKET CORE</h1>
                    <p className="text-emerald-500 font-bold uppercase tracking-[0.3em] text-xs">2026 Edition</p>
                </div>
                <div className="absolute bottom-12 text-center space-y-4">
                    <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-6 overflow-hidden">
                        <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite] w-1/2"></div>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Cricket is Life, Enjoy It</p>
                    <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">Powered by Mitchipoohdevs</p>
                </div>
                <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 50% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
            </div>
        );
    }

    if (!profile || editingProfile) {
        return (
            <ProfileSetup
                onComplete={handleProfileComplete}
                onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
                initialMode={profileSetupMode}
            />
        );
    }

    const myClubOrg = profile.joinedClubIds && profile.joinedClubIds.length > 0 ? orgs.find(o => o.id === profile.joinedClubIds![0]) : null;

    return (
        <ErrorBoundary>
            <Layout
                activeTab={activeTab}
                onTabChange={setActiveTab}
                profile={profile}
                theme={theme}
                onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                settings={settings}
                onToggleSetting={(k) => updateSettings({ ...settings, [k]: k === 'devMode' ? !settings.devMode : !settings[k] })}
                onEditProfile={() => {
                    if (profile.role === 'Guest') {
                        setProfileSetupMode('CREATE');
                        setEditingProfile(true);
                    } else {
                        setEditingProfile(true);
                        setProfileSetupMode('CREATE'); // Actually irrelevant since skipping setup mode reset inside
                    }
                }}
                onApplyForAccreditation={() => setIsApplyingForOrg(true)}
                onSignOut={async () => {
                    if (user) {
                        await signOut();
                    }
                    updateProfile(MOCK_GUEST_PROFILE);
                }}
                onSignIn={() => {
                    setProfileSetupMode('LOGIN');
                    setEditingProfile(true);
                }}
                onSwitchProfile={handleSwitchProfile}
                showCaptainHub={true}
            >
                <ApplicationModal isOpen={isApplyingForOrg} onClose={() => setIsApplyingForOrg(false)} organizations={orgs.filter(o => o.isPublic !== false && !profile.joinedClubIds?.includes(o.id))} onApply={handleApplyForOrg} />

                <div id="csp-view-container" className="h-full flex flex-col min-h-0">
                    <TeamProfileModal team={allTeams.find(t => t.id === viewingTeamId) || null} isOpen={!!viewingTeamId} onClose={() => setViewingTeamId(null)} allFixtures={allFixtures} onViewPlayer={(pId) => setViewingPlayerId(pId)} isFollowed={viewingTeamId ? following.teams.includes(viewingTeamId) : false} onToggleFollow={() => viewingTeamId && toggleFollowing('TEAM', viewingTeamId)} onViewMatch={(m) => { setViewMatchId(m.id); setActiveTab('media'); }} />
                    <PlayerProfileModal player={allPlayers.find(p => p.id === viewingPlayerId) || null} isOpen={!!viewingPlayerId} onClose={() => setViewingPlayerId(null)} isFollowed={viewingPlayerId ? following.players.includes(viewingPlayerId) : false} onToggleFollow={() => viewingPlayerId && toggleFollowing('PLAYER', viewingPlayerId)} allFixtures={allFixtures} onViewMatch={(m) => { setViewMatchId(m.id); setActiveTab('media'); }} />

                    {activeTab === 'home' && (
                        <AdminCenter
                            organizations={orgs} standaloneMatches={standaloneMatches} userRole={profile.role}
                            onStartMatch={(m) => { setActiveMatch(m); setActiveTab('scorer'); }} onViewMatch={(m) => { setViewMatchId(m.id); setActiveTab('media'); }} onRequestSetup={() => { setPendingSetupFixture(null); setActiveTab('setup'); }}
                            onUpdateOrgs={setOrgs} onCreateOrg={handleCreateOrg} onAddTeam={handleAddTeam} onRemoveTeam={(oid, tid) => { const next = orgs.map(o => o.id === oid ? { ...o, memberTeams: o.memberTeams.filter(t => t.id !== tid) } : o); setOrgs(next); }}
                            onBulkAddPlayers={(tid, pl) => { const next = orgs.map(o => ({ ...o, memberTeams: o.memberTeams.map(t => t.id === tid ? { ...t, players: [...t.players, ...pl] } : t) })); setOrgs(next); }} onAddGroup={(oid, gn) => { const next = orgs.map(o => o.id === oid ? { ...o, groups: [...o.groups, { id: `grp-${Date.now()}`, name: gn, teams: [] }] } : o); setOrgs(next); }}
                            onUpdateGroupTeams={(oid, gid, tids) => { const next = orgs.map(o => o.id === oid ? { ...o, groups: o.groups.map(g => g.id === gid ? { ...g, teams: o.memberTeams.filter(t => tids.includes(t.id)) } : g) } : o); setOrgs(next); }}
                            onAddTournament={(oid, trn) => { const next = orgs.map(o => o.id === oid ? { ...o, tournaments: [...o.tournaments, trn] } : o); setOrgs(next); }} mediaPosts={mediaPosts} onAddMediaPost={handleAddMediaPost}
                            onViewTeam={(tid) => setViewingTeamId(tid)} onOpenMediaStudio={() => setActiveTab('media')} following={following} onToggleFollow={toggleFollowing} hireableScorers={hireableScorers} currentUserId={profile.id}
                            onApplyForOrg={handleApplyForOrg} onProcessApplication={handleProcessApplication} currentUserProfile={profile}
                            showCaptainHub={true} onOpenCaptainHub={() => setActiveTab('captain_hub')}
                            onRequestMatchReports={() => setActiveTab('captain_hub')}
                            onUpdateProfile={updateProfile}
                            issues={issues}
                            onUpdateIssues={setIssues}
                        />
                    )}

                    {activeTab === 'my_club' && myClubOrg && (
                        <OrganizationView
                            organization={myClubOrg}
                            userRole="Player"
                            onBack={() => setActiveTab('home')}
                            onViewTournament={() => { }}
                            onViewPlayer={(p) => setViewingPlayerId(p.id)}
                            onRequestAddTeam={() => { }}
                            onRequestAddTournament={() => { }}
                            players={allPlayers.filter(p => p.orgId === myClubOrg.id)}
                            onViewTeam={setViewingTeamId}
                            isFollowed={following.orgs.includes(myClubOrg.id)}
                            onToggleFollow={() => toggleFollowing('ORG', myClubOrg.id)}
                            globalUsers={[]}
                            onAddMember={() => { }}
                            currentUserProfile={profile}
                        />
                    )}

                    {activeTab === 'career' && profile.role !== 'Player' && (
                        <div className="max-w-4xl mx-auto p-6 md:p-12 min-h-screen">
                            <PlayerCareer
                                profile={profile}
                                onUpdateProfile={updateProfile}
                                showCaptainHub={true}
                                onOpenCaptainHub={() => setActiveTab('captain_hub')}
                            />
                        </div>
                    )}

                    {activeTab === 'career' && profile.role === 'Player' && (<PlayerCareer profile={profile} onUpdateProfile={updateProfile} showCaptainHub={true} onOpenCaptainHub={() => setActiveTab('captain_hub')} />)}
                    {activeTab === 'setup' && (<MatchSetup teams={allTeams} existingFixture={pendingSetupFixture} onMatchReady={handleSetupComplete} onCancel={() => { setPendingSetupFixture(null); setActiveTab('home'); }} onCreateTeam={handleQuickCreateTeam} />)}
                    {activeTab === 'scorer' && (activeMatch ? (<Scorer match={activeMatch} teams={allTeams} userRole={profile.role} organizations={orgs} onUpdateOrgs={setOrgs} onUpdateMatchState={handleUpdateMatchState} onComplete={() => setActiveTab('home')} onRequestNewMatch={() => setActiveTab('setup')} onAddMediaPost={handleAddMediaPost} onExit={() => setActiveTab('home')} currentUserId={profile.id} />) : (<div className="flex flex-col items-center justify-center h-full text-center pb-20"> <h2 className="text-3xl font-black text-slate-900 mb-6">Cloud Sync Scoring</h2> <button onClick={() => setActiveTab('setup')} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Start New Cloud Match</button> </div>))}

                    {activeTab === 'captain_hub' && (
                        <CaptainsProfile
                            team={myTeam || { id: 'ghost-team', name: 'Unassigned Team', players: [] }}
                            fixtures={allFixtures}
                            allPlayers={allPlayers}
                            onBack={() => setActiveTab('home')}
                            onSubmitReport={handleSubmitMatchReport}
                            onLodgeProtest={(issue) => setIssues([...issues, issue])}
                            currentUser={profile}
                            issues={issues}
                        />
                    )}

                    {activeTab === 'media' && viewMatchId && viewMatch?.reportSubmission?.status === 'PENDING' && profile.role === 'Administrator' ? (
                        <ReportVerification
                            submission={viewMatch.reportSubmission}
                            fixture={viewMatch}
                            onApprove={handleVerifyReport}
                            onReject={handleRejectReport}
                            onBack={() => setViewMatchId(null)}
                        />
                    ) : activeTab === 'media' && (
                        <MediaCenter
                            onBack={() => setActiveTab('home')}
                            fixtures={allFixtures}
                            teams={allTeams}
                            players={allPlayers}
                            mediaPosts={mediaPosts}
                            onAddMediaPost={handleAddMediaPost}
                            onDeletePost={handleDeleteMediaPost}
                            initialMatchId={viewMatchId}
                            following={following}
                            onToggleFollow={toggleFollowing}
                            onViewTeam={setViewingTeamId}
                            onViewPlayer={(p) => setViewingPlayerId(p.id)}
                            userRole={profile.role}
                            currentProfile={profile}
                            userRole={profile.role}
                            currentProfile={profile}
                            organizations={orgs}
                        />
                    )}

                    {activeTab === 'registry' && (
                        <PlayerRegistry
                            allPlayers={allPlayers}
                            allTeams={allTeams}
                            onViewPlayer={(id) => setViewingPlayerId(id)}
                            onBack={() => setActiveTab('home')}
                        />
                    )}
                </div>
            </Layout>

            {/* Auth Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                initialMode={authModalMode}
                onSuccess={() => {
                    setShowLoginModal(false);
                    // Profile will be synced via useEffect
                }}
            />
        </ErrorBoundary>
    );
};

export default App;
