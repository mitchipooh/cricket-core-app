import { useState, useRef, useCallback, useEffect } from 'react';
import { Organization, MatchFixture, MediaPost, UserProfile } from '../types';
import { fetchGlobalSync, pushGlobalSync, pushUserData, fetchUserData } from '../services/centralZoneService';

interface UseSyncProps {
    profile: UserProfile | null;
    orgs: Organization[];
    standaloneMatches: MatchFixture[];
    mediaPosts: MediaPost[];
    settings: any;
    following: any;

    setOrgsState: (val: Organization[]) => void;
    setMatchesState: (val: MatchFixture[]) => void;
    setPostsState: (val: MediaPost[]) => void;
    setSettings: (val: any) => void;
    setFollowing: (val: any) => void;
}

export const useSync = ({
    profile,
    orgs,
    standaloneMatches,
    mediaPosts,
    settings,
    following,
    setOrgsState,
    setMatchesState,
    setPostsState,
    setSettings,
    setFollowing
}: UseSyncProps) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const isSyncingRef = useRef(false);
    const dirtyRef = useRef(false);

    // 1. PULL: Fetch on mount and occasionally
    const performPull = useCallback(async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        setIsSyncing(true);

        const userId = profile?.googleId || (profile?.role !== 'Guest' ? profile?.id : undefined);

        try {
            const cloudData = await fetchGlobalSync(userId);
            console.log('📥 Cloud data received:', cloudData ? {
                orgs: cloudData.orgs?.length,
                teams: cloudData.orgs?.[0]?.memberTeams?.length,
                matches: cloudData.standaloneMatches?.length
            } : 'null');

            if (cloudData) {
                // Simple merge strategy: Server wins if we are not dirty. 
                const orgsChanged = JSON.stringify(cloudData.orgs) !== JSON.stringify(orgs);
                const matchesChanged = JSON.stringify(cloudData.standaloneMatches) !== JSON.stringify(standaloneMatches);
                const postsChanged = JSON.stringify(cloudData.mediaPosts) !== JSON.stringify(mediaPosts);

                console.log('🔄 Applying changes:', { orgsChanged, matchesChanged, postsChanged });

                if (orgsChanged) setOrgsState(cloudData.orgs || []);
                if (matchesChanged) setMatchesState(cloudData.standaloneMatches || []);
                if (postsChanged) setPostsState(cloudData.mediaPosts || []);
            } else {
                console.log('⚠️ No cloud data to sync');
            }

            if (profile && profile.role !== 'Guest') {
                const userData = await fetchUserData(profile.id);
                if (userData) {
                    if (userData.settings) setSettings(userData.settings);
                    if (userData.following) setFollowing(userData.following);
                }
            }
        } catch (e) {
            console.error("Sync fetch failed:", e);
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
            dirtyRef.current = false; // Reset dirty after a successful sync/merge cycle
        }
    }, [profile?.id, profile?.role]); // Dependencies for Pull

    // 2. PUSH: Function to call when we make changes
    const performPush = useCallback(async () => {
        const userId = profile?.googleId || (profile?.role !== 'Guest' ? profile?.id : undefined);
        await pushGlobalSync({ orgs, standaloneMatches, mediaPosts }, userId);

        if (profile && profile.role !== 'Guest') {
            await pushUserData(profile.id, { profile, settings, following });
        }
        dirtyRef.current = false;
    }, [orgs, standaloneMatches, mediaPosts, profile, settings, following]);

    // Initial Pull & Heartbeat
    useEffect(() => {
        performPull();
        const interval = setInterval(performPull, 30000);
        return () => clearInterval(interval);
    }, [performPull]);

    // Debounced Push for Data Changes
    useEffect(() => {
        if (!dirtyRef.current) return;
        const timer = setTimeout(() => {
            performPush();
        }, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [orgs, standaloneMatches, mediaPosts, profile, settings, following, performPush]);

    const markDirty = () => {
        dirtyRef.current = true;
    };

    return {
        isSyncing,
        syncNow: performPull,
        markDirty
    };
};
