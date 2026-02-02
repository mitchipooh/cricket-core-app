import React, { createContext, useContext, useEffect, useState } from 'react';
import { Organization, MatchFixture, MediaPost, UserProfile } from '../types';
import { useSync } from '../hooks/useSync';

interface DataContextType {
    orgs: Organization[];
    standaloneMatches: MatchFixture[];
    mediaPosts: MediaPost[];
    profile: UserProfile | null;
    settings: { notifications: boolean; sound: boolean; devMode?: boolean; fullScreen?: boolean };
    following: { teams: string[], players: string[], orgs: string[] };

    // Actions
    updateProfile: (p: UserProfile) => void;
    updateSettings: (s: { notifications: boolean; sound: boolean; devMode?: boolean; fullScreen?: boolean }) => void;
    updateFollowing: (f: { teams: string[], players: string[], orgs: string[] }) => void;

    // Data Mutations (Automatically triggers sync)
    setOrgs: (orgs: Organization[]) => void;
    setStandaloneMatches: (matches: MatchFixture[]) => void;
    setMediaPosts: (posts: MediaPost[]) => void;

    // Manual Sync trigger
    syncNow: () => Promise<void>;
    isSyncing: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};

const MOCK_GUEST_PROFILE: UserProfile = { id: 'guest', name: 'Visitor', handle: 'guest', role: 'Guest', createdAt: Date.now() };

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- STATE ---
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        try { const saved = localStorage.getItem('cc_profile'); return saved ? JSON.parse(saved) : MOCK_GUEST_PROFILE; } catch { return MOCK_GUEST_PROFILE; }
    });

    const [orgs, setOrgsState] = useState<Organization[]>([]);
    const [standaloneMatches, setMatchesState] = useState<MatchFixture[]>([]);
    const [mediaPosts, setPostsState] = useState<MediaPost[]>([]);

    const [settings, setSettings] = useState(() => {
        try { const saved = localStorage.getItem('cc_settings'); return saved ? JSON.parse(saved) : { notifications: false, sound: true, devMode: false, fullScreen: false }; } catch { return { notifications: false, sound: true, devMode: false, fullScreen: false }; }
    });

    const [following, setFollowing] = useState(() => {
        try { const saved = localStorage.getItem('cc_following'); return saved ? JSON.parse(saved) : { teams: [], players: [], orgs: [] }; } catch { return { teams: [], players: [], orgs: [] }; }
    });

    // --- PERSISTENCE EFFECT ---
    useEffect(() => {
        if (profile && profile.role !== 'Guest') localStorage.setItem('cc_profile', JSON.stringify(profile));
        else localStorage.removeItem('cc_profile');
    }, [profile]);

    useEffect(() => { localStorage.setItem('cc_settings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { localStorage.setItem('cc_following', JSON.stringify(following)); }, [following]);

    // --- SYNC HOOK ---
    const { isSyncing, syncNow, markDirty } = useSync({
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
    });

    // --- SETTERS (Wrap to mark dirty) ---
    const setOrgs = (newOrgs: Organization[]) => {
        setOrgsState(newOrgs);
        markDirty();
    };

    const setStandaloneMatches = (newMatches: MatchFixture[]) => {
        setMatchesState(newMatches);
        markDirty();
    };

    const setMediaPosts = (newPosts: MediaPost[]) => {
        setPostsState(newPosts);
        markDirty();
    };

    const updateProfile = (p: UserProfile) => {
        setProfile(p);
        markDirty();
    };

    const updateSettings = (s: any) => {
        setSettings(s);
        markDirty();
    };

    const updateFollowing = (f: any) => {
        setFollowing(f);
        markDirty();
    };

    return (
        <DataContext.Provider value={{
            orgs, standaloneMatches, mediaPosts, profile, settings, following,
            setOrgs, setStandaloneMatches, setMediaPosts,
            updateProfile, updateSettings, updateFollowing,
            syncNow, isSyncing
        }}>
            {children}
        </DataContext.Provider>
    );
};
