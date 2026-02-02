
import React, { useState } from 'react';
import { Coordinates } from '../../types.ts';
import { FieldView } from './FieldView.tsx';
import { PitchView } from './PitchView.tsx';

interface ShotEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pitch: Coordinates | undefined, shot: Coordinates | undefined) => void;
  existingPitch?: Coordinates;
  existingShot?: Coordinates;
}

export const ShotEntryModal: React.FC<ShotEntryModalProps> = ({ 
  isOpen, onClose, onSave, existingPitch, existingShot 
}) => {
  const [pitch, setPitch] = useState<Coordinates | undefined>(existingPitch);
  const [shot, setShot] = useState<Coordinates | undefined>(existingShot);
  const [tab, setTab] = useState<'PITCH' | 'SHOT'>('PITCH');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[85vh]">
         <div className="p-6 bg-slate-950 border-b border-slate-800">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Shot Analytics</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Moneyball Data Entry</p>
               </div>
               <div className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg animate-pulse uppercase tracking-widest">New Event</div>
            </div>
            
            <div className="flex bg-slate-800 rounded-xl p-1">
               <button 
                onClick={() => setTab('PITCH')} 
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${tab === 'PITCH' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}
               >
                 <span>📍</span> Pitch Location
               </button>
               <button 
                onClick={() => setTab('SHOT')} 
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${tab === 'SHOT' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}
               >
                 <span>🏏</span> Hit Direction
               </button>
            </div>
         </div>

         <div className="flex-1 p-6 bg-slate-900 flex items-center justify-center relative">
            {tab === 'PITCH' ? (
                <div className="w-full animate-in slide-in-from-left-4">
                    <p className="text-center text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-widest bg-slate-800 py-2 rounded-full border border-white/5 px-4 mx-4">
                        Tap where the ball pitched
                    </p>
                    <PitchView 
                        onRecord={(c) => { setPitch(c); setTimeout(() => setTab('SHOT'), 300); }} 
                        deliveries={pitch ? [{ coords: pitch, color: 'red' }] : []} 
                    />
                </div>
            ) : (
                <div className="w-full animate-in slide-in-from-right-4">
                    <p className="text-center text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-widest bg-slate-800 py-2 rounded-full border border-white/5 px-4 mx-4">
                        Tap where the ball traveled
                    </p>
                    <FieldView 
                        onRecord={setShot} 
                        shots={shot ? [{ coords: shot, color: 'yellow' }] : []} 
                    />
                </div>
            )}
         </div>

         <div className="p-6 border-t border-slate-800 bg-slate-950 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs hover:text-white transition-all">Skip Ball</button>
            <button 
                onClick={() => { onSave(pitch, shot); onClose(); }} 
                disabled={!pitch && !shot}
                className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
                Log Analytics
            </button>
         </div>
      </div>
    </div>
  );
};

