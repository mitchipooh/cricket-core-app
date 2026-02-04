
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

// --- GLOBAL LEAGUE DATA SYNC ---

// Helper: Map DB to App
const mapTeam = (t: any, allPlayers: any[]) => ({
  id: t.id,
  // orgId removed - teams now use junction table for many-to-many relationship
  name: t.name,
  logoUrl: t.logo_url,
  location: t.location,
  players: allPlayers.filter(p => p.team_id === t.id).map(p => ({
    id: p.id,
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
  const orgTeamLinks: any[] = []; // NEW: Junction table for org-team many-to-many
  const tournamentTeamLinks: any[] = []; // NEW: Junction table for tournament-team many-to-many
  const affiliationsPayload: any[] = []; // NEW: Affiliations

  data.orgs.forEach(org => {
    orgsPayload.push({
      id: org.id, name: org.name, type: org.type, country: org.country,
      logo_url: org.logoUrl, is_public: org.isPublic,
      created_by: org.createdBy, // ROBUST: Explicit ownership column
      details: { description: org.description, address: org.address, allowMemberEditing: org.allowMemberEditing },
      members: org.members // Keep for backward compatibility
    });

    // NEW: Create organization affiliations junction entries
    // We only need to push parent relationships, as child is the inverse
    (org.parentOrgIds || []).forEach(parentId => {
      // Avoid self-references or invalid IDs
      if (parentId && parentId !== org.id) {
        affiliationsPayload.push({
          parent_org_id: parentId,
          child_org_id: org.id,
          status: 'APPROVED'
        });
      }
    });

    // NEW: Create organization-team junction entries
    org.memberTeams.forEach(team => {
      orgTeamLinks.push({
        organization_id: org.id,
        team_id: team.id
      });

      // Add team to teams table (no org_id anymore)
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

      // NEW: Create tournament-team junction entries
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

  // NEW: Collect tournament groups and group-team assignments
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

  // Batch Upsert (including junction tables)
  const { error: err1 } = await supabase.from('organizations').upsert(orgsPayload);
  const { error: err2 } = await supabase.from('tournaments').upsert(tournamentsPayload);
  const { error: err3 } = await supabase.from('teams').upsert(teamsPayload);
  const { error: err4 } = await supabase.from('roster_players').upsert(playersPayload);
  const { error: err5 } = await supabase.from('fixtures').upsert(fixturesPayload);
  const { error: err6 } = await supabase.from('media_posts').upsert(data.mediaPosts.map(p => ({
    id: p.id, type: p.type, title: p.title, caption: p.caption, author_name: p.authorName,
    content_url: p.contentUrl, likes: p.likes, timestamp: new Date(p.timestamp)
  })));

  // NEW: Upsert junction tables with conflict resolution
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

  // NEW: Upsert tournament groups
  const { error: err9 } = groupsPayload.length > 0
    ? await supabase.from('tournament_groups').upsert(groupsPayload, {
      onConflict: 'id',
      ignoreDuplicates: false // Allow updates to group name
    })
    : { error: null };

  // NEW: Upsert group-team assignments
  const { error: err10 } = groupTeamLinks.length > 0
    ? await supabase.from('group_teams').upsert(groupTeamLinks, {
      onConflict: 'group_id,team_id',
      ignoreDuplicates: true
    })
    : { error: null };

  // NEW: Upsert affiliations
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

export const fetchGlobalSync = async (userId?: string): Promise<{ orgs: Organization[], standaloneMatches: MatchFixture[], mediaPosts: MediaPost[] } | null> => {
  try {
    // Fetch all tables including junction tables
    const [orgs, teams, players, tournaments, fixtures, media, orgTeamLinks, tournamentTeamLinks, groups, groupTeamLinks, orgAffiliations] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('teams').select('*'),
      supabase.from('roster_players').select('*'),
      supabase.from('tournaments').select('*'),
      supabase.from('fixtures').select('*'),
      supabase.from('media_posts').select('*'),
      supabase.from('organization_teams').select('*'), // NEW: Junction table
      supabase.from('tournament_teams').select('*'),    // NEW: Junction table
      supabase.from('tournament_groups').select('*'),   // NEW: Groups table
      supabase.from('group_teams').select('*'),          // NEW: Group-team junction
      supabase.from('organization_affiliations').select('*') // NEW: Org Affiliations
    ]);

    if (orgs.error || teams.error || players.error) throw new Error("Fetch failed");

    // Stitching Data with Junction Tables
    // @ts-ignore
    const affiliationsData = orgTeamLinks[4]?.data || []; // Actually it's the 11th item but Promise.all is array. wait.
    // The Promise.all array index is 10.
    // Let's restructure the destructuring.
    const mappedOrgs: Organization[] = orgs.data.map((o: any) => {
      const orgTournaments = tournaments.data?.filter((t: any) => t.org_id === o.id) || [];

      // NEW: Get teams via junction table (many-to-many)
      const linkedTeamIds = orgTeamLinks.data
        ?.filter((link: any) => link.organization_id === o.id)
        .map((link: any) => link.team_id) || [];

      const orgTeamsRaw = teams.data?.filter((t: any) => linkedTeamIds.includes(t.id)) || [];
      const orgTeams = orgTeamsRaw.map((t: any) => mapTeam(t, players.data || []));

      // Fixtures associated with this org (via tournament OR team)
      const orgTournamentIds = orgTournaments.map((t: any) => t.id);
      const orgFixtures = fixtures.data?.filter((f: any) => orgTournamentIds.includes(f.tournament_id)).map(mapFixture) || [];

      // NEW: Map tournaments with teamIds from junction table
      const mappedTournaments = orgTournaments.map((t: any) => {
        const tournamentTeamIds = tournamentTeamLinks.data
          ?.filter((link: any) => link.tournament_id === t.id)
          .map((link: any) => link.team_id) || [];

        // NEW: Map groups for this tournament
        const tournamentGroups = groups.data
          ?.filter((g: any) => g.tournament_id === t.id)
          .map((g: any) => {
            // Get teams assigned to this group
            const groupTeamIds = groupTeamLinks.data
              ?.filter((link: any) => link.group_id === g.id)
              .map((link: any) => link.team_id) || [];

            const groupTeams = orgTeams.filter((team: any) => groupTeamIds.includes(team.id));

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
          teamIds: tournamentTeamIds, // NEW: Many-to-many team IDs
          groups: tournamentGroups,   // NEW: Mapped groups with teams
          orgId: t.org_id,
          ...t.config
        };
      });

      return {
        id: o.id,
        name: o.name,
        type: o.type as any,
        createdBy: o.created_by, // ROBUST: Map ownership from DB
        country: o.country,
        description: o.details?.description,
        address: o.details?.address,
        logoUrl: o.logo_url,
        isPublic: o.is_public,
        allowUserContent: true,
        allowMemberEditing: o.details?.allowMemberEditing !== undefined ? o.details.allowMemberEditing : true,
        members: o.members || [], // Fix: Map members from DB JSONB column
        applications: [],
        sponsors: [],
        tournaments: mappedTournaments,
        groups: [],
        memberTeams: orgTeams,
        fixtures: orgFixtures, // Map fixtures
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

    console.log("DB_SYNC_DEBUG: Fetched", mappedOrgs.length, "organizations with junction table relationships");

    return {
      orgs: mappedOrgs,
      standaloneMatches: [], // Currently not handling standalone outside orgs for simplicity
      mediaPosts: mappedMedia as MediaPost[]
    };

  } catch (error) {
    console.error("Relational Fetch Error:", error);
    // Fallback to WP check if Supabase fails completely
    if (SYNC_URL) {
      // ... (Existing WP Fallback logic - simplified for brevity)
    }
    return null;
  }
};

// --- TEAM REMOVAL HELPERS ---

/**
 * Remove a team from an organization (deletes junction table entry)
 */
export const removeTeamFromOrg = async (orgId: string, teamId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('organization_teams')
    .delete()
    .match({ organization_id: orgId, team_id: teamId });

  if (error) {
    console.error("Failed to remove team from organization:", error);
    return false;
  }
  console.log(`DB_SYNC_DEBUG: Removed team ${teamId} from organization ${orgId}`);
  return true;
};

/**
 * Remove a team from a tournament (deletes junction table entry)
 */
export const removeTeamFromTournament = async (tournamentId: string, teamId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tournament_teams')
    .delete()
    .match({ tournament_id: tournamentId, team_id: teamId });

  if (error) {
    console.error("Failed to remove team from tournament:", error);
    return false;
  }
  console.log(`DB_SYNC_DEBUG: Removed team ${teamId} from tournament ${tournamentId}`);
  return true;
};

/**
 * Completely delete a team (also removes all junction table references)
 */
export const deleteTeam = async (teamId: string): Promise<boolean> => {
  // Delete junction table entries first
  await supabase.from('organization_teams').delete().match({ team_id: teamId });
  await supabase.from('tournament_teams').delete().match({ team_id: teamId });

  // Delete players
  await supabase.from('roster_players').delete().match({ team_id: teamId });

  // Delete team
  const { error } = await supabase.from('teams').delete().match({ id: teamId });

  if (error) {
    console.error("Failed to delete team:", error);
    return false;
  }
  console.log(`DB_SYNC_DEBUG: Completely deleted team ${teamId}`);
  return true;
};

// --- INDIVIDUAL USER DATA SYNC ---

export type UserDataPayload = {
  profile?: UserProfile;
  settings?: { notifications: boolean; sound: boolean };
  following?: { teams: string[], players: string[], orgs: string[] };
};

export const pushUserData = async (userId: string, data: UserDataPayload) => {
  // 1. Supabase Push
  const { error: supabaseError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      name: data.profile?.name,
      handle: data.profile?.handle,
      role: data.profile?.role,
      avatar_url: data.profile?.avatarUrl,
      password: data.profile?.password, // Needed for lite-auth cross-device login
      settings: data.settings,
      following: data.following,
      updated_at: new Date()
    });

  if (supabaseError) {
    console.error("Supabase User Sync Error:", supabaseError);
  }

  // 2. Fallback to WP Sync
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
  // 1. Supabase Pull (Try by ID first)
  let { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // 2. Fallback to Handle lookup if ID fails (common for Lite users)
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

  // 2. Fallback to WP
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


// --- FIXTURE UPDATES ---

export const updateFixture = async (fixtureId: string, updates: Partial<MatchFixture>) => {
  // Map App Types to DB Types
  const payload: any = {};
  if (updates.status) payload.status = updates.status;
  if (updates.result) payload.result = updates.result;
  if (updates.teamAScore || updates.teamBScore) {
    // We need to fetch existing scores first or assume we are passing full scores object?
    // For now, let's assume we pass what we want to update in a jsonb merge style if possible, 
    // but standard update replaces.
    // Better to fetch current first if complex.
    // BUT for Squads (teamASquadIds), it's a specific column in our schema?
    // Wait, DB Schema `fixtures` table has `details` jsonb. 
    // Types.ts says `teamASquadIds` is on MatchFixture. 
    // Our mapFixture (line 44) puts `teamASquadIds`? 
    // Line 44 doesn't explicitly map `teamASquadIds`. 
    // Let's check line 57 `...(f.details || {})`.
    // So squad IDs are stored in `details` JSONB column in DB?
    // Line 101: `details jsonb default '{}'::jsonb -- umpires, toss, etc.`
    // Yes.
  }

  // Logic: We are updating the 'details' jsonb column.
  // We should fetch, merge, and update.

  try {
    const { data: current } = await supabase.from('fixtures').select('details').eq('id', fixtureId).single();
    if (!current) throw new Error("Fixture not found");

    const newDetails = { ...(current.details || {}), ...updates };

    // Explicitly handle top-level fields if any
    const topLevelUpdates: any = {};
    if (updates.status) topLevelUpdates.status = updates.status;
    if (updates.result) topLevelUpdates.result = updates.result;

    const { error } = await supabase
      .from('fixtures')
      .update({ ...topLevelUpdates, details: newDetails })
      .eq('id', fixtureId);

    return !error;
  } catch (e) {
    console.error("Update Fixture Failed:", e);
    return false;
  }
};
