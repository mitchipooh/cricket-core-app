
import React, { useState, useEffect } from 'react';
import { Player } from '../../types.ts';

interface MatchStartModalProps {
  isOpen: boolean;
  battingPlayers: Player[];
  bowlingPlayers: Player[];
  onConfirm: (strikerId: string, nonStrikerId: string, bowlerId: string) => void;
}

export const MatchStartModal: React.FC<MatchStartModalProps> = ({
  isOpen,
  battingPlayers,
  bowlingPlayers,
  onConfirm
}) => {
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStrikerId('');
      setNonStrikerId('');
      setBowlerId('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('All fields are required to start the match.');
      return;
    }
    if (strikerId === nonStrikerId) {
      setError('Striker and Non-Striker must be different players.');
      return;
    }
    onConfirm(strikerId.trim(), nonStrikerId.trim(), bowlerId.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-slate-950 p-8 border-b border-slate-800 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-indigo-600/20 mb-4">🚀</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ready to Play?</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Select opening players to start innings</p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Striker</label>
              <select
                value={strikerId}
                onChange={e => setStrikerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="">Select Batter...</option>
                {battingPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Non-Striker</label>
              <select
                value={nonStrikerId}
                onChange={e => setNonStrikerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="">Select Batter...</option>
                {battingPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1">Opening Bowler</label>
            <select
              value={bowlerId}
              onChange={e => setBowlerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="">Select Bowler...</option>
              {bowlingPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-[10px] font-bold uppercase text-center animate-in shake">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 mt-4"
          >
            Start Play
          </button>
        </div>
      </div>
    </div>
  );
};

