
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, PiggyBank, ViewState, ThemeColor, Language, getTranslations, AVATARS, Transaction, Goal, AppMode, CUSTOM_LOGO_URL, THEME_COLORS, SPECIALS_DATABASE } from './types';
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
import { Trophy, RotateCcw, AlertTriangle, RefreshCw, PiggyBank as PigIcon, HelpCircle, BookOpen, Smartphone, Baby, Briefcase, ChevronRight, ChevronLeft, X, ArrowRight, Snowflake } from 'lucide-react';
import { AppHelpModal } from './components/AppHelpModal';
import { supabase } from './lib/supabaseClient';
import { decryptAmount, encryptAmount } from './lib/crypto';
import { LoadingSkeleton } from './components/LoadingSkeleton';

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initialisierung...');
  const [initError, setInitError] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>([]);
  
  const [accentColor, setAccentColor] = useState<ThemeColor>('primary');
  const [language, setLanguage] = useState<Language>('de');
  const [appMode, setAppMode] = useState<AppMode>('kids'); 
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLevelActive, setIsLevelActive] = useState(false);
  const [showAgeSelection, setShowAgeSelection] = useState(false);
  const [showAppHelp, setShowAppHelp] = useState(false);
  const [selectedBirthdate, setSelectedBirthdate] = useState('');

  const dataLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const lastProfileUpdateRef = useRef<number>(0);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
      userRef.current = user;
  }, [user]);

  const tAge = getTranslations(language).age;

  const getPrefsKey = (uid: string) => `sparify_prefs_${uid}`;
  const loadPrefs = (uid: string): Pick<User, 'activeFrames' | 'activeTitles'> => {
    try {
      const raw = localStorage.getItem(getPrefsKey(uid));
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        activeFrames: Array.isArray(parsed.activeFrames) ? parsed.activeFrames : [],
        activeTitles: Array.isArray(parsed.activeTitles) ? parsed.activeTitles : []
      };
    } catch {
      return { activeFrames: [], activeTitles: [] };
    }
  };
  const savePrefs = (uid: string, prefs: Pick<User, 'activeFrames' | 'activeTitles'>) => {
    try { localStorage.setItem(getPrefsKey(uid), JSON.stringify(prefs)); } catch {}
  };

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

                const prefs = loadPrefs(uid);
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
                    hasSeenTutorial: p.has_seen_tutorial || false,
                    activeFrames: prefs.activeFrames,
                    activeTitles: prefs.activeTitles
                };
                setUser(userData);
                
                // Only auto-open tutorial during initial load (not background refresh)
                // BUT: Don't do it here, let the view effect handle it
                // if (showLoadingSpinner && !userData.hasSeenTutorial && p.birthdate !== null) {
                //   setView('BOX_TUTORIAL');
                // }
            }
        } else if (showLoadingSpinner) {
            // Logged in, but no profile row yet -> create it once.
            // This fixes "register/login takes long and nothing is written in DB".
            const prefs = loadPrefs(uid);
            const insertRes = await supabase.from('profiles').upsert({
              id: uid,
              email,
              name: 'SparFuchs',
              avatar_id: 0,
              trophies: 0,
              coins: 0,
              inventory: [],
              completed_levels: [],
              claimed_achievements: [],
              active_specials: [],
              streak: 0,
              last_completed_date: null,
              language: 'de',
              birthdate: null,
              has_seen_tutorial: false
            });
            if (insertRes.error) console.error('Profile create failed:', insertRes.error);

            setUser({
              name: 'SparFuchs',
              email,
              avatarId: 0,
              trophies: 0,
              coins: 0,
              inventory: [],
              unseenItems: [],
              completedLevels: [],
              claimedAchievements: [],
              activeSpecials: [],
              streak: 0,
              lastCompletedDate: null,
              language: 'de',
              age: null,
              birthdate: null,
              hasSeenTutorial: false,
              activeFrames: [],
              activeTitles: []
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
          // Build history from transactions: reconstruct running balance at each transaction date
          const history: { day: string; amount: number }[] = [];
          try {
            let running = decBalance;
            // decTxs currently sorted descending by rawDate
            for (const tx of decTxs) {
              history.push({ day: tx.date, amount: running });
              running -= tx.amount;
            }
            history.reverse();
          } catch (e) { /* fallback to empty history */ }

          return {
            id: pig.id, name: pig.name || 'Sparbox', balance: decBalance, color: pig.color || 'blue',
            role, connectedDate: new Date(pig.created_at).toLocaleDateString(), history,
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
    if (user && !user.hasSeenTutorial && user.birthdate && view === 'DASHBOARD' && !loading && !isSyncing) {
      setView('BOX_TUTORIAL');
    }
  }, [user, view, loading, isSyncing]);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
                setUserId(session.user.id);
          // Guard loadUserData with a timeout to avoid infinite loading on network issues
          const loadPromise = loadUserData(session.user.id, session.user.email || '');
          const timeoutMs = 10000; // 10s
          try {
            await Promise.race([
              loadPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('load-timeout')), timeoutMs))
            ]);
          } catch (e) {
            console.warn('loadUserData timed out or failed:', e);
            setInitError('Initialisierung hat zu lange gedauert. Bitte Seite neu laden.');
            setLoading(false);
          }
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
        // Also guard background sign-in load with timeout
        try {
          await Promise.race([
            loadUserData(session.user.id, session.user.email || '', false),
            new Promise((_, reject) => setTimeout(() => reject(new Error('load-timeout')), 10000))
          ]);
          console.log('Background loadUserData completed');
        } catch (e) {
          console.warn('Background loadUserData timed out or failed:', e);
        }
        } else if (event === 'SIGNED_OUT') {
            setView('LOGIN'); setUser(null); setUserId(null); setPiggyBanks([]);
        }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserData]);

  useEffect(() => {
    // When user is loaded and view is still LOGIN, switch to DASHBOARD (or BOX_TUTORIAL if needed)
    if (user && view === 'LOGIN') {
      // If user has a birthdate and hasn't seen tutorial, show tutorial
      if (user.birthdate && !user.hasSeenTutorial) {
        setView('BOX_TUTORIAL');
      } else {
        // Otherwise show dashboard
        setView('DASHBOARD');
      }
    }
  }, [user]); // Depend on user object itself, not user?.id

  // Flush pending profile updates that were stored locally while offline or without userId
  useEffect(() => {
    const flushPending = async () => {
      if (!userId) return;
      try {
        const raw = localStorage.getItem('sparify_pending_profile');
        if (!raw) return;
        const pending = JSON.parse(raw) as User;
        if (pending) {
          await updateUserProfile(pending);
        }
      } catch (e) {
        console.warn('Failed to flush pending profile:', e);
      }
    };
    flushPending();
  }, [userId]);

  const updateUserProfile = async (updatedUser: User) => {
      setUser(updatedUser);
      setLanguage(updatedUser.language); 
      lastProfileUpdateRef.current = Date.now();

      // Ensure we have a userId; try to recover from session if missing
      let uid = userId;
      if (!uid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          uid = session?.user?.id || null;
          if (uid) setUserId(uid);
        } catch (e) {
          console.warn('Could not obtain session while saving profile:', e);
        }
      }

      // Always persist prefs locally if we don't have a server write
      if (uid) {
        savePrefs(uid, {
        activeFrames: updatedUser.activeFrames,
        activeTitles: updatedUser.activeTitles
        });
      } else {
        try { localStorage.setItem('sparify_pending_profile', JSON.stringify(updatedUser)); } catch {}
      }

      setIsSyncing(true);
      const doUpdate = async () => {
        try {
          if (!uid) throw new Error('no-user-id');
          const res = await supabase.from('profiles').update({
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
          }).eq('id', uid);

          if (res.error) {
            console.error('Supabase update error:', res.error, res);
            throw res.error;
          }
          console.debug('Profile update saved:', res.data);
          // Clear any pending local save now that it succeeded
          try { localStorage.removeItem('sparify_pending_profile'); } catch {}
        } catch (e) {
          console.error('Update error:', e);
          // Retry once after short delay
          try {
            await new Promise(r => setTimeout(r, 1200));
            if (!uid) return;
            const retryRes = await supabase.from('profiles').update({
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
            }).eq('id', uid);
            if (retryRes.error) console.error('Retry failed:', retryRes.error, retryRes);
            else {
              console.debug('Profile update retry saved:', retryRes.data);
              try { localStorage.removeItem('sparify_pending_profile'); } catch {}
            }
          } catch (er) { console.error('Retry exception:', er); }
        }
      };

      await doUpdate();
      setIsSyncing(false);
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

  const handleAddGoal = async (pigId: string, newGoal: Goal) => {
    setIsSyncing(true);
    try {
        const encTar = await encryptAmount(newGoal.targetAmount);
        await supabase.from('goals').insert({
            id: newGoal.id,
            piggy_bank_id: pigId,
            title: newGoal.title,
            target_amount: encTar,
            saved_amount: await encryptAmount(newGoal.savedAmount),
            allocation_percent: newGoal.allocationPercent
        });
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

  if (loading) return <LoadingSkeleton />;

  if (view === 'LOGIN' && !user) return (
    <LoginScreen
      onLogin={async (email, password, isRegister) => {
        if (isRegister) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          const needsVerification = !data.session;
          return { success: true, needsVerification };
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { success: true };
      }}
      onResetPassword={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return { success: true };
      }}
      language={language}
      accentColor={accentColor}
    />
  );

  // Fallback: if user exists but view isn't set properly, show dashboard
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-lg font-bold">Nicht angemeldet</p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen font-sans overflow-hidden ${appMode === 'adult' ? 'bg-slate-100' : 'bg-slate-50'}`}>
        {/* QR Scanner Overlay - appears on top of everything */}
        {view === 'SCANNER' && (
          <QRScanner
            onClose={() => setView('DASHBOARD')}
            onFound={async (code: string, isGuest: boolean) => {
              try {
                let result;
                if (isGuest) {
                  result = await supabase
                    .from('piggy_bank_guests')
                    .select('piggy_bank_id')
                    .eq('access_code', code)
                    .maybeSingle();
                  
                  if (result.data) {
                    const { data: pig } = await supabase
                      .from('piggy_banks')
                      .select('*, transactions(*), goals(*)')
                      .eq('id', result.data.piggy_bank_id)
                      .maybeSingle();
                    
                    if (pig) {
                      await supabase.from('piggy_bank_guests').insert({
                        piggy_bank_id: pig.id,
                        user_id: userId,
                        access_code: code
                      }).select();
                      await loadUserData(userId!, user.email, false);
                      setView('DASHBOARD');
                      return { success: true };
                    }
                  }
                  return { success: false, message: 'Gast-Code ungültig' };
                } else {
                  result = await supabase
                    .from('piggy_banks')
                    .select('*, transactions(*), goals(*)')
                    .eq('qr_code', code)
                    .eq('user_id', userId)
                    .maybeSingle();
                  
                  if (result.data) {
                    await loadUserData(userId!, user.email, false);
                    setView('DASHBOARD');
                    return { success: true };
                  }
                  return { success: false, message: 'Code nicht gefunden' };
                }
              } catch (err) {
                console.error('Scanner error:', err);
                return { success: false, message: 'Fehler beim Scannen' };
              }
            }}
            accentColor={accentColor}
            language={language}
          />
        )}

        <Sidebar 
            currentView={view === 'DETAIL' || view === 'BOX_TUTORIAL' || view === 'SCANNER' ? 'DASHBOARD' : view} 
          onChangeView={(v) => { setView(v); setSelectedBankId(null); }} 
            accentColor={accentColor} 
            user={user} 
            onLogout={handleLogout} 
            appMode={appMode}
        />
        <main className="flex-1 flex flex-col h-full relative md:ml-80">
            {view !== 'LEARN' && view !== 'SHOP' && view !== 'DETAIL' && view !== 'BOX_TUTORIAL' && view !== 'SCANNER' && !isLevelActive && (
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
                            {user.activeTitles.length > 0 && (
                                <p className="text-[9px] font-black uppercase tracking-tighter truncate text-blue-600">
                                    {(getTranslations(language) as any).shopItems?.[user.activeTitles[0]]?.label || SPECIALS_DATABASE.find(item => item.id === user.activeTitles[0])?.label?.replace('Titel: ', '')}
                                </p>
                            )}
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
            }} accentColor={accentColor} language={language} appMode={appMode} user={user} onUpdateGoal={handleUpdateGoal} onAddGoal={handleAddGoal} />}

            {view === 'DETAIL' && selectedBankId && <PiggyDetailScreen bank={piggyBanks.find(p => p.id === selectedBankId)!} user={user} piggyBanks={piggyBanks} onBack={() => setView('DASHBOARD')} onUpdateBank={async (upd) => {
                await supabase.from('piggy_banks').update({ name: upd.name, color: upd.color }).eq('id', upd.id);
                await loadUserData(userId!, user.email, false);
            }} onTransaction={async (pigId, newBal, newTxs) => {
                await supabase.from('piggy_banks').update({ balance: await encryptAmount(newBal) }).eq('id', pigId);
                if (newTxs.length > 0) await supabase.from('transactions').insert(await Promise.all(newTxs.map(async t => ({ piggy_bank_id: pigId, title: t.title, amount: await encryptAmount(t.amount), type: t.type }))));
                await loadUserData(userId!, user.email, false);
            }} onDeleteBank={async (id) => {
                await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: await encryptAmount(0) });
                await loadUserData(userId!, user.email, false); setView('DASHBOARD');
            }} onDeleteGoal={async (pigId, goal) => {
                await supabase.from('goals').delete().eq('id', goal.id);
                await loadUserData(userId!, user.email, false);
            }} onUpdateGoal={handleUpdateGoal} onAddGoal={handleAddGoal} language={language} appMode={appMode} onUpdateUser={updateUserProfile} />}

            {view === 'LEARN' && <LearnScreen language={language} accentColor={accentColor} user={user} onCompleteLevel={handleLevelComplete} onLevelStart={() => setIsLevelActive(true)} onLevelEnd={() => setIsLevelActive(false)} appMode={appMode} />}

            {view === 'SHOP' && <ShopScreen language={language} user={user} onUpdateUser={updateUserProfile} />}
            {view === 'SETTINGS' && (
              <SettingsScreen
                user={user}
                onUpdateUser={updateUserProfile}
                accentColor={accentColor}
                onUpdateAccent={setAccentColor}
                onLogout={handleLogout}
                language={language}
                setLanguage={setLanguage}
                appMode={appMode}
                onChangeView={(v) => setView(v)}
                onOpenAppHelp={() => setShowAppHelp(true)}
              />
            )}
            
            {view === 'BOX_TUTORIAL' && (
              <BoxTutorialScreen
                language={language}
                accentColor={accentColor}
                onFinish={async () => {
                  await updateUserProfile({ ...user, hasSeenTutorial: true });
                  setView('DASHBOARD');
                }}
                onSkip={async () => {
                  await updateUserProfile({ ...user, hasSeenTutorial: true });
                  setView('DASHBOARD');
                }}
              />
            )}

            {!isLevelActive && view !== 'DETAIL' && view !== 'BOX_TUTORIAL' && view !== 'SCANNER' && <BottomNav currentView={view} onChangeView={setView} accentColor={accentColor} />}
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
        {showAppHelp && (
          <AppHelpModal language={language} onClose={() => setShowAppHelp(false)} />
        )}
    </div>
  );
}
