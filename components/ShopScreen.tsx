import React, { useMemo, useState, useEffect } from 'react';
import { ShoppingBag, Check, Clock, Sparkles, User, Palette, Ticket, CheckCircle2, Circle, Snowflake } from 'lucide-react';
import { Language, getTranslations, User as UserType, ThemeColor, AVATARS, THEME_COLORS, SPECIALS_DATABASE } from '../types';

interface ShopScreenProps {
  user: UserType;
  onUpdateUser: (user: UserType) => void;
  language: Language;
}

const sfc32 = (a: number, b: number, c: number, d: number) => {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

export const ShopScreen: React.FC<ShopScreenProps> = ({ user, onUpdateUser, language }) => {
    const t = getTranslations(language).shop;
    const itemTranslations = (getTranslations(language) as any).shopItems || {};

  const [devDateOffset, setDevDateOffset] = useState(0);
  const [applyDiscount, setApplyDiscount] = useState(false);

  if (!user) return null;

  const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1 + devDateOffset);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  const todayStr = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() + devDateOffset);
      return d.toISOString().split('T')[0];
  }, [devDateOffset]);

  const hasCouponInInventory = user.inventory.includes('item_discount_coupon');
  
  const dailyShopItems = useMemo(() => {
      let seed1 = 0, seed2 = 0;
      for(let i=0; i<todayStr.length; i++) {
          seed1 += todayStr.charCodeAt(i);
          seed2 += todayStr.charCodeAt(i) * 2;
      }
      const rand = sfc32(seed1, seed2, 12345, 67890);

      const avatarPool = AVATARS.slice(4).map((_, idx) => idx + 4); 
      for (let i = avatarPool.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [avatarPool[i], avatarPool[j]] = [avatarPool[j], avatarPool[i]];
      }
      const todaysAvatars = avatarPool.slice(0, 4).map(idx => ({
          id: `avatar_${idx}`,
          type: 'avatar' as const,
          value: idx,
          price: 50 + Math.floor(rand() * 3) * 10 
      }));

      const allColors = Object.keys(THEME_COLORS) as ThemeColor[];
      const themePool = allColors.filter(c => c !== 'orange' && c !== 'blue');
      for (let i = themePool.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [themePool[i], themePool[j]] = [themePool[j], themePool[i]];
      }
      const todaysThemes = themePool.slice(0, 3).map(c => ({
          id: `theme_${c}`,
          type: 'theme' as const,
          value: c,
          price: 100
      }));

      const specials = SPECIALS_DATABASE;
      // Shuffle specials and take first 4
      const shuffledSpecials = [...specials];
      for (let i = shuffledSpecials.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [shuffledSpecials[i], shuffledSpecials[j]] = [shuffledSpecials[j], shuffledSpecials[i]];
      }
      const todaysSpecials = shuffledSpecials.slice(0, 4);
      
      return { avatars: todaysAvatars, themes: todaysThemes, specials: todaysSpecials };
  }, [todayStr]);

  useEffect(() => {
      const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);
      return () => clearInterval(timer);
  }, [devDateOffset]);

  const getEffectivePrice = (item: any) => {
      // Der Gutschein selbst kann nicht rabattiert werden
      if (item.id === 'item_discount_coupon') return item.price;
      return (hasCouponInInventory && applyDiscount) ? Math.floor(item.price * 0.5) : item.price;
  };

  const handleBuy = (item: any) => {
    const effectivePrice = getEffectivePrice(item);
    const itemId = item.id;

    if (user.coins >= effectivePrice && !isOwned(itemId)) {
      let newInventory = [...user.inventory, itemId];
      let newStreakFreezeUntil = user.streakFreezeUntil;
      
      // Streakfreezer Logik: Setze Ablaufdatum auf Jetzt + 24h
      if (itemId === 'item_streak_freeze') {
          const now = new Date();
          const freezeExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          newStreakFreezeUntil = freezeExpiry.toISOString();
          // Freezer wird direkt aktiviert und landet nicht permanent im Inventar (bzw. wird hier als "aktiv" markiert)
      }

      // Wenn der Rabatt angewendet wurde UND es nicht der Gutschein selbst ist, Gutschein entfernen
      if (hasCouponInInventory && applyDiscount && itemId !== 'item_discount_coupon') {
          newInventory = newInventory.filter(id => id !== 'item_discount_coupon');
          setApplyDiscount(false); // Nach Einlösung deaktivieren
      }

      onUpdateUser({
        ...user,
        coins: user.coins - effectivePrice,
        inventory: newInventory,
        unseenItems: [...user.unseenItems, itemId],
        streakFreezeUntil: newStreakFreezeUntil
      });
    }
  };

  const isOwned = (itemId: string) => {
      // Streakfreezer kann immer wieder gekauft werden (erneuert die 24h)
      if (itemId === 'item_streak_freeze') {
          if (!user.streakFreezeUntil) return false;
          return new Date(user.streakFreezeUntil) > new Date();
      }
      return user.inventory.includes(itemId);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden h-screen">
      <div className="px-6 pt-12 pb-6 bg-white shadow-sm z-10 sticky top-0 md:px-12 md:pt-10">
          <div className="flex justify-between items-center mb-4 max-w-5xl mx-auto w-full">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <ShoppingBag size={32} className="text-blue-500" strokeWidth={2.5} />
                    {t.title}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 font-mono">{timeLeft}</span>
                    </div>
                </div>
            </div>
            <div className="bg-yellow-400 text-yellow-950 px-4 py-2 rounded-2xl font-black shadow-md flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-100 border-2 border-yellow-950 flex items-center justify-center text-[10px]">€</div>
                <span className="text-xl">{user.coins}</span>
            </div>
          </div>

          {/* Rabatt-Einlöse-Bereich */}
          {hasCouponInInventory && (
              <div className="max-w-5xl mx-auto w-full">
                  <button 
                    onClick={() => setApplyDiscount(!applyDiscount)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        applyDiscount 
                        ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200' 
                        : 'bg-orange-50 border-orange-100 text-orange-600'
                    }`}
                  >
                      <div className="flex items-center gap-3">
                          <Ticket size={24} className={applyDiscount ? 'text-white' : 'text-orange-500'} />
                          <div>
                              <p className="font-black text-sm uppercase leading-none">{t.couponAvailableTitle}</p>
                              <p className={`text-[10px] font-bold ${applyDiscount ? 'text-orange-100' : 'text-orange-400'}`}>
                                  {applyDiscount ? t.couponAvailableHintOn : t.couponAvailableHintOff}
                              </p>
                          </div>
                      </div>
                      {applyDiscount ? <CheckCircle2 size={24} /> : <Circle size={24} className="opacity-30" />}
                  </button>
              </div>
          )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32 max-w-5xl mx-auto w-full">
        {/* Specials Section */}
        <div className="mb-12">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Sparkles size={24} className="text-blue-500" />
                {t.specials}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {dailyShopItems.specials.map((item) => {
                    const price = getEffectivePrice(item);
                    const owned = isOwned(item.id);
                    const canAfford = user.coins >= price;
                    const discountVisible = applyDiscount && item.id !== 'item_discount_coupon' && hasCouponInInventory;

                    return (
                        <div key={item.id} className="bg-white p-4 rounded-[2rem] shadow-lg shadow-slate-200/50 border-2 border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                <item.icon className={item.color} size={24} />
                            </div>
                            <h3 className="font-black text-sm text-slate-800 mb-0.5 leading-tight">{(itemTranslations[item.id]?.label) || item.label}</h3>
                            <p className="text-slate-400 text-[10px] font-bold mb-4 px-1 leading-tight h-8 flex items-center justify-center">{(itemTranslations[item.id]?.description) || item.description}</p>
                            
                            {owned && item.id !== 'item_streak_freeze' ? (
                                <button disabled className="w-full bg-emerald-50 text-emerald-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs">
                                    <Check size={16} /> {t.owned}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleBuy(item)}
                                    disabled={!canAfford}
                                    className={`w-full font-black py-3 rounded-xl flex flex-col items-center justify-center gap-0 text-xs shadow-md transition-all active:scale-95 ${
                                        canAfford 
                                        ? 'bg-slate-900 text-white' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {discountVisible && <span className="text-[9px] line-through opacity-50">{item.price} €</span>}
                                    <span>{owned && item.id === 'item_streak_freeze' ? 'Erneuern (' + price + ')' : `${price} ${t.balance}`}</span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Avatars Section */}
        <div className="mb-12">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center"><User size={18} /></div>
                {t.sectionAvatars}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dailyShopItems.avatars.map((item) => {
                    const price = getEffectivePrice(item);
                    const discountVisible = applyDiscount && hasCouponInInventory;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
                            <div className="w-24 h-24 rounded-full bg-slate-50 mb-4 border-4 border-white shadow-sm overflow-hidden">
                                <img src={AVATARS[item.value]} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            {isOwned(item.id) ? (
                                <button disabled className="w-full bg-emerald-50 text-emerald-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                                    <Check size={18} /> {t.owned}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleBuy(item)}
                                    disabled={user.coins < price}
                                    className={`w-full font-black py-3 rounded-xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 text-sm ${
                                        user.coins >= price 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    }`}
                                >
                                    {discountVisible && <span className="text-[10px] line-through opacity-50">{item.price} €</span>}
                                    <span>{price} {t.balance}</span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Themes Section */}
        <div className="mb-8">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center"><Palette size={18} /></div>
                {t.sectionThemes}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dailyShopItems.themes.map((item) => {
                    const price = getEffectivePrice(item);
                    const discountVisible = applyDiscount && hasCouponInInventory;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-between hover:scale-[1.02] transition-transform">
                             <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl ${THEME_COLORS[item.value as ThemeColor]} shadow-md border-4 border-white`}></div>
                                <h3 className="font-black text-lg text-slate-800 capitalize">{item.value}</h3>
                             </div>
                             <div className="w-32">
                                 {isOwned(item.id) ? (
                                    <button disabled className="w-full bg-emerald-50 text-emerald-600 font-bold py-2 rounded-xl flex items-center justify-center gap-1 text-sm">
                                        <Check size={18} /> {t.owned}
                                    </button>
                                 ) : (
                                    <button onClick={() => handleBuy(item)} disabled={user.coins < price} className={`w-full font-bold py-2 flex flex-col items-center justify-center rounded-xl text-sm transition-all active:scale-95 ${user.coins >= price ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                                        {discountVisible && <span className="text-[10px] line-through opacity-50">{item.price} €</span>}
                                        <span>{price} {t.balance}</span>
                                    </button>
                                 )}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};