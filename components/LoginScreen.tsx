import React, { useState } from 'react';
import { PiggyBank, Loader2, AlertCircle, Mail, ArrowRight, UserPlus, LogIn, KeyRound, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { Language, TRANSLATIONS, LOGIN_LOGO_URL, THEME_COLORS, ThemeColor } from '../types';

interface LoginScreenProps {
  onLogin: (email: string, pass: string, isRegister: boolean) => Promise<any>;
  onResetPassword?: (email: string) => Promise<any>;
  language: Language;
  accentColor: ThemeColor;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onResetPassword, language, accentColor }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const t = TRANSLATIONS[language].login;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
        if (isResetMode && onResetPassword) {
            await onResetPassword(email);
            setSuccessMsg(t.resetSuccess);
            setLoading(false);
            return;
        }

        const result = await onLogin(email, password, isRegisterMode);
        if (result && result.success && result.needsVerification) {
            setVerificationSent(true);
            setLoading(false);
        }
    } catch (err: any) {
        console.error(err);
        setErrorMsg(isResetMode ? "Fehler beim Senden der Email." : "Das hat nicht geklappt. Bitte prüfe deine Daten.");
        setLoading(false);
    }
  };

  if (verificationSent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 md:bg-slate-100 text-slate-900">
             <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-[2rem] shadow-2xl shadow-emerald-100 text-center animate-in zoom-in-95 duration-300">
                 <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-sm">
                     <Mail size={40} />
                 </div>
                 <h2 className="text-3xl font-black text-slate-900 mb-4">Fast geschafft!</h2>
                 <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-left border border-slate-100">
                     <p className="text-slate-500 font-medium text-sm mb-2">
                         Wir haben eine E-Mail geschickt an:
                     </p>
                     <p className="text-slate-800 font-bold text-lg break-all">
                         {email}
                     </p>
                 </div>
                 <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                     Bitte klicke auf den Link in der E-Mail, um dein Sparschwein zu aktivieren! 🐷
                 </p>
                 <button 
                    onClick={() => {
                        setVerificationSent(false);
                        setIsRegisterMode(false);
                    }}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                     Zum Login <ArrowRight size={18} />
                 </button>
             </div>
        </div>
      )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 md:bg-slate-100 text-slate-900 md:flex-row md:gap-16">
      <div className="flex flex-col items-center mb-6 md:mb-0 md:items-start">
        
        {LOGIN_LOGO_URL ? (
            <div className="w-32 h-32 md:w-48 md:h-48 mb-4 drop-shadow-xl flex items-center justify-center">
                <img 
                  src={LOGIN_LOGO_URL}
                  className="w-full h-full object-contain"
                  alt="Sparify Logo"
                />
            </div>
        ) : (
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20 md:w-32 md:h-32">
              <PiggyBank size={48} className="text-white md:w-16 md:h-16" />
            </div>
        )}

        <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Sparify</h1>
        <p className="text-slate-500 mt-2 font-medium md:text-xl">{t.slogan}</p>
      </div>

      <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-[2rem] shadow-2xl shadow-slate-200/50 mb-6 md:mb-0">
        
        {isResetMode && (
            <button 
                onClick={() => {
                    setIsResetMode(false);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                }}
                className="mb-4 text-slate-400 hover:text-slate-600 flex items-center gap-1 font-bold text-sm"
            >
                <ChevronLeft size={16} /> {t.backToLogin}
            </button>
        )}

        <h2 className="text-2xl font-bold text-center mb-1 flex items-center justify-center gap-2">
            {isResetMode ? (
                <>
                    <KeyRound size={24} className="text-blue-500" />
                    {t.resetTitle}
                </>
            ) : (
                isRegisterMode ? 'Neues Konto' : t.title
            )}
        </h2>

        {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-500 text-sm font-bold">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
            </div>
        )}

        {successMsg && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-600 text-sm font-bold">
                <Mail size={18} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              required
              className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-slate-200 placeholder-slate-400 font-bold"
            />
          </div>
          
          {!isResetMode && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{t.password}</label>
                <div className="relative">
                    <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-slate-200 placeholder-slate-400 font-bold pr-12"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                
                {!isRegisterMode && (
                    <button 
                        type="button"
                        onClick={() => {
                            setIsResetMode(true);
                            setErrorMsg(null);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-blue-500 mt-2 ml-1"
                    >
                        {t.forgotPassword}
                    </button>
                )}
              </div>
          )}

          <button
            type="submit"
            disabled={loading || (isResetMode && !!successMsg)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all mt-4 flex items-center justify-center text-lg disabled:opacity-70 disabled:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={24} />
                Lade...
              </>
            ) : (
              isResetMode ? t.resetButton : (isRegisterMode ? t.registerBtn : t.button)
            )}
          </button>
        </form>

        {!isResetMode && (
            <div className="mt-6 pt-6 border-t border-slate-100">
                <button 
                    onClick={() => {
                        setIsRegisterMode(!isRegisterMode);
                        setErrorMsg(null);
                    }}
                    className="w-full text-slate-500 font-bold text-sm hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                    {isRegisterMode ? (
                        <>
                            <LogIn size={16} /> Ich habe schon ein Konto
                        </>
                    ) : (
                        <>
                            <UserPlus size={16} /> Neues Konto erstellen
                        </>
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};