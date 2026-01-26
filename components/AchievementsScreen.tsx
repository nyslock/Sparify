
import React from 'react';
import { X, Check, Trophy, Lock, Coins, ArrowRight, Star } from 'lucide-react';
import { Language, TRANSLATIONS, User, PiggyBank, ACHIEVEMENTS_LIST, Achievement } from '../types';

interface AchievementsScreenProps {
  user: User;
  piggyBanks: PiggyBank[];
  onUpdateUser: (user: User) => void;
  onClose: () => void;
  language: Language;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ user, piggyBanks, onUpdateUser, onClose, language }) => {
  const t = TRANSLATIONS[language].detail;
  const tShop = TRANSLATIONS[language].shop;

  const handleClaim = (achievement: Achievement) => {
    if (achievement.condition(user, piggyBanks) && !user.claimedAchievements.includes(achievement.id)) {
      onUpdateUser({
        ...user,
        coins: user.coins + achievement.reward,
        claimedAchievements: [...user.claimedAchievements, achievement.id]
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm border-b border-slate-100 flex justify-between items-center z-10 sticky top-0 md:px-12 md:pt-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.achievements}</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">{t.achievementsDesc}</p>
          </div>
        </div>
        <div className="bg-yellow-400 text-yellow-950 px-4 py-2 rounded-2xl font-black shadow-md flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-yellow-100 border-2 border-yellow-950 flex items-center justify-center text-[10px]">€</div>
          <span className="text-xl">{user.coins}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const isCompleted = ach.condition(user, piggyBanks);
            const isClaimed = user.claimedAchievements.includes(ach.id);
            const canClaim = isCompleted && !isClaimed;

            return (
              <div 
                key={ach.id} 
                className={`p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group ${
                  isClaimed 
                    ? 'bg-slate-100 border-slate-200 opacity-80' 
                    : isCompleted 
                      ? 'bg-white border-emerald-400 shadow-xl shadow-emerald-100' 
                      : 'bg-white border-slate-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm transition-transform duration-500 group-hover:scale-110 ${
                    isClaimed ? 'bg-slate-200' : isCompleted ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    {isClaimed ? <Check className="text-emerald-500" strokeWidth={4} /> : ach.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-black text-xl ${isClaimed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{ach.title}</h3>
                    <p className={`text-sm font-bold ${isClaimed ? 'text-slate-400' : 'text-slate-500'}`}>{ach.description}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] font-black text-yellow-900 shadow-sm">€</div>
                    <span className="font-black text-slate-900">{ach.reward} {tShop.balance}</span>
                  </div>

                  {isClaimed ? (
                    <div className="bg-slate-200 text-slate-500 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1">
                      <Check size={14} strokeWidth={3} /> Abgeholt
                    </div>
                  ) : canClaim ? (
                    <button 
                      onClick={() => handleClaim(ach)}
                      className="bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-200 active:scale-95 animate-pulse transition-all hover:bg-emerald-600"
                    >
                      Belohnung abholen!
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 font-black text-xs">
                      <Lock size={14} /> Gesperrt
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
