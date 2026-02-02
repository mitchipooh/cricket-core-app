
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

export const pushGlobalSync = async (data: { orgs: Organization[], standaloneMatches: MatchFixture[], mediaPosts: MediaPost[] }, userId?: string) => {
  // 1. Supabase Push
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: 'global', payload: data, updated_at: new Date() });

  if (!error) return true;
  console.error("Supabase Push Error:", error);

  // 2. Fallback to WP Sync
  if (!SYNC_URL) return false;

  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': window.wpApiSettings!.nonce,
        ...(userId ? { 'X-CC-User-ID': userId } : {})
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.error("Cloud Sync Failed:", error);
    return false;
  }
};

export const fetchGlobalSync = async (userId?: string): Promise<{ orgs: Organization[], standaloneMatches: MatchFixture[], mediaPosts: MediaPost[] } | null> => {
  // 1. Supabase Pull
  console.log('🔄 Fetching from Supabase...');
  const { data, error } = await supabase
    .from('app_state')
    .select('payload')
    .eq('id', 'global')
    .single();

  if (data && data.payload) {
    console.log('✅ Supabase data fetched:', {
      orgs: data.payload.orgs?.length,
      teams: data.payload.orgs?.[0]?.memberTeams?.length
    });
    return data.payload as any;
  }
  if (error && error.code !== 'PGRST116') { // Ignore 'no rows' error
    console.warn("Supabase Fetch Error (or empty):", error.message);
  } else if (error) {
    console.log('⚠️  No data in Supabase (table might be empty)');
  }

  // 2. Fallback to WP
  if (!SYNC_URL) return null;

  try {
    const url = userId ? `${SYNC_URL}?user_id=${encodeURIComponent(userId)}` : SYNC_URL;
    const response = await fetch(url, {
      headers: {
        'X-WP-Nonce': window.wpApiSettings!.nonce
      }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Cloud Fetch Failed:", error);
    return null;
  }
};

// --- INDIVIDUAL USER DATA SYNC ---

export type UserDataPayload = {
  profile?: UserProfile;
  settings?: { notifications: boolean; sound: boolean };
  following?: { teams: string[], players: string[], orgs: string[] };
};

export const pushUserData = async (userId: string, data: UserDataPayload) => {
  if (!USER_URL) return false;

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
    console.error("User Data Sync Failed:", error);
    return false;
  }
};

export const fetchUserData = async (userId: string): Promise<UserDataPayload | null> => {
  if (!USER_URL) return null;

  try {
    const response = await fetch(`${USER_URL}?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'X-WP-Nonce': window.wpApiSettings!.nonce
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    // Return null if data is empty (user might not exist in cloud yet)
    if (!data || Object.keys(data).length === 0) return null;
    return data;
  } catch (error) {
    console.error("User Data Fetch Failed:", error);
    return null;
  }
};
