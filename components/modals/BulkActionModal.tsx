
import React, { useState } from 'react';

interface BulkActionModalProps {
  isOpen: boolean;
  mode: 'TEAMS' | 'PLAYERS';
  onClose: () => void;
  onConfirm: (data: string[]) => void;
  currentUserPassword?: string;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({ isOpen, mode, onClose, onConfirm, currentUserPassword }) => {
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleVerify = () => {
      if (password === currentUserPassword) {
          const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          onConfirm(lines);
      } else {
          setError('Incorrect Admin Password');
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 p-8 text-white">
            <h3 className="text-xl font-black mb-1">Bulk Import {mode === 'TEAMS' ? 'Teams' : 'Players'}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Administrative Action</p>
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
            {step === 'INPUT' ? (
                <>
                    <p className="text-sm text-slate-600 mb-4 font-medium">
                        {mode === 'TEAMS' 
                            ? "Paste team names below (one per line). Duplicates will be handled automatically." 
                            : "Paste players below (one per line). Format: Name - Role (Optional). e.g., 'John Smith - Bowler'"}
                    </p>
                    <textarea 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder={mode === 'TEAMS' ? "Team A\nTeam B\nTeam C..." : "John Doe - Batsman\nJane Smith\n..."}
                        className="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm outline-none focus:border-indigo-500 resize-none"
                    />
                </>
            ) : (
                <div className="py-10 text-center">
                    <div className="text-4xl mb-4">🔒</div>
                    <h4 className="text-lg font-black text-slate-900 mb-2">Security Check</h4>
                    <p className="text-xs text-slate-500 mb-6">Please enter your admin password to authorize this bulk update.</p>
                    <input 
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold text-center outline-none focus:border-indigo-500"
                        placeholder="Admin Password"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-xs font-bold mt-4 uppercase tracking-widest animate-pulse">{error}</p>}
                </div>
            )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:text-slate-600 transition-all">Cancel</button>
            {step === 'INPUT' ? (
                <button 
                    onClick={() => setStep('VERIFY')} 
                    disabled={!inputText.trim()}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 shadow-lg disabled:opacity-50"
                >
                    Proceed to Verify
                </button>
            ) : (
                <button 
                    onClick={handleVerify}
                    className="flex-1 py-4 bg-emerald-500 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 shadow-lg"
                >
                    Confirm Import
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

