
import React from 'react';
import { Organization, UserProfile } from '../../types.ts';
import { Can } from '../common/Can.tsx';

interface OrgCardProps {
  org: Organization;
  userRole: UserProfile['role'];
  onOpen: (id: string) => void;
  onDeleteRequest: (org: Organization) => void;
}

export const OrgCard: React.FC<OrgCardProps> = ({ org, userRole, onOpen, onDeleteRequest }) => {
  const isClub = org.type === 'CLUB';

  return (
    <div
      onClick={() => onOpen(org.id)}
      className="group bg-white border border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-2 md:p-4 opacity-[0.03] text-4xl md:text-6xl font-black text-black group-hover:opacity-[0.06] transition-opacity select-none">
        {org.name.charAt(0)}
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2 md:mb-3">
          <div className={`w-8 h-8 md:w-10 md:h-10 border rounded-lg md:rounded-xl flex items-center justify-center text-lg md:text-xl shadow-sm group-hover:scale-110 transition-transform duration-300 ${isClub ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-purple-50 border-purple-100 text-purple-500'}`}>
            {isClub ? '🛡️' : '🏛️'}
          </div>
          <Can role={userRole} perform="org:delete">
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteRequest(org); }}
              className="text-slate-300 hover:text-red-500 p-1 transition-colors text-xs"
            >
              ✕
            </button>
          </Can>
        </div>

        <div className="mb-1">
          {isClub ? (
            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Club</span>
          ) : (
            <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Body</span>
          )}
        </div>

        <h3 className="text-sm md:text-base font-black text-slate-900 mb-0.5 tracking-tight line-clamp-1">{org.name}</h3>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 md:mb-4 line-clamp-1">
          {org.groundLocation ? `${org.groundLocation} • ` : ''}{org.country || 'Global'}
        </p>

        <div className="flex gap-3 md:gap-4 border-t border-slate-100 pt-2 md:pt-3">
          <div>
            <div className="text-base md:text-lg font-black text-slate-900">{org.memberTeams.length + (org.childOrgIds?.length || 0)}</div>
            <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Squads</div>
          </div>
          {(!isClub || org.tournaments.length > 0) && (
            <div>
              <div className="text-base md:text-lg font-black text-slate-900">{org.tournaments.length}</div>
              <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider">{isClub ? 'Leagues' : 'Seasons'}</div>
            </div>
          )}
          {org.establishedYear && (
            <div>
              <div className="text-base md:text-lg font-black text-slate-900">{org.establishedYear}</div>
              <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Est.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

