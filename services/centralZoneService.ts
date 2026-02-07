
import { Organization, MatchFixture, MediaPost, UserProfile } from '../types';

declare global {
  interface Window {
    wpApiSettings?: {
      root: string;
      nonce: string;
      site_url: string;
      current_user_id: number;
      plugin_url?: string;
      // Fix: Added google_client_id to global window settings for consistent typing
      google_client_id?: string;
    };
  }
}

import { supabase } from '../lib/supabase';

const IS_WP = typeof window !== 'undefined' && !!window.wpApiSettings;
const SYNC_URL = IS_WP ? `${window.wpApiSettings!.root}cricket-core/v1/sync` : null;
const USER_URL = IS_WP ? `${window.wpApiSettings!.root}cricket-core/v1/user` : null;

// --- GLOBAL LEAGUE DATA SYNC ---

// Helper: Map DB to App
const mapTeam = (t: any, allPlayers: any[]) => ({
  id: t.id,
  name: t.name,
  logoUrl: t.logo_url,
  location: t.location,
  players: allPlayers.filter(p => p.team_id === t.id).map(p => ({
    id: p.id,
    userId: p.user_id, // Expose linked User ID
    name: p.name,
    role: p.role,
    photoUrl: p.photo_url,
    stats: p.stats || {},
    playerDetails: p.details || {}
  }))
});

const mapFixture = (f: any) => ({
  id: f.id,
  tournamentId: f.tournament_id,
  teamAId: f.team_a_id,
  teamBId: f.team_b_id,
  date: f.date,
  venue: f.venue,
  status: f.status,
  result: f.result,
  winnerId: f.winner_id,
  teamAScore: f.scores?.teamAScore,
  teamBScore: f.scores?.teamBScore,
  savedState: f.saved_state,
  ...(f.details || {})
});

