import React from 'react';
import { Home, Settings, Plus, GraduationCap, ShoppingBag } from 'lucide-react';
import { ThemeColor, THEME_COLORS, ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  accentColor: ThemeColor;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView, accentColor }) => {
  
  // Die Leiste schwebt NUR im LEARN Modus, sonst klebt sie unten fest.
  const isFloating = currentView === 'LEARN';

  return (
    <div 
        className={`fixed z-50 md:hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isFloating 
                ? 'bottom-6 left-6 right-6' // Schwebend (Learn)
                : 'bottom-0 left-0 right-0' // Fest am Boden (Dashboard, etc.)
        }`}
    >
      <div className={`bg-white flex justify-between items-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isFloating
            ? 'rounded-[2.5rem] shadow-2xl shadow-slate-300/60 p-2 h-20 border border-slate-100' // Schwebendes Design
            : 'rounded-t-[2rem] shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] px-4 pt-2 pb-8 h-24 border-t border-slate-100' // Festes Design (höher für Safe Area)
      }`}>
        
        {/* Home Tab */}
        <button 
          onClick={() => onChangeView('DASHBOARD')}
          className={`flex-1 flex flex-col items-center justify-center h-full rounded-[2rem] transition-all duration-300 ${
            currentView === 'DASHBOARD' 
                ? (isFloating ? 'bg-slate-100 text-slate-900' : 'text-slate-900') 
                : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {/* Indikator Linie nur im festen Modus */}
          {!isFloating && currentView === 'DASHBOARD' && <div className="w-8 h-1 bg-slate-900 rounded-full mb-1 animate-in zoom-in"></div>}
          <Home size={24} strokeWidth={currentView === 'DASHBOARD' ? 3 : 2.5} />
        </button>

        {/* Learn Tab */}
        <button 
          onClick={() => onChangeView('LEARN')}
          className={`flex-1 flex flex-col items-center justify-center h-full rounded-[2rem] transition-all duration-300 ${
            currentView === 'LEARN' 
                ? (isFloating ? 'bg-slate-100 text-slate-900' : 'text-slate-900') 
                : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <GraduationCap size={26} strokeWidth={currentView === 'LEARN' ? 3 : 2.5} />
        </button>

        {/* FAB - In beiden Modi leicht versetzt */}
        <div className={`relative mx-2 transition-all duration-500 ${isFloating ? '-top-8' : '-top-10'}`}>
            <button
            onClick={() => onChangeView('SCANNER')}
            className={`w-16 h-16 ${THEME_COLORS[accentColor]} rounded-full shadow-xl shadow-slate-400/40 flex items-center justify-center text-white active:scale-95 transition-transform ring-4 ring-white`}
            >
            <Plus size={32} strokeWidth={3} />
            </button>
        </div>

        {/* Shop Tab */}
        <button 
          onClick={() => onChangeView('SHOP')}
          className={`flex-1 flex flex-col items-center justify-center h-full rounded-[2rem] transition-all duration-300 ${
            currentView === 'SHOP' 
                ? (isFloating ? 'bg-slate-100 text-slate-900' : 'text-slate-900') 
                : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {!isFloating && currentView === 'SHOP' && <div className="w-8 h-1 bg-slate-900 rounded-full mb-1 animate-in zoom-in"></div>}
          <ShoppingBag size={24} strokeWidth={currentView === 'SHOP' ? 3 : 2.5} />
        </button>

        {/* Settings Tab */}
        <button 
          onClick={() => onChangeView('SETTINGS')}
          className={`flex-1 flex flex-col items-center justify-center h-full rounded-[2rem] transition-all duration-300 ${
            currentView === 'SETTINGS' 
                ? (isFloating ? 'bg-slate-100 text-slate-900' : 'text-slate-900') 
                : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {!isFloating && currentView === 'SETTINGS' && <div className="w-8 h-1 bg-slate-900 rounded-full mb-1 animate-in zoom-in"></div>}
          <Settings size={24} strokeWidth={currentView === 'SETTINGS' ? 3 : 2.5} />
        </button>
      </div>
    </div>
  );
};