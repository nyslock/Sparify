
import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Zap, Radio, Coins, ShieldCheck, Palette, X, Sparkles, Smartphone, Usb } from 'lucide-react';
import { Language, TRANSLATIONS, ThemeColor, THEME_COLORS } from '../types';

interface BoxTutorialScreenProps {
  language: Language;
  accentColor: ThemeColor;
  onFinish: () => void;
  onSkip: () => void;
}

export const BoxTutorialScreen: React.FC<BoxTutorialScreenProps> = ({ language, accentColor, onFinish, onSkip }) => {
  const [step, setStep] = useState(0);
  const steps = TRANSLATIONS[language].boxTutorial;
  const isLastStep = step === steps.length - 1;

  const icons = [
    <Usb size={80} className="text-blue-500" />,
    <Radio size={80} className="text-indigo-500 animate-pulse" />,
    <Coins size={80} className="text-yellow-500" />,
    <ShieldCheck size={80} className="text-emerald-500" />,
    <Palette size={80} className="text-pink-500" />
  ];

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-hidden">
      {/* Background decoration */}
      <div className={`absolute top-0 left-0 w-full h-1/2 ${THEME_COLORS[accentColor]} opacity-5 rounded-b-[5rem] -z-10`}></div>
      
      {/* Skip Button */}
      <div className="p-6 flex justify-end">
        <button 
          onClick={onSkip} 
          className="text-slate-400 font-bold flex items-center gap-1 hover:text-slate-600 transition-colors"
        >
          Skip <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto w-full">
        {/* Step Indicator */}
        <div className="flex gap-2 mb-10">
          {steps.map((_: any, i: number) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? `w-8 ${THEME_COLORS[accentColor]}` : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Illustration Placeholder / Icon */}
        <div className="w-48 h-48 bg-slate-50 rounded-[3rem] shadow-inner flex items-center justify-center mb-10 relative group">
           <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/50 rounded-[3rem] pointer-events-none"></div>
           <div className="transition-transform duration-500 group-hover:scale-110">
              {icons[step]}
           </div>
           
           {/* Visual cues for step 2 (Connection) */}
           {step === 1 && (
             <div className="absolute -right-4 -top-4 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-blue-500">
                <Smartphone size={24} />
             </div>
           )}

           {/* Decor for step 5 */}
           {step === 4 && (
             <div className="absolute -right-2 -bottom-2 animate-bounce">
                <Sparkles size={32} className="text-yellow-400" />
             </div>
           )}
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500" key={step}>
          <h2 className="text-3xl font-black text-slate-900 mb-4 leading-tight">
            {steps[step].heading}
          </h2>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
            {steps[step].bodyText}
          </p>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-8 pb-12 max-w-lg mx-auto w-full">
        <button 
          onClick={handleNext}
          className={`w-full py-5 rounded-[2rem] font-black text-xl text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${THEME_COLORS[accentColor]}`}
        >
          {isLastStep ? 'Starten!' : 'Weiter'}
          <ArrowRight size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
