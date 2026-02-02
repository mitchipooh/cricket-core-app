
import { createClient } from '@supabase/supabase-js';
import { Organization, Team, MatchFixture, Player, Tournament } from '../types';
import fs from 'fs';
import path from 'path';

// --- ENV SETUP ---
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {} as any);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log('🌱 Seeding Database...');

    // --- 1. PLAYERS ---
    const createPlayer = (name: string, role: Player['role']): Player => ({
        id: `p-${Math.random().toString(36).substr(2, 9)}`,
        name,
        role,
        stats: {
            matches: 5,
            runs: Math.floor(Math.random() * 200),
            wickets: Math.floor(Math.random() * 10),
            catches: 2,
            stumpings: 0,
            runOuts: 0,
            ballsFaced: 100,
            ballsBowled: 50,
            runsConceded: 75,
            maidens: 1,
            highestScore: 85,
            bestBowling: '3/20',
            fours: 10,
            sixes: 5,
            hundreds: 0,
            fifties: 1,
            ducks: 0,
            threeWickets: 1,
            fiveWickets: 0
        }
    });

    const warriorsPlayers = [
        createPlayer("Liam Livingstone", "All-rounder"),
        createPlayer("Jos Buttler", "Wicket-keeper"),
        createPlayer("Jofra Archer", "Bowler"),
        createPlayer("Ben Stokes", "All-rounder"),
        createPlayer("Harry Brook", "Batsman"),
    ];

    const eaglesPlayers = [
        createPlayer("Pat Cummins", "Bowler"),
        createPlayer("Travis Head", "Batsman"),
        createPlayer("Steve Smith", "Batsman"),
        createPlayer("Mitchell Starc", "Bowler"),
        createPlayer("Glenn Maxwell", "All-rounder"),
    ];

    // --- 2. TEAMS ---
    const warriors: Team = {
        id: 'team-warriors',
        name: 'Western Warriors',
        players: warriorsPlayers
    };

    const eagles: Team = {
        id: 'team-eagles',
        name: 'Eastern Eagles',
        players: eaglesPlayers
    };

    // --- 3. TOURNAMENT ---
    const tournament: Tournament = {
        id: 'trn-summer-26',
        name: 'Summer Cup 2026',
        format: 'T20',
        groups: [],
        pointsConfig: { win: 2, loss: 0, tie: 1, noResult: 1 },
        overs: 20,
        status: 'Ongoing'
    };

    // --- 4. FIXTURES ---
    const pastMatch: MatchFixture = {
        id: 'match-001',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        teamAId: warriors.id,
        teamBId: eagles.id,
        teamAName: warriors.name,
        teamBName: eagles.name,
        venue: 'WACA Ground',
        format: 'T20',
        status: 'Completed',
        tournamentId: tournament.id,
        result: 'Eastern Eagles won by 15 runs',
        winnerId: eagles.id,
        teamAScore: "180/8 (20.0)",
        teamBScore: "195/4 (20.0)"
    };

    const pendingMatch: MatchFixture = {
        id: 'match-002',
        date: new Date(Date.now() - 86400000 * 1).toISOString(),
        teamAId: eagles.id,
        teamBId: warriors.id,
        teamAName: eagles.name,
        teamBName: warriors.name,
        venue: 'SCG',
        format: 'T20',
        status: 'Completed',
        tournamentId: tournament.id,
        result: 'Match Concluded - Pending Verification'
    };

    const futureMatch: MatchFixture = {
        id: 'match-003',
        date: new Date(Date.now() + 86400000 * 5).toISOString(),
        teamAId: warriors.id,
        teamBId: eagles.id,
        teamAName: warriors.name,
        teamBName: eagles.name,
        venue: 'Lord\'s',
        format: 'T20',
        status: 'Scheduled',
        tournamentId: tournament.id
    };

    // --- 5. ORGANIZATION (Central Zone) ---
    const centralZone: Organization = {
        id: 'org-central-zone',
        name: 'Central Zone',
        type: 'GOVERNING_BODY',
        country: 'Global',
        description: 'The primary governing body for the Cricket-Core League.',
        isPublic: true,
        allowUserContent: true,
        tournaments: [tournament],
        groups: [],
        memberTeams: [warriors, eagles],
        fixtures: [pastMatch, pendingMatch, futureMatch],
        members: [],
        applications: []
    };

    // --- 6. PUSH TO SUPABASE ---
    const payload = {
        orgs: [centralZone],
        standaloneMatches: [],
        mediaPosts: []
    };

    console.log('🚀 Pushing data to Supabase app_state...');
    const { error } = await supabase
        .from('app_state')
        .upsert({ id: 'global', payload: payload, updated_at: new Date() });

    if (error) {
        console.error('❌ Sync Failed:', error);
    } else {
        console.log('✅ Sync Successful! Data loaded.');
    }
}

seed();
