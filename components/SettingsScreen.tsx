
import React, { useState } from 'react';
import { LogOut, Info, User as UserIcon, Palette, Globe, Lock, ToggleRight, Baby, Briefcase, KeyRound, Check, Sparkles } from 'lucide-react';
import { ThemeColor, THEME_COLORS, AVATARS, User, Language, TRANSLATIONS, AppMode, SPECIALS_DATABASE } from '../types';

interface SettingsScreenProps {
  user: User;
  onUpdateUser: (user: User) => void;
  accentColor: ThemeColor;
  onUpdateAccent: (color: ThemeColor) => void;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  appMode: AppMode;
  isRecoveryMode?: boolean;
  onUpdatePassword?: (password: string) => Promise<void>;
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
  setLanguage,
  appMode,
  isRecoveryMode,
  onUpdatePassword
}) => {
  const [editingName, setEditingName] = useState(user.name);
  const [showAllAvatars, setShowAllAvatars] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const t = TRANSLATIONS[language].settings;
  const tCommon = TRANSLATIONS[language].common;
  const isFrameActive = user.inventory.includes('frame_gold') && user.activeSpecials.includes('frame_gold');

  const isAvatarOwned = (index: number) => {
      if (index < 4) return true;
      return user.inventory.includes(`avatar_${index}`);
  };

  const isColorOwned = (c: ThemeColor) => {
      const freeColors = ['orange', 'yellow', 'green']; 
      if (freeColors.includes(c)) return true;
      return user.inventory.includes(`theme_${c}`);
  };

  const isUnseen = (itemId: string) => {
      return (user.unseenItems || []).includes(itemId);
  };

  const markAsSeen = (itemId: string) => {
      if (!isUnseen(itemId)) return;
      const newUnseen = (user.unseenItems || []).filter(id => id !== itemId);
      onUpdateUser({ ...user, unseenItems: newUnseen });
  };

  const handleSelectAvatar = (idx: number) => {
      const id = `avatar_${idx}`;
      markAsSeen(id);
      onUpdateUser({ ...user, avatarId: idx, unseenItems: (user.unseenItems || []).filter(uId => uId !== id) });
  };

  const handleSelectColor = (c: ThemeColor) => {
      const id = `theme_${c}`;
      markAsSeen(id);
      onUpdateAccent(c);
      // Manuelles User Update falls wir unseenItems hier entfernen wollen direkt
      const newUnseen = (user.unseenItems || []).filter(uId => uId !== id);
      onUpdateUser({ ...user, unseenItems: newUnseen });
  };

  const ownedProfileSpecials = SPECIALS_DATABASE.filter(item => 
      item.category === 'profile' && user.inventory.includes(item.id)
  );
  
  const handleToggleSpecial = (id: string) => {
      const currentActive = [...(user.activeSpecials || [])];
      let newActive;
      if (currentActive.includes(id)) {
          newActive = currentActive.filter(specialId => specialId !== id);
      } else {
          newActive = [...currentActive, id];
      }
      onUpdateUser({ ...user, activeSpecials: newActive });
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onUpdatePassword || newPassword.length < 6) return;
      setIsPasswordLoading(true);
      try {
          await onUpdatePassword(newPassword);
          setNewPassword('');
          setPasswordSaved(true);
          setTimeout(() => setPasswordSaved(false), 3000);
      } catch (err) { console.error(err); }
      setIsPasswordLoading(false);
  };

  const displayedAvatars = showAllAvatars ? AVATARS : AVATARS.slice(0, 4);
  const displayedColors = showAllColors ? colors : colors.slice(0, 10); 

  return (
    <div className={`flex-1 p-6 pb-32 overflow-y-auto no-scrollbar ${appMode === 'adult' ? 'text-slate-900 bg-slate-100' : ''}`}>
      <div className="flex items-center gap-6 mb-8">
           <div className={`w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl ${isFrameActive ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}>
               <img src={AVATARS[user.avatarId]} alt="Profile" className="w-full h-full object-cover" />
           </div>
           <div>
               <h2 className={`text-3xl text-slate-900 ${appMode === 'adult' ? 'font-bold' : 'font-black'}`}>{t.title}</h2>
               <div className="flex items-center gap-2 mt-1">
                   <div className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${appMode === 'adult' ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white'}`}>
                       {appMode === 'adult' ? <Briefcase size={10} /> : <Baby size={10} />}
                       {appMode.toUpperCase()} Version
                   </div>
               </div>
           </div>
      </div>

      {isRecoveryMode && onUpdatePassword && (
          <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100 ring-4 ring-orange-500">
             <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-slate-900 rounded-xl text-white"><KeyRound size={20} /></div>
                 <h3 className="font-bold text-slate-800">{t.security}</h3>
             </div>
             <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">{t.newPassword}</label>
                     <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} className="w-full bg-transparent text-xl text-slate-900 focus:outline-none font-bold" />
                 </div>
                 <button type="submit" disabled={isPasswordLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95">{passwordSaved ? t.passwordSaved : t.changePassword}</button>
             </form>
          </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-50 rounded-xl text-blue-500"><UserIcon size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.profile}</h3>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
            <label className="text-xs text-slate-400 font-bold uppercase mb-1 block">{t.name}</label>
            <input type="text" value={editingName} onChange={(e) => { setEditingName(e.target.value); onUpdateUser({...user, name: e.target.value}); }} className="w-full bg-transparent text-xl text-slate-900 focus:outline-none font-black" />
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-4">
          {displayedAvatars.map((avatar, index) => {
            const realIndex = AVATARS.indexOf(avatar);
            const owned = isAvatarOwned(realIndex);
            const isSelected = user.avatarId === realIndex;
            const itemUnseen = isUnseen(`avatar_${realIndex}`);

            return (
                <button 
                  key={realIndex} 
                  onClick={() => owned && handleSelectAvatar(realIndex)} 
                  disabled={!owned} 
                  className={`relative rounded-full transition-all aspect-square p-1 ${isSelected ? 'z-10' : 'z-0'}`}
                >
                    <div className={`transition-all duration-300 w-full h-full flex items-center justify-center rounded-full overflow-hidden ${isSelected ? 'scale-105 ring-4 ring-slate-900 shadow-xl' : 'scale-95 opacity-80'}`}>
                        <img src={avatar} alt={`Avatar ${realIndex}`} className={`w-full h-full object-cover bg-slate-50 ${!owned ? 'grayscale opacity-50' : ''}`} />
                    </div>
                    {!owned && <div className="absolute inset-0 flex items-center justify-center z-20"><div className="bg-slate-900/80 p-1.5 rounded-full text-white"><Lock size={12} /></div></div>}
                    {owned && !isSelected && itemUnseen && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-md animate-bounce z-30">
                            <span className="text-white text-[10px] font-black">!</span>
                        </div>
                    )}
                </button>
            )
          })}
        </div>
        <button onClick={() => setShowAllAvatars(!showAllAvatars)} className="w-full py-3 text-slate-400 font-bold text-sm">{showAllAvatars ? tCommon.showLess : tCommon.showAll}</button>
      </div>

      {/* Profile Specials Toggles */}
      {ownedProfileSpecials.length > 0 && (
          <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-yellow-50 rounded-xl text-yellow-500"><Sparkles size={20} /></div>
                 <h3 className="font-bold text-slate-800">{t.activeSpecials}</h3>
            </div>
            <div className="space-y-3">
                {ownedProfileSpecials.map(item => {
                    const Icon = item.icon;
                    const isActive = (user.activeSpecials || []).includes(item.id);
                    return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center ${item.color}`}>
                                    <Icon size={20} />
                                </div>
                                <span className="font-bold text-slate-800">{item.label}</span>
                            </div>
                            <button 
                                onClick={() => handleToggleSpecial(item.id)}
                                className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    );
                })}
            </div>
          </div>
      )}

      {/* Design / Themes Section */}
      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-orange-50 rounded-xl text-orange-500"><Palette size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.design}</h3>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-8 gap-4 mb-4">
          {displayedColors.map((c) => {
            const owned = isColorOwned(c);
            const isSelected = accentColor === c;
            const itemUnseen = isUnseen(`theme_${c}`);

            return (
                <button 
                  key={c} 
                  onClick={() => owned && handleSelectColor(c)} 
                  disabled={!owned} 
                  title={c}
                  className={`relative aspect-square rounded-2xl transition-all duration-300 ${THEME_COLORS[c]} ${isSelected ? 'ring-4 ring-slate-900 ring-offset-2 scale-105 shadow-lg z-10' : 'scale-90 opacity-70 hover:opacity-100 hover:scale-100'}`}
                >
                    {!owned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl backdrop-blur-[1px]">
                            <Lock size={14} className="text-white" />
                        </div>
                    )}
                    {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
                            <Check size={12} className="text-slate-900" strokeWidth={4} />
                        </div>
                    )}
                    {owned && !isSelected && itemUnseen && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-md animate-bounce z-30">
                            <span className="text-white text-[10px] font-black">!</span>
                        </div>
                    )}
                </button>
            )
          })}
        </div>
        <button onClick={() => setShowAllColors(!showAllColors)} className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
            {showAllColors ? tCommon.showLess : tCommon.showAllColors}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500"><Globe size={20} /></div>
             <h3 className="font-bold text-slate-800">{t.language}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {languages.map((l) => (
            <button key={l.code} onClick={() => onUpdateUser({...user, language: l.code})} className={`p-4 rounded-2xl flex items-center gap-3 border transition-all ${language === l.code ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600'}`}>
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
            <span>2.0.0</span>
        </div>
      </div>

      <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 bg-red-50 text-red-500 font-black rounded-[2rem] border-2 border-red-100 shadow-sm flex items-center justify-center space-x-2">
        <LogOut size={20} />
        <span>{t.logout}</span>
      </button>

      {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 text-center shadow-2xl relative">
                   <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 shadow-xl border-4 border-white">
                       <LogOut size={36} strokeWidth={2.5} />
                   </div>
                   <h3 className="text-xl font-black text-slate-800 mb-2">{t.logoutConfirm}</h3>
                   <div className="flex flex-col gap-3 mt-8">
                       <button onClick={onLogout} className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl">{t.logout}</button>
                       <button onClick={() => setShowLogoutConfirm(false)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl">{t.cancel}</button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
