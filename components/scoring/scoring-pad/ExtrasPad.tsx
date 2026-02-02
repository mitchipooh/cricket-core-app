import React, { useState } from 'react';
import { ScoringPadProps } from './types';

interface ExtrasPadProps extends ScoringPadProps {
    // Extras specific props if any
}

export const ExtrasPad: React.FC<ExtrasPadProps> = ({
    readOnly,
    compact,
    onBack,
    onCommitExtra
}) => {
    const [extraType, setExtraType] = useState<'Wide' | 'NoBall' | 'Bye' | 'LegBye' | ''>('');
    const [nbSubType, setNbSubType] = useState<'Bat' | 'Bye' | 'LegBye'>('Bat');
    const [extraRuns, setExtraRuns] = useState(0);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customRunsVal, setCustomRunsVal] = useState('');

    const isByeOrLegBye = extraType === 'Bye' || extraType === 'LegBye';
    const isNoBall = extraType === 'NoBall';

    let runButtons = [0, 1, 2, 3, 4];
    if (isByeOrLegBye) {
        runButtons = [1, 2, 3, 4];
    } else if (isNoBall) {
        if (nbSubType === 'Bat') {
            runButtons = [0, 1, 2, 3, 4, 6];
        } else {
            runButtons = [1, 2, 3, 4];
        }
    }

    return (
        <div className="h-full flex flex-col animate-in zoom-in-95 p-1 gap-2">
            <h3 className="text-center font-black uppercase text-[9px] text-amber-500 tracking-widest shrink-0">Select Extra Type</h3>

            <div className={`grid gap-2 flex-1 min-h-0 ${isNoBall ? 'grid-rows-[2fr_1fr]' : 'grid-rows-1'}`}>
                <div className="grid grid-cols-2 gap-2 h-full">
                    {(['Wide', 'NoBall', 'Bye', 'LegBye'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => {
                                setExtraType(type);
                                setShowCustomInput(false);
                                if (type === 'NoBall') {
                                    setNbSubType('Bat');
                                    if (extraRuns === 0) setExtraRuns(0);
                                } else if (type === 'Bye' || type === 'LegBye') {
                                    if (extraRuns === 0) setExtraRuns(1);
                                }
                            }}
                            disabled={readOnly}
                            className={`rounded-xl border font-black transition-all relative overflow-hidden flex items-center justify-center text-sm uppercase tracking-wider ${extraType === type
                                    ? 'border-amber-500 bg-amber-500/20 text-amber-500 shadow-inner'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-amber-500/50 hover:text-amber-500'
                                } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {isNoBall && (
                    <div className="grid grid-cols-3 gap-2">
                        {(['Bat', 'LegBye', 'Bye'] as const).map(sub => (
                            <button
                                key={sub}
                                disabled={readOnly}
                                onClick={() => {
                                    setNbSubType(sub);
                                    if (sub !== 'Bat' && extraRuns === 0) setExtraRuns(1);
                                }}
                                className={`rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${nbSubType === sub
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {sub === 'Bat' ? 'Off Bat' : sub === 'LegBye' ? 'Leg Byes' : 'Byes'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showCustomInput ? (
                <div className="h-16 shrink-0 flex gap-2">
                    <input
                        type="number"
                        value={customRunsVal}
                        onChange={(e) => setCustomRunsVal(e.target.value)}
                        placeholder="Enter runs..."
                        autoFocus
                        disabled={readOnly}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 text-white font-black text-xl outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                    <button
                        disabled={readOnly}
                        onClick={() => {
                            const val = parseInt(customRunsVal);
                            if (!isNaN(val)) {
                                setExtraRuns(val);
                                setShowCustomInput(false);
                            }
                        }}
                        className="px-6 bg-amber-600 text-white rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-50"
                    >
                        Set
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 h-14 shrink-0 overflow-x-auto no-scrollbar">
                    {runButtons.map(r => (
                        <button
                            key={r}
                            disabled={readOnly}
                            onClick={() => setExtraRuns(r)}
                            className={`flex-1 min-w-[3rem] rounded-lg font-black transition-all border text-lg flex flex-col items-center justify-center ${extraRuns === r
                                    ? 'bg-white text-slate-900 border-white shadow-lg'
                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-white'
                                } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className="leading-none">+{r}</span>
                        </button>
                    ))}
                    <button
                        disabled={readOnly}
                        onClick={() => setShowCustomInput(true)}
                        className={`flex-1 min-w-[3rem] rounded-lg font-bold transition-all border text-xs bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-white uppercase tracking-widest ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        More
                    </button>
                </div>
            )}

            <div className="flex gap-2 h-12 mt-auto shrink-0">
                <button
                    onClick={onBack}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase text-[10px] rounded-xl border border-slate-700 transition-all"
                >
                    Cancel
                </button>
                <button
                    disabled={!extraType || readOnly}
                    onClick={() => {
                        const isOffBat = extraType === 'NoBall' ? nbSubType === 'Bat' : false;
                        onCommitExtra(extraType, extraRuns, isOffBat);
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-[10px] rounded-xl shadow-xl shadow-amber-900/20 transition-all disabled:opacity-50 disabled:shadow-none tracking-widest"
                >
                    Confirm Extra
                </button>
            </div>
        </div>
    );
};

