
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, PiggyBank, ViewState, ThemeColor, Language, TRANSLATIONS, AVATARS, Transaction, Goal, AppMode, CUSTOM_LOGO_URL, THEME_COLORS, SPECIALS_DATABASE } from './types';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { QRScanner } from './components/QRScanner';
import { PiggyDetailScreen } from './components/PiggyDetailScreen';
import { LearnScreen } from './components/LearnScreen';
import { ShopScreen } from './components/ShopScreen';
import { BoxTutorialScreen } from './components/BoxTutorialScreen';
import { Trophy, Loader2, RotateCcw, AlertTriangle, RefreshCw, PiggyBank as PigIcon, HelpCircle, BookOpen, Smartphone, Baby, Briefcase, ChevronRight, ChevronLeft, X, ArrowRight, Snowflake } from 'lucide-react';
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
  
  const [accentColor, setAccentColor] = useState<ThemeColor>('blue');
  const [language, setLanguage] = useState<Language>('de');
  const [appMode, setAppMode] = useState<AppMode>('kids'); 
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLevelActive, setIsLevelActive] = useState(false);
  const [showAgeSelection, setShowAgeSelection] = useState(false);
  const [selectedBirthdate, setSelectedBirthdate] = useState('');

  const dataLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const lastProfileUpdateRef = useRef<number>(0);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
      userRef.current = user;
  }, [user]);

  const tAge = TRANSLATIONS[language]?.age || TRANSLATIONS['de'].age;

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

  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getYesterdayISO = () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
  };

  const loadUserData = useCallback(async (uid: string, email: string, showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsSyncing(true);
    
    setUserId(uid);
    
    try {
        const [profileRes, ownedPigsRes, guestRelationsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
            supabase.from('piggy_banks').select('*, transactions(*), goals(*)').eq('user_id', uid),
            supabase.from('piggy_bank_guests').select('piggy_bank_id').eq('user_id', uid)
        ]);

        if (profileRes.data) {
            const p = profileRes.data;
            if (p.language && showLoadingSpinner) setLanguage(p.language); 
            
            const calcAge = p.birthdate ? calculateAge(p.birthdate) : null;
            if (p.birthdate === null && !isRefreshingRef.current) {
                setShowAgeSelection(true);
            } else if (p.birthdate !== null) {
                setAppMode(calcAge! > 14 ? 'adult' : 'kids');
            }

            const localUnseenRaw = localStorage.getItem(`sparify_unseen_${uid}`);
            const localUnseen = localUnseenRaw ? JSON.parse(localUnseenRaw) : [];

            const nowTs = Date.now();
            if (nowTs - lastProfileUpdateRef.current > 15000 || showLoadingSpinner) {
                const today = getTodayISO();
                const yesterday = getYesterdayISO();
                const lastCompleted = p.last_completed_date;
                const isFrozen = p.streak_freeze_until ? new Date(p.streak_freeze_until) > new Date() : false;
                
                let validatedStreak = p.streak || 0;
                if (lastCompleted && lastCompleted !== today && lastCompleted !== yesterday && !isFrozen) {
                    validatedStreak = 0;
                }

                const userData: User = {
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
                    streak: validatedStreak,
                    lastCompletedDate: p.last_completed_date,
                    streakFreezeUntil: p.streak_freeze_until,
                    language: p.language || 'de',
                    age: calcAge,
                    birthdate: p.birthdate,
                    hasSeenTutorial: p.has_seen_tutorial || false
                };
                setUser(userData);
                
                // If the user hasn't seen the tutorial, switch to the tutorial view
                if (!userData.hasSeenTutorial && p.birthdate !== null) {
                  setView('BOX_TUTORIAL');
                }
            }
        } else if (showLoadingSpinner) {
            setUser({
                name: 'SparFuchs', email, avatarId: 0, trophies: 0, coins: 0, inventory: [], unseenItems: [],
                completedLevels: [], claimedAchievements: [], activeSpecials: [], streak: 0, lastCompletedDate: null,
                language: 'de', age: null, birthdate: null, hasSeenTutorial: false
            });
            setShowAgeSelection(true);
        }

        let guestPigsData: any[] = [];
        if (guestRelationsRes.data && guestRelationsRes.data.length > 0) {
            const guestPigIds = guestRelationsRes.data.map((r: any) => r.piggy_bank_id);
            const { data } = await supabase.from('piggy_banks').select('*, transactions(*), goals(*)').in('id', guestPigIds);
            if (data) guestPigsData = data;
        }

        const processPig = async (pig: any, role: 'owner' | 'guest'): Promise<PiggyBank> => {
            const [decBalance, decTxs, decGoals] = await Promise.all([
                decryptAmount(pig.balance),
                Promise.all((pig.transactions || []).map(async (t: any) => ({
                    id: t.id, title: t.title, amount: await decryptAmount(t.amount), type: t.type,
                    date: new Date(t.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
                    rawDate: new Date(t.created_at) 
                }))),
                Promise.all((pig.goals || []).map(async (g: any) => ({
                    id: g.id, title: g.title, targetAmount: await decryptAmount(g.target_amount),
                    savedAmount: await decryptAmount(g.saved_amount), allocation_percent: g.allocation_percent || 0
                })))
            ]);
            decTxs.sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));
            return {
                id: pig.id, name: pig.name || 'Spardose', balance: decBalance, color: pig.color || 'blue',
                role, connectedDate: new Date(pig.created_at).toLocaleDateString(), history: [],
                transactions: decTxs, goals: decGoals, glitterEnabled: pig.glitter_enabled || false,
                rainbowEnabled: pig.rainbow_enabled || false, safeLockEnabled: pig.safe_lock_enabled || false
            };
        };

        const owned = await Promise.all((ownedPigsRes.data || []).map(p => processPig(p, 'owner')));
        const guest = await Promise.all(guestPigsData.map(p => processPig(p, 'guest')));
        setPiggyBanks([...owned, ...guest]);
        dataLoadedRef.current = true;
    } catch (err) {
        console.error("Load User Data Error:", err);
    } finally {
        setLoading(false);
        setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!userId || !user) return;
    const interval = setInterval(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try { await loadUserData(userId, user.email, false); } catch (err) { console.error(err); } 
      finally { isRefreshingRef.current = false; }
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, user?.email, loadUserData]);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
                setUserId(session.user.id);
                await loadUserData(session.user.id, session.user.email || '');
                if (mounted && view !== 'BOX_TUTORIAL') setView('DASHBOARD');
            } else if (mounted) {
                setLoading(false);
            }
        } catch (err) { console.error(err); setLoading(false); }
    };
    initialize();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
            setUserId(session.user.id);
            await loadUserData(session.user.id, session.user.email || '', false);
            if (mounted && view !== 'BOX_TUTORIAL') setView('DASHBOARD');
        } else if (event === 'SIGNED_OUT') {
            setView('LOGIN'); setUser(null); setUserId(null); setPiggyBanks([]);
        }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserData]);

  const updateUserProfile = async (updatedUser: User) => {
      setUser(updatedUser);
      setLanguage(updatedUser.language); 
      lastProfileUpdateRef.current = Date.now();

      if (!userId) return;
      setIsSyncing(true);
      try {
          const { error } = await supabase.from('profiles').update({
              name: updatedUser.name,
              avatar_id: updatedUser.avatarId,
              coins: updatedUser.coins,
              inventory: updatedUser.inventory,
              completed_levels: updatedUser.completedLevels,
              claimed_achievements: updatedUser.claimedAchievements,
              active_specials: updatedUser.activeSpecials,
              streak: updatedUser.streak,
              last_completed_date: updatedUser.lastCompletedDate, 
              streak_freeze_until: updatedUser.streakFreezeUntil,
              language: updatedUser.language,
              birthdate: updatedUser.birthdate,
              has_seen_tutorial: updatedUser.hasSeenTutorial
          }).eq('id', userId);
          
          if (error) throw error;
      } catch (e) { 
          console.error("Update error:", e); 
      } finally { 
          setIsSyncing(false); 
      }
  };

  const handleLogout = async () => {
      try {
          await supabase.auth.signOut();
          localStorage.removeItem(`sparify_unseen_${userId}`);
          setView('LOGIN');
          setUser(null);
          setUserId(null);
          setPiggyBanks([]);
      } catch (err) {
          console.error("Logout failed:", err);
          // Fallback
          setView('LOGIN');
          setUser(null);
      }
  };

  const handleSaveAge = async () => {
    const freshUser = userRef.current;
    if (!freshUser || !userId || !selectedBirthdate) return;
    const age = calculateAge(selectedBirthdate);
    setAppMode(age > 14 ? 'adult' : 'kids');
    setShowAgeSelection(false);
    
    const hasSeen = freshUser.hasSeenTutorial;
    if (!hasSeen) {
      setView('BOX_TUTORIAL');
    } else {
      setView('DASHBOARD');
    }
    
    await updateUserProfile({ ...freshUser, birthdate: selectedBirthdate, age });
  };

  const handleUpdateGoal = async (pigId: string, updatedGoal: Goal) => {
    setIsSyncing(true);
    try {
        const encTar = await encryptAmount(updatedGoal.targetAmount);
        await supabase.from('goals').update({
            title: updatedGoal.title, target_amount: encTar, allocation_percent: updatedGoal.allocationPercent
        }).eq('id', updatedGoal.id);
        await loadUserData(userId!, user?.email || '', false);
    } catch (e) { console.error(e); }
    setIsSyncing(false);
  };

  const handleLevelComplete = (id: string, reward: number) => {
      const freshUser = userRef.current;
      if (!freshUser) return;

      const today = getTodayISO();
      const yesterday = getYesterdayISO();
      const isNew = !freshUser.completedLevels.includes(id);
      
      let newStreak = freshUser.streak;
      if (freshUser.lastCompletedDate === yesterday) {
          newStreak += 1;
      } else if (freshUser.lastCompletedDate !== today) {
          newStreak = 1;
      }

      updateUserProfile({
          ...freshUser,
          coins: freshUser.coins + (isNew ? reward : 10),
          completedLevels: isNew ? [...freshUser.completedLevels, id] : freshUser.completedLevels,
          streak: newStreak,
          lastCompletedDate: today
      });
  };

  if (loading) return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-6 font-bold p-6">
          <Loader2 className="animate-spin text-blue-500" size={64} />
          <p className="text-slate-600 text-xl">{loadingStatus}</p>
      </div>
  );

  if (view === 'LOGIN' && !user) return <LoginScreen onLogin={async (e,p,r) => {
      if (r) return supabase.auth.signUp({ email: e, password: p });
      return supabase.auth.signInWithPassword({ email: e, password: p });
  }} language={language} accentColor={accentColor} />;

  if (!user) return null;

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${appMode === 'adult' ? 'bg-slate-100' : 'bg-slate-50'}`}>
        <Sidebar 
            currentView={view === 'DETAIL' || view === 'BOX_TUTORIAL' ? 'DASHBOARD' : view} 
            onChangeView={(v) => { setView(v); setSelectedBankId(null); }} 
            accentColor={accentColor} 
            user={user} 
            onLogout={handleLogout} 
            appMode={appMode} 
        />
        <main className="flex-1 flex flex-col h-full relative md:ml-80">
            {view !== 'LEARN' && view !== 'SHOP' && view !== 'DETAIL' && view !== 'BOX_TUTORIAL' && !isLevelActive && (
                <div className="px-6 pt-12 pb-4 flex justify-between items-center z-10 bg-slate-50/90 backdrop-blur-md sticky top-0 md:hidden">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${THEME_COLORS[accentColor]} rounded-xl flex items-center justify-center p-1.5 shadow-sm`}>
                            <img src={CUSTOM_LOGO_URL} className="w-full h-full object-contain" alt="Logo" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-2xl font-black text-slate-900 leading-tight">{user.name}</h1>
                                {user.streakFreezeUntil && new Date(user.streakFreezeUntil) > new Date() && <Snowflake size={16} className="text-blue-400 animate-pulse" />}
                            </div>
                        </div>
                    </div>
                    <div onClick={() => setView('SETTINGS')} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer">
                        <img src={AVATARS[user.avatarId || 0]} className="w-full h-full object-cover" />
                    </div>
                </div>
            )}
            
            {view === 'DASHBOARD' && <DashboardScreen piggyBanks={piggyBanks} onConnect={() => setView('SCANNER')} onSelectBank={(id) => { setSelectedBankId(id); setView('DETAIL'); }} onRemoveBank={async (id) => {
                const pig = piggyBanks.find(p => p.id === id);
                if (pig?.role === 'owner') await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: await encryptAmount(0) });
                else await supabase.from('piggy_bank_guests').delete().eq('user_id', userId).eq('piggy_bank_id', id);
                await loadUserData(userId!, user.email, false);
            }} accentColor={accentColor} language={language} appMode={appMode} user={user} onUpdateGoal={handleUpdateGoal} />}

            {view === 'DETAIL' && selectedBankId && <PiggyDetailScreen bank={piggyBanks.find(p => p.id === selectedBankId)!} user={user} piggyBanks={piggyBanks} onBack={() => setView('DASHBOARD')} onUpdateBank={async (upd) => {
                await supabase.from('piggy_banks').update({ name: upd.name, color: upd.color }).eq('id', upd.id);
                await loadUserData(userId!, user.email, false);
            }} onTransaction={async (pigId, newBal, newTxs) => {
                await supabase.from('piggy_banks').update({ balance: await encryptAmount(newBal) }).eq('id', pigId);
                if (newTxs.length > 0) await supabase.from('transactions').insert(newTxs.map(t => ({ piggy_bank_id: pigId, title: t.title, amount: encryptAmount(t.amount), type: t.type })));
                await loadUserData(userId!, user.email, false);
            }} onDeleteBank={async (id) => {
                await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: await encryptAmount(0) });
                await loadUserData(userId!, user.email, false); setView('DASHBOARD');
            }} onDeleteGoal={async (pigId, goal) => {
                await supabase.from('goals').delete().eq('id', goal.id);
                await loadUserData(userId!, user.email, false);
            }} language={language} appMode={appMode} onUpdateUser={updateUserProfile} />}

            {view === 'LEARN' && <LearnScreen language={language} accentColor={accentColor} user={user} onCompleteLevel={handleLevelComplete} onLevelStart={() => setIsLevelActive(true)} onLevelEnd={() => setIsLevelActive(false)} appMode={appMode} />}

            {view === 'SHOP' && <ShopScreen language={language} user={user} onUpdateUser={updateUserProfile} />}
            {view === 'SETTINGS' && <SettingsScreen user={user} onUpdateUser={updateUserProfile} accentColor={accentColor} onUpdateAccent={setAccentColor} onLogout={handleLogout} language={language} setLanguage={setLanguage} appMode={appMode} />}
            
            {view === 'BOX_TUTORIAL' && (
              <BoxTutorialScreen 
                language={language} 
                accentColor={accentColor} 
                onFinish={() => { 
                  updateUserProfile({ ...user, hasSeenTutorial: true });
                  setView('DASHBOARD');
                }}
                onSkip={() => {
                  updateUserProfile({ ...user, hasSeenTutorial: true });
                  setView('DASHBOARD');
                }}
              />
            )}

            {!isLevelActive && view !== 'DETAIL' && view !== 'BOX_TUTORIAL' && <BottomNav currentView={view} onChangeView={setView} accentColor={accentColor} />}
        </main>

        {showAgeSelection && (
            <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="bg-white w-full max-md rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{tAge.title}</h2>
                    <p className="text-slate-500 font-bold mb-10">{tAge.subtitle}</p>
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 mb-8 border border-slate-100">
                        <input type="date" value={selectedBirthdate} onChange={(e) => setSelectedBirthdate(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-xl font-black text-slate-900 text-center" />
                    </div>
                    <button onClick={handleSaveAge} disabled={!selectedBirthdate} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl disabled:opacity-50 text-xl">{tAge.confirm}</button>
                </div>
            </div>
        )}
    </div>
  );
}
