import React from 'react';
import { Home, Settings, Plus, GraduationCap, ShoppingBag, LogOut, PiggyBank, PieChart, Briefcase, Snowflake, Flame } from 'lucide-react';
import { ThemeColor, THEME_COLORS, ViewState, User, AVATARS, CUSTOM_LOGO_URL, AppMode, SPECIALS_DATABASE } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  accentColor: ThemeColor;
  user: User;
  onLogout: () => void;
  appMode?: AppMode;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, accentColor, user, onLogout, appMode = 'kids' }) => {
  const activeFrame = user.activeSpecials.find(id => id.startsWith('frame_'));
  const activeTagId = user.activeSpecials.find(id => id.startsWith('tag_'));
  const activeTag = activeTagId ? SPECIALS_DATABASE.find(item => item.id === activeTagId) : null;
  const isStreakFrozen = user.streakFreezeUntil ? new Date(user.streakFreezeUntil) > new Date() : false;

  const getFrameStyles = (frameId: string | undefined) => {
    switch (frameId) {
        case 'frame_wood': return 'ring-2 ring-amber-800 ring-offset-1';
        case 'frame_silver': return 'ring-2 ring-slate-300 ring-offset-1';
        case 'frame_gold': return 'ring-2 ring-yellow-400 ring-offset-1';
        default: return '';
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center gap-4 px-4 py-3 transition-all duration-200 group ${
        appMode === 'adult' ? 'rounded-lg' : 'rounded-2xl' 
      } ${
        currentView === view 
          ? appMode === 'adult' 
             ? 'bg-slate-100 text-slate-900 border border-slate-200'
             : 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={appMode === 'adult' ? 20 : 24} strokeWidth={currentView === view ? (appMode === 'adult' ? 2.5 : 3) : 2.5} className="transition-transform group-hover:scale-105" />
      <span className={`${appMode === 'adult' ? 'font-semibold text-sm' : 'font-bold text-lg'}`}>{label}</span>
    </button>
  );

  return (
    <div className={`hidden md:flex flex-col w-80 h-screen bg-white border-r border-slate-100 p-6 fixed left-0 top-0 z-50 ${appMode === 'adult' ? 'w-64' : ''}`}>
      
      <div className="flex items-center gap-3 mb-10 px-2">
         {CUSTOM_LOGO_URL ? (
            <div className={`
                flex items-center justify-center p-2 shadow-lg transition-all rounded-xl
                ${appMode === 'adult' ? 'w-8 h-8' : 'w-12 h-12'} ${THEME_COLORS[accentColor]}
            `}>
                <img 
                    src={CUSTOM_LOGO_URL}
                    className="w-full h-full object-contain"
                    alt="Logo"
                />
            </div>
         ) : (
             <div className={`
                 flex items-center justify-center shadow-lg text-white transition-all
                 ${appMode === 'adult' ? 'w-8 h-8 rounded-lg bg-slate-900 shadow-none' : `w-12 h-12 rounded-2xl ${THEME_COLORS[accentColor]}`}
             `}>
                <PiggyBank size={appMode === 'adult' ? 18 : 28} />
             </div>
         )}
         <div>
             <h1 className={`${appMode === 'adult' ? 'font-bold text-lg' : 'font-black text-2xl'} text-slate-900 tracking-tight`}>Sparify</h1>
             {appMode === 'adult' && <span className="text-xs text-slate-400 font-medium">Adult Finance</span>}
         </div>
      </div>

      <div className="flex-1 space-y-2">
        <NavItem view="DASHBOARD" icon={appMode === 'adult' ? PieChart : Home} label={appMode === 'adult' ? "Dashboard" : "Übersicht"} />
        <NavItem view="LEARN" icon={appMode === 'adult' ? Briefcase : GraduationCap} label={appMode === 'adult' ? "Finanzwissen" : "Lernen & Spielen"} />
        <NavItem view="SHOP" icon={ShoppingBag} label="Shop" />
        <NavItem view="SETTINGS" icon={Settings} label="Einstellungen" />
        
        <button
            onClick={() => onChangeView('SCANNER')}
            className={`w-full flex items-center gap-4 px-4 py-3 transition-all mt-6 ${
                appMode === 'adult' 
                ? 'rounded-lg bg-slate-900 text-white hover:bg-slate-800' 
                : `${THEME_COLORS[accentColor]} text-white shadow-md hover:opacity-90 active:scale-95 rounded-2xl`
            }`}
        >
            <Plus size={appMode === 'adult' ? 20 : 24} strokeWidth={3} />
            <span className={`${appMode === 'adult' ? 'font-semibold text-sm' : 'font-bold text-lg'}`}>{appMode === 'adult' ? 'Konto hinzufügen' : 'Neues Schwein'}</span>
        </button>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-100">
          <div className={`flex items-center gap-3 bg-slate-50 p-3 border border-slate-100 ${appMode === 'adult' ? 'rounded-lg' : 'rounded-2xl'}`}>
            <div className={`overflow-hidden bg-white border border-slate-200 transition-all ${appMode === 'adult' ? 'w-8 h-8 rounded-full' : 'w-10 h-10 rounded-full'} ${getFrameStyles(activeFrame)}`}>
                <img src={AVATARS[user.avatarId]} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                    <p className={`${appMode === 'adult' ? 'font-bold text-sm' : 'font-black'} text-slate-800 truncate`}>{user.name}</p>
                    {isStreakFrozen && <div title="Streak Protected" className="text-blue-400 animate-pulse"><Snowflake size={14} /></div>}
                </div>
                {activeTag ? (
                    <p className={`text-[9px] font-black uppercase tracking-tighter truncate ${activeTag.color}`}>{activeTag.label.replace('Titel: ', '')}</p>
                ) : (
                    appMode === 'kids' && (
                        <div className="flex items-center gap-1 text-xs font-bold text-yellow-600">
                            <span>{user.coins} Münzen</span>
                        </div>
                    )
                )}
            </div>
            <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout(); }} 
                className="p-2.5 text-slate-400 hover:text-red-500 transition-colors bg-white/50 hover:bg-white rounded-xl shadow-sm"
                title="Abmelden"
            >
                <LogOut size={appMode === 'adult' ? 18 : 22} />
            </button>
          </div>
      </div>
    </div>
  );
};