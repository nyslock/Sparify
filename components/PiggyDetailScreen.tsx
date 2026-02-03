
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Settings, ArrowUpRight, Target, Trophy, CheckCircle2, PiggyBank as PigIcon, Trash2, Signal, ArrowDownLeft, Wallet, Star, Flag, ArrowRightLeft, PieChart, Check, Sparkles, Gift, ShoppingBag, AlertCircle, PlusCircle, X, Percent, TrendingUp, Info, Lock, Loader2 } from 'lucide-react';
import { PiggyBank, ThemeColor, THEME_COLORS, Language, getTranslations, Goal, Transaction, User, AppMode, SPECIALS_DATABASE } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AchievementsScreen } from './AchievementsScreen';

interface PiggyDetailScreenProps {
  bank: PiggyBank;
  user: User;
  piggyBanks: PiggyBank[]; 
  onBack: () => void;
  onUpdateBank: (updatedBank: PiggyBank) => void;
  onTransaction: (pigId: string, newBalance: number, transactions: Transaction[]) => Promise<void>;
  onDeleteBank: (id: string) => Promise<void>;
  onDeleteGoal: (pigId: string, goal: Goal) => Promise<void>;
  onUpdateGoal?: (pigId: string, goal: Goal) => void;
  onAddGoal?: (pigId: string, goal: Goal) => void;
  onUpdateUser: (user: User) => void; 
  language: Language;
  appMode?: AppMode;
}

