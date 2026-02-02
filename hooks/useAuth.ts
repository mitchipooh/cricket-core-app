/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) console.error('Google sign in error:', error);
        return { error };
    };

    const signInWithFacebook = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) console.error('Facebook sign in error:', error);
        return { error };
    };

    const signInWithEmail = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    };

    const signUpWithEmail = async (email: string, password: string, name: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    handle: `@${email.split('@')[0]}`
                }
            }
        });

        // Create user profile
        if (data.user && !error) {
            await supabase.from('user_profiles').insert({
                id: data.user.id,
                email,
                name,
                handle: `@${email.split('@')[0]}`,
                avatar_url: data.user.user_metadata.avatar_url || '',
                role: 'Fan'
            });
        }

        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const getUserProfile = async (): Promise<UserProfile | null> => {
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }

        // Map Supabase profile to UserProfile type
        return {
            id: data.id,
            name: data.name || user.email || 'User',
            handle: data.handle || `@${user.email?.split('@')[0]}`,
            email: data.email || user.email,
            avatarUrl: data.avatar_url || user.user_metadata.avatar_url,
            role: data.role || 'Fan',
            createdAt: new Date(data.created_at).getTime()
        };
    };

    return {
        user,
        session,
        loading,
        signInWithGoogle,
        signInWithFacebook,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        getUserProfile
    };
};
