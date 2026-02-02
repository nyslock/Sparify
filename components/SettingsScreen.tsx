
import React, { useState, useEffect } from 'react';
// Fix: Added missing ChevronRight import
import { LogOut, Info, User as UserIcon, Palette, Globe, Calendar, Lock, Baby, Briefcase, Tag, Frame, HelpCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { ThemeColor, THEME_COLORS, AVATARS, User, Language, getTranslations, AppMode, SPECIALS_DATABASE, ViewState } from '../types';

interface SettingsScreenProps {
  user: User;
  onUpdateUser: (user: User) => void;
  accentColor: ThemeColor;
  onUpdateAccent: (color: ThemeColor) => void;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  appMode: AppMode;
  onChangeView?: (view: ViewState) => void;
  onOpenAppHelp?: () => void;
}

const colors: ThemeColor[] = [
    'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal', 'cyan', 
    'indigo', 'lime', 'rose', 'fuchsia', 'violet', 'sky', 'amber', 'zinc',
    'mint', 'gold', 'black', 'slate', 'stone', 'emerald', 'cocoa', 'lilac', 
    'salmon', 'ocean', 'forest', 'night', 'berry'
];

const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'hu', label: 'Magyar', flag: '🇭🇺' }
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onUpdateUser,
  accentColor,
  onUpdateAccent,
  onLogout,
  language,
  appMode,
  onChangeView,
  onOpenAppHelp
}) => {
  const [editingName, setEditingName] = useState(user.name);
  const [showAllAvatars, setShowAllAvatars] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [columnsPerRow, setColumnsPerRow] = useState(4);

  const tr = getTranslations(language);
  const t = tr.settings;
  const tHelp = tr.help;
  const tCommon = tr.common;
  const tAge = tr.age;

  // Responsive Reihen-Logik
  useEffect(() => {
    const calcCols = () => {
        const w = window.innerWidth;
        if (w >= 1024) return 8; // LG
        if (w >= 768) return 6;  // MD
        if (w >= 640) return 5;  // SM
        return 4; // Mobile
    };
    setColumnsPerRow(calcCols());
    const handleResize = () => setColumnsPerRow(calcCols());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const handleBirthdateChange = (newDate: string) => {
      const age = calculateAge(newDate);
      onUpdateUser({ ...user, birthdate: newDate, age });
  };

  const activeFrame = user.activeFrames.find(id => id.startsWith('frame_'));

  const isAvatarOwned = (index: number) => {
      if (index < 4) return true;
      return user.inventory.includes(`avatar_${index}`);
  };

  const isColorOwned = (c: ThemeColor) => {
      const freeColors = ['orange', 'yellow', 'green', 'blue']; 
      if (freeColors.includes(c)) return true;
      return user.inventory.includes(`theme_${c}`);
  };

  const handleSelectAvatar = (idx: number) => {
      const id = `avatar_${idx}`;
      onUpdateUser({ ...user, avatarId: idx, unseenItems: (user.unseenItems || []).filter(uId => uId !== id) });
  };

  const handleSelectColor = (c: ThemeColor) => {
      const id = `theme_${c}`;
      onUpdateAccent(c);
      onUpdateUser({ ...user, unseenItems: (user.unseenItems || []).filter(uId => uId !== id) });
  };

  const displayedAvatars = showAllAvatars ? AVATARS : AVATARS.slice(0, columnsPerRow);
  const displayedColors = showAllColors ? colors : colors.slice(0, columnsPerRow); 

  // Get owned frames and titles
  const ownedFrames = SPECIALS_DATABASE.filter(s => s.category === 'frame' && user.inventory.includes(s.id));
  const ownedTitles = SPECIALS_DATABASE.filter(s => s.category === 'tag' && user.inventory.includes(s.id));


  // Select frame (only one can be active)
  const selectFrame = (frameId: string) => {
    const newFrames = user.activeFrames.includes(frameId) ? [] : [frameId];
    onUpdateUser({ ...user, activeFrames: newFrames });
  };

  // Select title (only one can be active)
  const selectTitle = (titleId: string) => {
    const newTitles = user.activeTitles.includes(titleId) ? [] : [titleId];
    onUpdateUser({ ...user, activeTitles: newTitles });
  };

  const getFrameDisplay = (frameId: string) => {
    if (!user.activeFrames.includes(frameId)) return '';
    switch(frameId) {
        case 'frame_wood': return 'ring-4 ring-amber-800 ring-offset-2';
        case 'frame_silver': return 'ring-4 ring-slate-300 ring-offset-2';
        case 'frame_gold': return 'ring-4 ring-yellow-400 ring-offset-2';
        default: return '';
    }
  };

  return (
    <div className={`flex-1 p-6 pb-32 overflow-y-auto no-scrollbar ${appMode === 'adult' ? 'text-slate-900 bg-slate-100' : ''}`}>
      <div className="flex items-center gap-6 mb-8">
           <div className={`w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl ${getFrameDisplay(activeFrame)}`}>
               <img src={AVATARS[user.avatarId]} alt="Profile" className="w-full h-full object-cover" />
           </div>
           <div>
               <h2 className={`text-3xl text-slate-900 ${appMode === 'adult' ? 'font-bold' : 'font-black'}`}>{t.title}</h2>
               <div className="flex items-center gap-2 mt-1">
                   <div className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${appMode === 'adult' ? 'bg-slate-900 text-white' : 'bg-blue-500 text-white'}`}>
                       {appMode === 'adult' ? <Briefcase size={10} /> : <Baby size={10} />}
                       {appMode.toUpperCase()} Version
                   </div>
               </div>
           </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><UserIcon size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.profile}</h3>
        </div>
        
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">{t.name}</label>
                <input type="text" value={editingName} onChange={(e) => { setEditingName(e.target.value); onUpdateUser({...user, name: e.target.value}); }} className="w-full bg-transparent text-xl text-slate-900 focus:outline-none font-black" />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs text-slate-400 font-bold uppercase mb-1 block flex items-center gap-1"><Calendar size={10}/> {tAge.birthdate}</label>
                <input 
                    type="date" 
                    value={user.birthdate || ''} 
                    onChange={(e) => handleBirthdateChange(e.target.value)} 
                    className="w-full bg-transparent text-lg text-slate-900 focus:outline-none font-bold" 
                />
            </div>
        </div>

        <div className={`mt-6 grid gap-3 mb-4 grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8`}>
          {displayedAvatars.map((avatar, index) => {
            const realIndex = AVATARS.indexOf(avatar);
            const owned = isAvatarOwned(realIndex);
            const isSelected = user.avatarId === realIndex;
            return (
                <button key={realIndex} onClick={() => owned && handleSelectAvatar(realIndex)} disabled={!owned} className="relative rounded-full transition-all aspect-square p-1">
                    <div className={`transition-all duration-300 w-full h-full flex items-center justify-center rounded-full overflow-hidden ${isSelected ? 'scale-105 ring-4 ring-slate-900 shadow-xl' : 'scale-95 opacity-80'}`}>
                        <img src={avatar} className={`w-full h-full object-cover bg-slate-50 ${!owned ? 'grayscale opacity-50' : ''}`} />
                    </div>
                    {!owned && <div className="absolute inset-0 flex items-center justify-center"><div className="bg-slate-900/80 p-1.5 rounded-full text-white"><Lock size={12} /></div></div>}
                </button>
            )
          })}
        </div>
        <button onClick={() => setShowAllAvatars(!showAllAvatars)} className="w-full py-3 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">
            {showAllAvatars ? tCommon.showLess : tCommon.showAll}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><Palette size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.design}</h3>
        </div>
        <div className={`grid gap-4 mb-4 grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8`}>
          {displayedColors.map((c) => {
            const owned = isColorOwned(c);
            const isSelected = accentColor === c;
            return (
                <button key={c} onClick={() => owned && handleSelectColor(c)} disabled={!owned} className={`relative aspect-square rounded-2xl transition-all duration-300 ${THEME_COLORS[c]} ${isSelected ? 'ring-4 ring-slate-900 ring-offset-2 scale-105 shadow-lg' : 'scale-90 opacity-70 hover:opacity-100 hover:scale-100'}`}>
                    {!owned && <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl backdrop-blur-[1px]"><Lock size={14} className="text-white" /></div>}
                </button>
            )
          })}
        </div>
        <button onClick={() => setShowAllColors(!showAllColors)} className="w-full py-3 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">
            {showAllColors ? tCommon.showLess : tCommon.showAllColors}
        </button>
      </div>

      {/* Frames Section */}
      {ownedFrames.length > 0 && (
        <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700"><Frame size={20} /></div>
            <h3 className="font-bold text-slate-800">Profilrahmen</h3>
          </div>
          <div className="space-y-3">
            {ownedFrames.map((frame) => {
              const isActive = user.activeFrames.includes(frame.id);
              return (
                <button
                  key={frame.id}
                  onClick={() => selectFrame(frame.id)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 flex items-center justify-between active:scale-95 transition-all hover:bg-slate-100"
                  style={{ borderColor: isActive ? '#10b981' : '#e2e8f0' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center ${frame.color}`}>
                      <Frame size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-800">{frame.label}</div>
                      <div className="text-xs font-bold text-slate-400">{frame.description}</div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 border-emerald-600' : 'border-slate-300'}`}>
                    {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Titles Section */}
      {ownedTitles.length > 0 && (
        <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-700"><Tag size={20} /></div>
            <h3 className="font-bold text-slate-800">Profile Titel</h3>
          </div>
          <div className="space-y-3">
            {ownedTitles.map((title) => {
              const isActive = user.activeTitles.includes(title.id);
              return (
                <button
                  key={title.id}
                  onClick={() => selectTitle(title.id)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 flex items-center justify-between active:scale-95 transition-all hover:bg-slate-100"
                  style={{ borderColor: isActive ? '#8b5cf6' : '#e2e8f0' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center ${title.color}`}>
                      <Tag size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-800">{title.label}</div>
                      <div className="text-xs font-bold text-slate-400">{title.description}</div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'bg-purple-500 border-purple-600' : 'border-slate-300'}`}>
                    {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Help / Box Tutorial Section */}
      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-amber-50 rounded-xl text-amber-500"><HelpCircle size={20} /></div>
             <h3 className="font-bold text-slate-800">{tHelp.appTutorial}</h3>
        </div>
        <button 
          onClick={() => onChangeView?.('BOX_TUTORIAL')}
          className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><Info size={20} /></div>
             <span className="font-bold text-slate-800">{tHelp.boxTutorial}</span>
          </div>
          {/* Fix: Added missing ChevronRight component */}
          <ChevronRight size={18} className="text-slate-300" />
        </button>
        
        {onOpenAppHelp && (
          <button 
            onClick={onOpenAppHelp}
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group active:scale-95 transition-all mt-3"
          >
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><HelpCircle size={20} /></div>
               <span className="font-bold text-slate-800">{tHelp.appTutorial}</span>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500"><Globe size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.language}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {languages.map((l) => (
            <button key={l.code} onClick={() => onUpdateUser({...user, language: l.code})} className={`p-4 rounded-2xl flex items-center gap-3 border transition-all ${user.language === l.code ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600'}`}>
              <span className="text-2xl">{l.flag}</span>
              <span className="font-bold">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 mb-8 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-slate-50 rounded-xl text-slate-500"><Info size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.info}</h3>
        </div>
        <div className="flex justify-between items-center text-sm font-medium text-slate-500 mb-2">
            <span>{t.version}</span>
            <span>2.2.1</span>
        </div>
      </div>

      <button 
        type="button"
        onClick={() => setShowLogoutConfirm(true)} 
        className="w-full py-4 bg-red-50 text-red-500 font-black rounded-[2rem] border-2 border-red-100 flex items-center justify-center space-x-2 active:scale-95 transition-all"
      >
        <LogOut size={20} />
        <span>{t.logout}</span>
      </button>

      {showLogoutConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-sm rounded-[2.5rem] p-8 text-center shadow-2xl relative animate-in zoom-in-95">
                   <h3 className="text-xl font-black text-slate-800 mb-2">{t.logoutConfirm}</h3>
                   <div className="flex flex-col gap-3 mt-8">
                       <button onClick={(e) => { e.preventDefault(); onLogout(); }} className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-600 active:scale-95 transition-all">Abmelden</button>
                       <button onClick={() => setShowLogoutConfirm(false)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Abbrechen</button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
