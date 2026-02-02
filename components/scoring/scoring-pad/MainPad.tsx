import React from 'react';
import { ScoringPadProps } from './types';

export const MainPad: React.FC<ScoringPadProps> = ({
    readOnly,
    compact,
    onRun,
    striker,
    onStartWicket,
    onAnalyticsClick,
    onNav
}) => {
    const btnClass = (base: string) =>
        `${base} ${readOnly ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''} ${compact ? 'text-xs py-1' : ''}`;

    return (
        <div className="h-full w-full flex flex-col relative">
            {readOnly && (
                <div className="absolute top-2 right-2 z-20 pointer-events-none">
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest animate-pulse shadow-md">
                        Live View Only
                    </span>
                </div>
            )}

            <div className={`grid grid-cols-4 gap-2 h-full w-full ${compact ? 'grid-rows-[1fr_1fr_1fr_1fr]' : 'grid-rows-[1fr_1.25fr_1fr]'}`}>
                {/* Row 1: Singles/Dots */}
                <button onClick={() => onRun(0)} disabled={readOnly} className={btnClass("col-span-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-400 rounded-xl text-2xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>0</button>
                <button onClick={() => onRun(1)} disabled={readOnly} className={btnClass("col-span-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-2xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>1</button>
                <button onClick={() => onRun(2)} disabled={readOnly} className={btnClass("col-span-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-2xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>2</button>
                <button onClick={() => onRun(3)} disabled={readOnly} className={btnClass("col-span-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-2xl font-black transition-all active:scale-95 shadow-sm border border-slate-700 flex items-center justify-center")}>3</button>

                {/* Row 2: Boundaries */}
                <button onClick={() => onRun(4)} disabled={readOnly} className={btnClass("col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 hover:to-indigo-700 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-900/40 border border-indigo-500/30 flex flex-col items-center justify-center group relative overflow-hidden")}>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className={`${compact ? 'text-3xl' : 'text-5xl'} font-black relative z-10`}>4</span>
                    {!compact && <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 relative z-10">Boundary</span>}
                </button>
                <button onClick={() => onRun(6)} disabled={readOnly} className={btnClass("col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-800 hover:to-emerald-700 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/40 border border-emerald-500/30 flex flex-col items-center justify-center group relative overflow-hidden")}>
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className={`${compact ? 'text-3xl' : 'text-5xl'} font-black relative z-10`}>6</span>
                    {!compact && <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 relative z-10">Maximum</span>}
                </button>

                {/* Row 3: Extras */}
                <button onClick={() => onNav('extras')} disabled={readOnly} className={btnClass("col-span-2 bg-amber-700/80 hover:bg-amber-600 text-white rounded-xl text-lg font-black transition-all active:scale-95 shadow-md shadow-amber-900/30 border border-amber-500/30 flex flex-col items-center justify-center")}>
                    {compact ? 'Extras' : 'WD / NB / B / LB'}
                    {!compact && <span className="text-[8px] font-bold opacity-70 uppercase tracking-widest mt-0.5">Extras Menu</span>}
                </button>

                {/* Wicket/Events */}
                <div className="col-span-2 grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onStartWicket(striker?.id)}
                        disabled={readOnly}
                        className={btnClass("col-span-1 bg-red-700 hover:bg-red-600 text-white rounded-xl text-lg font-black transition-all active:scale-95 shadow-md shadow-red-900/30 border border-red-500/30 flex flex-col items-center justify-center")}
                    >
                        OUT
                    </button>
                    <div className="col-span-1 grid grid-rows-2 gap-2">
                        <button
                            onClick={() => { if (onAnalyticsClick) onAnalyticsClick(); }}
                            className={btnClass("bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-black transition-all active:scale-95 border border-slate-600 flex items-center justify-center")}
                            title="Shot Map"
                        >
                            📍 {compact ? '' : 'Map'}
                        </button>
                        <button
                            onClick={() => onNav('events')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-lg font-black transition-all active:scale-95 border border-slate-700 flex items-center justify-center"
                        >
                            •••
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

