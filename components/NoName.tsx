// ...existing code...
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Language, getTranslations, User } from '../types';

interface CasinoScreenProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onClose: () => void;
  language: Language;
}

export const CasinoScreen: React.FC<CasinoScreenProps> = ({ user, onUpdateUser, onClose, language }) => {
  const t = getTranslations(language);

  const GRID_SIZE = 5;
  const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

  const [selectedGame, setSelectedGame] = useState<'menu' | 'mines' | 'dice' | 'slots'>('menu');
  const [betAmount, setBetAmount] = useState<number>(10);

  // Mines state
  const [minesCount, setMinesCount] = useState(3);
  const [mines, setMines] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [message, setMessage] = useState('');

  // Dice state
  const [diceState, setDiceState] = useState<'idle' | 'rolling' | 'result'>('idle');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceWinAmount, setDiceWinAmount] = useState(0);

  // Slots state
  const SLOT_SYMBOLS = ['🍒','🍋','🔔','7️⃣','💎','🍀'];
  const REELS_COUNT = 4;
  const [reels, setReels] = useState<number[]>(Array(REELS_COUNT).fill(0));
  const [spinning, setSpinning] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  const placeMines = (count: number) => {
    const indices = new Set<number>();
    while (indices.size < count) indices.add(Math.floor(Math.random() * TOTAL_CELLS));
    return Array.from(indices);
  };

  // clamp helpers for bet input
  const BET_MAX = Math.max(1, Math.min(user.coins));
  const clampBet = (v: number) => Math.max(1, Math.min(BET_MAX, Math.floor(v || 0)));

  const startRound = (deduct = true) => {
    if (user.coins < betAmount) {
      setMessage('Nicht genug Coins');
      return false;
    }
    if (deduct) onUpdateUser({ ...user, coins: user.coins - betAmount });
    return true;
  };

  // Mines logic
  const startMines = () => {
    if (!startRound()) return;
    setMines(placeMines(minesCount));
    setRevealed([]);
    setExploded(false);
    setIsPlaying(true);
    setMultiplier(1);
    setMessage('Viel Glück!');
  };

  const handleReveal = (idx: number) => {
    if (!isPlaying || exploded || revealed.includes(idx)) return;
    if (mines.includes(idx)) {
      setExploded(true);
      setIsPlaying(false);
      setMessage('💥 Verloren!');
      return;
    }
    const newRevealed = [...revealed, idx];
    setRevealed(newRevealed);
    const factor = TOTAL_CELLS / (TOTAL_CELLS - minesCount);
    const newMultiplier = +(multiplier * factor).toFixed(2);
    setMultiplier(newMultiplier);
    setMessage(`Sicher! x${newMultiplier}`);
  };

  const cashOut = () => {
    if (!isPlaying) return;
    const winnings = Math.floor(betAmount * multiplier);
    onUpdateUser({ ...user, coins: user.coins + winnings });
    setIsPlaying(false);
    setMessage(`🎉 Gewonnen: +${winnings} Coins`);
  };

  const resetMines = () => {
    setIsPlaying(false);
    setExploded(false);
    setMines([]);
    setRevealed([]);
    setMultiplier(1);
    setMessage('');
  };

  // Dice logic
  const playDice = (choice: 'higher' | 'lower') => {
    if (!startRound()) return;
    setDiceState('rolling');
    setMessage('Würfeln...');
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceResult(roll);
      const targetNumber = 3;
      const won = (choice === 'higher' && roll > targetNumber) || (choice === 'lower' && roll < targetNumber);
      const earnings = won ? Math.floor(betAmount * 1.5) : 0;
      setDiceWinAmount(earnings);
      setDiceState('result');
      setMessage(won ? `🎉 Gewonnen! +${earnings} Coins` : '😢 Verloren!');
      if (won) onUpdateUser({ ...user, coins: user.coins + earnings });
    }, 900 + Math.random() * 800);
  };

  // Slots logic
  const spinSlots = () => {
    if (spinning) return;
    if (!startRound()) return;

    setSpinning(true);
    setSlotMessage('Drehen...');

    const intervalMs = 80;
    const totalDuration = 1300 + Math.random() * 700;
    const intervalId = setInterval(() => {
      setReels(prev => prev.map(() => Math.floor(Math.random() * SLOT_SYMBOLS.length)));
    }, intervalMs);

    setTimeout(() => {
      clearInterval(intervalId);
      const final = Array(REELS_COUNT).fill(0).map(() => Math.floor(Math.random() * SLOT_SYMBOLS.length));
      setReels(final);

      const counts: Record<number, number> = {};
      final.forEach(i => (counts[i] = (counts[i] || 0) + 1));
      const freq = Object.values(counts).sort((a,b)=>b-a);

      let slotMultiplier = 0;
      if (freq[0] === REELS_COUNT) slotMultiplier = 12;
      else if (freq[0] === 3) slotMultiplier = 5;
      else if (freq.length === 2 && freq[0] === 2 && freq[1] === 2) slotMultiplier = 2;
      else if (freq[0] === 2) slotMultiplier = 1;
      else slotMultiplier = 0;

      const winnings = Math.floor(betAmount * slotMultiplier);
      if (winnings > 0) {
        onUpdateUser({ ...user, coins: user.coins + winnings });
        setSlotMessage(`🎉 Gewonnen +${winnings} Coins (x${slotMultiplier})`);
        setMessage(`🎉 Slots: +${winnings} Coins`);
      } else {
        setSlotMessage('😢 Verloren!');
        setMessage('😢 Slots verloren');
      }

      setSpinning(false);
    }, totalDuration);
  };

  const resetAll = () => {
    resetMines();
    setDiceState('idle');
    setDiceResult(null);
    setDiceWinAmount(0);
    setReels(Array(REELS_COUNT).fill(0));
    setSpinning(false);
    setSlotMessage('');
    setMessage('');
  };

  /* UI helpers: colourful panels per game, menu shows three cards.
     Each game is rendered as its own "window" (centered card). */

  const MenuView = () => (
    <div className="grid gap-6 sm:grid-cols-3">
      <div onClick={() => { resetAll(); setSelectedGame('mines'); }} className="cursor-pointer p-6 rounded-2xl shadow-xl transform hover:scale-105 transition bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400 text-white">
        <h2 className="text-2xl font-extrabold">Mines</h2>
        <p className="mt-2 opacity-90">Wähle Felder, vermeide Minen. Hohe Spannung!</p>
      </div>

      <div onClick={() => { resetAll(); setSelectedGame('dice'); }} className="cursor-pointer p-6 rounded-2xl shadow-xl transform hover:scale-105 transition bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
        <h2 className="text-2xl font-extrabold">Dice</h2>
        <p className="mt-2 opacity-90">Wette auf Higher / Lower. Schnelles Glück.</p>
      </div>

      <div onClick={() => { resetAll(); setSelectedGame('slots'); }} className="cursor-pointer p-6 rounded-2xl shadow-xl transform hover:scale-105 transition bg-gradient-to-br from-green-400 via-emerald-500 to-cyan-400 text-white">
        <h2 className="text-2xl font-extrabold">Slots</h2>
        <p className="mt-2 opacity-90">4 Walzen gleichzeitig drehen — große Gewinne!</p>
      </div>
    </div>
  );

  const GameWindowWrapper: React.FC<{title: string; colorClass: string; onBack?: () => void}> = ({ children, title, colorClass, onBack }) => (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
      <div className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden ${colorClass}`}>
        <div className="flex items-center justify-between px-6 py-4 bg-black/30">
          <div className="flex items-center gap-4">
            <button onClick={() => { onBack ? onBack() : setSelectedGame('menu'); }} className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center">←</button>
            <h3 className="text-xl font-extrabold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-lg bg-white text-black font-bold">{user.coins} €</div>
            <button onClick={onClose} className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center"><X size={18} /></button>
          </div>
        </div>
        <div className="p-6 bg-white/5">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex flex-col">
      <div className="px-6 pt-8 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">🎰 {t.casino?.title || 'Casino'}</h1>
          <p className="text-slate-300 text-sm">Bunte Spiele - Jedes in eigenem Fenster</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-lg bg-amber-400 font-black text-slate-900">{betAmount} €</div>
          <button onClick={onClose} className="w-12 h-12 bg-white/5 rounded-xl text-white flex items-center justify-center"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32 max-w-5xl mx-auto w-full">
        {selectedGame === 'menu' && (
          <>
            <div className="mb-6 flex items-center gap-3">
              {[10,25,50,100].map(a => (
                <button key={a} onClick={() => setBetAmount(a)} className={`px-3 py-2 rounded-lg font-bold ${betAmount===a ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{a}</button>
              ))}
              <input type="range" min={1} max={BET_MAX} value={betAmount} onChange={(e)=>setBetAmount(Number(e.target.value))} className="ml-4 w-1/3" />
              {/* neues Eingabefeld für den Einsatz */}
              <input
                type="number"
                min={1}
                max={BET_MAX}
                value={betAmount}
                onChange={(e) => {
                  const v = clampBet(Number(e.target.value));
                  setBetAmount(v);
                }}
                className="ml-4 w-32 px-3 py-2 rounded-lg bg-white/10 text-white"
                aria-label="Einsatz eingeben"
              />
            </div>
            <MenuView />
          </>
        )}

        {selectedGame === 'mines' && (
          <GameWindowWrapper title="Mines" colorClass="bg-gradient-to-br from-pink-600 via-rose-500 to-yellow-400" onBack={() => setSelectedGame('menu')}>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="bg-white/10 p-4 rounded-lg">
                <label className="text-sm text-white font-bold">Minen</label>
                <div className="flex gap-2 mt-2">
                  {[1,3,5,8,10].map(m=> (
                    <button key={m} onClick={() => setMinesCount(m)} disabled={isPlaying} className={`px-3 py-2 rounded-lg font-bold ${minesCount===m ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{m}</button>
                  ))}
                </div>
                <p className="text-xs text-white/80 mt-2">Mehr Minen → mehr Risiko & Auszahlung.</p>
              </div>

              <div className="bg-white/10 p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="text-sm text-white/90 font-bold">Aktueller Multiplikator</div>
                  <div className="text-2xl font-extrabold text-yellow-200">x{multiplier.toFixed(2)}</div>
                </div>
                <div className="flex gap-2 mt-4">
                  {!isPlaying && <button onClick={startMines} className="flex-1 py-2 rounded-lg bg-emerald-300 font-black">Start</button>}
                  {isPlaying && <button onClick={cashOut} className="flex-1 py-2 rounded-lg bg-amber-300 font-black">Cashout</button>}
                  <button onClick={resetMines} className="px-3 py-2 rounded-lg bg-white/10">Reset</button>
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded-lg">
                <div className="text-sm text-white/90 font-bold">Einsatz</div>
                <div className="text-2xl font-extrabold text-white mt-2">{betAmount} Coins</div>
                <div className="mt-3 text-sm text-white/80">Coins: {user.coins}</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 grid grid-cols-5 gap-3">
              {Array.from({length: TOTAL_CELLS}).map((_, idx) => {
                const isRevealed = revealed.includes(idx) || (exploded && mines.includes(idx));
                const showMine = exploded && mines.includes(idx);
                return (
                  <button key={idx} onClick={() => handleReveal(idx)} disabled={!isPlaying || isRevealed} className={`h-14 rounded-lg ${isRevealed? (showMine? 'bg-red-600 text-white':'bg-emerald-500 text-white') : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isRevealed ? (showMine ? '💣' : '✔') : ''}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-white">
              <p>{message}</p>
              <p className="text-sm mt-2">Minen: {minesCount} • Felder: {TOTAL_CELLS}</p>
            </div>
          </GameWindowWrapper>
        )}

        {selectedGame === 'dice' && (
          <GameWindowWrapper title="Dice" colorClass="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" onBack={() => setSelectedGame('menu')}>
            <div className="grid gap-4">
              <div className="flex gap-3">
                <button onClick={() => playDice('higher')} className="flex-1 py-3 rounded-lg bg-blue-400 font-black text-white">Roll Higher</button>
                <button onClick={() => playDice('lower')} className="flex-1 py-3 rounded-lg bg-red-400 font-black text-white">Roll Lower</button>
                <button onClick={() => { setDiceState('idle'); setDiceResult(null); setDiceWinAmount(0); }} className="px-4 py-3 rounded-lg bg-white/10">Reset</button>
              </div>

              <div className="bg-white/5 p-6 rounded-lg text-center">
                <div className="text-white/90 font-bold">{diceState === 'rolling' ? 'Würfeln...' : diceState === 'result' ? message : 'Wähle Higher / Lower'}</div>
                {diceResult !== null && <div className="text-6xl font-extrabold text-yellow-300 mt-4">{diceResult}</div>}
                {diceState === 'result' && (
                  <div className="mt-4 flex justify-center gap-4">
                    <div className="bg-white/10 px-4 py-2 rounded-lg">Einsatz -{betAmount}</div>
                    <div className="bg-emerald-400 px-4 py-2 rounded-lg">Gewinn +{diceWinAmount}</div>
                  </div>
                )}
              </div>

              <div className="text-white text-sm">Coins: {user.coins}</div>
            </div>
          </GameWindowWrapper>
        )}

        {selectedGame === 'slots' && (
          <GameWindowWrapper title="Slots" colorClass="bg-gradient-to-br from-green-500 via-emerald-400 to-cyan-300" onBack={() => setSelectedGame('menu')}>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {reels.map((r, i) => (
                  <div key={i} className={`text-4xl md:text-6xl p-4 rounded-lg flex items-center justify-center ${spinning ? 'animate-bounce bg-white/10' : 'bg-white/20'}`}>
                    {SLOT_SYMBOLS[r]}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={spinSlots} disabled={spinning} className="flex-1 py-3 rounded-lg bg-indigo-700 text-white font-black">{spinning ? 'Drehen...' : 'Spin Slots'}</button>
                <button onClick={() => { setReels(Array(REELS_COUNT).fill(0)); setSlotMessage(''); }} className="px-4 py-3 rounded-lg bg-white/10">Reset</button>
              </div>

              <div className="bg-white/5 p-3 rounded-lg text-center">
                <div className="text-white">{slotMessage || 'Drücke Spin um zu spielen'}</div>
                {!spinning && <div className="mt-2 text-sm">Einsatz: -{betAmount} • Coins: {user.coins}</div>}
              </div>
            </div>
          </GameWindowWrapper>
        )}
      </div>
    </div>
  );
};
// ...existing code...