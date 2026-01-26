
import React, { useState, useMemo } from 'react';
import { Plus, PiggyBank as PigIcon, Eye, Lock, Megaphone, Trash2, Wallet, CreditCard, ChevronRight, TrendingUp, PieChart, ArrowUpRight, ArrowDownLeft, Snowflake, Target, Percent, Info, AlertCircle, Check } from 'lucide-react';
import { PiggyBank, ThemeColor, THEME_COLORS, Language, TRANSLATIONS, CUSTOM_LOGO_URL, AppMode, User, Goal } from '../types';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardScreenProps {
  piggyBanks: PiggyBank[];
  onConnect: () => void;
  onSelectBank: (id: string) => void;
  onRemoveBank: (id: string) => void;
  accentColor: ThemeColor;
  language: Language;
  appMode?: AppMode;
  user: User;
  onUpdateGoal?: (pigId: string, goal: Goal) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
  piggyBanks, 
  onConnect, 
  onSelectBank,
  onRemoveBank,
  accentColor,
  language,
  appMode = 'kids',
  user,
  onUpdateGoal
}) => {
  const [pigToDeleteId, setPigToDeleteId] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'7D' | 'MTD'>('MTD');

  if (!user) return null;

  const ownedPigs = piggyBanks.filter(p => p.role === 'owner');
  const guestPigs = piggyBanks.filter(p => p.role === 'guest');
  const t = TRANSLATIONS[language].dashboard;
  const tDetail = TRANSLATIONS[language].detail;
  const tScanner = TRANSLATIONS[language].scanner;

  const TREASURE_LOGO_URL = 'https://bejlqwebcujfklavoecm.supabase.co/storage/v1/object/public/Logo/SparifyLogo.png';

  const aggregatedData = useMemo(() => {
    if (ownedPigs.length === 0) return [];
    
    const historyLength = ownedPigs[0].history?.length || 0;
    if (historyLength === 0) return [];
    
    const result = [];
    for (let i = 0; i < historyLength; i++) {
        let sum = 0;
        let dayLabel = ownedPigs[0].history[i].day;
        ownedPigs.forEach(pig => {
            if (pig.history && pig.history[i]) sum += pig.history[i].amount;
        });
        result.push({ day: dayLabel, amount: sum });
    }

    // Filter based on period: 7D slices the last 7 items, MTD shows full (up to 30)
    if (chartPeriod === '7D') {
        return result.slice(-7);
    }
    
    return result;
  }, [ownedPigs, chartPeriod]);

  const growthInfo = useMemo(() => {
    if (aggregatedData.length < 2) return { percent: "0.0", isPositive: true };
    const latest = aggregatedData[aggregatedData.length - 1].amount;
    const start = aggregatedData[0].amount;
    if (start === 0) return { percent: latest > 0 ? "100.0" : "0.0", isPositive: true };
    const diff = ((latest - start) / start) * 100;
    return { percent: Math.abs(diff).toFixed(1), isPositive: diff >= 0 };
  }, [aggregatedData]);

  const totalBalance = ownedPigs.reduce((acc, pig) => acc + pig.balance, 0);
  const activeCount = ownedPigs.length;

  if (appMode === 'adult') {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar h-full bg-slate-100">
            <div className="p-6 md:p-10 pb-40 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">{t.balance}</p>
                        <div className="flex items-center gap-4">
                            <span className="text-5xl font-black text-slate-900">€{totalBalance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-black ${growthInfo.isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {growthInfo.isPositive ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                {growthInfo.percent}%
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onConnect} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-all">
                            <Plus size={20} /> {t.newPig}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white mb-10">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
                            <TrendingUp size={24} className="text-indigo-500" /> {tDetail.history}
                        </h3>
                        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                            <button 
                                onClick={() => setChartPeriod('7D')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartPeriod === '7D' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                7D
                            </button>
                            <button 
                                onClick={() => setChartPeriod('MTD')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartPeriod === 'MTD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                MTD
                            </button>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={aggregatedData}>
                                <defs>
                                    <linearGradient id="adultGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                                    dy={10}
                                    interval={chartPeriod === 'MTD' ? 4 : 0}
                                />
                                <YAxis 
                                    hide 
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                                    formatter={(val: number) => [`€${val.toFixed(2)}`, 'Equity']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="#6366f1" 
                                    strokeWidth={4} 
                                    fill="url(#adultGradient)"
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-6 px-2 flex items-center gap-2">
                            <Wallet size={24} className="text-emerald-500" /> {t.myPigs}
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {ownedPigs.map(pig => (
                                <div key={pig.id} onClick={() => onSelectBank(pig.id)} className="bg-white p-6 rounded-[2.5rem] border border-white shadow-sm flex items-center justify-between hover:shadow-md cursor-pointer transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl ${THEME_COLORS[pig.color]} flex items-center justify-center text-white shadow-inner`}>
                                            <PigIcon size={28} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{pig.name}</h4>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 text-xl">€{pig.balance.toFixed(2)}</div>
                                        <ChevronRight size={18} className="text-slate-300 ml-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  const handleBankClick = (pig: PiggyBank) => {
    if (pig.role === 'guest') return; 
    onSelectBank(pig.id);
  };

  const confirmDelete = () => {
      if (pigToDeleteId) {
          onRemoveBank(pigToDeleteId);
          setPigToDeleteId(null);
      }
  };

  const getPraiseMessage = (id: string) => {
      const messages = t.praiseMessages;
      let hash = 0;
      for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
      const index = Math.abs(hash) % messages.length;
      return messages[index];
  };

  const renderPigCard = (pig: PiggyBank, isGuest: boolean) => (
    <div 
      key={pig.id}
      onClick={() => handleBankClick(pig)}
      className={`
        bg-white rounded-[2.5rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border relative overflow-hidden transition-all duration-300
        ${isGuest 
            ? 'border-slate-200 border-2 bg-slate-50/50 cursor-default' 
            : `border-slate-100 shadow-[0_15px_30px_-10px_rgba(148,163,184,0.3)] hover:scale-[1.02] active:scale-95 cursor-pointer group hover:shadow-xl`
        }
      `}
    >
      {!isGuest && pig.glitterEnabled && (
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay animate-glitter z-0" 
               style={{ 
                   backgroundImage: `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
                   backgroundSize: '16px 16px'
               }} />
      )}
      
      <div className={`absolute left-0 top-0 bottom-0 w-4 ${THEME_COLORS[pig.color]} ${isGuest ? 'opacity-50' : ''} z-10`}></div>
      
      {isGuest && (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault(); e.stopPropagation(); setPigToDeleteId(pig.id);
            }}
            className="absolute top-3 right-3 bg-white/80 backdrop-blur-md text-slate-400 hover:text-red-500 p-2.5 rounded-full z-30 transition-all shadow-sm border border-slate-200"
        >
            <Trash2 size={20} />
        </button>
      )}
      
      <div className="flex items-center space-x-6 pl-5 w-full relative z-10">
        <div className={`
            w-16 h-16 shrink-0 rounded-[1.2rem] flex items-center justify-center shadow-md transform transition-transform 
            ${isGuest ? 'bg-white text-slate-400 border border-slate-200' : `${THEME_COLORS[pig.color]} text-white group-hover:rotate-6`}
        `}>
           {isGuest ? <Eye size={32} /> : <PigIcon size={32} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-black text-2xl tracking-tight truncate ${isGuest ? 'text-slate-600' : 'text-slate-800'}`}>{pig.name}</h4>
          {!isGuest && (
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{getPraiseMessage(pig.id)}</p>
          )}
        </div>
      </div>

      <div className="text-right mt-4 sm:mt-0 pl-5 sm:pl-0 w-full sm:w-auto relative z-10">
        <span className={`block font-black text-3xl ${isGuest ? 'text-slate-500' : 'text-slate-900'}`}>
            €{pig.balance.toFixed(2)}
        </span>
      </div>

      <style>{`
        @keyframes glitter {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.05; }
          50% { transform: scale(1.1) translate(2px, 2px); opacity: 0.15; }
        }
        .animate-glitter {
          animation: glitter 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar h-full">
      <div className="p-6 pb-32 max-w-7xl mx-auto w-full">
        <div className="mb-8 w-full">
            <div className="bg-slate-100 rounded-[1.5rem] border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-slate-300 transition-colors cursor-pointer">
                <span className="absolute top-2 right-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded">{t.adLabel}</span>
                <div className="py-2 flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                        <Megaphone size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-slate-500 font-bold text-sm">{t.adTitle}</p>
                        <p className="text-slate-400 text-xs">{t.adSubtitle}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10">
            <div className={`lg:col-span-2 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-slate-300 ${THEME_COLORS[accentColor]} transition-colors duration-500`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-white/90 text-sm font-bold uppercase tracking-wide mb-1">{t.balance}</h2>
                        <div className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-md">
                        €{totalBalance.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm">
                                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                                <span className="text-xs font-bold text-white">{activeCount} {t.pigs}</span>
                            </div>
                        </div>
                    </div>
                    <div className="pl-4">
                        <img src={TREASURE_LOGO_URL} alt="Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-lg" />
                    </div>
                </div>
            </div>
            
            <div className="hidden md:flex flex-col justify-center gap-4">
                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl h-full flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Plus size={32} className="text-slate-400" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">{t.moreSavings}</h3>
                    <button onClick={onConnect} className={`w-full py-3 rounded-xl font-bold text-white ${THEME_COLORS[accentColor]} shadow-md hover:opacity-90 active:scale-95 transition-all`}>
                        + {t.newPig}
                    </button>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-2xl font-black text-slate-900">{t.myPigs}</h3>
            <button onClick={onConnect} className="md:hidden w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 hover:scale-110 transition-transform">
                <Plus size={20} />
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {ownedPigs.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm mx-2">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PigIcon className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold text-lg">{t.noPigs}</p>
            </div>
            ) : (
            ownedPigs.map(pig => renderPigCard(pig, false))
            )}
        </div>

        {guestPigs.length > 0 && (
            <>
                <div className="flex items-center gap-3 mb-4 px-2 mt-8 border-t border-slate-200 pt-8">
                    <Eye size={24} className="text-slate-400" />
                    <h3 className="text-xl font-black text-slate-500">{t.watchedPigs}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 opacity-90">
                    {guestPigs.map(pig => renderPigCard(pig, true))}
                </div>
            </>
        )}

        {pigToDeleteId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPigToDeleteId(null)}>
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 text-center shadow-2xl border-4 border-slate-50 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 shadow-xl border-4 border-white">
                        <Trash2 size={36} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{t.removeGuestConfirm}</h3>
                    <div className="flex flex-col gap-3 mt-8">
                        <button onClick={confirmDelete} className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl">{tDetail.confirm}</button>
                        <button onClick={() => setPigToDeleteId(null)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl">{tDetail.cancel}</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
