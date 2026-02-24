
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy, memo } from 'react';
import { User, PiggyBank, ViewState, ThemeColor, Language, getTranslations, AVATARS, Transaction, Goal, AppMode, CUSTOM_LOGO_URL, THEME_COLORS, SPECIALS_DATABASE } from './types';
// Lazy load screen components for code splitting
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const DashboardScreen = lazy(() => import('./components/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const SettingsScreen = lazy(() => import('./components/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const PiggyDetailScreen = lazy(() => import('./components/PiggyDetailScreen').then(m => ({ default: m.PiggyDetailScreen })));
const LearnScreen = lazy(() => import('./components/LearnScreen').then(m => ({ default: m.LearnScreen })));
const ShopScreen = lazy(() => import('./components/ShopScreen').then(m => ({ default: m.ShopScreen })));
const BoxTutorialScreen = lazy(() => import('./components/BoxTutorialScreen').then(m => ({ default: m.BoxTutorialScreen })));
// Eagerly load always-visible components
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { QRScanner } from './components/QRScanner';
import { SpotlightTutorial, TutorialStep } from './components/SpotlightTutorial';
import { Trophy, RotateCcw, AlertTriangle, RefreshCw, PiggyBank as PigIcon, HelpCircle, BookOpen, Smartphone, Baby, Briefcase, ChevronRight, ChevronLeft, X, ArrowRight, Snowflake } from 'lucide-react';
import { AppHelpModal } from './components/AppHelpModal';
import { ToastContainer, ToastNotification } from './components/ToastNotification';
import { supabase } from './lib/supabaseClient';
import { decryptAmount, encryptAmount } from './lib/crypto';
import { syncBalance, getTotalBalance } from './lib/piggyBank';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { usePushNotifications } from './lib/usePushNotifications';

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initialisierung...');
  const [initError, setInitError] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  const [accentColor, setAccentColor] = useState<ThemeColor>('primary');
  const [language, setLanguage] = useState<Language>('de');
  const [appMode, setAppMode] = useState<AppMode>('kids');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLevelActive, setIsLevelActive] = useState(false);
  const [showAgeSelection, setShowAgeSelection] = useState(false);
  const [showAppHelp, setShowAppHelp] = useState(false);
  const [selectedBirthdate, setSelectedBirthdate] = useState('');
  const [tutorialBeforeView, setTutorialBeforeView] = useState<ViewState | null>(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const dataLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const lastProfileUpdateRef = useRef<number>(0);
  const userRef = useRef<User | null>(null);

  // Инициализация Push Notifications
  const { isPermissionGranted, requestPermission } = usePushNotifications({
    userId,
    onNotificationReceived: (payload) => {
      // Обработка foreground уведомлений
      if (payload.notification) {
        addNotification({
          type: 'deposit',
          title: payload.notification.title || 'Sparify',
          message: payload.notification.body || '',
          amount: parseFloat(payload.data?.amount) || 0,
          pigName: payload.data?.pigName || 'Sparbox',
        });
      }
    },
  });

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const tAge = useMemo(() => getTranslations(language).age, [language]);

  const getPrefsKey = (uid: string) => `sparify_prefs_${uid}`;
  const loadPrefs = (uid: string): { activeFrames: string[], activeTitles: string[], theme?: ThemeColor } => {
    try {
      const raw = localStorage.getItem(getPrefsKey(uid));
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        activeFrames: Array.isArray(parsed.activeFrames) ? parsed.activeFrames : [],
        activeTitles: Array.isArray(parsed.activeTitles) ? parsed.activeTitles : [],
        theme: parsed.theme
      };
    } catch {
      return { activeFrames: [], activeTitles: [] };
    }
  };
  const savePrefs = (uid: string, prefs: Partial<{ activeFrames: string[], activeTitles: string[], theme?: ThemeColor }>) => {
    try {
      const existing = loadPrefs(uid);
      const merged = { ...existing, ...prefs };
      // Filter out undefined values to keep clean
      if (prefs.theme) merged.theme = prefs.theme;
      // If array is passed, use it. If not, keep existing.
      if (prefs.activeFrames) merged.activeFrames = prefs.activeFrames;
      if (prefs.activeTitles) merged.activeTitles = prefs.activeTitles;

      localStorage.setItem(getPrefsKey(uid), JSON.stringify(merged));
    } catch { }
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

  // Notification management
  const addNotification = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newNotification: ToastNotification = {
      ...notification,
      id,
      duration: notification.duration || 4000
    };
    setNotifications(prev => [...prev, newNotification]);
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: `${notification.message}\n€${notification.amount?.toFixed(2) || '0.00'} • ${notification.pigName || 'Sparbox'}`,
        tag: 'sparify-transaction',
        badge: '/images/sparify-logo.png'
      });
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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
        if (p.color && showLoadingSpinner) setAccentColor(p.color as ThemeColor);

        const calcAge = p.birthdate ? calculateAge(p.birthdate) : null;
        if (p.birthdate === null && !isRefreshingRef.current) {
          setShowAgeSelection(true);
        } else if (p.birthdate !== null && showLoadingSpinner) {
          // Nur beim initialen Load den Modus basierend auf Alter setzen, nicht bei jedem Sync
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
            color: p.color || 'primary',
            activeFrames: prefs.activeFrames,
            activeTitles: prefs.activeTitles
          };
          setUser(userData);
          if (p.color) setAccentColor(p.color as ThemeColor);
          else if (prefs.theme) setAccentColor(prefs.theme);

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
          has_seen_tutorial: false,
          color: 'primary'
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
          color: 'primary',
          activeFrames: [],
          activeTitles: []
        });
        if (prefs.theme) setAccentColor(prefs.theme);
        setShowAgeSelection(true);
      }

      let guestPigsData: any[] = [];
      if (guestRelationsRes.data && guestRelationsRes.data.length > 0) {
        const guestPigIds = guestRelationsRes.data.map((r: any) => r.piggy_bank_id);
        const { data } = await supabase.from('piggy_banks').select('*, transactions(*), goals(*)').in('id', guestPigIds);
        if (data) guestPigsData = data;
      }

      const processPig = async (pig: any, role: 'owner' | 'guest', shouldSync = false): Promise<PiggyBank> => {
        // Only sync balance on manual refresh, not on initial load - speeds up first page render
        let decBalance = 0;
        if (shouldSync) {
          const syncedBalance = await syncBalance(pig.id);
          decBalance = syncedBalance !== null ? syncedBalance : 0;
        } else {
          // On initial load, just decrypt the stored balance (much faster)
          decBalance = await decryptAmount(pig.balance);
        }

        const [decTxs, decGoals] = await Promise.all([
          Promise.all((pig.transactions || []).map(async (t: any) => ({
            id: t.id, title: t.title, amount: Number(t.amount) || 0, type: t.type,
            date: new Date(t.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
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
          // decTxs currently sorted descending by rawDate (newest first)
          // To get history: start with current balance, iterate backwards in time
          // If tx was deposit (+), previous balance was running - amount
          // If tx was withdrawal (-), previous balance was running + amount
          for (const tx of decTxs) {
            history.push({ day: tx.date, amount: running });
            if (tx.type === 'deposit') {
              running -= tx.amount;
            } else {
              // withdrawal or transfer (out)
              running += Math.abs(tx.amount);
            }
          }
          // Add initial state (balance before first transaction)
          history.push({ day: new Date(pig.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), amount: running });

          history.reverse();

          // Deduplicate days: Keep only the LAST entry for each day (which corresponds to the End-of-Day balance)
          const dayMap = new Map<string, number>();
          history.forEach(h => dayMap.set(h.day, h.amount));
          const finalHistory = Array.from(dayMap.entries()).map(([day, amount]) => ({ day, amount }));

          return {
            id: pig.id, name: pig.name || 'Sparbox', balance: decBalance, color: pig.color || 'blue',
            role, connectedDate: new Date(pig.created_at).toLocaleDateString(), history: finalHistory,
            transactions: decTxs, goals: decGoals, glitterEnabled: pig.glitter_enabled || false,
            rainbowEnabled: pig.rainbow_enabled || false, safeLockEnabled: pig.safe_lock_enabled || false,
            diamondSkinEnabled: pig.diamond_skin_enabled || false, lock_state: pig.lock_state
          };
        } catch (e) { console.error(e); }

        return {
          id: pig.id, name: pig.name || 'Sparbox', balance: 0, color: pig.color || 'blue',
          role, connectedDate: new Date(pig.created_at).toLocaleDateString(), history: [],
          transactions: decTxs, goals: decGoals, glitterEnabled: pig.glitter_enabled || false,
          rainbowEnabled: pig.rainbow_enabled || false, safeLockEnabled: pig.safe_lock_enabled || false,
          diamondSkinEnabled: pig.diamond_skin_enabled || false, lock_state: pig.lock_state
        };
      };

      // Pass showLoadingSpinner as shouldSync flag - only sync on manual refreshes
      const owned = await Promise.all((ownedPigsRes.data || []).map(p => processPig(p, 'owner', !showLoadingSpinner)));
      const guest = await Promise.all(guestPigsData.map(p => processPig(p, 'guest', !showLoadingSpinner)));
      setPiggyBanks([...owned, ...guest]);

      // Get total balance using the separate method
      if (uid) {
        const total = await getTotalBalance(uid);
        setTotalBalance(total);
      }

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
      } catch (err: any) { 
        // Silently ignore abort errors (common in React Strict Mode)
        if (!err?.message?.includes('AbortError')) {
          console.error(err);
        }
        setLoading(false); 
      }
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
        } catch (e: any) {
          // Silently ignore abort errors (common in React Strict Mode)
          if (e?.message?.includes('AbortError')) {
            return;
          }
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

  // Set up real-time balance updates
  useEffect(() => {
    if (!userId) return;

    const processPig = async (pig: any, role: 'owner' | 'guest', shouldSync = false): Promise<PiggyBank> => {
      let decBalance = 0;
      if (shouldSync) {
        const syncedBalance = await syncBalance(pig.id);
        decBalance = syncedBalance !== null ? syncedBalance : 0;
      } else {
        decBalance = await decryptAmount(pig.balance);
      }

      const [decTxs, decGoals] = await Promise.all([
        Promise.all((pig.transactions || []).map(async (t: any) => ({
          id: t.id, title: t.title, amount: Number(t.amount) || 0, type: t.type,
          date: new Date(t.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          rawDate: new Date(t.created_at)
        }))),
        Promise.all((pig.goals || []).map(async (g: any) => ({
          id: g.id, title: g.title, targetAmount: await decryptAmount(g.target_amount),
          savedAmount: await decryptAmount(g.saved_amount), allocation_percent: g.allocation_percent || 0
        })))
      ]);
      decTxs.sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));
      const history: { day: string; amount: number }[] = [];
      try {
        let running = decBalance;
        for (const tx of decTxs) {
          history.push({ day: tx.date, amount: running });
          if (tx.type === 'deposit') {
            running -= tx.amount;
          } else {
            running += Math.abs(tx.amount);
          }
        }
        history.push({ day: new Date(pig.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), amount: running });
        history.reverse();
        const dayMap = new Map<string, number>();
        history.forEach(h => dayMap.set(h.day, h.amount));
        const finalHistory = Array.from(dayMap.entries()).map(([day, amount]) => ({ day, amount }));

        return {
          id: pig.id, name: pig.name || 'Sparbox', balance: decBalance, color: pig.color || 'blue',
          role, connectedDate: new Date(pig.created_at).toLocaleDateString(), history: finalHistory,
          transactions: decTxs, goals: decGoals, glitterEnabled: pig.glitter_enabled || false,
          rainbowEnabled: pig.rainbow_enabled || false, safeLockEnabled: pig.safe_lock_enabled || false,
          diamondSkinEnabled: pig.diamond_skin_enabled || false, lock_state: pig.lock_state
        };
      } catch (e) { console.error(e); }

      return {
        id: pig.id, name: pig.name || 'Sparbox', balance: 0, color: pig.color || 'blue',
        role, connectedDate: new Date(pig.created_at).toLocaleDateString(), history: [],
        transactions: decTxs, goals: decGoals, glitterEnabled: pig.glitter_enabled || false,
        rainbowEnabled: pig.rainbow_enabled || false, safeLockEnabled: pig.safe_lock_enabled || false,
        diamondSkinEnabled: pig.diamond_skin_enabled || false, lock_state: pig.lock_state
      };
    };

    // Set up real-time subscription
    const subscriptionsRef = { current: [] as any[] };
    const setupSubscriptions = () => {
      try {
        const transactionSub = supabase
          .channel(`transactions-user-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transactions',
              filter: `piggy_bank_id=in.(SELECT id FROM piggy_banks WHERE user_id=eq.${userId})`
            },
            async (payload) => {
              try {
                const { data: allPigs } = await supabase
                  .from('piggy_banks')
                  .select('*, transactions(*), goals(*)')
                  .eq('user_id', userId);

                if (allPigs) {
                  const ownedOnly = allPigs.filter(p => p.user_id === userId);
                  const processed = await Promise.all(ownedOnly.map(p => processPig(p, 'owner', false)));
                  setPiggyBanks(processed);

                  const transaction = payload.new;
                  if (transaction) {
                    const isDeposit = transaction.type === 'deposit';
                    const amount = Math.abs(Number(transaction.amount) || 0);
                    const pigId = transaction.piggy_bank_id;
                    const pigName = allPigs.find(p => p.id === pigId)?.name || 'Sparbox';

                    addNotification({
                      title: isDeposit ? '💰 Einzahlung erhalten!' : '💸 Auszahlung getätigt!',
                      message: transaction.title || (isDeposit ? 'Neue Einzahlung' : 'Auszahlung'),
                      type: 'success',
                      amount: amount,
                      pigName: pigName,
                      duration: 5000
                    });
                  }
                }
              } catch (err) {
                console.error('Error handling realtime update:', err);
              }
            }
          )
          .subscribe();

        subscriptionsRef.current.push(transactionSub);
      } catch (err) {
        console.error('Error setting up real-time subscriptions:', err);
      }
    };

    setupSubscriptions();

    return () => {
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe().catch(console.error);
        }
      });
    };
  }, [userId, addNotification]);

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
      // Also persist unseenItems locally as they are not in DB main table
      try { localStorage.setItem(`sparify_unseen_${uid}`, JSON.stringify(updatedUser.unseenItems)); } catch { }
    } else {
      try { localStorage.setItem('sparify_pending_profile', JSON.stringify(updatedUser)); } catch { }
    }

    setIsSyncing(true);
    const doUpdate = async () => {
      try {
        if (!uid) throw new Error('no-user-id');

        // Sanitize payload: ensure undefined becomes null for optional fields
        const payload = {
          name: updatedUser.name,
          avatar_id: updatedUser.avatarId,
          coins: updatedUser.coins,
          inventory: updatedUser.inventory,
          completed_levels: updatedUser.completedLevels,
          claimed_achievements: updatedUser.claimedAchievements,
          active_specials: updatedUser.activeSpecials,
          streak: updatedUser.streak,
          last_completed_date: updatedUser.lastCompletedDate || null,
          streak_freeze_until: updatedUser.streakFreezeUntil || null,
          language: updatedUser.language,
          birthdate: updatedUser.birthdate || null,
          has_seen_tutorial: updatedUser.hasSeenTutorial,
          color: updatedUser.color || 'primary'
        };

        const res = await supabase.from('profiles').update(payload).eq('id', uid);

        if (res.error) {
          console.error('Supabase update error:', res.error, res);
          throw res.error;
        }
        console.debug('Profile update saved:', res.data);
        // Clear any pending local save now that it succeeded
        try { localStorage.removeItem('sparify_pending_profile'); } catch { }
      } catch (e) {
        console.error('Update error:', e);
        // Retry once after short delay
        try {
          await new Promise(r => setTimeout(r, 1200));
          if (!uid) return;

          const payload = {
            name: updatedUser.name,
            avatar_id: updatedUser.avatarId,
            coins: updatedUser.coins,
            inventory: updatedUser.inventory,
            completed_levels: updatedUser.completedLevels,
            claimed_achievements: updatedUser.claimedAchievements,
            active_specials: updatedUser.activeSpecials,
            streak: updatedUser.streak,
            last_completed_date: updatedUser.lastCompletedDate || null,
            streak_freeze_until: updatedUser.streakFreezeUntil || null,
            language: updatedUser.language,
            birthdate: updatedUser.birthdate || null,
            has_seen_tutorial: updatedUser.hasSeenTutorial,
            color: updatedUser.color || 'primary'
          };

          const retryRes = await supabase.from('profiles').update(payload).eq('id', uid);
          if (retryRes.error) console.error('Retry failed:', retryRes.error, retryRes);
          else {
            console.debug('Profile update retry saved:', retryRes.data);
            try { localStorage.removeItem('sparify_pending_profile'); } catch { }
          }
        } catch (er) { console.error('Retry exception:', er); }
      }
    };

    await doUpdate();
    setIsSyncing(false);
  };

  const handleAdminAddMoney = async (amount: number) => {
    if (!userId || !user) {
      return { ok: false, error: 'Kein Benutzer angemeldet.' };
    }
    const targetPig = piggyBanks.find(p => p.role === 'owner') || piggyBanks[0];
    if (!targetPig) {
      return { ok: false, error: 'Keine Sparbox gefunden.' };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Ungültiger Betrag.' };
    }

    const title = 'Admin: Einzahlung';
    try {
      // Insert transaction
      await supabase.from('transactions').insert([
        { piggy_bank_id: targetPig.id, title, amount, type: 'deposit' }
      ]);
      
      // Immediately sync balance for this piggy bank only
      const newBalance = await syncBalance(targetPig.id);
      
      // Update state optimistically without full reload
      if (newBalance !== null) {
        setPiggyBanks(prev => prev.map(p => 
          p.id === targetPig.id ? { ...p, balance: newBalance } : p
        ));
        setTotalBalance(await getTotalBalance(userId));
      }
      
      return { ok: true };
    } catch (e) {
      console.error('Admin add money failed:', e);
      return { ok: false, error: 'Fehler beim Speichern.' };
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
    const isFrozen = freshUser.streakFreezeUntil ? new Date(freshUser.streakFreezeUntil) > new Date() : false;

    // Logic:
    // If completed yesterday -> streak + 1
    // If completed today -> streak stays same (already counted for today? usually implies we track if 'streak_updated_today' but here we just check date)
    // Actually if lastCompletedDate == today, we don't increment.

    if (freshUser.lastCompletedDate === yesterday) {
      newStreak += 1;
    } else if (freshUser.lastCompletedDate !== today) {
      // Missed a day or more
      if (isFrozen) {
        // Frozen: keep streak, don't reset. usage of freeze usually consumes it or checks expiration
        // User has freeze active until future date. Streak survives.
        // Just don't increment, but don't reset.
        // If it's the first time playing today after a freeze gap, we might want to increment?
        // Simple rule: If freeze active, treat 'missed days' as 'attended', so effectively we continue from where we left off.
        // But we can only increment by 1 max per day. 
        // So if lastCompletedDate was 5 days ago but freeze covers it, we just add 1 for today? 
        // Or just keep it? Let's assume we just keep it and add 1 for today.
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    updateUserProfile({
      ...freshUser,
      coins: freshUser.coins + (isNew ? reward : 10),
      completedLevels: isNew ? [...freshUser.completedLevels, id] : freshUser.completedLevels,
      streak: newStreak,
      lastCompletedDate: today
    });
  };

  // Tutorial steps definition
  const tutorialSteps: TutorialStep[] = [
    {
      id: 'balance',
      elementId: 'tutorial-balance',
      title: 'Dein Gesamtguthaben',
      description: 'Hier siehst du, wie viel Geld du insgesamt in all deinen Sparboxen gespart hast.',
      screen: 'DASHBOARD'
    },
    {
      id: 'piggy-list',
      elementId: 'tutorial-piggy-list',
      title: 'Deine Sparboxen',
      description: 'In dieser Liste findest du alle deine Sparboxen. Tippe auf eine, um Details zu sehen.',
      screen: 'DASHBOARD'
    },
    {
      id: 'connect',
      elementId: 'tutorial-connect',
      title: 'Neue Sparbox hinzufügen',
      description: 'Tippe hier, um eine neue Sparbox zu scannen oder per Code hinzuzufügen.',
      screen: 'DASHBOARD'
    },
    {
      id: 'piggy-balance',
      elementId: 'tutorial-piggy-balance',
      title: 'Sparbox-Guthaben',
      description: 'Hier siehst du das Guthaben dieser Sparbox. Der Betrag wird in Echtzeit aktualisiert.',
      screen: 'DETAIL'
    },
    {
      id: 'piggy-goals',
      elementId: 'tutorial-piggy-goals',
      title: 'Deine Wünsche',
      description: 'Erstelle Wünsche und verfolge deinen Fortschritt. Wenn du genug gespart hast, kannst du sie einlösen!',
      screen: 'DETAIL'
    },
    {
      id: 'piggy-transactions',
      elementId: 'tutorial-piggy-transactions',
      title: 'Transaktionen',
      description: 'Hier siehst du alle Ein- und Auszahlungen dieser Sparbox.',
      screen: 'DETAIL'
    }
  ];

  if (loading) return <LoadingSkeleton />;

  if (view === 'LOGIN' && !user) return (
    <Suspense fallback={<LoadingSkeleton />}>
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
    </Suspense>
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
    <div className={`flex h-screen font-sans overflow-hidden ${appMode === 'adult' ? 'bg-slate-100 adult-mode' : 'bg-slate-50'}`}>
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
                // Owner mode: Find piggy bank by QR code (without user_id filter)
                result = await supabase
                  .from('piggy_banks')
                  .select('*, transactions(*), goals(*)')
                  .eq('qr_code', code)
                  .maybeSingle();

                if (result.data) {
                  // Check if this piggy already belongs to this user or is unassigned
                  if (!result.data.user_id) {
                    // New/unassigned pig -> claim it
                    const { error: claimError } = await supabase
                      .from('piggy_banks')
                      .update({ user_id: userId })
                      .eq('id', result.data.id);

                    if (claimError) throw claimError;

                    await loadUserData(userId!, user.email, false);
                    setView('DASHBOARD');
                    return { success: true };
                  } else if (result.data.user_id === userId) {
                    // Already owned, just refresh data
                    await loadUserData(userId!, user.email, false);
                    setView('DASHBOARD');
                    return { success: true };
                  } else {
                    // Piggy belongs to someone else
                    return { success: false, message: 'Diese Sparbox gehört einem anderen Benutzer' };
                  }
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
        onChangeView={(v) => {
          if (v === 'SPOTLIGHT_TUTORIAL') {
            setShowSpotlight(true);
            if (view === 'LOGIN' || view === 'BOX_TUTORIAL') setView('DASHBOARD');
          } else {
            setView(v);
            setSelectedBankId(null);
          }
        }}
        accentColor={accentColor}
        user={user}
        onLogout={handleLogout}
        appMode={appMode}
      />
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {view !== 'LEARN' && view !== 'SHOP' && view !== 'DETAIL' && view !== 'BOX_TUTORIAL' && view !== 'SCANNER' && !isLevelActive && (
          <div className="px-8 pt-6 pb-4 flex justify-between items-center z-10 bg-slate-50/90 backdrop-blur-md sticky top-0 md:hidden">
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
            <div onClick={() => setView('SETTINGS')} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer relative">
              <img src={AVATARS[user.avatarId || 0]} className="w-full h-full object-cover" />
              {user.activeFrames.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Frame Overlay Logic - Simple mapping for known frames */}
                  {user.activeFrames.includes('frame_wood') && <div className="absolute inset-0 border-[3px] border-amber-700 rounded-full" />}
                  {user.activeFrames.includes('frame_silver') && <div className="absolute inset-0 border-[3px] border-slate-300 rounded-full shadow-[0_0_10px_rgba(203,213,225,0.8)]" />}
                  {user.activeFrames.includes('frame_gold') && <div className="absolute inset-0 border-[3px] border-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)]" />}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'DASHBOARD' && (
          <Suspense fallback={<LoadingSkeleton />}>
            <DashboardScreen piggyBanks={piggyBanks} onConnect={() => setView('SCANNER')} onSelectBank={(id) => { setSelectedBankId(id); setView('DETAIL'); }} onRemoveBank={async (id) => {
              const pig = piggyBanks.find(p => p.id === id);
              if (pig?.role === 'owner') await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: await encryptAmount(0) });
              else await supabase.from('piggy_bank_guests').delete().eq('user_id', userId).eq('piggy_bank_id', id);
              await loadUserData(userId!, user.email, false);
            }} accentColor={accentColor} language={language} appMode={appMode} user={user} onUpdateGoal={handleUpdateGoal} onAddGoal={handleAddGoal} />
          </Suspense>
        )}

        {view === 'DETAIL' && selectedBankId && (
          <Suspense fallback={<LoadingSkeleton />}>
            <PiggyDetailScreen bank={piggyBanks.find(p => p.id === selectedBankId)!} user={user} piggyBanks={piggyBanks} onBack={() => setView('DASHBOARD')} onUpdateBank={async (upd) => {
              await supabase.from('piggy_banks').update({ name: upd.name, color: upd.color }).eq('id', upd.id);
              await loadUserData(userId!, user.email, false);
            }} onTransaction={async (pigId, newBal, newTxs) => {
              // 1. Insert transactions
              if (newTxs.length > 0) {
                await supabase.from('transactions').insert(
                  newTxs.map(t => ({ 
                    piggy_bank_id: pigId, 
                    title: t.title, 
                    amount: t.amount, 
                    type: t.type 
                  }))
                );
              }
              
              // 2. Immediately sync balance for this piggy bank only (fast)
              const updatedBalance = await syncBalance(pigId);
              
              // 3. Fetch updated transactions for this piggy bank
              const { data: updatedPig } = await supabase
                .from('piggy_banks')
                .select('*, transactions(*), goals(*)')
                .eq('id', pigId)
                .single();
              
              if (updatedBalance !== null && updatedPig) {
                // 4. Update only this piggy bank in state (instant UI update)
                setPiggyBanks(prev => prev.map(p => {
                  if (p.id === pigId && updatedPig) {
                    return {
                      ...p,
                      balance: updatedBalance,
                      transactions: (updatedPig.transactions || []).map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        amount: Number(t.amount) || 0,
                        type: t.type,
                        date: new Date(t.created_at).toLocaleString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }),
                        rawDate: new Date(t.created_at)
                      })).sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0))
                    };
                  }
                  return p;
                }));
                
                // 5. Update total balance
                setTotalBalance(await getTotalBalance(userId!));
              }
            }} onDeleteBank={async (id) => {
              await supabase.rpc('reset_piggy_bank', { pig_id: id, zero_balance: await encryptAmount(0) });
              await loadUserData(userId!, user.email, false); setView('DASHBOARD');
            }} onDeleteGoal={async (pigId, goal) => {
              await supabase.from('goals').delete().eq('id', goal.id);
              await loadUserData(userId!, user.email, false);
            }} onRemoveAllGuests={async (pigId) => {
              await supabase.from('piggy_bank_guests').delete().eq('piggy_bank_id', pigId);
              await loadUserData(userId!, user.email, false);
            }} onUpdateGoal={handleUpdateGoal} onAddGoal={handleAddGoal} language={language} appMode={appMode} onUpdateUser={updateUserProfile} />
          </Suspense>
        )}

        {view === 'LEARN' && (
          <Suspense fallback={<LoadingSkeleton />}>
            <LearnScreen language={language} accentColor={accentColor} user={user} onCompleteLevel={handleLevelComplete} onLevelStart={() => setIsLevelActive(true)} onLevelEnd={() => setIsLevelActive(false)} appMode={appMode} />
          </Suspense>
        )}

        {view === 'SHOP' && (
          <Suspense fallback={<LoadingSkeleton />}>
            <ShopScreen language={language} user={user} onUpdateUser={updateUserProfile} />
          </Suspense>
        )}
        {view === 'SETTINGS' && (
          <Suspense fallback={<LoadingSkeleton />}>
            <SettingsScreen
              user={user}
              userId={userId || undefined}
              onUpdateUser={updateUserProfile}
              accentColor={accentColor}
              onUpdateAccent={(color) => {
                setAccentColor(color);
                if (user && userId) {
                  updateUserProfile({ ...user, color });
                  savePrefs(userId, {
                    activeFrames: user?.activeFrames || [],
                    activeTitles: user?.activeTitles || [],
                    theme: color
                  });
                }
              }}
              onLogout={handleLogout}
              language={language}
              setLanguage={setLanguage}
              appMode={appMode}
              onChangeAppMode={(newMode) => setAppMode(newMode)}
              onChangeView={(v) => {
                if (v === 'SPOTLIGHT_TUTORIAL') {
                  setShowSpotlight(true);
                } else {
                  setView(v);
                }
              }}
              onOpenAppHelp={() => setShowAppHelp(true)}
              onAdminAddMoney={handleAdminAddMoney}
            />
          </Suspense>
        )}

        {view === 'BOX_TUTORIAL' && (
          <Suspense fallback={<LoadingSkeleton />}>
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
          </Suspense>
        )}

        {view === 'SPOTLIGHT_TUTORIAL' && (
          <div className="hidden" /> // Replaced by overlay below
        )}

        {!isLevelActive && view !== 'DETAIL' && view !== 'BOX_TUTORIAL' && view !== 'SCANNER' && view !== 'SPOTLIGHT_TUTORIAL' && (
          <BottomNav
            currentView={view}
            onChangeView={(v) => {
              if (v === 'SPOTLIGHT_TUTORIAL') {
                setShowSpotlight(true);
              } else {
                setView(v);
              }
            }}
            accentColor={accentColor}
          />
        )}
      </main>

      {showSpotlight && (
        <SpotlightTutorial
          steps={tutorialSteps}
          language={language}
          currentScreen={selectedBankId ? 'DETAIL' : 'DASHBOARD'}
          onNavigate={(screen) => {
            if (screen === 'DETAIL' && piggyBanks.length > 0 && !selectedBankId) {
              setSelectedBankId(piggyBanks[0].id);
              setView('DETAIL');
            } else if (screen === 'DASHBOARD') {
              setSelectedBankId(null);
              setView('DASHBOARD');
            }
          }}
          onComplete={() => {
            setShowSpotlight(false);
          }}
          onSkip={() => {
            setShowSpotlight(false);
          }}
        />
      )}

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
      <ToastContainer notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}