export const PiggyDetailScreen: React.FC<PiggyDetailScreenProps> = ({ bank, user, piggyBanks, onBack, onUpdateBank, onTransaction, onDeleteBank, onDeleteGoal, onUpdateGoal, onAddGoal, onUpdateUser, language, appMode = 'kids' }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  
  const [editName, setEditName] = useState(bank.name);
  const [glitterToggle, setGlitterToggle] = useState(bank.glitterEnabled || false);
  const [rainbowToggle, setRainbowToggle] = useState(bank.rainbowEnabled || false);
  const [safeLockToggle, setSafeLockToggle] = useState(bank.safeLockEnabled || false);
  
  const [transAmount, setTransAmount] = useState('');
  const [transReason, setTransReason] = useState('');
  const [transError, setTransError] = useState<string | null>(null);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  
  const [confirmGoalDelete, setConfirmGoalDelete] = useState(false);
  const [goalToRedeem, setGoalToRedeem] = useState<Goal | null>(null);
  const [isProcessingRedeem, setIsProcessingRedeem] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const [showAllocationModal, setShowAllocationModal] = useState<{goal: Goal} | null>(null);
  const [tempAllocation, setTempAllocation] = useState<string>('0');

  const colors: ThemeColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  const t = getTranslations(language).detail;

  const ownedPigSpecials = SPECIALS_DATABASE.filter(item => 
      item.category === 'piggy' && user.inventory.includes(item.id)
  );

  const distributedGoals = useMemo(() => {
      const goals = bank.goals || [];
      const totalBalance = bank.balance;
      if (goals.length === 0) return [];
      
      const count = goals.length;
      const initialShare = totalBalance / count;
      let goalStates = goals.map(g => ({ ...g, currentAmount: initialShare, isFull: false }));
      
      let iterations = 0;
      let hasChanges = true;
      while(hasChanges && iterations < 20) { 
          hasChanges = false;
          let overflow = 0;
          let incompleteIndices: number[] = [];
          
          goalStates.forEach((g, idx) => {
              if (!g.isFull) {
                  if (g.currentAmount >= g.targetAmount - 0.001) {
                      overflow += Math.max(0, g.currentAmount - g.targetAmount);
                      g.currentAmount = g.targetAmount;
                      g.isFull = true;
                      hasChanges = true; 
                  } else incompleteIndices.push(idx);
              }
          });
          
          if (overflow > 0.001 && incompleteIndices.length > 0) {
              const share = overflow / incompleteIndices.length;
              incompleteIndices.forEach(idx => { goalStates[idx].currentAmount += share; });
              hasChanges = true; 
          }
          iterations++;
      }
      return goalStates;
  }, [bank.balance, bank.goals]);

  const handleOpenGoalModal = (goal?: Goal) => {
      setConfirmGoalDelete(false); 
      if (goal) {
          setEditingGoal(goal);
          setGoalName(goal.title);
          setGoalAmount(goal.targetAmount.toFixed(2).replace('.', ','));
      } else {
          setEditingGoal(null);
          setGoalName('');
          setGoalAmount('');
      }
      setShowGoalModal(true);
  };

  const handleTransactionExecute = async () => {
    const amountStr = transAmount.replace(',', '.');
    const amount = parseFloat(amountStr);
    const currentBalance = Number(bank.balance);
    if (isNaN(amount) || amount <= 0) { setTransError("Bitte gib einen gültigen Betrag ein."); return; }
    if (amount > currentBalance) { setTransError(t.errorNotEnough); return; }
    
    setIsProcessingTransaction(true);
    setTransError(null);

    try {
        const transactionTitle = transReason.trim() || t.withdrawal;
        const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const newTransaction: Transaction = { id: crypto.randomUUID(), title: transactionTitle, amount: -amount, date: today, type: 'withdrawal' };
        
        await onTransaction(bank.id, currentBalance - amount, [newTransaction]);
        
        setTransactionSuccess(true);
        setTimeout(() => {
            setShowPayout(false);
            setIsProcessingTransaction(false);
            setTransactionSuccess(false);
            setTransAmount('');
            setTransReason('');
        }, 1500);
    } catch (err) {
        setTransError("Fehler beim Verarbeiten. Bitte versuche es erneut.");
        setIsProcessingTransaction(false);
    }
  };

  const handleSaveGoal = async () => {
      const amountStr = goalAmount.replace(',', '.');
      const amount = parseFloat(amountStr);
      if (!goalName || isNaN(amount) || amount <= 0) return;
      
      const goal = { id: editingGoal?.id || crypto.randomUUID(), title: goalName, targetAmount: amount, savedAmount: editingGoal?.savedAmount || 0, allocationPercent: editingGoal?.allocationPercent || 0 };
      
      if (editingGoal) {
          if (onUpdateGoal) await onUpdateGoal(bank.id, goal);
      } else {
          if (onAddGoal) await onAddGoal(bank.id, goal);
      }
      setShowGoalModal(false);
  }

  const handleConfirmRedeem = async () => {
      if (!goalToRedeem || isProcessingRedeem) return;
      
      if (bank.balance < goalToRedeem.targetAmount) {
          alert("Dein Guthaben reicht leider nicht aus, um diesen Wunsch zu erfüllen.");
          setGoalToRedeem(null);
          return;
      }

      setIsProcessingRedeem(true);
      
      try {
          const redeemAmount = goalToRedeem.targetAmount;
          const newBalance = bank.balance - redeemAmount;
          const title = `Wunscheinlösung: ${goalToRedeem.title}`;
          const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          
          const redemptionTx: Transaction = {
              id: crypto.randomUUID(),
              title: title,
              amount: -redeemAmount,
              date: today,
              type: 'withdrawal'
          };

          await onDeleteGoal(bank.id, goalToRedeem);
          await onTransaction(bank.id, newBalance, [redemptionTx]);
          
          setRedeemSuccess(true);
          setTimeout(() => {
              setGoalToRedeem(null);
              setIsProcessingRedeem(false);
              setRedeemSuccess(false);
          }, 2000);
      } catch (err) {
          console.error("Fehler beim Einlösen des Wunschs:", err);
          alert("Es gab einen Fehler. Bitte versuche es erneut.");
          setIsProcessingRedeem(false);
      }
  };

  const handleTogglePigSpecial = (id: string) => {
      if (id === 'effect_glitter') setGlitterToggle(!glitterToggle);
      if (id === 'effect_rainbow') setRainbowToggle(!rainbowToggle);
      if (id === 'effect_safe_lock') setSafeLockToggle(!safeLockToggle);
  };

  const chartData = bank.history || [];

  if (appMode === 'adult') {
      return (
        <div className="flex-1 flex flex-col h-screen bg-slate-100 overflow-hidden relative">
            <div className="p-4 sm:p-6 flex justify-between items-center z-50">
                <button onClick={onBack} className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                    <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <h1 className="font-black text-slate-800 text-sm sm:text-lg uppercase tracking-widest truncate px-4">{bank.name}</h1>
                <button onClick={() => setShowSettings(true)} className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                    <Settings size={20} strokeWidth={2.5} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pt-0 max-w-6xl mx-auto w-full pb-40">
                <div className="space-y-6">
                    <div className={`bg-white rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-slate-200/50 border border-white flex flex-col items-center text-center gap-6 sm:gap-8 ${bank.safeLockEnabled ? 'border-2 border-slate-900 shadow-slate-400' : ''}`}>
                        <div>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">{t.available}</p>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter flex items-center gap-2 sm:gap-3">
                                    {bank.safeLockEnabled && <Lock size={24} className="text-slate-400 sm:w-8 sm:h-8" />}
                                    €{bank.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-emerald-500 font-bold flex items-center text-xs sm:text-sm bg-emerald-50 px-3 py-1 rounded-full"><TrendingUp size={14} className="mr-1" /> Active</span>
                            </div>
                        </div>
                        <div className="flex gap-3 sm:gap-4 w-full md:w-auto">
                            <button onClick={() => setShowPayout(true)} className="flex-1 md:flex-none bg-slate-900 text-white font-bold py-3 sm:py-4 px-4 sm:px-8 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                                <ArrowUpRight size={18} className="sm:w-5 sm:h-5" /> {t.payout}
                            </button>
                            <button onClick={() => handleOpenGoalModal()} className="flex-1 md:flex-none bg-white border-2 border-slate-100 text-slate-800 font-bold py-3 sm:py-4 px-4 sm:px-8 rounded-2xl shadow-sm hover:border-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                                <Target size={18} className="text-indigo-500 sm:w-5 sm:h-5" /> {t.newGoal}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-white">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Signal size={18} className="text-indigo-500" /> {t.history}</h3>
                            </div>
                            <div className="h-[200px]">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="adultColor" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="day" hide />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} 
                                                formatter={(v: number) => [`€${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Equity']}
                                            />
                                            <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#adultColor)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <p>Keine Transaktionen vorhanden</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-white">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Percent size={18} className="text-rose-500" /> {t.share}</h3>
                            </div>
                            <div className="space-y-4">
                                {distributedGoals.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-slate-400 text-sm">{t.noGoals}</p>
                                        <button onClick={() => handleOpenGoalModal()} className="mt-4 text-indigo-500 font-bold text-sm">+ {t.newGoal}</button>
                                    </div>
                                ) : (
                                    distributedGoals.map((goal) => (
                                        <div 
                                            key={goal.id} 
                                            onClick={() => {
                                                setShowAllocationModal({goal});
                                                setTempAllocation((goal.allocationPercent || 0).toString());
                                            }}
                                            className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 hover:bg-slate-50 cursor-pointer group transition-all"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-white shadow-sm rounded-lg flex items-center justify-center text-slate-600 font-bold text-xs">{goal.allocationPercent || 0}%</div>
                                                    <span className="font-bold text-slate-800 text-sm sm:text-base">{goal.title}</span>
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-black text-slate-400">€{goal.currentAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="w-full bg-white h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-white">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Signal size={18} className="text-emerald-500" /> {t.transactions}</h3>
                        <div className="space-y-2">
                            {bank.transactions?.length > 0 ? bank.transactions.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {t.type === 'deposit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{t.title || (t.type === 'deposit' ? 'Deposit' : 'Withdrawal')}</h4>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t.date}</p>
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm sm:text-base ${t.type === 'deposit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {t.type === 'deposit' ? '+' : '-'}€{Math.abs(t.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )) : <p className="text-slate-400 text-center py-10">{t.noTransactions}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {renderCommonModals()}
        </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col h-screen relative bg-slate-50 md:flex-row md:overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-6 pt-12 md:pt-6 flex justify-between items-start z-50 pointer-events-none max-w-7xl mx-auto w-full md:relative md:w-auto md:h-0">
          <button onClick={onBack} className="pointer-events-auto w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg ring-1 ring-white/30 md:bg-white md:text-slate-500 md:shadow-md md:hover:bg-slate-50 md:ring-0 md:fixed md:top-6 md:right-24 md:z-[60]">
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <button onClick={() => setShowSettings(true)} className="pointer-events-auto w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg ring-1 ring-white/30 md:bg-white md:text-slate-500 md:shadow-md md:hover:bg-slate-50 md:ring-0 md:fixed md:top-6 md:right-6 md:z-[60]">
            <Settings size={24} strokeWidth={3} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar md:p-6 md:flex md:gap-8 md:max-w-7xl md:mx-auto md:w-full">
          <div className="md:w-1/2 md:flex md:flex-col md:gap-6">
            <div className={`relative ${bank.rainbowEnabled ? 'animate-rainbow-bg' : THEME_COLORS[bank.color]} rounded-b-[3.5rem] md:rounded-[2.5rem] pt-28 pb-12 px-6 shadow-2xl shadow-slate-300/50 z-10 transition-colors duration-500 overflow-hidden md:pt-12 md:flex-1 md:flex md:flex-col md:justify-center`}>
                {bank.glitterEnabled && (
                    <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay animate-glitter-bg z-0" 
                         style={{ backgroundImage: `radial-gradient(circle at 50% 50%, white 1.5px, transparent 1.5px)`, backgroundSize: '24px 24px' }} />
                )}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                <div className="text-center relative z-10">
                <div className="inline-block bg-black/10 backdrop-blur-md px-5 py-2 rounded-full mb-3 border border-white/20 shadow-sm">
                    <h1 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"><PigIcon size={14} /> {bank.name}</h1>
                </div>
                <h2 className={`text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-sm flex items-center justify-center gap-4 ${bank.safeLockEnabled ? 'scale-90' : ''}`}>
                    {bank.safeLockEnabled && <Lock size={48} className="opacity-80" />}
                    €{bank.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <p className="text-white/80 font-bold mt-2 text-sm bg-black/5 inline-block px-3 py-1 rounded-lg">{t.available}</p>
                </div>
            </div>

            <div className="px-6 pt-10 md:pt-0 pb-6 grid grid-cols-3 gap-3 relative z-20">
                <button onClick={() => setShowPayout(true)} className="bg-white hover:bg-slate-50 active:scale-95 transition-all p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center gap-2 group border border-slate-100">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><ArrowUpRight size={24} strokeWidth={2.5} /></div>
                    <span className="font-black text-slate-800 text-[10px] uppercase tracking-wider">{t.payout}</span>
                </button>
                <button onClick={() => handleOpenGoalModal()} className="bg-white hover:bg-slate-50 active:scale-95 transition-all p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center gap-2 group border border-slate-100">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Star size={24} strokeWidth={2.5} fill="currentColor" className="text-blue-500" /></div>
                    <span className="font-black text-slate-800 text-[10px] uppercase tracking-wider">{t.goal}</span>
                </button>
                <button onClick={() => setShowAchievements(true)} className="bg-white hover:bg-slate-50 active:scale-95 transition-all p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center gap-2 group border border-slate-100">
                    <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform"><Trophy size={24} strokeWidth={2.5} /></div>
                    <span className="font-black text-slate-800 text-[10px] uppercase tracking-wider">{t.achievements}</span>
                </button>
            </div>
            
            <div className="mx-6 mb-8 md:mx-0 md:mb-0 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex-1 min-h-[220px] relative z-20">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg"><div className="bg-indigo-100 p-2 rounded-xl text-indigo-500"><Signal size={20} /></div> {t.history}</h3>
               </div>
               <div style={{ width: '100%', height: 140 }}>
                 {chartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                       <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                       <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                       <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#1e293b' }} itemStyle={{ color: '#6366f1', fontWeight: 'bold' }} formatter={(value: number) => [`€${value.toFixed(2)}`, 'Betrag']} />
                       <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="flex items-center justify-center h-full text-slate-400">
                     <p>Keine Transaktionen vorhanden</p>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="px-6 md:px-0 pb-40 md:pb-0 md:w-1/2 md:flex md:flex-col md:gap-6 md:overflow-y-auto md:no-scrollbar relative z-20">
            <div className="mb-6 md:mb-0">
                <h3 className="font-black text-slate-800 mb-5 ml-4 text-xl flex items-center gap-2"><Target size={20} className="text-emerald-500" /> {t.goals}</h3>
                {distributedGoals.length > 0 ? (
                     <div className="space-y-4">
                        {distributedGoals.map((goal) => {
                             const currentSavedAmount = goal.currentAmount;
                             const progress = Math.min(100, (currentSavedAmount / goal.targetAmount) * 100);
                             const isCompleted = progress >= 99.9;
                             return (
                                <div key={goal.id} onClick={() => handleOpenGoalModal(goal)} className={`p-5 rounded-[2rem] border transition-transform cursor-pointer group hover:shadow-xl relative overflow-hidden ${isCompleted ? 'bg-emerald-500 border-emerald-500 shadow-xl shadow-emerald-200 text-white' : 'bg-white border-slate-100 shadow-lg shadow-slate-100 active:scale-95'}`}>
                                    <div className="flex justify-between items-center mb-3 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${isCompleted ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-500'}`}>{isCompleted ? <Check size={20} strokeWidth={4} /> : <Flag size={18} fill="currentColor" />}</div>
                                            <div>
                                                <h4 className={`font-black text-lg leading-none ${isCompleted ? 'text-white' : 'text-slate-800'}`}>{goal.title}</h4>
                                                {isCompleted && <div className="text-emerald-100 text-[10px] font-bold uppercase mt-1">Wunsch erfüllt!</div>}
                                            </div>
                                        </div>
                                        <span className={`font-black px-3 py-1 rounded-xl text-sm ${isCompleted ? 'bg-white text-emerald-600' : 'text-emerald-500 bg-emerald-50'}`}>{goal.targetAmount.toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    {!isCompleted && (
                                        <><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
                                          <p className="text-right text-xs font-bold mt-2 flex justify-between text-slate-400"><span className="text-emerald-500">{currentSavedAmount.toFixed(2).replace('.', ',')} € gespart</span><span>Noch {(goal.targetAmount - currentSavedAmount).toFixed(2).replace('.', ',')} €</span></p></>
                                    )}
                                    {isCompleted && <div className="mt-4 relative z-20"><button onClick={(e) => { e.stopPropagation(); setGoalToRedeem(goal); }} className="w-full bg-white text-emerald-600 font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-95"><Gift size={20} /> Kaufen & Einlösen</button></div>}
                                </div>
                             );
                        })}
                     </div>
                ) : <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-200"><p className="text-slate-800 font-bold text-lg mb-1">{t.noGoals}</p></div>}
            </div>
            <div className="mb-6 md:mb-0 md:flex-1"><h3 className="font-black text-slate-800 mb-5 ml-4 text-xl">{t.transactions}</h3><div className="space-y-4">{bank.transactions?.length > 0 ? bank.transactions.map((t) => (
                <div key={t.id} className="bg-white p-5 rounded-[2rem] flex items-center justify-between border border-slate-100 shadow-lg shadow-slate-100">
                    <div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>{t.type === 'deposit' ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}</div><div><h4 className="font-black text-slate-800 text-base">{t.title}</h4><p className="text-slate-400 text-xs font-bold">{t.date}</p></div></div>
                    <span className={`font-black text-xl ${t.type === 'deposit' ? 'text-emerald-500' : 'text-slate-800'}`}>{t.type === 'deposit' ? '+' : '-'}€{Math.abs(t.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>)) : <div className="text-center py-12 text-slate-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-slate-200">{t.noTransactions}</div>}</div></div>
          </div>
      </div>

      {showAchievements && (
        <AchievementsScreen 
          user={user} 
          piggyBanks={piggyBanks} 
          onUpdateUser={onUpdateUser} 
          onClose={() => setShowAchievements(false)} 
          language={language} 
        />
      )}

      {renderCommonModals()}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl border-4 border-white relative overflow-hidden">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-xl border-4 border-white">
              <Trash2 size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">Vorsicht! Hard Reset</h3>
            <div className="bg-red-50 p-4 rounded-2xl mb-8 text-left border border-red-100">
              <p className="text-sm font-bold text-red-600 leading-relaxed">
                Dies wird diese Sparbox von deinem Konto trennen.
                <br /><br />
                • Alle Wünsche werden gelöscht
                <br />
                • Der gesamte Verlauf wird gelöscht
                <br />
                • Alle Zuschauer werden entfernt
                <br /><br />
                Die Sparbox bleibt im System erhalten, ist aber für dich nicht mehr sichtbar.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); onDeleteBank(bank.id); }} className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-lg">Alles löschen & trennen</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl active:scale-95 transition-all">Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* REDEEM CONFIRMATION MODAL */}
      {goalToRedeem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl border-4 border-white relative overflow-hidden">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-xl border-4 border-white">
                      {redeemSuccess ? <Check size={48} className="text-emerald-500 scale-125 transition-transform" /> : (isProcessingRedeem ? <Loader2 size={36} className="animate-spin" /> : <Gift size={36} strokeWidth={2.5} />)}
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">{redeemSuccess ? 'Wunsch erfüllt!' : 'Wunsch einlösen?'}</h3>
                  {!redeemSuccess && (
                      <div className="bg-emerald-50 p-6 rounded-3xl mb-8 border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-1">Du kaufst:</p>
                          <h4 className="text-xl font-black text-emerald-900 mb-4">{goalToRedeem.title}</h4>
                          <div className="flex items-center justify-center gap-2 text-2xl font-black text-emerald-600">
                              <span>-€{goalToRedeem.targetAmount.toFixed(2)}</span>
                          </div>
                      </div>
                  )}
                  {redeemSuccess && <p className="text-emerald-600 font-bold mb-8">Das Geld wurde abgezogen und dein Wunsch archiviert!</p>}
                  {!redeemSuccess && (
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleConfirmRedeem} 
                            disabled={isProcessingRedeem}
                            className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isProcessingRedeem ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} strokeWidth={3} />}
                            {isProcessingRedeem ? 'Verarbeite...' : 'Jetzt einlösen'}
                        </button>
                        <button 
                            onClick={() => setGoalToRedeem(null)} 
                            disabled={isProcessingRedeem}
                            className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
                        >
                            Noch warten
                        </button>
                    </div>
                  )}
              </div>
          </div>
      )}

      <style>{`
        @keyframes rainbow {
          0% { background-color: #ef4444; }
          20% { background-color: #f59e0b; }
          40% { background-color: #10b981; }
          60% { background-color: #3b82f6; }
          80% { background-color: #8b5cf6; }
          100% { background-color: #ef4444; }
        }
        .animate-rainbow-bg {
          animation: rainbow 10s infinite linear;
        }
        @keyframes glitter-bg {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.1) translate(3px, 3px); opacity: 0.25; }
        }
        .animate-glitter-bg {
          animation: glitter-bg 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );

  function renderCommonModals() {
    return (
        <>
            {showSettings && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 animate-in slide-in-from-bottom-10 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900">{t.settingsTitle}</h3>
                            <button onClick={() => setShowSettings(false)} className="bg-slate-100 p-3 rounded-full"><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t.pigName}</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-50 text-slate-900 font-bold text-xl p-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-3">{t.color}</label>
                                <div className="flex justify-between bg-slate-50 p-4 rounded-2xl flex-wrap gap-2">
                                    {colors.map((c) => (
                                        <button key={c} onClick={() => onUpdateBank({...bank, color: c, name: editName})} className={`w-10 h-10 rounded-full transition-all ${THEME_COLORS[c]} ${bank.color === c ? 'ring-4 ring-slate-300 scale-110' : 'opacity-70'}`} />
                                    ))}
                                </div>
                            </div>
                            
                            {ownedPigSpecials.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Aktive Effekte</h4>
                                    {ownedPigSpecials.map(item => {
                                        const Icon = item.icon;
                                        const isActive = 
                                            (item.id === 'effect_glitter' && glitterToggle) || 
                                            (item.id === 'effect_rainbow' && rainbowToggle) || 
                                            (item.id === 'effect_safe_lock' && safeLockToggle);
                                        
                                        return (
                                            <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center ${item.color} shadow-sm`}><Icon size={20} /></div>
                                                    <div><h4 className="font-bold text-slate-800 text-sm">{item.label}</h4></div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePigSpecial(item.id)} 
                                                    className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <button onClick={() => { 
                                    onUpdateBank({
                                        ...bank, 
                                        name: editName, 
                                        glitterEnabled: glitterToggle,
                                        rainbowEnabled: rainbowToggle,
                                        safeLockEnabled: safeLockToggle
                                    }); 
                                    setShowSettings(false); 
                                }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all mb-3">{t.save}</button>
                                <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-5 rounded-2xl border-2 border-red-100 bg-red-50 text-red-500 font-bold flex items-center justify-center gap-3"><Trash2 size={20} /> {t.delete}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showPayout && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <div className="flex justify-center mb-4">
                             {transactionSuccess ? <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 animate-in zoom-in duration-300"><Check size={40} strokeWidth={3} /></div> : null}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 text-center">{transactionSuccess ? t.successTitle : t.payoutTitle}</h3>
                        {!transactionSuccess ? (
                            <>
                                <p className="text-slate-500 font-bold mb-6 text-center">{t.balanceLabel}: €{bank.balance.toFixed(2).replace('.', ',')}</p>
                                <div className="bg-slate-50 rounded-3xl p-6 mb-2 flex items-center border-2 border-slate-100 focus-within:bg-white focus-within:border-amber-400 transition-all">
                                    <span className="text-4xl font-bold text-slate-300 mr-4">€</span>
                                    <input type="text" inputMode="decimal" value={transAmount} onChange={(e) => { setTransAmount(e.target.value); setTransError(null); }} placeholder="0,00" className="bg-transparent text-5xl font-black text-slate-900 w-full outline-none placeholder-slate-200" autoFocus />
                                </div>
                                {transError && <div className="mb-4 flex items-center gap-2 text-red-500 font-bold text-sm bg-red-50 p-3 rounded-xl"><AlertCircle size={16} /> {transError}</div>}
                                <div className="mb-8 mt-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2 block">{t.reasonLabel}</label>
                                    <input type="text" value={transReason} onChange={(e) => setTransReason(e.target.value)} placeholder="z.B. Eis, Lego..." className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none border-2 border-slate-100 focus:border-indigo-400 focus:bg-white transition-all" maxLength={50} />
                                </div>
                                <button 
                                    onClick={handleTransactionExecute} 
                                    disabled={isProcessingTransaction}
                                    className={`w-full text-white font-black text-lg py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isProcessingTransaction ? 'bg-slate-300' : 'bg-amber-400 shadow-amber-200'}`}
                                >
                                    {isProcessingTransaction ? <Loader2 className="animate-spin" /> : t.confirm}
                                </button>
                                <button onClick={() => setShowPayout(false)} disabled={isProcessingTransaction} className="w-full mt-4 py-4 text-slate-400 font-bold disabled:opacity-50">{t.cancel}</button>
                            </>
                        ) : (
                            <p className="text-center text-slate-500 font-medium">Dein Guthaben wird aktualisiert...</p>
                        )}
                    </div>
                </div>
            )}
            {showGoalModal && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 animate-in slide-in-from-bottom-10 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 mb-6">{editingGoal ? t.editGoal : t.newGoal}</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block ml-1">{t.wishLabel}</label>
                                <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-black text-slate-800 outline-none border-2 border-slate-100 focus:border-indigo-400 focus:bg-white transition-all" placeholder="z.B. Playstation, Fahrrad..." maxLength={50} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block ml-1">{t.costLabel}</label>
                                <div className="bg-slate-50 rounded-2xl p-5 flex items-center border-2 border-slate-100 focus-within:bg-white focus-within:border-indigo-400 transition-all">
                                    <span className="text-3xl font-bold text-slate-300 mr-4">€</span>
                                    <input type="text" inputMode="decimal" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="0,00" className="bg-transparent text-4xl font-black text-slate-900 w-full outline-none" />
                                </div>
                            </div>
                            <div className="pt-4 flex flex-col gap-3">
                                <button onClick={handleSaveGoal} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all">{t.save}</button>
                                <button onClick={() => setShowGoalModal(false)} className="w-full py-2 text-slate-400 font-bold">{t.cancel}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
  }
};
