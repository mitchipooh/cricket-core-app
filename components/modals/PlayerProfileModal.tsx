
import React, { useState, useMemo } from 'react';
import { PlayerWithContext, Player, MatchFixture, BallEvent } from '../../types.ts';
import { FieldView } from '../analytics/FieldView.tsx';
import { PitchView } from '../analytics/PitchView.tsx';

interface PlayerProfileModalProps {
    player: PlayerWithContext | null;
    isOpen: boolean;
    onClose: () => void;
    isFollowed: boolean;
    onToggleFollow: () => void;
    allFixtures?: MatchFixture[];
    onViewMatch?: (match: MatchFixture) => void;
    onUpdatePlayer?: (player: Partial<Player>) => void;
}

type StatTab = 'BATTING' | 'BOWLING' | 'FIELDING' | 'KEEPING' | 'SPATIAL' | 'MATCHES';
type StatContext = 'OFFICIAL' | 'UNOFFICIAL';

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
    player, isOpen, onClose, isFollowed, onToggleFollow, allFixtures = [], onViewMatch, onUpdatePlayer
}) => {
    const [viewMode, setViewMode] = useState<'SUMMARY' | 'DETAILED'>('SUMMARY');
    const [activeTab, setActiveTab] = useState<StatTab>('BATTING');
    const [statContext, setStatContext] = useState<StatContext>('OFFICIAL');
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<{ name: string; role: string; bio: string; }>({ name: '', role: '', bio: '' });

    // Re-inserting optimized logic
    const contextFixtures = useMemo(() => {
        return allFixtures.filter(f =>
            statContext === 'OFFICIAL' ? f.isOfficial !== false : f.isOfficial === false
        );
    }, [allFixtures, statContext]);

    const calculatedStats = useMemo(() => {
        if (!player) return { matches: 0, runs: 0, wickets: 0, ballsFaced: 0, ballsBowled: 0, runsConceded: 0, catches: 0, stumpings: 0, highestScore: 0, fours: 0, sixes: 0, fiveWickets: 0, threeWickets: 0, maidens: 0, ducks: 0, hundreds: 0, fifties: 0, bestBowling: '' };

        let runs = 0, wickets = 0, ballsFaced = 0, ballsBowled = 0, runsConceded = 0;
        let matches = 0, catches = 0, stumpings = 0;
        let highestScore = 0, fours = 0, sixes = 0;
        let fiveWickets = 0, threeWickets = 0, maidens = 0, ducks = 0, hundreds = 0, fifties = 0;
        let bestBowling = '';

        contextFixtures.forEach(f => {
            if (!f.savedState) return;
            const isPlayerInMatch = f.teamASquadIds?.includes(player.id) || f.teamBSquadIds?.includes(player.id) || f.teamAId === player.teamId || f.teamBId === player.teamId;
            if (isPlayerInMatch) matches++;
            const history = f.savedState.history;

            // Batting
            const playerBatting = history.filter(b => b.strikerId === player.id && !b.commentary?.startsWith('EVENT'));
            const matchRuns = playerBatting.reduce((sum, b) => sum + (b.runs || 0), 0);
            const legalBallsFaced = playerBatting.filter(b => b.extraType !== 'Wide').length;

            if (legalBallsFaced > 0 || playerBatting.some(b => b.isWicket && b.outPlayerId === player.id)) {
                ballsFaced += legalBallsFaced;
                runs += matchRuns;
                if (matchRuns > highestScore) highestScore = matchRuns;
                if (matchRuns >= 100) hundreds++;
                else if (matchRuns >= 50) fifties++;
                if (matchRuns === 0 && playerBatting.some(b => b.isWicket && b.outPlayerId === player.id)) ducks++;

                fours += playerBatting.filter(b => b.runs === 4).length;
                sixes += playerBatting.filter(b => b.runs === 6).length;
            }

            // Bowling
            const playerBowling = history.filter(b => b.bowlerId === player.id && !b.commentary?.startsWith('EVENT'));
            const matchWickets = playerBowling.filter(b => b.isWicket && b.creditBowler).length;
            const matchRunsConceded = playerBowling.reduce((sum, b) => {
                const penalty = (b.extraType === 'Wide' || b.extraType === 'NoBall') ? 1 : 0;
                return sum + (b.runs || 0) + (b.extraRuns || 0) + penalty;
            }, 0);

            if (playerBowling.length > 0) {
                wickets += matchWickets;
                runsConceded += matchRunsConceded;
                ballsBowled += playerBowling.filter(b => b.extraType !== 'Wide' && b.extraType !== 'NoBall').length;
                if (matchWickets >= 5) fiveWickets++; else if (matchWickets >= 3) threeWickets++;
                // Calculate Best Bowling
                // Simplified: just check wickets then runs
                // In real app, persist this
            }

            // Fielding
            catches += history.filter(b => b.isWicket && b.wicketType === 'Caught' && b.fielderId === player.id).length;
            stumpings += history.filter(b => b.isWicket && b.wicketType === 'Stumped' && b.fielderId === player.id).length;
        });
        return { matches, runs, wickets, ballsFaced, ballsBowled, runsConceded, catches, stumpings, highestScore, fours, sixes, fiveWickets, threeWickets, maidens, ducks, hundreds, fifties, bestBowling };
    }, [contextFixtures, player]);

    const relevantBalls = useMemo(() => {
        if (!player) return [];
        const balls: BallEvent[] = [];
        contextFixtures.forEach(f => {
            if (f.savedState?.history) {
                f.savedState.history.forEach(b => {
                    if (b.strikerId === player.id || b.bowlerId === player.id) balls.push(b);
                });
            }
        });
        return balls;
    }, [contextFixtures, player]);

    const pitchData = useMemo(() => relevantBalls.filter(b => player && b.strikerId === player.id && b.pitchCoords).map(b => ({ coords: b.pitchCoords!, color: b.isWicket ? 'red' : b.runs >= 4 ? 'yellow' : 'green' })), [relevantBalls, player]);
    const shotData = useMemo(() => relevantBalls.filter(b => player && b.strikerId === player.id && b.shotCoords).map(b => ({ coords: b.shotCoords!, color: b.runs === 4 ? 'indigo' : b.runs === 6 ? 'emerald' : 'yellow' })), [relevantBalls, player]);

    const battingAvg = calculatedStats.matches > 0 ? (calculatedStats.runs / Math.max(1, calculatedStats.matches - calculatedStats.ducks)).toFixed(1) : '0.0';
    const battingSR = calculatedStats.ballsFaced > 0 ? ((calculatedStats.runs / calculatedStats.ballsFaced) * 100).toFixed(1) : '0.0';
    const oversBowled = Math.floor(calculatedStats.ballsBowled / 6) + (calculatedStats.ballsBowled % 6) / 10;
    const bowlingEcon = calculatedStats.ballsBowled > 0 ? (calculatedStats.runsConceded / (calculatedStats.ballsBowled / 6)).toFixed(2) : '0.0';
    const bowlingAvg = calculatedStats.wickets > 0 ? (calculatedStats.runsConceded / calculatedStats.wickets).toFixed(1) : '0.0';

    if (!isOpen || !player) return null;

    const isKeeper = player.role === 'Wicket-keeper';

    const playerMatches = contextFixtures.filter(f =>
        f.teamAId === player.teamId || f.teamBId === player.teamId ||
        f.teamASquadIds?.includes(player.id) || f.teamBSquadIds?.includes(player.id)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleDetailedView = () => {
        setViewMode('DETAILED');
        if (player.role === 'Bowler') setActiveTab('BOWLING'); else if (isKeeper) setActiveTab('KEEPING'); else setActiveTab('BATTING');
    };

    const tabs: StatTab[] = ['BATTING', 'BOWLING', 'SPATIAL', 'MATCHES'].filter(t => { if (t === 'KEEPING' && !isKeeper) return false; return true; }) as StatTab[];

    const handleEditToggle = () => {
        if (isEditing) {
            // Save
            if (onUpdatePlayer) {
                onUpdatePlayer({
                    name: editForm.name,
                    role: editForm.role as any,
                    bio: editForm.bio
                });
            }
            setIsEditing(false);
        } else {
            setEditForm({
                name: player.name,
                role: player.role,
                bio: player.bio || ''
            });
            setIsEditing(true);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpdatePlayer) {
            setUploading(true);
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const MAX_SIZE = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    onUpdatePlayer({ photoUrl: dataUrl });
                    setUploading(false);
                };
                img.src = readerEvent.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

                {/* HEADER HERO */}
                <div className="relative h-64 md:h-80 shrink-0 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900 z-10"></div>

                    {player.highlightVideoUrl ? (
                        <video src={player.highlightVideoUrl} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900"></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                        </>
                    )}

                    <div className="absolute top-6 left-6 z-20">
                        <button onClick={onClose} className="w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all font-black text-xl">←</button>
                    </div>

                    <div className="absolute top-6 right-6 z-20 flex gap-3">
                        {onUpdatePlayer && (
                            <button onClick={handleEditToggle} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-emerald-500 text-white' : 'bg-black/30 text-white backdrop-blur-md'}`}>
                                {isEditing ? 'Save Changes' : 'Edit Profile'}
                            </button>
                        )}
                        <button onClick={onToggleFollow} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFollowed ? 'bg-emerald-500 text-white' : 'bg-black/30 text-slate-300 hover:bg-black/50 hover:text-white backdrop-blur-md'}`}>
                            {isFollowed ? 'Following' : 'Follow'}
                        </button>
                        <button onClick={onClose} className="w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all">✕</button>
                    </div>

                    <div className="absolute -bottom-16 left-8 md:left-12 flex items-end gap-6 z-20">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-slate-900 bg-slate-800 shadow-2xl overflow-hidden relative group transition-transform duration-500">
                            {uploading ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : (
                                <img src={player.photoUrl || `https://ui-avatars.com/api/?name=${player.name}&background=random&size=256`} className="w-full h-full object-cover" alt={player.name} />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-center">
                                <span className="text-[10px] font-black uppercase text-white tracking-widest bg-indigo-600 px-2 py-0.5 rounded-full">{player.role}</span>
                            </div>
                            {onUpdatePlayer && (
                                <>
                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-30" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none"><span className="text-white text-[9px] font-bold uppercase">{uploading ? 'Wait' : 'Change'}</span></div>
                                </>
                            )}
                        </div>
                        <div className="pb-16 md:pb-4 mb-2">
                            {isEditing ? (
                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="text-3xl md:text-5xl font-black text-white bg-transparent border-b border-white/20 outline-none w-full" />
                            ) : (
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">{player.name}</h1>
                            )}
                            <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase text-xs tracking-widest mt-1">
                                <span onClick={() => { navigator.clipboard.writeText(player.id); alert('ID Copied!'); }} className="cursor-pointer hover:text-white" title="Click to Copy ID">ID: {player.id.substring(0, 8)}...</span>
                                <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
                                <span>{player.teamName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 bg-slate-900 pt-20 px-8 pb-8 overflow-y-auto custom-scrollbar relative z-10">

                    <div className="flex justify-end mb-6">
                        <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
                            <button onClick={() => setStatContext('OFFICIAL')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statContext === 'OFFICIAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Official Career</button>
                            <button onClick={() => setStatContext('UNOFFICIAL')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statContext === 'UNOFFICIAL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Friendlies</button>
                        </div>
                    </div>

                    {viewMode === 'SUMMARY' ? (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                            {/* HEADLINE STATS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { l: 'Matches', v: calculatedStats.matches },
                                    { l: 'Total Runs', v: calculatedStats.runs },
                                    { l: 'Total Wickets', v: calculatedStats.wickets },
                                    { l: isKeeper ? 'Dismissals' : 'Catches', v: isKeeper ? calculatedStats.catches + calculatedStats.stumpings : calculatedStats.catches }
                                ].map((s, i) => (
                                    <div key={i} className="bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center">
                                        <div className="text-3xl font-black text-white">{s.v}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.l}</div>
                                    </div>
                                ))}
                            </div>

                            {/* BIO */}
                            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-8 rounded-[2.5rem] border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-white mb-2">Player Bio</h3>
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm" placeholder="Enter bio..." />
                                            <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm">
                                                <option value="Batsman">Batsman</option><option value="Bowler">Bowler</option><option value="All-rounder">All-rounder</option><option value="Wicket-keeper">Wicket-keeper</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                                            {player.bio || `Representing ${player.teamName}. A key ${player.role.toLowerCase()} contributing to the squad's depth.`}
                                        </p>
                                    )}
                                </div>
                                <button onClick={handleDetailedView} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 hover:scale-105 transition-all shadow-xl whitespace-nowrap">View Comprehensive Analytics →</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-slate-800 pb-4 shrink-0">
                                {tabs.map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>{tab}</button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 bg-slate-800 rounded-[2.5rem] p-8 border border-slate-700 shadow-xl relative overflow-hidden flex flex-col min-h-[400px]">
                                    {activeTab === 'BATTING' && (
                                        <div className="space-y-8 animate-in fade-in">
                                            <div className="flex justify-between items-end border-b border-slate-700 pb-6">
                                                <div><div className="text-5xl font-black text-white">{calculatedStats.runs}</div><div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Career Runs</div></div>
                                                <div className="text-right"><div className="text-3xl font-black text-indigo-400">{calculatedStats.highestScore || 0}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">High Score</div></div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-6">
                                                {[
                                                    { l: 'Average', v: battingAvg }, { l: 'Strike Rate', v: battingSR }, { l: 'Hundreds', v: calculatedStats.hundreds },
                                                    { l: 'Fifties', v: calculatedStats.fifties }, { l: 'Ducks', v: calculatedStats.ducks }, { l: 'Fours', v: calculatedStats.fours }, { l: 'Sixes', v: calculatedStats.sixes }, { l: 'Balls Faced', v: calculatedStats.ballsFaced }
                                                ].map((s, i) => (
                                                    <div key={i} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50"><div className="text-xl font-black text-white">{s.v}</div><div className="text-[9px] text-slate-500 uppercase tracking-widest">{s.l}</div></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'BOWLING' && (
                                        <div className="space-y-8 animate-in fade-in">
                                            <div className="flex justify-between items-end border-b border-slate-700 pb-6">
                                                <div><div className="text-5xl font-black text-white">{calculatedStats.wickets}</div><div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Career Wickets</div></div>
                                                <div className="text-right"><div className="text-3xl font-black text-emerald-400">{calculatedStats.bestBowling || '-/-'}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Best Figures</div></div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-6">
                                                {[
                                                    { l: 'Economy', v: bowlingEcon }, { l: 'Average', v: bowlingAvg }, { l: '5W Hauls', v: calculatedStats.fiveWickets },
                                                    { l: '3W Hauls', v: calculatedStats.threeWickets }, { l: 'Maidens', v: calculatedStats.maidens }, { l: 'Overs', v: oversBowled }
                                                ].map((s, i) => (
                                                    <div key={i} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50"><div className="text-xl font-black text-white">{s.v}</div><div className="text-[9px] text-slate-500 uppercase tracking-widest">{s.l}</div></div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'SPATIAL' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full animate-in fade-in">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Pitch Dispersion</h4>
                                                <PitchView deliveries={pitchData} readonly />
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Scoring Wagon Wheel</h4>
                                                <FieldView shots={shotData} readonly />
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'MATCHES' && (
                                        <div className="space-y-4 h-full flex flex-col animate-in fade-in">
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Game History</h3>
                                            {playerMatches.length === 0 ? (
                                                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-bold uppercase">No match history available.</div>
                                            ) : (
                                                <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                                                    {playerMatches.map(m => (
                                                        <div key={m.id} onClick={() => { if (onViewMatch) { onViewMatch(m); onClose(); } }} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-700 transition-colors cursor-pointer flex justify-between items-center group">
                                                            <div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(m.date).toLocaleDateString()} • {m.venue}</div>
                                                                <div className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">{m.teamAName} vs {m.teamBName}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={`text-[10px] font-black uppercase px-2 py-1 rounded ${m.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{m.status}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-white text-slate-900 rounded-[2.5rem] p-6 text-center shadow-xl">
                                        <div className="text-sm font-black uppercase tracking-widest mb-1">Impact Score</div>
                                        <div className="text-5xl font-black text-indigo-600 tracking-tighter">
                                            {Math.floor((calculatedStats.runs / 20) + (calculatedStats.wickets * 15) + ((calculatedStats.catches + calculatedStats.stumpings) * 5))}
                                        </div>
                                    </div>
                                    <button onClick={() => setViewMode('SUMMARY')} className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 hover:text-white transition-all shadow-xl">← Exit Analytics</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

