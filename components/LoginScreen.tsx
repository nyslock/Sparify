import React, { useState } from 'react';
import { PiggyBank, Loader2, AlertCircle, Mail, ArrowRight, UserPlus, LogIn, KeyRound, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { Language, getTranslations, LOGIN_LOGO_URL, THEME_COLORS, ThemeColor } from '../types';

interface LoginScreenProps {
  onLogin: (email: string, pass: string, isRegister: boolean) => Promise<any>;
  onResetPassword?: (email: string) => Promise<any>;
  language: Language;
  accentColor?: ThemeColor;
  isPasswordRecoveryMode?: boolean;
  recoveryEmail?: string | null;
  onRecoverySubmit?: (newPassword: string) => Promise<any>;
  onRecoveryCancel?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  onResetPassword, 
  language, 
  accentColor = 'primary',
  isPasswordRecoveryMode,
  recoveryEmail,
  onRecoverySubmit,
  onRecoveryCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Password recovery mode
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const t = getTranslations(language).login;
  const accentHex = accentColor === 'primary' ? '#00B1B7' : THEME_COLORS[accentColor] || '#00B1B7';

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Bitte fülle alle Felder aus');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Die Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);
    try {
      await onRecoverySubmit(newPassword);
      setSuccessMsg('Passwort erfolgreich geändert');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Aktualisieren des Passworts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
        // RESET PASSWORD FLOW
        if (isResetMode && onResetPassword) {
            await onResetPassword(email);
            setSuccessMsg(t.resetSuccess);
            setLoading(false);
            return;
        }

        // LOGIN / REGISTER FLOW
        const result = await onLogin(email, password, isRegisterMode);
        if (result && result.success && result.needsVerification) {
            setVerificationSent(true);
            setLoading(false);
            return;
        }
        setLoading(false);
    } catch (err: any) {
        console.error(err);
        setErrorMsg(isResetMode ? (t.resetError || "Fehler beim Senden der Email.") : (t.loginError || "Das hat nicht geklappt. Bitte prüfe deine Daten."));
        setLoading(false);
    }
  };

  if (verificationSent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 md:bg-slate-100 text-slate-900">
             <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-[2rem] shadow-2xl text-center animate-in zoom-in-95 duration-300" style={{ boxShadow: `0 20px 25px -5px rgba(0, 177, 183, 0.15)` }}>
                 <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm" style={{ backgroundColor: `${accentHex}30`, color: accentHex }}>
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
                  className="w-full h-full object-contain"
                  style={{ borderRadius: '48px' }}
                  alt="Sparify Logo"
                />
            </div>
        ) : (
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4 shadow-xl md:w-32 md:h-32" style={{ backgroundColor: accentHex, boxShadow: `0 20px 25px -5px ${accentHex}33` }}>
              <PiggyBank size={48} className="text-white md:w-16 md:h-16" />
            </div>
        )}

        <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Sparify</h1>
        <p className="text-slate-500 mt-2 font-medium md:text-xl">{t.slogan}</p>
      </div>

      <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-[2rem] shadow-2xl shadow-slate-200/50 mb-6 md:mb-0">
        
        {/* PASSWORD RECOVERY FORM */}
        {isPasswordRecoveryMode && recoveryEmail && (
          <>
            <button 
              onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setErrorMsg(null);
                setSuccessMsg(null);
                if (onRecoveryCancel) onRecoveryCancel();
              }}
              className="mb-4 text-slate-400 hover:text-slate-600 flex items-center gap-1 font-bold text-sm"
            >
              <ChevronLeft size={16} /> {t.backToLogin}
            </button>

            <h2 className="text-2xl font-black text-slate-900 mb-6">Passwort zurücksetzen</h2>

            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
              <p className="text-slate-500 font-medium text-sm mb-1">E-Mail</p>
              <p className="text-slate-800 font-bold break-all">{recoveryEmail}</p>
            </div>

            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              {/* New Password Field */}
              <div>
                <label className="block text-slate-600 font-bold text-sm mb-2">Neues Passwort</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-slate-600 font-bold text-sm mb-2">Passwort bestätigen</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {successMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                {loading ? "Wird aktualisiert..." : "Passwort aktualisieren"}
              </button>
            </form>

            <p className="text-center text-slate-500 text-xs mt-4">
              Dein Passwort wird sicher verschlüsselt gespeichert.
            </p>
          </>
        )}

        <h2 className="text-2xl font-bold text-center mb-1 flex items-center justify-center gap-2">
            {isResetMode ? (
                <>
                    <KeyRound size={24} style={{ color: accentHex }} />
                    {t.resetTitle}
                </>
            ) : isRegisterMode ? (
                <>
                    <UserPlus size={24} style={{ color: accentHex }} />
                    {t.registerTitle}
                </>
            ) : (
                <>
                    <LogIn size={24} style={{ color: accentHex }} />
                    {t.title}
                </>
            )}
        </h2>

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

        {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-500 text-sm font-bold">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
            </div>
        )}

        {successMsg && (
            <div className="mt-4 p-3 rounded-xl flex items-start gap-3 text-sm font-bold" style={{ backgroundColor: `${accentHex}25`, border: `2px solid ${accentHex}`, color: accentHex }}>
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
              disabled={loading}
              className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all border border-slate-200 placeholder-slate-400 font-bold disabled:opacity-50"
              style={{ focusRing: `2px solid ${accentHex}` }}
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
                    disabled={loading}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all border border-slate-200 placeholder-slate-400 font-bold pr-12 disabled:opacity-50"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        disabled={loading}
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
                        className="text-xs font-bold mt-2 ml-1 transition-colors"
                        style={{ color: accentHex }}
                    >
                        {t.forgotPassword}
                    </button>
                )}
              </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || (!isResetMode && !password)}
            className="w-full text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all mt-4 flex items-center justify-center text-lg disabled:opacity-70 disabled:scale-100"
            style={{ backgroundColor: accentHex, boxShadow: `0 15px 30px -5px ${accentHex}40` }}
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
                    className="w-full font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    style={{ color: accentHex }}
                >
                    {isRegisterMode ? (
                        <>
                            <LogIn size={16} /> {t.alreadyHaveAccount}
                        </>
                    ) : (
                        <>
                            <UserPlus size={16} /> {t.createNewAccount}
                        </>
                    )}
                </button>
            </div>
        )}
      </div>
      
    </div>
  );
};