export const pushGlobalSync = async (data: { orgs: Organization[], standaloneMatches: MatchFixture[], mediaPosts: MediaPost[] }, userId?: string) => {
  // We need to deconstruct the nested app state into flat relational arrays
  const orgsPayload: any[] = [];
  const teamsPayload: any[] = [];
  const playersPayload: any[] = [];
  const tournamentsPayload: any[] = [];
  const fixturesPayload: any[] = [];
  const orgTeamLinks: any[] = [];
  const tournamentTeamLinks: any[] = [];
  const affiliationsPayload: any[] = [];

  data.orgs.forEach(org => {
    orgsPayload.push({
      id: org.id, name: org.name, type: org.type, country: org.country,
      logo_url: org.logoUrl, is_public: org.isPublic,
      created_by: org.createdBy,
      details: { description: org.description, address: org.address, allowMemberEditing: org.allowMemberEditing },
      members: org.members,
      applications: org.applications
    });

    (org.parentOrgIds || []).forEach(parentId => {
      if (parentId && parentId !== org.id) {
        affiliationsPayload.push({
          parent_org_id: parentId,
          child_org_id: org.id,
          status: 'APPROVED'
        });
      }
    });

    org.memberTeams.forEach(team => {
      orgTeamLinks.push({
        organization_id: org.id,
        team_id: team.id
      });

      teamsPayload.push({
        id: team.id,
        name: team.name,
        logo_url: team.logoUrl,
        location: team.location
      });

      team.players.forEach(p => {
        playersPayload.push({
          id: p.id, team_id: team.id, name: p.name, role: p.role, photo_url: p.photoUrl,
          stats: p.stats, details: p.playerDetails
        });
      });
    });

    org.tournaments.forEach(t => {
      tournamentsPayload.push({
        id: t.id,
        org_id: org.id,
        name: t.name,
        format: t.format,
        status: t.status,
        config: { pointsConfig: t.pointsConfig, overs: t.overs }
      });

      (t.teamIds || []).forEach(teamId => {
        tournamentTeamLinks.push({
          tournament_id: t.id,
          team_id: teamId
        });
      });
    });

    org.fixtures.forEach(f => {
      fixturesPayload.push({
        id: f.id, tournament_id: f.tournamentId, team_a_id: f.teamAId, team_b_id: f.teamBId,
        date: f.date, venue: f.venue, status: f.status, result: f.result, winner_id: f.winnerId,
        scores: { teamAScore: f.teamAScore, teamBScore: f.teamBScore }, saved_state: f.savedState,
        details: { umpires: f.umpires, tossWinnerId: f.tossWinnerId, tossDecision: f.tossDecision }
      });
    });
  });

  const groupsPayload: any[] = [];
  const groupTeamLinks: any[] = [];

  data.orgs.forEach(org => {
    org.tournaments.forEach(t => {
      (t.groups || []).forEach(group => {
        groupsPayload.push({
          id: group.id,
          tournament_id: t.id,
          name: group.name
        });

        group.teams.forEach(team => {
          groupTeamLinks.push({
            group_id: group.id,
            team_id: team.id
          });
        });
      });
    });
  });

  console.log("DB_SYNC_DEBUG: Pushing Orgs with members:", orgsPayload.map(o => ({ id: o.id, name: o.name, memberCount: o.members?.length })));
  console.log("DB_SYNC_DEBUG: Pushing Teams:", teamsPayload.map(t => ({ id: t.id, name: t.name })));
  console.log("DB_SYNC_DEBUG: Pushing Org-Team Links:", orgTeamLinks.length, "links");
  console.log("DB_SYNC_DEBUG: Pushing Tournament-Team Links:", tournamentTeamLinks.length, "links");
  console.log("DB_SYNC_DEBUG: Pushing Groups:", groupsPayload.length, "groups");
  console.log("DB_SYNC_DEBUG: Pushing Group-Team Links:", groupTeamLinks.length, "assignments");
  console.log("DB_SYNC_DEBUG: Pushing Affiliations:", affiliationsPayload.length, "links");

  const { error: err1 } = await supabase.from('organizations').upsert(orgsPayload);
  const { error: err2 } = await supabase.from('tournaments').upsert(tournamentsPayload);
  const { error: err3 } = await supabase.from('teams').upsert(teamsPayload);
  const { error: err4 } = await supabase.from('roster_players').upsert(playersPayload);
  const { error: err5 } = await supabase.from('fixtures').upsert(fixturesPayload);
  const { error: err6 } = await supabase.from('media_posts').upsert(data.mediaPosts.map(p => ({
    id: p.id, type: p.type, title: p.title, caption: p.caption, author_name: p.authorName,
    content_url: p.contentUrl, likes: p.likes, timestamp: new Date(p.timestamp)
  })));

  const { error: err7 } = orgTeamLinks.length > 0
    ? await supabase.from('organization_teams').upsert(orgTeamLinks, {
      onConflict: 'organization_id,team_id',
      ignoreDuplicates: true
    })
    : { error: null };

  const { error: err8 } = tournamentTeamLinks.length > 0
    ? await supabase.from('tournament_teams').upsert(tournamentTeamLinks, {
      onConflict: 'tournament_id,team_id',
      ignoreDuplicates: true
    })
    : { error: null };

  const { error: err9 } = groupsPayload.length > 0
    ? await supabase.from('tournament_groups').upsert(groupsPayload, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    : { error: null };

  const { error: err10 } = groupTeamLinks.length > 0
    ? await supabase.from('group_teams').upsert(groupTeamLinks, {
      onConflict: 'group_id,team_id',
      ignoreDuplicates: true
    })
    : { error: null };

  const { error: err11 } = affiliationsPayload.length > 0
    ? await supabase.from('organization_affiliations').upsert(affiliationsPayload, {
      onConflict: 'parent_org_id,child_org_id',
      ignoreDuplicates: true
    })
    : { error: null };

  if (err1 || err2 || err3 || err4 || err5 || err6 || err7 || err8 || err9 || err10 || err11) {
    console.error("Relational Sync Error:", { err1, err2, err3, err4, err5, err6, err7, err8, err9, err10, err11 });
    return false;
  }
  console.log("DB_SYNC_DEBUG: Sync Successful (including groups & junction tables)");
  return true;
};

// DIRECT PERSISTENCE UTILS

export const requestAffiliation = async (targetOrgId: string, application: any): Promise<boolean> => {
  try {
    const { error } = await supabase.from('organization_affiliations').insert({
      parent_org_id: targetOrgId,
      child_org_id: application.applicantId,
      status: 'PENDING'
    });

    if (error) {
      console.error("Affiliation Request (Junction) Failed:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Affiliation Request Exception:", e);
    return false;
  }
};

export const claimPlayerProfile = async (playerId: string, userId: string, applicantName: string): Promise<{ success: boolean; message?: string }> => {
  try {
    // 1. Check if player is already claimed
    const { data: player } = await supabase.from('roster_players').select('user_id').eq('id', playerId).single();
    if (player?.user_id) return { success: false, message: 'This profile is already claimed by another user.' };

    // 2. Find the organization managing this player (via team)
    const { data: teamData } = await supabase.from('roster_players').select(`
            team_id,
            teams (
                organization_teams (
                    organization_id
                )
            )
        `).eq('id', playerId).single();

    const teamObj = Array.isArray(teamData?.teams) ? teamData.teams[0] : teamData?.teams;
    const orgId = teamObj?.organization_teams?.[0]?.organization_id;

    if (!orgId) {
      return { success: false, message: 'This player belongs to a team that is not part of any managed club.' };
    }

    // 3. Create a Proxy "Ghost" Organization to satisfy FK constraints
    const timestamp = Date.now();
    // ID format: claim-req-{timestamp}-{userId}
    const proxyOrgId = `claim-req-${timestamp}-${userId.substring(0, 5)}`;
    // Metadata packed into name: CLAIM_REQ:{userId}:{playerId}:{applicantName}
    const proxyOrgName = `CLAIM_REQ:${userId}:${playerId}:${applicantName}`;

    // Insert Proxy Org
    const { error: orgError } = await supabase.from('organizations').insert({
      id: proxyOrgId,
      name: proxyOrgName,
      type: 'CLUB',
      is_public: false,
      created_by: userId,
      country: 'Global',
      ground_location: 'Virtual',
      established_year: new Date().getFullYear(),
      member_teams: [],
      tournaments: [],
      groups: []
    });

    if (orgError) {
      console.error("Claim Failed: Proxy Org Creation Error", orgError);
      return { success: false, message: 'Failed to initialize claim request.' };
    }

    // 4. Create Affiliation Request using the Proxy Org ID
    const { error: affError } = await supabase.from('organization_affiliations').insert({
      parent_org_id: orgId,
      child_org_id: proxyOrgId,
      status: 'PENDING'
    });

    if (affError) {
      console.error("Claim Failed: Affiliation Insert Error", affError);
      // Attempt cleanup
      await supabase.from('organizations').delete().eq('id', proxyOrgId);
      return { success: false, message: 'Failed to send request due to a database error.' };
    }

    return { success: true };
  } catch (e) {
    console.error("Claim Error", e);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

export const approvePlayerClaim = async (claimId: string, playerId: string, userId: string): Promise<boolean> => {
  // 1. Update Player Row
  const { error: pError } = await supabase.from('roster_players').update({ user_id: userId }).eq('id', playerId);
  if (pError) return false;

  // 2. Cleanup: Delete the Affiliation and the Ghost Org
  // claimId passed is the Ghost Org ID (because we map child_org_id -> applicantId -> appId in sync).

  // Delete Affiliation
  await supabase.from('organization_affiliations').delete().eq('child_org_id', claimId);
  // Delete Ghost Org
  await supabase.from('organizations').delete().eq('id', claimId);

  return true;
};

export const updateAffiliationStatus = async (parentOrgId: string, childOrgId: string, status: 'APPROVED' | 'REJECTED'): Promise<boolean> => {
  const { error } = await supabase
    .from('organization_affiliations')
    .update({ status })
    .match({ parent_org_id: parentOrgId, child_org_id: childOrgId });

  if (error) {
    console.error("Update Affiliation Status Failed:", error);
    return false;
  }
  return true;
};


export const fetchGlobalSync = async (userId?: string): Promise<{ orgs: Organization[], standaloneMatches: MatchFixture[], mediaPosts: MediaPost[] } | null> => {
  try {
    const [orgs, teams, players, tournaments, fixtures, media, orgTeamLinks, tournamentTeamLinks, groups, groupTeamLinks, orgAffiliations] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('teams').select('*'),
      supabase.from('roster_players').select('*'),
      supabase.from('tournaments').select('*'),
      supabase.from('fixtures').select('*'),
      supabase.from('media_posts').select('*'),
      supabase.from('organization_teams').select('*'),
      supabase.from('tournament_teams').select('*'),
      supabase.from('tournament_groups').select('*'),
      supabase.from('group_teams').select('*'),
      supabase.from('organization_affiliations').select('*')
    ]);

    if (orgs.error || teams.error || players.error) throw new Error("Fetch failed");

    const mappedOrgs: Organization[] = orgs.data.map((o: any) => {
      const orgTournaments = tournaments.data?.filter((t: any) => t.org_id === o.id) || [];

      const linkedTeamIds = orgTeamLinks.data
        ?.filter((link: any) => link.organization_id === o.id)
        .map((link: any) => link.team_id) || [];

      const orgTeamsRaw = teams.data?.filter((t: any) => linkedTeamIds.includes(t.id)) || [];
      const orgTeams = orgTeamsRaw.map((t: any) => mapTeam(t, players.data || []));

      const orgTournamentIds = orgTournaments.map((t: any) => t.id);
      const orgFixtures = fixtures.data?.filter((f: any) => orgTournamentIds.includes(f.tournament_id)).map(mapFixture) || [];

      const mappedTournaments = orgTournaments.map((t: any) => {
        const tournamentTeamIds = tournamentTeamLinks.data
          ?.filter((link: any) => link.tournament_id === t.id)
          .map((link: any) => link.team_id) || [];

        const tournamentGroups = groups.data
          ?.filter((g: any) => g.tournament_id === t.id)
          .map((g: any) => {
            const groupTeamIds = groupTeamLinks.data
              ?.filter((link: any) => link.group_id === g.id)
              .map((link: any) => link.team_id) || [];

            const groupTeams = (teams.data || []).map((t: any) => mapTeam(t, players.data || [])).filter((team: any) => groupTeamIds.includes(team.id));

            return {
              id: g.id,
              name: g.name,
              teams: groupTeams
            };
          }) || [];

        return {
          id: t.id,
          name: t.name,
          format: t.format,
          status: t.status,
          teamIds: tournamentTeamIds,
          groups: tournamentGroups,
          orgId: t.org_id,
          ...t.config
        };
      });

      // MERGE USER APPLICATIONS + AFFILIATION REQUESTS
      const userApps = o.applications || [];
      const affiliationRequests = orgAffiliations.data
        ?.filter((a: any) => a.parent_org_id === o.id && a.status === 'PENDING')
        .map((a: any) => {

          const childId = a.child_org_id || '';
          const applicantOrg = orgs.data.find((sub: any) => sub.id === childId);

          // 1. PLAYER CLAIM (Ghost Org detection)
          if (applicantOrg && applicantOrg.name.startsWith('CLAIM_REQ:')) {
            const parts = applicantOrg.name.split(':');
            // Format: CLAIM_REQ:{userId}:{playerId}:{applicantName}
            const userId = parts[1];
            const playerId = parts[2];
            const realApplicantName = parts.slice(3).join(':');

            return {
              id: childId, // Use the Child Org ID (proxy ID) as the App ID for approval references
              type: 'PLAYER_CLAIM',
              applicantId: userId,
              applicantName: realApplicantName || 'Claim Request',
              targetPlayerId: playerId,
              status: a.status,
              timestamp: new Date(a.created_at || Date.now()).getTime()
            };
          }

          // 2. USER JOIN (join:userId)
          if (childId.startsWith('join:')) {
            const [, userId] = childId.split(':');
            return {
              id: `join-${a.id}`,
              type: 'USER_JOIN',
              applicantId: userId,
              applicantName: 'New Member', // Placeholder
              status: a.status,
              timestamp: new Date(a.created_at || Date.now()).getTime()
            };
          }

          // 3. ORG AFFILIATION (Standard)
          return {
            id: `aff-req-${childId}`,
            type: 'ORG_AFFILIATE',
            applicantId: childId,
            applicantName: applicantOrg?.name || 'Unknown Org',
            applicantHandle: '',
            status: 'PENDING',
            timestamp: new Date(a.created_at || Date.now()).getTime()
          };
        }) || [];

      const mergedApplications = [...userApps, ...affiliationRequests];

      return {
        id: o.id,
        name: o.name,
        type: o.type as any,
        createdBy: o.created_by,
        country: o.country,
        description: o.details?.description,
        address: o.details?.address,
        logoUrl: o.logo_url,
        isPublic: o.is_public,
        allowUserContent: true,
        allowMemberEditing: o.details?.allowMemberEditing !== undefined ? o.details.allowMemberEditing : true,
        members: o.members || [],
        applications: mergedApplications,
        sponsors: [],
        tournaments: mappedTournaments,
        groups: [],
        memberTeams: orgTeams,
        fixtures: orgFixtures,
        parentOrgIds: orgAffiliations.data
          ?.filter((a: any) => a.child_org_id === o.id && a.status === 'APPROVED')
          .map((a: any) => a.parent_org_id) || [],
        childOrgIds: orgAffiliations.data
          ?.filter((a: any) => a.parent_org_id === o.id && a.status === 'APPROVED')
          .map((a: any) => a.child_org_id) || []
      };
    });

    const mappedMedia = media.data?.map((p: any) => ({
      id: p.id, type: p.type, title: p.title, caption: p.caption, authorName: p.author_name,
      contentUrl: p.content_url, likes: p.likes, timestamp: new Date(p.timestamp).getTime(),
      comments: []
    })) || [];

    return {
      orgs: mappedOrgs,
      standaloneMatches: [],
      mediaPosts: mappedMedia as MediaPost[]
    };

  } catch (error) {
    console.error("Relational Fetch Error:", error);
    if (SYNC_URL) {
      // Logic for WP fallback would go here
    }
    return null;
  }
};

export const removeTeamFromOrg = async (orgId: string, teamId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('organization_teams')
    .delete()
    .match({ organization_id: orgId, team_id: teamId });

  if (error) {
    console.error("Failed to remove team from organization:", error);
    return false;
  }
  return true;
};

export const removeTeamFromTournament = async (tournamentId: string, teamId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tournament_teams')
    .delete()
    .match({ tournament_id: tournamentId, team_id: teamId });

  if (error) {
    console.error("Failed to remove team from tournament:", error);
    return false;
  }
  return true;
};

export const deleteTeam = async (teamId: string): Promise<boolean> => {
  await supabase.from('organization_teams').delete().match({ team_id: teamId });
  await supabase.from('tournament_teams').delete().match({ team_id: teamId });
  await supabase.from('roster_players').delete().match({ team_id: teamId });
  const { error } = await supabase.from('teams').delete().match({ id: teamId });

  if (error) {
    console.error("Failed to delete team:", error);
    return false;
  }
  return true;
};

export type UserDataPayload = {
  profile?: UserProfile;
  settings?: { notifications: boolean; sound: boolean };
  following?: { teams: string[], players: string[], orgs: string[] };
};

export const pushUserData = async (userId: string, data: UserDataPayload) => {
  const { error: supabaseError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      name: data.profile?.name,
      handle: data.profile?.handle,
      role: data.profile?.role,
      avatar_url: data.profile?.avatarUrl,
      password: data.profile?.password,
      settings: data.settings,
      following: data.following,
      updated_at: new Date()
    });

  if (supabaseError) {
    console.error("Supabase User Sync Error:", supabaseError);
  }

  if (!USER_URL) return !supabaseError;

  try {
    const response = await fetch(`${USER_URL}?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': window.wpApiSettings!.nonce
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.error("User Data WP Sync Failed:", error);
    return false;
  }
};

export const fetchUserData = async (userId: string): Promise<UserDataPayload | null> => {
  let { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!data || error) {
    const handleToTry = userId.startsWith('@') ? userId : `@${userId}`;
    const { data: handleData, error: handleErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('handle', handleToTry)
      .single();

    if (handleData && !handleErr) {
      data = handleData;
      error = null;
    }
  }

  if (data && !error) {
    return {
      profile: {
        id: data.id,
        name: data.name,
        handle: data.handle,
        role: data.role,
        avatarUrl: data.avatar_url,
        password: data.password,
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now()
      } as UserProfile,
      settings: data.settings,
      following: data.following
    };
  }

  if (error && error.code !== 'PGRST116') {
    console.warn("Supabase User Fetch error:", error.message);
  }

  if (!USER_URL) return null;

  try {
    const response = await fetch(`${USER_URL}?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'X-WP-Nonce': window.wpApiSettings!.nonce
      }
    });
    if (!response.ok) return null;
    const wpData = await response.json();
    if (!wpData || Object.keys(wpData).length === 0) return null;
    return wpData;
  } catch (error) {
    console.error("User Data WP Fetch Failed:", error);
    return null;
  }
  return null;
}

export const updateFixture = async (fixtureId: string, updates: Partial<MatchFixture>) => {
  try {
    const { data: current } = await supabase.from('fixtures').select('details, scores').eq('id', fixtureId).single();

    const newDetails = { ...(current?.details || {}), ...updates };
    delete newDetails.savedState;
    delete newDetails.status;
    delete newDetails.result;
    delete newDetails.teamAScore;
    delete newDetails.teamBScore;

    const topLevelUpdates: any = {};
    if (updates.status) topLevelUpdates.status = updates.status;
    if (updates.result) topLevelUpdates.result = updates.result;
    if (updates.savedState) topLevelUpdates.saved_state = updates.savedState;

    if (updates.teamAScore !== undefined || updates.teamBScore !== undefined) {
      topLevelUpdates.scores = {
        teamAScore: updates.teamAScore ?? current?.scores?.teamAScore,
        teamBScore: updates.teamBScore ?? current?.scores?.teamBScore
      };
    }

    const { error } = await supabase
      .from('fixtures')
      .update({ ...topLevelUpdates, details: newDetails })
      .eq('id', fixtureId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Update Fixture Failed:", e);
    return false;
  }
};
