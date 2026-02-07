import React from 'react';
import { ScoringPadProps } from './types';

export const MainPad: React.FC<ScoringPadProps> = ({
    readOnly,
    compact,
    onRun,
    striker,
    onStartWicket,
    onAnalyticsClick,
    onNav,
    onUndo,
    onCommitExtra
}) => {
    const btnClass = (base: string) =>
        `${base} ${readOnly ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''} ${compact ? 'text-xs' : ''}`;

    return (
        <div className="h-full w-full flex flex-col relative p-1">
            {readOnly && (
                <div className="absolute -top-1 right-2 z-20 pointer-events-none">
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest animate-pulse shadow-md">
                        Live View
                    </span>
                </div>
            )}

            <div className="grid grid-cols-4 gap-1.5 h-full w-full grid-rows-3">
                {/* Row 1: Singles/Dots */}
                <button onClick={() => onRun(0)} disabled={readOnly} className={btnClass("bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-400 rounded-xl text-xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>0</button>
                <button onClick={() => onRun(1)} disabled={readOnly} className={btnClass("bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>1</button>
                <button onClick={() => onRun(2)} disabled={readOnly} className={btnClass("bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>2</button>
                <button onClick={() => onRun(3)} disabled={readOnly} className={btnClass("bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>3</button>

                {/* Row 2: Boundaries and Quick Extras */}
                <button onClick={() => onRun(4)} disabled={readOnly} className={btnClass("bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-2xl font-black transition-all active:scale-95 shadow-md border border-indigo-400 flex items-center justify-center sticky-btn")}>4</button>
                <button onClick={() => onRun(6)} disabled={readOnly} className={btnClass("bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-2xl font-black transition-all active:scale-95 shadow-md border border-emerald-400 flex items-center justify-center sticky-btn")}>6</button>
                <button onClick={() => onCommitExtra('Wide', 1)} disabled={readOnly} className={btnClass("bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md border border-amber-500/30 flex flex-col items-center justify-center")}>
                    WD
                </button>
                <button onClick={() => onCommitExtra('NoBall', 1)} disabled={readOnly} className={btnClass("bg-amber-700/90 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md border border-amber-500/30 flex flex-col items-center justify-center")}>
                    NB
                </button>

                {/* Row 3: Management */}
                <button
                    onClick={() => onUndo?.()}
                    disabled={readOnly}
                    className={btnClass("bg-orange-600/90 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-md border border-orange-500/30 flex items-center justify-center")}
                >
                    UNDO
                </button>
                <button
                    onClick={() => onStartWicket(striker?.id)}
                    disabled={readOnly}
                    className={btnClass("bg-red-700 hover:bg-red-600 text-white rounded-xl text-base font-black transition-all active:scale-95 shadow-md border border-red-500/30 flex items-center justify-center")}
                >
                    OUT
                </button>
                <button onClick={() => onNav('extras')} disabled={readOnly} className={btnClass("bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-sm border border-slate-600 flex items-center justify-center")}>
                    EXTRAS
                </button>
                <button
                    onClick={() => onNav('events')}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xl font-black transition-all active:scale-95 border border-slate-600 flex items-center justify-center"
                >
                    •••
                </button>
            </div>
        </div>
    );
};

