import React, { useState } from 'react';
import { PiggyBank, Loader2, AlertCircle, Mail, ArrowRight, UserPlus, LogIn, KeyRound, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { Language, getTranslations, LOGIN_LOGO_URL, THEME_COLORS, ThemeColor } from '../types';

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
  
  const t = getTranslations(language).login;

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
            return;
        }
        setLoading(false);
    } catch (err: any) {
        console.error(err);
        setErrorMsg(isResetMode ? (getTranslations(language)?.login?.resetError || "Fehler beim Senden der Email.") : (getTranslations(language)?.login?.loginError || "Das hat nicht geklappt. Bitte prüfe deine Daten."));
        setLoading(false);
    }
  };

  if (verificationSent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 md:bg-slate-100 text-slate-900">
             <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-[2rem] shadow-2xl shadow-[#00B1AD]/20 text-center animate-in zoom-in-95 duration-300">
                 <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm" style={{ backgroundColor: '#00B1AD20', color: '#00B1AD' }}>
                     <Mail size={40} />
                 </div>
                 <h2 className="text-3xl font-black text-slate-900 mb-4">{t.verifyTitle}</h2>
                 <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-left border border-slate-100">
                     <p className="text-slate-500 font-medium text-sm mb-2">
                         {t.verifySentTo}
                     </p>
                     <p className="text-slate-800 font-bold text-lg break-all">
                         {email}
                     </p>
                 </div>
                 <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                     {t.verifyHint}
                 </p>
                 <button 
                    onClick={() => {
                        setVerificationSent(false);
                        setIsRegisterMode(false);
                    }}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                     {t.goToLogin} <ArrowRight size={18} />
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
                  className="w-full h-full object-contain rounded-3xl"
                  alt="Sparify Logo"
                />
            </div>
        ) : (
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4 shadow-xl md:w-32 md:h-32" style={{ backgroundColor: '#00B1AD', boxShadow: '0 20px 25px -5px rgba(0, 177, 173, 0.2)' }}>
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
                    <KeyRound size={24} className="text-slate-400" />
                    {t.resetTitle}
                </>
            ) : isRegisterMode ? (
                <>
                    <UserPlus size={24} className="text-slate-400" />
                    {t.registerTitle}
                </>
            ) : (
                <>
                    <LogIn size={24} className="text-slate-400" />
                    {t.loginTitle}
                </>
            )}
        </h2>

        <p className="text-slate-500 text-center mb-6 text-sm">
            {isResetMode ? t.resetSubtitle : isRegisterMode ? t.registerSubtitle : t.loginSubtitle}
        </p>

        {errorMsg && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 font-medium text-sm">{errorMsg}</p>
            </div>
        )}

        {successMsg && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-green-700 font-medium text-sm">{successMsg}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-slate-700 font-bold text-sm mb-2">{t.email}</label>
                <div className="relative">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 pr-10"
                        placeholder={t.emailPlaceholder}
                        required
                        disabled={loading}
                    />
                    <Mail size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
            </div>

            {!isResetMode && (
                <div>
                    <label className="block text-slate-700 font-bold text-sm mb-2">{t.password}</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 pr-10"
                            placeholder={t.passwordPlaceholder}
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !email || (!isResetMode && !password)}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        {t.loading}
                    </>
                ) : isResetMode ? (
                    <>
                        {t.resetButton} <ArrowRight size={18} />
                    </>
                ) : isRegisterMode ? (
                    <>
                        {t.registerButton} <ArrowRight size={18} />
                    </>
                ) : (
                    <>
                        {t.loginButton} <ArrowRight size={18} />
                    </>
                )}
            </button>
        </form>

        <div className="mt-6 text-center space-y-2">
            {!isResetMode && (
                <button
                    onClick={() => {
                        setIsRegisterMode(!isRegisterMode);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                    }}
                    className="text-slate-500 hover:text-slate-700 font-medium text-sm block"
                >
                    {isRegisterMode ? t.haveAccount : t.noAccount}
                </button>
            )}

            {!isRegisterMode && (
                <button
                    onClick={() => {
                        setIsResetMode(!isResetMode);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                    }}
                    className="text-slate-500 hover:text-slate-700 font-medium text-sm block"
                >
                    {isResetMode ? t.backToLogin : t.forgotPassword}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
