
import React, { useState, useEffect, useRef } from 'react';
import { User, PiggyBank, ViewState, ThemeColor, Language, TRANSLATIONS, AVATARS, Transaction, Goal, AppMode } from './types';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { QRScanner } from './components/QRScanner';
import { PiggyDetailScreen } from './components/PiggyDetailScreen';
import { LearnScreen } from './components/LearnScreen';
import { ShopScreen } from './components/ShopScreen';
import { Trophy, Loader2, RotateCcw, AlertTriangle, RefreshCw, PiggyBank as PigIcon, HelpCircle, BookOpen, Smartphone, Baby, Briefcase } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { decryptAmount, encryptAmount } from './lib/crypto';

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initialisierung...');
  const [initError, setInitError] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>([]);
  
  const [accentColor, setAccentColor] = useState<ThemeColor>('orange');
  const [language, setLanguage] = useState<Language>('de');
  const [appMode, setAppMode] = useState<AppMode>('kids'); 
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLevelActive, setIsLevelActive] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showAgeSelection, setShowAgeSelection] = useState(false);
  const [selectedAge, setSelectedAge] = useState(14);

  const dataLoadedRef = useRef(false);
  const initHandledRef = useRef(false);
  const piggyBanksRef = useRef<PiggyBank[]>([]);
  const isRefreshingRef = useRef(false);

  const tHelp = TRANSLATIONS[language].help;
  const tCommon = TRANSLATIONS[language].common;
  const tAge = TRANSLATIONS[language].age;

  useEffect(() => {
    piggyBanksRef.current = piggyBanks;
  }, [piggyBanks]);

  // Mandatory 3-second background refresh to keep transactions and balance updated
  useEffect(() => {
    if (!userId || !user) return;

    const interval = setInterval(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        await loadUserData(userId, user.email, false);
      } finally {
        isRefreshingRef.current = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userId, user?.email]);

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
        if (loading && mounted && !dataLoadedRef.current) {
            setInitError("Die Verbindung zum Server dauert ungewöhnlich lange. Bitte prüfe deine Internetverbindung.");
        }
    }, 8000);

    const initSession = async () => {
        if (initHandledRef.current) return;
        
        try {
            setLoadingStatus("Verbindung zum Server...");
            const { data: { session }, error } = await (supabase.auth as any).getSession();
            
            if (error) throw error;

            if (session && mounted) {
                setUserId(session.user.id);
                setLoadingStatus("Daten werden geladen...");
                await loadUserData(session.user.id, session.user.email || '');
                
                const isRecoveryFlow = window.location.hash && window.location.hash.includes('type=recovery');
                if (isRecoveryFlow) setIsRecoveryMode(true);
                
                if (mounted) {
                    setView(isRecoveryFlow ? 'SETTINGS' : 'DASHBOARD');
                    setLoading(false);
                }
            } else if (mounted) {
                setView('LOGIN');
                setLoading(false);
            }
        } catch (err: any) {
            console.error("Session Init Error:", err);
            if (mounted) {
                setInitError("Verbindungsfehler. Bitte lade die Seite neu.");
                setLoading(false);
            }
        } finally {
            initHandledRef.current = true;
        }
    };

    initSession();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session) {
            setUserId(session.user.id);
            if (!dataLoadedRef.current) {
                setLoadingStatus("Benutzerdaten werden abgerufen...");
                await loadUserData(session.user.id, session.user.email || '');
            }
            if (mounted) {
                setView('DASHBOARD');
                setLoading(false);
            }
        } else if (event === 'SIGNED_OUT') {
            if (mounted) {
                setView('LOGIN');
                setUser(null);
                setUserId(null);
                setPiggyBanks([]);
                dataLoadedRef.current = false;
                setIsRecoveryMode(false);
                setShowAgeSelection(false);
                setLoading(false);
            }
        }
    });

    const transactionChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        async (payload) => {
          const newTx = payload.new;
          const targetPig = piggyBanksRef.current.find(p => p.id === newTx.piggy_bank_id);
          
          if (targetPig) {
            setIsSyncing(true);
            const { data: allTxs } = await supabase
              .from('transactions')
              .select('amount')
              .eq('piggy_bank_id', targetPig.id);
            
            if (allTxs) {
              let totalSum = 0;
              for (const tx of allTxs) {
                totalSum += await decryptAmount(tx.amount);
              }
              const encryptedCorrectBalance = await encryptAmount(totalSum);
              await supabase.from('piggy_banks').update({ balance: encryptedCorrectBalance }).eq('id', targetPig.id);
              await loadUserData(userId!, user?.email || '', false);
            }
            setIsSyncing(false);
          }
        }
      )
      .subscribe();

    return () => {
        mounted = false;
        clearTimeout(timeout);
        subscription.unsubscribe();
        supabase.removeChannel(transactionChannel);
    };
  }, []); 

  const loadUserData = async (uid: string, email: string, showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsSyncing(true);
    
    setUserId(uid);
    
    try {
        const [profileRes, ownedPigsRes, guestRelationsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', uid).single(),
            supabase.from('piggy_banks').select('*, transactions(*), goals(*)').eq('user_id', uid),
            supabase.from('piggy_bank_guests').select('piggy_bank_id').eq('user_id', uid)
        ]);

        if (profileRes.data) {
            const p = profileRes.data;
            if (p.language) setLanguage(p.language); 
            if (p.age === null) setShowAgeSelection(true);
            else setAppMode(p.age > 14 ? 'adult' : 'kids');

            const localUnseenRaw = localStorage.getItem(`sparify_unseen_${uid}`);
            const localUnseen = localUnseenRaw ? JSON.parse(localUnseenRaw) : [];

            setUser({
                name: p.name || 'SparFuchs',
                email: p.email || email,
                avatarId: p.avatar_id || 0,
                trophies: p.trophies || 0,
                coins: p.coins || 0,
                inventory: p.inventory || [],
                unseenItems: localUnseen,
                completedLevels: p.completed_levels || [],
                claimedAchievements: p.claimed_achievements || [],
                activeSpecials: p.active_specials || [],
                streak: p.streak || 0,
                lastCompletedDate: p.last_completed_date,
                streakFreezeUntil: p.streak_freeze_until,
                language: p.language || 'de',
                age: p.age,
                hasSeenTutorial: p.has_seen_tutorial || false
            });
        }

        let guestPigsData: any[] = [];
        if (guestRelationsRes.data && guestRelationsRes.data.length > 0) {
            const guestPigIds = guestRelationsRes.data.map((r: any) => r.piggy_bank_id);
            const { data } = await supabase.from('piggy_banks').select('*, transactions(*), goals(*)').in('id', guestPigIds);
            if (data) guestPigsData = data;
        }

        const processPig = async (pig: any, role: 'owner' | 'guest'): Promise<PiggyBank> => {
            const [decryptedBalance, decryptedTransactions, decryptedGoals] = await Promise.all([
                decryptAmount(pig.balance),
                Promise.all((pig.transactions || []).map(async (t: any) => ({
                    id: t.id,
                    title: t.title,
                    amount: await decryptAmount(t.amount), 
                    type: t.type,
                    date: new Date(t.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
                    rawDate: new Date(t.created_at) 
                }))),
                Promise.all((pig.goals || []).map(async (g: any) => ({
                    id: g.id,
                    title: g.title,
                    targetAmount: await decryptAmount(g.target_amount),
                    savedAmount: await decryptAmount(g.saved_amount),
                    allocation_percent: g.allocation_percent || 0
                })))
            ]);

            decryptedTransactions.sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));

            const actualSum = decryptedTransactions.reduce((acc, curr) => acc + curr.amount, 0);
            let finalBalance = decryptedBalance;

            if (Math.abs(actualSum - decryptedBalance) > 0.01 && role === 'owner') {
                finalBalance = actualSum;
                const encryptedCorrectBalance = await encryptAmount(actualSum);
                await supabase.from('piggy_banks').update({ balance: encryptedCorrectBalance }).eq('id', pig.id);
            }

            const historyData = [];
            let runningBalance = finalBalance; 
            for (let i = 0; i < 30; i++) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const dStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                historyData.unshift({ day: i === 0 ? 'Heute' : dStr, amount: Math.max(0, runningBalance) });
                const txsOnDate = decryptedTransactions.filter((t: any) => t.date === dStr);
                for (const tx of txsOnDate) runningBalance -= tx.amount;
            }

            return {
                id: pig.id,
                name: pig.name || 'Spardose',
                balance: finalBalance,
                color: pig.color || 'orange',
                role: role,
                connectedDate: new Date(pig.created_at).toLocaleDateString(),
                history: historyData,
                transactions: decryptedTransactions,
                goals: decryptedGoals,
                glitterEnabled: pig.glitter_enabled || false,
                rainbowEnabled: pig.rainbow_enabled || false,
                safeLockEnabled: pig.safe_lock_enabled || false
            };
        };

        const processedOwned = await Promise.all((ownedPigsRes.data || []).map(p => processPig(p, 'owner')));
        const processedGuest = await Promise.all(guestPigsData.map(p => processPig(p, 'guest')));
        
        setPiggyBanks([...processedOwned, ...processedGuest]);
        dataLoadedRef.current = true;

    } catch (err) {
        console.error("Failed to load user data:", err);
    } finally {
        setLoading(false);
        setIsSyncing(false);
    }
  };
  
  const updateUserProfile = async (updatedUser: User) => {
      setUser(updatedUser);
      setLanguage(updatedUser.language); 
      
      if (!userId) return;
      setIsSyncing(true);

      localStorage.setItem(`sparify_unseen_${userId}`, JSON.stringify(updatedUser.unseenItems));
      
      try {
          const { error } = await supabase.from('profiles').update({
              name: updatedUser.name,
              avatar_id: updatedUser.avatarId,
              coins: updatedUser.coins,
              inventory: updatedUser.inventory,
              completed_levels: updatedUser.completedLevels,
              claimed_achievements: updatedUser.claimedAchievements,
              active_specials: updatedUser.activeSpecials,
              streak_freeze_until: updatedUser.streakFreezeUntil,
              language: updatedUser.language,
              age: updatedUser.age
          }).eq('id', userId);

          if (error) throw error;
      } catch (e) { 
          console.error("Fehler beim Profil-Update:", e);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleSaveAge = async () => {
    if (!user || !userId) return;
    const finalMode = selectedAge > 14 ? 'adult' : 'kids';
    setAppMode(finalMode);
    setShowAgeSelection(false);
    await updateUserProfile({ ...user, age: selectedAge });
  };

  const handleUpdateGoal = async (pigId: string, updatedGoal: Goal) => {
    setIsSyncing(true);
    try {
        const encryptedTarget = await encryptAmount(updatedGoal.targetAmount);
        await supabase.from('goals').update({
            title: updatedGoal.title,
            target_amount: encryptedTarget,
            allocation_percent: updatedGoal.allocationPercent
        }).eq('id', updatedGoal.id);
        await loadUserData(userId!, user?.email || '', false);
    } catch (e) { console.error(e); }
    setIsSyncing(false);
  };

  const refreshData = async () => {
      if (userId) await loadUserData(userId, user?.email || '', true);
  };

  const handleLogin = async (email: string, pass: string, isRegister: boolean) => {
    try {
        if (isRegister) {
            const result = await (supabase.auth as any).signUp({ email, password: pass });
            if (result.error) throw result.error;
            return { success: true, needsVerification: !result.data.session };
        } else {
            const result = await (supabase.auth as any).signInWithPassword({ email, password: pass });
            if (result.error) throw result.error;
            return { success: true };
        }
    } catch (err) { throw err; }
  };

  if (loading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-6 font-bold p-6">
          <div className="relative">
              <Loader2 className="animate-spin text-orange-500" size={64} />
              <div className="absolute inset-0 flex items-center justify-center">
                  <PigIcon size={24} className="text-orange-200" />
              </div>
          </div>
          <div className="text-center">
              <p className="text-slate-600 text-xl mb-1">{loadingStatus}</p>
              <p className="text-slate-400 text-sm font-medium">Dein Sparschwein wird vorbereitet</p>
          </div>
          {initError && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 max-w-sm text-center">
                  <AlertTriangle size={20} className="shrink-0" />
                  <span>{initError}</span>
                  <button onClick={() => window.location.reload()} className="ml-2 bg-red-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm whitespace-nowrap">
                      <RefreshCw size={14} /> Neu laden
                  </button>
              </div>
          )}
      </div>
  );

  if (view === 'LOGIN' && !user) {
    return <LoginScreen onLogin={handleLogin} onResetPassword={async (e) => await (supabase.auth as any).resetPasswordForEmail(e, { redirectTo: window.location.origin })} language={language} />;
  }

  if (view === 'SCANNER') {
    return <QRScanner onClose={() => setView('DASHBOARD')} onFound={async (code, guest) => {
        const { data: { user: authUser } } = await (supabase.auth as any).getUser();
        if(!authUser) return { success: false, message: "Bitte logge dich neu ein." };
        const { error } = await supabase.rpc(guest ? 'add_guest_by_code_v2' : 'claim_piggy_bank_v2', { code_input: code.trim() });
        if (error) return { success: false, message: error.message };
        await loadUserData(authUser.id, authUser.email || '');
        setView('DASHBOARD');
        return { success: true };
    }} accentColor={accentColor} language={language} />;
  }

  if (!user) {
      return <LoginScreen onLogin={handleLogin} onResetPassword={async (e) => await (supabase.auth as any).resetPasswordForEmail(e, { redirectTo: window.location.origin })} language={language} />;
  }

  const isProfileFrameActive = user.inventory.includes('frame_gold') && user.activeSpecials.includes('frame_gold');

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${appMode === 'adult' ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-900'}`}>
        <Sidebar currentView={view === 'DETAIL' ? 'DASHBOARD' : view} onChangeView={(v) => { setView(v); setSelectedBankId(null); }} accentColor={accentColor} user={user} onLogout={async () => await (supabase.auth as any).signOut()} appMode={appMode} />
        
        {isSyncing && (
            <div className="fixed top-6 right-6 z-[999] bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
                <RefreshCw size={14} className="text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Abgleich...</span>
            </div>
        )}

        <main className="flex-1 flex flex-col h-full relative md:ml-80">
            {view !== 'LEARN' && view !== 'SHOP' && view !== 'DETAIL' && !isLevelActive && (
                <div className="px-6 pt-12 pb-4 flex justify-between items-center z-10 bg-slate-50/90 backdrop-blur-md sticky top-0 md:hidden">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">{tCommon.greeting}</p>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">{user.name}</h1>
                    </div>
                    <div className="flex gap-3 relative">
                        <div className="relative">
                            <button 
                                onClick={() => setShowHelpMenu(!showHelpMenu)} 
                                className={`w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-md transition-all ${showHelpMenu ? 'text-orange-500 scale-110' : 'text-slate-400'}`}
                            >
                                <HelpCircle size={22} />
                            </button>
                            
                            {showHelpMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowHelpMenu(false)}></div>
                                    <div className="absolute top-16 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in zoom-in-95 slide-in-from-top-2 duration-200">
                                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left group">
                                            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg group-hover:bg-orange-100 transition-colors">
                                                <Smartphone size={18} />
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm">{tHelp.appTutorial}</span>
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left group">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                <BookOpen size={18} />
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm">{tHelp.boxTutorial}</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={() => refreshData()} className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-md text-slate-400 active:rotate-180 transition-transform duration-500"><RotateCcw size={20} /></button>
                        
                        <div className="relative" onClick={() => setView('SETTINGS')}>
                            <div className={`w-12 h-12 bg-white rounded-full border-2 border-white shadow-md overflow-hidden ${isProfileFrameActive ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
                                <img src={AVATARS[user.avatarId || 0]} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {view === 'DASHBOARD' && <DashboardScreen piggyBanks={piggyBanks} onConnect={() => setView('SCANNER')} onSelectBank={(id) => { setSelectedBankId(id); setView('DETAIL'); }} onRemoveBank={async (id) => {
                setIsSyncing(true);
                const pig = piggyBanks.find(p => p.id === id);
                if (pig?.role === 'owner') {
                    const encryptedZero = await encryptAmount(0);
                    await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: encryptedZero });
                }
                else {
                    const { data: { user: authUser } } = await (supabase.auth as any).getUser();
                    if(authUser) await supabase.from('piggy_bank_guests').delete().eq('user_id', authUser.id).eq('piggy_bank_id', id);
                }
                await loadUserData(userId!, user?.email || '', false);
                setIsSyncing(false);
            }} accentColor={accentColor} language={language} appMode={appMode} user={user} onUpdateGoal={handleUpdateGoal} />}
            {view === 'DETAIL' && selectedBankId && <PiggyDetailScreen bank={piggyBanks.find(p => p.id === selectedBankId)!} user={user} piggyBanks={piggyBanks} onBack={() => setView('DASHBOARD')} onUpdateBank={async (updated) => {
                setIsSyncing(true);
                await supabase.from('piggy_banks').update({ 
                  name: updated.name, 
                  color: updated.color,
                  rainbow_enabled: updated.rainbowEnabled,
                  safe_lock_enabled: updated.safeLockEnabled
                }).eq('id', updated.id);

                if (updated.goals) {
                  for (const goal of updated.goals) {
                    const encryptedTarget = await encryptAmount(goal.targetAmount);
                    const encryptedSaved = await encryptAmount(goal.savedAmount || 0);
                    const isNew = goal.id.includes('.'); 
                    
                    if (isNew) {
                      await supabase.from('goals').insert({
                        piggy_bank_id: updated.id,
                        title: goal.title,
                        target_amount: encryptedTarget,
                        saved_amount: encryptedSaved,
                        allocation_percent: goal.allocation_percent || 0
                      });
                    } else {
                      await supabase.from('goals').update({
                        title: goal.title,
                        target_amount: encryptedTarget,
                        saved_amount: encryptedSaved,
                        allocation_percent: goal.allocation_percent
                      }).eq('id', goal.id);
                    }
                  }
                }
                await loadUserData(userId!, user?.email || '', false);
                setIsSyncing(false);
            }} onTransaction={async (pigId, newBalance, newTransactions) => {
                setIsSyncing(true);
                try {
                    const encryptedBalance = await encryptAmount(newBalance);
                    await supabase.from('piggy_banks').update({ balance: encryptedBalance }).eq('id', pigId);

                    if (newTransactions.length > 0) {
                        const dbTxs = await Promise.all(newTransactions.map(async (tx) => ({ 
                            piggy_bank_id: pigId, 
                            title: tx.title, 
                            amount: await encryptAmount(tx.amount), 
                            type: tx.type 
                        })));
                        await supabase.from('transactions').insert(dbTxs);
                    }
                    await loadUserData(userId!, user?.email || '', false);
                } catch (err) {
                    console.error(err);
                }
                setIsSyncing(false);
            }} onDeleteBank={async (id) => {
                setIsSyncing(true);
                try {
                  const encryptedZero = await encryptAmount(0);
                  await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: encryptedZero });
                  await loadUserData(userId!, user?.email || '', false);
                  setView('DASHBOARD');
                } catch (e) { console.error(e); }
                setIsSyncing(false);
            }} onDeleteGoal={async (pigId, goal) => {
                setIsSyncing(true);
                try {
                    await supabase.from('goals').delete().eq('id', goal.id);
                    await loadUserData(userId!, user?.email || '', false);
                } catch (e) { console.error(e); }
                setIsSyncing(false);
            }}
            language={language} appMode={appMode} onUpdateGoal={handleUpdateGoal} onUpdateUser={updateUserProfile} />}
            {view === 'LEARN' && <LearnScreen language={language} accentColor={accentColor} user={user} onCompleteLevel={(id, r) => {
                const isNew = !user.completedLevels.includes(id);
                const newCoins = user.coins + (isNew ? r : 10);
                const newLevels = isNew ? [...user.completedLevels, id] : user.completedLevels;
                updateUserProfile({ ...user, coins: newCoins, completedLevels: newLevels });
            }} onLevelStart={() => setIsLevelActive(true)} onLevelEnd={() => setIsLevelActive(false)} appMode={appMode} />}
            {view === 'SHOP' && <ShopScreen language={language} user={user} onUpdateUser={updateUserProfile} />}
            {view === 'SETTINGS' && <SettingsScreen user={user} onUpdateUser={updateUserProfile} accentColor={accentColor} onUpdateAccent={setAccentColor} onLogout={async () => await (supabase.auth as any).signOut()} language={language} setLanguage={setLanguage} appMode={appMode} isRecoveryMode={isRecoveryMode} onUpdatePassword={async (p) => { await (supabase.auth as any).updateUser({ password: p }); setIsRecoveryMode(false); }} />}
            {!isLevelActive && view !== 'DETAIL' && <BottomNav currentView={view} onChangeView={setView} accentColor={accentColor} />}
        </main>

        {showAgeSelection && (
            <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 shadow-xl border-4 border-white">
                        <Trophy size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{tAge.title}</h2>
                    <p className="text-slate-500 font-bold mb-10">{tAge.subtitle}</p>
                    
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 mb-8 border border-slate-100">
                        <div className="text-6xl font-black text-orange-500 mb-6 tabular-nums">
                            {selectedAge} <span className="text-xl text-slate-400">{tAge.years}</span>
                        </div>
                        <input 
                            type="range" 
                            min="4" 
                            max="99" 
                            value={selectedAge} 
                            onChange={(e) => setSelectedAge(parseInt(e.target.value))}
                            className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between mt-4">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedAge <= 14 ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
                                <Baby size={14} /> Kids
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${selectedAge > 14 ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>
                                <Briefcase size={14} /> Adult
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 text-left p-4 bg-slate-100 rounded-2xl mb-8">
                        <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                        <p className="text-xs font-bold text-slate-500 leading-relaxed">
                            {tAge.hint}
                        </p>
                    </div>

                    <button 
                        onClick={handleSaveAge}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all text-xl"
                    >
                        {tAge.confirm}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
