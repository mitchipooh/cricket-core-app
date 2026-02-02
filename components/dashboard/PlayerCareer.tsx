
import React from 'react';
import { UserProfile } from '../../types';

interface PlayerCareerProps {
    profile: UserProfile;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
    showCaptainHub?: boolean;
    onOpenCaptainHub?: () => void;
}

export const PlayerCareer: React.FC<PlayerCareerProps> = ({ profile, onUpdateProfile, showCaptainHub, onOpenCaptainHub }) => {
    const details = profile.playerDetails;

    if (!details) return null;

    return (
        <div className="animate-in slide-in-from-bottom-8 space-y-8">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 border border-slate-800 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-5xl font-black text-slate-900 shadow-2xl">
                        {profile.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-4xl font-black text-white">{profile.name}</h1>
                        <p className="text-indigo-300 font-bold uppercase text-sm tracking-widest mt-1">{details.primaryRole} • {details.battingStyle}</p>
                        <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                            <button
                                onClick={() => onUpdateProfile({ playerDetails: { ...details, lookingForClub: !details.lookingForClub } })}
                                className={`px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${details.lookingForClub ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                                {details.lookingForClub ? '✅ Looking for Club' : '❌ Not Looking'}
                            </button>
                            {showCaptainHub && onOpenCaptainHub && (
                                <button
                                    onClick={onOpenCaptainHub}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all flex items-center gap-2"
                                >
                                    <span>🎖️</span> Captain's Hub
                                </button>
                            )}
                            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all">
                                Edit Stats
                            </button>
                        </div>
                    </div>
                </div>
                {/* Decorative background */}
                <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl text-white font-black">CAREER</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black text-slate-900 mb-6">Playing Attributes</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">Batting Style</span>
                            <span className="font-black text-slate-900">{details.battingStyle}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">Bowling Style</span>
                            <span className="font-black text-slate-900">{details.bowlingStyle}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">Primary Role</span>
                            <span className="font-black text-slate-900">{details.primaryRole}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                    <h3 className="text-xl font-black mb-6">Career Statistics</h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-emerald-400">0</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matches</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-white">0</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Runs</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-white">0</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wickets</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-white">0</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Catches</div>
                        </div>
                    </div>
                    <div className="mt-6 text-center text-xs text-slate-500 italic">
                        Stats update automatically from official matches.
                    </div>
                </div>
            </div>
        </div>
    );
};

