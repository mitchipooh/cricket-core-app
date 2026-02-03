
/**
 * Cricket-Core 2026 Management System
 * Created by mitchipoohdevs
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { NetworkStatus } from './NetworkStatus.tsx';
import { DevTools } from '../dev/DevTools.tsx';
import { DevDatabaseConsole } from '../dev/DevDatabaseConsole.tsx';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'setup' | 'scorer' | 'stats' | 'media' | 'career' | 'my_club' | 'captain_hub' | 'registry' | 'tournament_details';
  onTabChange: (tab: any) => void;
  profile: UserProfile;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  settings: { notifications: boolean; sound: boolean; devMode?: boolean; fullScreen?: boolean };
  onToggleSetting: (key: 'notifications' | 'sound' | 'devMode' | 'fullScreen') => void;
  onEditProfile?: () => void;
  onApplyForAccreditation?: () => void;
  onSignOut: () => void;
  onSignIn?: () => void;
  onSwitchProfile: (type: 'ADMIN' | 'SCORER' | 'FAN' | 'COACH' | 'UMPIRE' | 'PLAYER' | 'GUEST' | 'CAPTAIN') => void;
  showCaptainHub?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children, activeTab, onTabChange, profile, theme, onThemeToggle,
  settings, onToggleSetting, onEditProfile, onApplyForAccreditation,
  onSignOut, onSignIn, onSwitchProfile, showCaptainHub
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDbConsole, setShowDbConsole] = useState(false);

  // Determine Logo Path based on environment
  const logoSrc = window.wpApiSettings?.plugin_url
    ? `${window.wpApiSettings.plugin_url}logo.jpg`
    : '/logo.jpg';

  const isDeveloper = settings.devMode || profile.handle === 'Trinity' || profile.handle === '@Trinity';
  const unreadCount = profile.notifications?.filter(n => !n.read).length || 0;

  // Conditional Fullscreen on first interaction
  useEffect(() => {
    if (!settings.fullScreen) return; // Only enable if user has turned it on

    const handleInteraction = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [settings.fullScreen]);

  const handleNavClick = (tab: any) => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  const navItems = [];
  if (profile.role === 'Guest') {
    navItems.push({ id: 'media', label: 'Media & Fan Zone', icon: '📺' });
    navItems.push({ id: 'scorer', label: 'Score Match', icon: '🏏' });
  } else if (profile.role === 'Fan') {
    navItems.push({ id: 'home', label: 'Media & Live', icon: '📺' });
  } else if (profile.role === 'Player') {
    if (profile.joinedClubIds && profile.joinedClubIds.length > 0) {
      navItems.push({ id: 'my_club', label: 'My Club', icon: '🛡️' });
    }
    if (showCaptainHub) {
      navItems.push({ id: 'captain_hub', label: "Captain's Hub", icon: '🎖️' });
    }
    navItems.push({ id: 'career', label: 'My Career', icon: '👤' });
    navItems.push({ id: 'home', label: 'Club Finder', icon: '🏟️' });
    navItems.push({ id: 'media', label: 'Media', icon: '📺' });
  } else {
    navItems.push({ id: 'home', label: 'Dashboard', icon: '🏠' });
    if (showCaptainHub) navItems.push({ id: 'captain_hub', label: "Captain's Hub", icon: '🎖️' });
    navItems.push({ id: 'scorer', label: 'Scoring', icon: '🏏' });
    if (profile.role === 'Administrator') navItems.push({ id: 'stats', label: 'Analytics', icon: '📊' });
    navItems.push({ id: 'media', label: 'Media', icon: '📺' });
  }

  // APP MODE
  const isAppMode = ['scorer', 'setup', 'media'].includes(activeTab);
  const mainClasses = isAppMode
    ? "h-[100dvh] w-full pt-16 lg:pt-20 overflow-x-hidden overflow-y-hidden flex flex-col relative"
    : "h-[100dvh] w-full pt-20 lg:pt-24 pb-12 px-4 md:px-8 lg:px-12 overflow-x-hidden overflow-y-auto scroll-container custom-scrollbar relative flex flex-col";

  return (
    <div className={`h-[100dvh] w-full ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} relative transition-colors duration-300 flex flex-col overflow-hidden`}>
      <div className="fixed top-4 left-4 lg:top-6 lg:left-6 z-50 flex items-center gap-4">
        <button
          onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSettingsOpen(false); }}
          className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 shadow-2xl z-50 ${isMenuOpen
            ? 'bg-slate-800 text-white rotate-90 ring-2 ring-indigo-500'
            : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-indigo-600/40'
            }`}
          aria-label="Menu"
        >
          <span className={`w-6 h-1 bg-current rounded-full transition-all ${isMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`}></span>
          <span className={`w-6 h-1 bg-current rounded-full transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`w-6 h-1 bg-current rounded-full transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
        </button>

        {!isMenuOpen && (
          <div className="hidden md:flex items-center gap-3 bg-slate-900/10 backdrop-blur-md p-1 pr-4 rounded-2xl border border-white/10 shadow-sm animate-in fade-in slide-in-from-left-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow-inner">
              {profile.name.charAt(0)}
            </div>
            <div className="flex flex-col px-1 py-1">
              <h1 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                {(new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening')}, {profile.role} {profile.name.split(' ')[0]}
              </h1>
              <span className="text-xs text-indigo-600 font-black uppercase tracking-widest leading-none">
                {activeTab === 'home' ? (profile.role === 'Fan' ? 'Media Center' : 'Dashboard') : activeTab.replace('_', ' ')}
              </span>
            </div>
            {activeTab === 'scorer' && (
              <button
                onClick={() => onTabChange('setup')}
                className="h-8 px-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ml-2"
                title="Start New Match"
              >
                <span className="font-black text-sm">+</span>
                <span className="text-[10px] font-black uppercase tracking-widest">New</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="fixed top-4 right-4 lg:top-6 lg:right-6 z-50 flex items-center gap-4">
        <div className="hidden md:block">
          <NetworkStatus />
        </div>

        {/* Player Registry Link - PUBLIC */}
        <button
          onClick={() => { onTabChange('registry'); if (window.innerWidth < 1024) setIsMenuOpen(false); }}
          className={`w-full text-left px-6 py-4 rounded-2xl flex items-center gap-4 transition-all group ${activeTab === 'registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${activeTab === 'registry' ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
            👥
          </div>
          <div>
            <span className="block font-black uppercase text-[10px] tracking-[0.2em] mb-0.5">Database</span>
            <span className="block font-bold text-sm tracking-tight">Player Registry</span>
          </div>
        </button>

        {/* Notification Bell */}
        {profile.role !== 'Guest' && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transition-all bg-white/10 backdrop-blur-md text-slate-400 border border-white/5 hover:bg-white/20 shadow-xl"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-16 right-0 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 z-[60]">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                  {profile.notifications && profile.notifications.length > 0 ? (
                    profile.notifications.slice().reverse().map(n => (
                      <div key={n.id} className={`p-3 mb-2 rounded-xl border transition-all ${n.read ? 'bg-slate-900/50 border-transparent opacity-60' : 'bg-slate-800 border-indigo-500/30'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${n.type === 'ALERT' ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>{n.type}</span>
                          <span className="text-[9px] text-slate-500">{new Date(n.timestamp).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">{n.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase">No updates</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsMenuOpen(false); setShowNotifications(false); }}
          className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xl z-50 ${isSettingsOpen ? 'bg-slate-800 text-white rotate-180 ring-2 ring-slate-600' : 'bg-white/10 backdrop-blur-md text-slate-400 border border-white/5 hover:bg-white/20'
            }`}
          aria-label="Settings"
        >
          <span className="text-xl">⚙️</span>
        </button>
      </div>

      <div className={`fixed inset-0 bg-slate-950/90 backdrop-blur-md z-40 transition-opacity duration-300 ${isMenuOpen || isSettingsOpen || showNotifications ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => { setIsMenuOpen(false); setIsSettingsOpen(false); setShowNotifications(false); }} />

      {/* Navigation Drawer */}
      <nav className={`fixed top-0 left-0 h-full w-full sm:w-80 bg-slate-900 p-8 pt-24 sm:pt-8 flex flex-col gap-6 shadow-2xl z-40 transition-transform duration-500 ease-out border-r border-slate-800 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col items-start gap-4 mb-4">
          <img src={logoSrc} alt="Cricket Core" className="w-24 h-24 object-contain drop-shadow-lg" />
          <div>
            <h1 className="text-xl font-black text-white leading-none">CRICKET<br />CORE</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">v3.0.0 PRO</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2 scroll-container">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-black uppercase text-xs tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
          {profile.role === 'Guest' ? (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">You are browsing as a Guest.</p>
              <button onClick={() => { if (onEditProfile) onEditProfile(); setIsMenuOpen(false); }} className="w-full py-3 bg-emerald-500 text-white hover:bg-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">Create Profile</button>
              {onSignIn && (
                <button
                  onClick={() => { onSignIn(); setIsMenuOpen(false); }}
                  className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                >
                  Sign In
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-black text-white">{profile.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{profile.name}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ID: {profile.id.substring(0, 8)}</p>
                </div>
              </div>
              <button onClick={onSignOut} className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">Sign Out</button>
            </>
          )}
          <div className="pt-4 border-t border-white/5 text-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Powered by mitchipoohdevs</p>
          </div>
        </div>
      </nav>

      {/* Settings Drawer */}
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-slate-900 p-8 pt-24 sm:pt-8 flex flex-col gap-6 shadow-2xl z-40 transition-transform duration-500 ease-out border-l border-slate-800 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-4">
          <h2 className="text-xl font-black text-white">Application Settings</h2>
          <p className="text-slate-500 text-xs mt-1">Configure your experience</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-container space-y-4 pr-1">
          {(profile.role === 'Fan' || profile.role === 'Player') && (
            <div className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-700/50">
              <div>
                <div className="text-xs font-bold text-white">Official Accreditation</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Join Organizations</div>
              </div>
              <button onClick={() => { if (onApplyForAccreditation) { onApplyForAccreditation(); setIsSettingsOpen(false); } }} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">Apply</button>
            </div>
          )}
          <div className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Dark Mode</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Visual Theme</div>
            </div>
            <button onClick={onThemeToggle} className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`} /></button>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Developer Mode</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Restricted Access</div>
            </div>
            <button onClick={() => {
              if (!settings.devMode) {
                const password = prompt('Enter developer password:');
                if (password === 'mitchipooh22') {
                  onToggleSetting('devMode');
                } else if (password !== null) {
                  alert('Incorrect password');
                }
              } else {
                onToggleSetting('devMode');
              }
            }} className={`w-12 h-6 rounded-full transition-colors relative ${settings.devMode ? 'bg-indigo-600' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.devMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Full-Screen Mode</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Auto-enter fullscreen</div>
            </div>
            <button onClick={() => onToggleSetting('fullScreen')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.fullScreen ? 'bg-indigo-600' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.fullScreen ? 'left-7' : 'left-1'}`} />
            </button>
          </div>


          {isDeveloper && (
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-indigo-500/30 space-y-4">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Dev: Switch Persona</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { onSwitchProfile('ADMIN'); setIsSettingsOpen(false); }} className="p-2 bg-purple-900/30 text-purple-400 border border-purple-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-purple-900/50">Admin</button>
                <button onClick={() => { onSwitchProfile('SCORER'); setIsSettingsOpen(false); }} className="p-2 bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-900/50">Scorer</button>
                <button onClick={() => { onSwitchProfile('UMPIRE'); setIsSettingsOpen(false); }} className="p-2 bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-yellow-900/50">Umpire</button>
                <button onClick={() => { onSwitchProfile('PLAYER'); setIsSettingsOpen(false); }} className="p-2 bg-pink-900/30 text-pink-400 border border-pink-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-pink-900/50">Player</button>
                <button onClick={() => { onSwitchProfile('FAN'); setIsSettingsOpen(false); }} className="p-2 bg-slate-700/30 text-slate-400 border border-slate-600/30 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-700/50">Fan</button>
                <button onClick={() => { onSwitchProfile('GUEST'); setIsSettingsOpen(false); }} className="p-2 bg-slate-500/30 text-slate-300 border border-slate-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-500/50">Guest</button>
                <button onClick={() => { onSwitchProfile('CAPTAIN'); setIsSettingsOpen(false); }} className="p-2 col-span-2 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-[9px] font-bold uppercase hover:bg-indigo-900/50">Captain (Mock)</button>
              </div>

              <div className="h-px bg-indigo-500/20 my-4" />
              <button
                onClick={() => { setShowDbConsole(true); setIsSettingsOpen(false); }}
                className="w-full py-4 bg-slate-900 border border-slate-700 hover:border-pink-500 text-slate-300 hover:text-pink-400 rounded-xl transition-all font-black uppercase text-[10px] tracking-[0.2em] shadow-lg group"
              >
                <span className="mr-2 text-lg group-hover:animate-pulse">🗄️</span> Open Database Console
              </button>
              <div className="h-px bg-indigo-500/20 my-4" />
              <DevTools />
            </div>
          )}
        </div>
        <div className="mt-auto bg-slate-800/50 p-6 rounded-3xl text-center shrink-0">
          <div className="text-4xl mb-3">📱</div>
          <h3 className="font-bold text-white mb-2">Get Mobile App</h3>
          <p className="text-xs text-slate-400 mb-4">Install Cricket-Core on your device for best performance.</p>
          <button className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest">Install Now</button>
          <div className="pt-4 mt-4 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
            Created by mitchipoohdevs
          </div>
        </div>
      </aside>

      <main className={mainClasses}>
        <div className="max-w-[1920px] mx-auto h-full flex flex-col min-h-0 w-full">
          {children}
        </div>
      </main>

      {/* Developer Console Overlay */}
      {showDbConsole && (
        <React.Suspense fallback={null}>
          <DevDatabaseConsole onClose={() => setShowDbConsole(false)} />
        </React.Suspense>
      )}
    </div>
  );
};

