import React, { useState, useMemo } from 'react';
import { Heart, Flame, Zap, Check, Lock, Play, Star, X, Coins, ArrowRight, ArrowLeft, Gamepad2, ShieldAlert, PiggyBank, Smile, Clock, Flag, Globe, ShoppingBasket, School, TrendingUp, AlertTriangle, Wallet, RotateCcw, Tag, Hourglass, Calculator, Briefcase, Percent, PieChart, Landmark, LineChart, ShieldCheck, ZapOff, Snowflake, Shield, Gift, Trophy, Target } from 'lucide-react';
import { Language, getTranslations, ThemeColor, User, AppMode } from '../types';

interface Level {
  id: string;
  title: string;
  type: 'lesson' | 'game' | 'quiz';
  icon: 'star' | 'zap' | 'check' | 'game' | 'calc';
  position: 'left' | 'center' | 'right';
  contentId: string;
  reward: number; 
  duration: string; 
}

interface Section {
    id: string;
    title: string;
    color: string;
    levels: Level[];
}

interface Slide {
    type: 'slide';
    title: string;
    text: string;
    icon?: React.ReactNode;
}

interface Question {
    type: 'question';
    question: string;
    options: { text: string; correct: boolean }[];
    feedbackSuccess: string;
    feedbackError: string;
}

type LevelContent = (Slide | Question)[];

interface LearnScreenProps {
  language: Language;
  accentColor: ThemeColor;
  user: User;
  onCompleteLevel: (levelId: string, rewardAmount: number) => void;
  onLevelStart: () => void;
  onLevelEnd: () => void;
  appMode?: AppMode;
}

export const LearnScreen: React.FC<LearnScreenProps> = ({ language, accentColor, user, onCompleteLevel, onLevelStart, onLevelEnd, appMode = 'kids' }) => {
  const t = getTranslations(language).learn;
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [quizAnswerState, setQuizAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const isStreakFrozen = user.streakFreezeUntil ? new Date(user.streakFreezeUntil) > new Date() : false;

  const SECTIONS: Section[] = useMemo(() => {
    if (appMode === 'adult') {
        return [
            {
                id: 'adult_math',
                title: 'Finanz-Mathematik & Strategie',
                color: 'bg-slate-800',
                levels: [
                    { id: 'p_math_1', title: 'Zinseszins-Magie', type: 'quiz', icon: 'calc', position: 'center', contentId: 'c_adult_math_1', reward: 50, duration: '5 Min' },
                    { id: 'p_math_2', title: 'Inflation & Kaufkraft', type: 'lesson', icon: 'zap', position: 'left', contentId: 'c_adult_math_2', reward: 50, duration: '3 Min' },
                    { id: 'p_math_3', title: 'Optimale Sparquote', type: 'quiz', icon: 'calc', position: 'right', contentId: 'c_adult_math_3', reward: 75, duration: '5 Min' },
                    { id: 'p_crash', title: 'Börsenpsychologie', type: 'lesson', icon: 'zap', position: 'center', contentId: 'c_adult_crash', reward: 100, duration: '6 Min' },
                    { id: 'p_compound', title: 'Langfristiges Wachstum', type: 'quiz', icon: 'calc', position: 'left', contentId: 'c_adult_compound', reward: 120, duration: '7 Min' },
                    { id: 'p_risk', title: 'Risiko-Management', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_adult_risk', reward: 150, duration: '8 Min' },
                    { id: 'p_divers', title: 'Diversifikation', type: 'quiz', icon: 'calc', position: 'center', contentId: 'c_adult_divers', reward: 180, duration: '9 Min' },
                    { id: 'p_tax', title: 'Steuervorteile', type: 'lesson', icon: 'zap', position: 'left', contentId: 'c_adult_tax', reward: 200, duration: '10 Min' }
                ]
            },
            {
                id: 'adult_invest',
                title: 'Investment-Struktur',
                color: 'bg-indigo-700',
                levels: [
                    { id: 'p_bud_1', title: '50-30-20 Meisterschaft', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_adult_bud_1', reward: 50, duration: '4 Min' },
                    { id: 'p_inv_etf', title: 'ETF-Weltportfolio', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_adult_etf', reward: 120, duration: '7 Min' },
                    { id: 'p_inv_crypto', title: 'Krypto-Risiken', type: 'quiz', icon: 'zap', position: 'right', contentId: 'c_adult_crypto', reward: 150, duration: '8 Min' },
                    { id: 'p_inv_bonds', title: 'Anleihen verstehen', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_adult_bonds', reward: 100, duration: '6 Min' },
                    { id: 'p_inv_real', title: 'Immobilien-Investment', type: 'quiz', icon: 'calc', position: 'left', contentId: 'c_adult_real', reward: 180, duration: '9 Min' },
                    { id: 'p_inv_passive', title: 'Passive vs Active', type: 'lesson', icon: 'zap', position: 'right', contentId: 'c_adult_passive', reward: 140, duration: '7 Min' },
                    { id: 'p_inv_psych', title: 'Behavioral Finance', type: 'quiz', icon: 'calc', position: 'center', contentId: 'c_adult_psych', reward: 200, duration: '10 Min' }
                ]
            },
            {
                id: 'adult_advanced',
                title: 'Fortgeschrittene Finanzen',
                color: 'bg-emerald-700',
                levels: [
                    { id: 'p_adv_port', title: 'Portfolio-Optimierung', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_adult_port', reward: 250, duration: '12 Min' },
                    { id: 'p_adv_tax_strat', title: 'Steuerstrategien', type: 'quiz', icon: 'calc', position: 'left', contentId: 'c_adult_tax_strat', reward: 300, duration: '15 Min' },
                    { id: 'p_adv_retire', title: 'Altersvorsorge-Planung', type: 'lesson', icon: 'zap', position: 'right', contentId: 'c_adult_retire', reward: 350, duration: '18 Min' },
                    { id: 'p_adv_insure', title: 'Versicherungsstrategie', type: 'quiz', icon: 'calc', position: 'center', contentId: 'c_adult_insure', reward: 280, duration: '14 Min' },
                    { id: 'p_adv_estate', title: 'Vermögensverwaltung', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_adult_estate', reward: 400, duration: '20 Min' }
                ]
            }
        ];
    }

    return [
      {
          id: 'basics',
          title: t.sections.basics,
          color: 'bg-emerald-500',
          levels: [
              { id: 'l_base_1', title: 'Hallo Geld', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_basics_1', reward: 5, duration: '2 Min' },
              { id: 'l_base_2', title: 'Euro & Cent', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_basics_2', reward: 5, duration: '2 Min' },
              { id: 'l_base_3', title: 'Scheine', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_basics_3', reward: 8, duration: '3 Min' },
              { id: 'l_base_4', title: 'Geld-Polizei', type: 'game', icon: 'game', position: 'center', contentId: 'c_basics_1', reward: 15, duration: '5 Min' },
              { id: 'l_base_5', title: 'Profi Quiz', type: 'quiz', icon: 'check', position: 'left', contentId: 'c_basics_quiz', reward: 10, duration: '4 Min' },
              { id: 'l_base_6', title: 'Münzen sammeln', type: 'game', icon: 'game', position: 'right', contentId: 'c_basics_2', reward: 12, duration: '4 Min' },
              { id: 'l_base_7', title: 'Geld zählen', type: 'quiz', icon: 'calc', position: 'center', contentId: 'c_basics_count', reward: 15, duration: '5 Min' },
              { id: 'l_base_8', title: 'Währungen', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_basics_currency', reward: 18, duration: '6 Min' }
          ]
      },
      {
          id: 'earning',
          title: t.sections.earning,
          color: 'bg-orange-500',
          levels: [
              { id: 'l_earn_1', title: 'Geldquelle', type: 'lesson', icon: 'zap', position: 'right', contentId: 'c_earn_1', reward: 5, duration: '2 Min' },
              { id: 'l_earn_2', title: 'Taschengeld', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_earn_2', reward: 8, duration: '3 Min' },
              { id: 'l_earn_3', title: 'Pfand & Flohmarkt', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_earn_3', reward: 10, duration: '4 Min' },
              { id: 'l_earn_4', title: 'Flohmarkt Profi', type: 'game', icon: 'game', position: 'center', contentId: 'c_earn_1', reward: 20, duration: '6 Min' },
              { id: 'l_earn_5', title: 'Job Quiz', type: 'quiz', icon: 'check', position: 'right', contentId: 'c_earn_quiz', reward: 12, duration: '5 Min' },
              { id: 'l_earn_6', title: 'Hilfsjobs', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_earn_jobs', reward: 15, duration: '5 Min' },
              { id: 'l_earn_7', title: 'Geld verdienen Spiele', type: 'game', icon: 'game', position: 'center', contentId: 'c_earn_games', reward: 25, duration: '7 Min' },
              { id: 'l_earn_8', title: 'Unternehmertum', type: 'quiz', icon: 'calc', position: 'right', contentId: 'c_earn_business', reward: 20, duration: '6 Min' }
          ]
      },
      {
          id: 'spending',
          title: t.sections.spending,
          color: 'bg-rose-500',
          levels: [
              { id: 'l_spend_1', title: 'Weg ist weg', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_spend_1', reward: 5, duration: '2 Min' },
              { id: 'l_spend_2', title: 'Brauchen vs Wollen', type: 'game', icon: 'game', position: 'left', contentId: 'c_spend_2', reward: 12, duration: '5 Min' },
              { id: 'l_spend_3', title: 'Preise checken', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_spend_3', reward: 8, duration: '3 Min' },
              { id: 'l_spend_4', title: 'Supermarkt', type: 'game', icon: 'game', position: 'center', contentId: 'c_spend_1', reward: 15, duration: '5 Min' },
              { id: 'l_spend_ex1', title: 'Kiosk', type: 'game', icon: 'game', position: 'left', contentId: 'c_spend_1', reward: 10, duration: '2 Min' },
              { id: 'l_spend_ex2', title: 'Rechnen', type: 'quiz', icon: 'check', position: 'right', contentId: 'c_spend_2', reward: 10, duration: '3 Min' },
              { id: 'l_spend_5', title: 'Budget planen', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_spend_budget', reward: 18, duration: '6 Min' },
              { id: 'l_spend_6', title: 'Sparen beim Einkaufen', type: 'quiz', icon: 'calc', position: 'left', contentId: 'c_spend_save', reward: 20, duration: '7 Min' },
              { id: 'l_spend_7', title: 'Wunschliste', type: 'game', icon: 'game', position: 'right', contentId: 'c_spend_wishlist', reward: 22, duration: '8 Min' }
          ]
      },
      {
          id: 'saving',
          title: t.sections.saving,
          color: 'bg-blue-500',
          levels: [
              { id: 'l_save_1', title: 'Zeitmaschine', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_save_1', reward: 5, duration: '3 Min' },
              { id: 'l_save_2', title: 'Die Sparbox', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_save_2', reward: 8, duration: '3 Min' },
              { id: 'l_save_3', title: 'Bankkonto', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_save_1', reward: 10, duration: '4 Min' },
              { id: 'l_save_4', title: 'Sparziele', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_save_3', reward: 10, duration: '4 Min' },
              { id: 'l_save_5', title: 'Meister Quiz', type: 'quiz', icon: 'check', position: 'left', contentId: 'c_save_quiz', reward: 15, duration: '5 Min' },
              { id: 'l_save_ex1', title: 'Zinsen?', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_save_1', reward: 10, duration: '3 Min' },
              { id: 'l_save_6', title: 'Spar-Challenges', type: 'game', icon: 'game', position: 'center', contentId: 'c_save_challenge', reward: 25, duration: '8 Min' },
              { id: 'l_save_7', title: 'Zukunft planen', type: 'quiz', icon: 'calc', position: 'left', contentId: 'c_save_future', reward: 20, duration: '6 Min' },
              { id: 'l_save_8', title: 'Notgroschen', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_save_emergency', reward: 18, duration: '5 Min' }
          ]
      },
      {
          id: 'safety',
          title: t.sections.safety,
          color: 'bg-slate-600',
          levels: [
              { id: 'l_safe_1', title: 'Angeber-Falle', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_safe_1', reward: 8, duration: '3 Min' },
              { id: 'l_safe_2', title: 'Geheim-Code', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_safe_2', reward: 10, duration: '3 Min' },
              { id: 'l_safe_ex1', title: 'Internet', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_safe_1', reward: 8, duration: '3 Min' },
              { id: 'l_safe_3', title: 'Sichere Passwörter', type: 'quiz', icon: 'check', position: 'center', contentId: 'c_safe_password', reward: 12, duration: '4 Min' },
              { id: 'l_safe_4', title: 'Online-Sicherheit', type: 'lesson', icon: 'star', position: 'left', contentId: 'c_safe_online', reward: 15, duration: '5 Min' },
              { id: 'l_safe_5', title: 'Betrug erkennen', type: 'game', icon: 'game', position: 'right', contentId: 'c_safe_scam', reward: 20, duration: '7 Min' }
          ]
      },
      {
          id: 'advanced',
          title: 'Fortgeschrittene Themen',
          color: 'bg-purple-600',
          levels: [
              { id: 'l_adv_1', title: 'Investieren lernen', type: 'lesson', icon: 'star', position: 'center', contentId: 'c_adv_invest', reward: 25, duration: '8 Min' },
              { id: 'l_adv_2', title: 'Budget-App nutzen', type: 'quiz', icon: 'calc', position: 'left', contentId: 'c_adv_budget', reward: 20, duration: '6 Min' },
              { id: 'l_adv_3', title: 'Zukunftsvision', type: 'lesson', icon: 'star', position: 'right', contentId: 'c_adv_future', reward: 30, duration: '10 Min' },
              { id: 'l_adv_4', title: 'Finanzielle Ziele', type: 'game', icon: 'game', position: 'center', contentId: 'c_adv_goals', reward: 35, duration: '12 Min' }
          ]
      }
    ];
  }, [language, appMode, t]);

  const LEVEL_CONTENTS: Record<string, LevelContent> = {
      'c_adult_math_1': [
        { type: 'slide', title: "Der Zinseszins-Effekt", text: "Zinsen auf Zinsen sorgen für exponentielles Wachstum. Wer früh startet, gewinnt Zeit!", icon: <TrendingUp size={64} className="text-emerald-500" /> },
        { type: 'question', question: "Du legst 1.000€ zu 10% Zinsen an. Wie viel hast du nach 2 Jahren (mit Zinseszins)?", options: [{ text: "1.200 €", correct: false }, { text: "1.210 €", correct: true }], feedbackSuccess: "Korrekt! Jahr 1: 1100€. Jahr 2: 1100 + 10% = 1210€.", feedbackError: "Nicht ganz. Du bekommst im zweiten Jahr Zinsen auf die 1.100€!" },
        { type: 'question', question: "Wie lange dauert es bei 7% Rendite ca., bis sich dein Kapital verdoppelt?", options: [{ text: "ca. 10 Jahre", correct: true }, { text: "ca. 15 Jahre", correct: false }], feedbackSuccess: "Richtig (72er Regel: 72 / 7 ≈ 10,2).", feedbackError: "Nutze die 72er-Regel: 72 geteilt durch Zinssatz." }
      ],
      'c_adult_math_2': [
        { type: 'slide', title: "Kaufkraftverlust", text: "Inflation bedeutet, dass dein Geld weniger wert wird. Waren kosten morgen mehr als heute.", icon: <AlertTriangle size={64} className="text-orange-500" /> },
        { type: 'question', question: "Du versteckst 10.000€ unter der Matratze. Inflation ist 3%. Was passiert in 10 Jahren?", options: [{ text: "Geld ist noch 10.000€ wert", correct: false }, { text: "Kaufkraft sinkt massiv", correct: true }], feedbackSuccess: "Genau. Nominal hast du 10k, aber du kannst dir viel weniger kaufen.", feedbackError: "Die Summe bleibt gleich, aber der Wert sinkt!" }
      ],
      'c_adult_math_3': [
        { type: 'slide', title: "Die Sparquote", text: "Deine Sparquote ist der Anteil deines Nettoeinkommens, den du sparst oder investierst.", icon: <Percent size={64} className="text-blue-500" /> },
        { type: 'question', question: "Netto: 2.000€. Ausgaben: 1.500€. Wie hoch ist die Sparquote?", options: [{ text: "25%", correct: true }, { text: "20%", correct: false }], feedbackSuccess: "Richtig. 500 / 2000 = 25%.", feedbackError: "Rechenweg: (Sparsumme / Einkommen) * 100." }
      ],
      'c_adult_crash': [
        { type: 'slide', title: "Angst & Gier", text: "An der Börse gewinnen oft die, die ihre Emotionen kontrollieren können.", icon: <ShieldCheck size={64} className="text-blue-500" /> },
        { type: 'question', question: "Dein Portfolio fällt um 30%. Was ist historisch meistens die beste Reaktion?", options: [{ text: "Panikverkäufe", correct: false }, { text: "Ruhig bleiben / Nachkaufen", correct: true }], feedbackSuccess: "Korrekt. Wer im Tief verkauft, realisiert Verluste.", feedbackError: "Verkaufen im Crash ist oft der größte Fehler." }
      ],
      'c_adult_compound': [
        { type: 'slide', title: "Langfristiges Wachstum", text: "Die Macht der Zeit: Kleine Beträge können durch Zinseszins zu Vermögen werden.", icon: <TrendingUp size={64} className="text-green-500" /> },
        { type: 'question', question: "Du sparst 100€/Monat bei 8% Rendite. Wie viel hast du nach 30 Jahren?", options: [{ text: "ca. 200.000 €", correct: true }, { text: "ca. 36.000 €", correct: false }], feedbackSuccess: "Richtig! Regelmäßiges Sparen + Zinseszins = Vermögen.", feedbackError: "Ohne Zinseszins wären es nur 36.000€. Mit Zinseszins viel mehr!" }
      ],
      'c_adult_risk': [
        { type: 'slide', title: "Risiko-Management", text: "Nicht jedes Investment ist gleich riskant. Diversifikation reduziert Risiken.", icon: <ShieldAlert size={64} className="text-red-500" /> },
        { type: 'question', question: "Was ist das größte Risiko bei Investments?", options: [{ text: "Verlust des gesamten Kapitals", correct: true }, { text: "Steuern", correct: false }], feedbackSuccess: "Genau. Totalverlust ist das Worst-Case-Szenario.", feedbackError: "Steuern sind wichtig, aber Totalverlust ist kritischer." }
      ],
      'c_adult_divers': [
        { type: 'slide', title: "Diversifikation", text: "Lege nicht alle Eier in einen Korb. Streue dein Geld über verschiedene Anlagen.", icon: <PieChart size={64} className="text-purple-500" /> },
        { type: 'question', question: "Du hast 10.000€. Wie viele verschiedene ETFs solltest du mindestens haben?", options: [{ text: "1-2", correct: false }, { text: "5-10", correct: true }], feedbackSuccess: "Richtig. Mehr Diversifikation = weniger Risiko.", feedbackError: "Ein ETF ist zu konzentriert. Streue breiter!" }
      ],
      'c_adult_tax': [
        { type: 'slide', title: "Steuervorteile", text: "Steuern können Investments deutlich teurer machen. Nutze Freibeträge und Vorsorge.", icon: <Landmark size={64} className="text-slate-600" /> },
        { type: 'question', question: "Was ist der Sparer-Pauschbetrag 2024?", options: [{ text: "1.000 €", correct: false }, { text: "1.000 € (Alleinstehend)", correct: true }], feedbackSuccess: "Richtig. 1.000€ für Alleinstehende, 2.000€ für Verheiratete.", feedbackError: "Der Betrag ist 1.000€ für Ledige." }
      ],
      'c_adult_etf': [
        { type: 'slide', title: "Diversifikation", text: "Setze niemals alles auf eine Karte. Ein ETF streut dein Geld in hunderte Firmen.", icon: <PieChart size={64} className="text-indigo-500" /> },
        { type: 'question', question: "Was ist ein 'Welt-ETF' (z.B. MSCI World)?", options: [{ text: "Wette auf Gold", correct: false }, { text: "Investment in globale Wirtschaft", correct: true }], feedbackSuccess: "Genau. Du investierst in die Weltwirtschaft.", feedbackError: "Nein, es geht um Aktien weltweit." }
      ],
      'c_adult_crypto': [
        { type: 'slide', title: "Volatilität", text: "Kryptowährungen können extrem steigen, aber auch auf Null fallen. Hohes Risiko!", icon: <Zap size={64} className="text-yellow-500" /> },
        { type: 'question', question: "Was ist ein 'Private Key'?", options: [{ text: "Ein Passwort für die Bank", correct: false }, { text: "Der einzige Zugang zu deinen Coins", correct: true }], feedbackSuccess: "Korrekt. 'Not your keys, not your coins'.", feedbackError: "Ohne Key ist dein Krypto-Geld für immer weg!" }
      ],
      'c_adult_bonds': [
        { type: 'slide', title: "Anleihen verstehen", text: "Anleihen sind Schuldscheine von Staaten oder Unternehmen. Sie zahlen Zinsen und sind sicherer als Aktien.", icon: <Briefcase size={64} className="text-blue-600" /> },
        { type: 'question', question: "Was passiert bei Insolvenz des Emittenten?", options: [{ text: "Du verlierst alles", correct: false }, { text: "Du stehst in der Gläubiger-Reihenfolge", correct: true }], feedbackSuccess: "Richtig. Anleihen haben Vorrang vor Aktien.", feedbackError: "Anleihen sind sicherer, aber nicht risikofrei." }
      ],
      'c_adult_real': [
        { type: 'slide', title: "Immobilien-Investment", text: "Immobilien können gute Rendite bringen, aber erfordern viel Kapital und Management.", icon: <Landmark size={64} className="text-amber-600" /> },
        { type: 'question', question: "Was ist die 'Cash-on-Cash-Rendite'?", options: [{ text: "Jährliche Mieteinnahmen / Investition", correct: true }, { text: "Wertsteigerung der Immobilie", correct: false }], feedbackSuccess: "Genau. Das ist die jährliche Rendite auf dein eingesetztes Kapital.", feedbackError: "Cash-on-Cash betrachtet nur die laufenden Einnahmen." }
      ],
      'c_adult_passive': [
        { type: 'slide', title: "Passive vs Active", text: "Passive Investments (ETFs) schlagen meist aktive Fonds langfristig.", icon: <LineChart size={64} className="text-green-600" /> },
        { type: 'question', question: "Warum sind ETFs oft besser?", options: [{ text: "Niedrigere Kosten", correct: true }, { text: "Höhere Risiken", correct: false }], feedbackSuccess: "Richtig. ETFs haben geringere Gebühren und schlagen die meisten Fonds.", feedbackError: "ETFs sind nicht riskanter, sondern effizienter." }
      ],
      'c_adult_psych': [
        { type: 'slide', title: "Behavioral Finance", text: "Menschen treffen oft irrationale Finanzentscheidungen aufgrund von Emotionen.", icon: <ShieldCheck size={64} className="text-purple-600" /> },
        { type: 'question', question: "Was ist 'Loss Aversion'?", options: [{ text: "Angst vor Verlusten", correct: true }, { text: "Freude an Gewinnen", correct: false }], feedbackSuccess: "Genau. Verluste schmerzen doppelt so stark wie Gewinne freuen.", feedbackError: "Loss Aversion erklärt, warum wir Verluste meiden." }
      ],
      'c_adult_port': [
        { type: 'slide', title: "Portfolio-Optimierung", text: "Die richtige Mischung aus Risiko und Rendite ist entscheidend für deinen Erfolg.", icon: <PieChart size={64} className="text-emerald-600" /> },
        { type: 'question', question: "Was ist die 'Efficient Frontier'?", options: [{ text: "Die beste Risiko-Rendite-Kombination", correct: true }, { text: "Die teuersten Investments", correct: false }], feedbackSuccess: "Richtig. Sie zeigt optimale Portfolios.", feedbackError: "Es geht um optimale Diversifikation." }
      ],
      'c_adult_tax_strat': [
        { type: 'slide', title: "Steuerstrategien", text: "Intelligente Steuerplanung kann deine Rendite deutlich verbessern.", icon: <Calculator size={64} className="text-slate-700" /> },
        { type: 'question', question: "Was ist 'Tax Loss Harvesting'?", options: [{ text: "Verlustverrechnung mit Gewinnen", correct: true }, { text: "Steuern sparen durch Spenden", correct: false }], feedbackSuccess: "Genau. Verluste können Steuern auf Gewinne reduzieren.", feedbackError: "Tax Loss Harvesting nutzt Verluste zur Steuerersparnis." }
      ],
      'c_adult_retire': [
        { type: 'slide', title: "Altersvorsorge-Planung", text: "Früh anfangen ist das A und O für eine sorgenfreie Rente.", icon: <Clock size={64} className="text-indigo-600" /> },
        { type: 'question', question: "Wie viel brauchst du im Ruhestand?", options: [{ text: "70-80% des letzten Einkommens", correct: true }, { text: "100% des letzten Einkommens", correct: false }], feedbackSuccess: "Richtig. Du brauchst weniger, da keine Arbeitskosten anfallen.", feedbackError: "Die Faustregel ist 70-80%." }
      ],
      'c_adult_insure': [
        { type: 'slide', title: "Versicherungsstrategie", text: "Die richtige Absicherung schützt vor finanziellen Katastrophen.", icon: <Shield size={64} className="text-red-600" /> },
        { type: 'question', question: "Was ist eine 'Berufsunfähigkeitsversicherung'?", options: [{ text: "Schutz bei Arbeitsunfähigkeit", correct: true }, { text: "Schutz bei Arbeitslosigkeit", correct: false }], feedbackSuccess: "Genau. Sie zahlt bei Berufsunfähigkeit.", feedbackError: "BU-Versicherung schützt vor Erwerbsunfähigkeit." }
      ],
      'c_adult_estate': [
        { type: 'slide', title: "Vermögensverwaltung", text: "Professionelle Vermögensverwaltung kann komplexe Strategien umsetzen.", icon: <Briefcase size={64} className="text-gold-600" /> },
        { type: 'question', question: "Was ist ein 'Family Office'?", options: [{ text: "Persönliche Vermögensverwaltung", correct: true }, { text: "Familien-Bankkonto", correct: false }], feedbackSuccess: "Richtig. Family Offices verwalten Vermögen für reiche Familien.", feedbackError: "Es ist eine professionelle Vermögensverwaltung." }
      ],
      'c_adult_bud_1': [
        { type: 'slide', title: "Finanzielle Freiheit", text: "Die 50-30-20 Regel hilft dir, ein Vermögen aufzubauen, ohne auf alles zu verzichten.", icon: <Landmark size={64} className="text-slate-800" /> }
      ],
      'c_basics_1': [
        { type: 'slide', title: "Hallo Geld!", text: "Geld ist wichtig. Aber warum haben wir es eigentlich?", icon: <Coins size={64} className="text-yellow-500" /> },
        { type: 'slide', title: "Tauschen", text: "Früher haben Leute Hühner gegen Brot getauscht. Das war oft kompliziert.", icon: <ArrowRight size={64} className="text-orange-500" /> },
        { type: 'question', question: "Ist Tauschen immer einfach?", options: [{ text: "Nein", correct: true }, { text: "Ja", correct: false }], feedbackSuccess: "Genau!", feedbackError: "Leider nicht immer." }
      ],
      'c_basics_2': [{ type: 'slide', title: "Euro & Cent", text: "Ein Euro hat 100 Cent.", icon: <Globe size={64} className="text-blue-500" /> }],
      'c_basics_3': [{ type: 'slide', title: "Scheine", text: "Große Beträge zahlen wir mit Scheinen.", icon: <Wallet size={64} className="text-green-600" /> }],
      'c_basics_quiz': [{ type: 'question', question: "Was nimmst du zum Bäcker?", options: [{ text: "Steine", correct: false }, { text: "Geld", correct: true }], feedbackSuccess: "Richtig.", feedbackError: "Nein!" }],
      'c_basics_count': [{ type: 'question', question: "Wie viel sind 2€ + 3€?", options: [{ text: "5€", correct: true }, { text: "6€", correct: false }], feedbackSuccess: "Super!", feedbackError: "Zähle nach: 2+3=5." }],
      'c_basics_currency': [{ type: 'slide', title: "Währungen", text: "In anderen Ländern gibt es andere Währungen wie Dollar oder Pfund.", icon: <Globe size={64} className="text-purple-500" /> }],
      'c_earn_1': [{ type: 'slide', title: "Arbeit", text: "Geld verdient man meist durch Arbeit.", icon: <Zap size={64} className="text-yellow-500" /> }],
      'c_earn_2': [{ type: 'slide', title: "Taschengeld", text: "Taschengeld ist zum Üben da.", icon: <Smile size={64} className="text-pink-500" /> }],
      'c_earn_3': [{ type: 'slide', title: "Pfand", text: "Leere Flaschen bringen Geld zurück!", icon: <RotateCcw size={64} className="text-blue-400" /> }],
      'c_earn_quiz': [{ type: 'question', question: "Woher kommt Geld?", options: [{ text: "Wasserhahn", correct: false }, { text: "Arbeit", correct: true }], feedbackSuccess: "Ja.", feedbackError: "Schön wärs!" }],
      'c_earn_jobs': [{ type: 'slide', title: "Hilfsjobs", text: "Zeitung austragen, babysitten oder Gartenarbeit bringen extra Geld.", icon: <Briefcase size={64} className="text-green-600" /> }],
      'c_earn_games': [{ type: 'slide', title: "Geld verdienen Spiele", text: "Manche Spiele belohnen dich mit echtem Geld oder Preisen.", icon: <Gamepad2 size={64} className="text-orange-500" /> }],
      'c_earn_business': [{ type: 'question', question: "Was ist Unternehmertum?", options: [{ text: "Eigene Ideen verkaufen", correct: true }, { text: "Immer arbeiten", correct: false }], feedbackSuccess: "Genau!", feedbackError: "Es geht um Kreativität und Initiative." }],
      'c_spend_1': [{ type: 'slide', title: "Sparen", text: "Man kann nur ausgeben, was man hat.", icon: <X size={64} className="text-slate-500" /> }],
      'c_spend_2': [{ type: 'question', question: "Was ist wichtiger?", options: [{ text: "Essen", correct: true }, { text: "Spielzeug", correct: false }], feedbackSuccess: "Korrekt.", feedbackError: "Ohne Essen geht es nicht." }],
      'c_spend_3': [{ type: 'slide', title: "Preise", text: "Vergleiche Preise im Laden!", icon: <Tag size={64} className="text-red-500" /> }],
      'c_spend_budget': [{ type: 'slide', title: "Budget planen", text: "Schreibe auf, wofür du Geld ausgibst, um nicht zu viel zu verbrauchen.", icon: <Calculator size={64} className="text-blue-500" /> }],
      'c_spend_save': [{ type: 'question', question: "Wie sparst du beim Einkaufen?", options: [{ text: "Angebote nutzen", correct: true }, { text: "Alles teuer kaufen", correct: false }], feedbackSuccess: "Ja!", feedbackError: "Angebote helfen sparen." }],
      'c_spend_wishlist': [{ type: 'slide', title: "Wunschliste", text: "Schreibe deine Wünsche auf und spare dafür.", icon: <Gift size={64} className="text-pink-500" /> }],
      'c_save_1': [{ type: 'slide', title: "Geduld", text: "Sparen braucht Zeit.", icon: <Hourglass size={64} className="text-blue-300" /> }],
    'c_save_2': [{ type: 'slide', title: "Die Sparbox", text: "Deine Sparbox bewacht dein Geld.", icon: <PiggyBank size={64} className="text-pink-500" /> }],
      'c_save_3': [{ type: 'slide', title: "Ziele", text: "Spare auf etwas Tolles!", icon: <Flag size={64} className="text-red-500" /> }],
      'c_save_quiz': [{ type: 'question', question: "Was ist Sparen?", options: [{ text: "Aufheben", correct: true }, { text: "Wegwerfen", correct: false }], feedbackSuccess: "Ja.", feedbackError: "Nein!" }],
      'c_save_challenge': [{ type: 'slide', title: "Spar-Challenges", text: "Versuche 30 Tage lang täglich etwas zu sparen.", icon: <Trophy size={64} className="text-yellow-500" /> }],
      'c_save_future': [{ type: 'question', question: "Warum sparen für die Zukunft?", options: [{ text: "Für Sicherheit", correct: true }, { text: "Für sofort Spaß", correct: false }], feedbackSuccess: "Richtig!", feedbackError: "Zukunft ist wichtig." }],
      'c_save_emergency': [{ type: 'slide', title: "Notgroschen", text: "Spare für unerwartete Ausgaben.", icon: <ShieldAlert size={64} className="text-red-500" /> }],
      'c_safe_1': [{ type: 'slide', title: "Sicherheit", text: "Geld nicht jedem zeigen!", icon: <ShieldAlert size={64} className="text-slate-700" /> }],
      'c_safe_2': [{ type: 'slide', title: "PIN", text: "Geheimzahlen sind geheim!", icon: <Lock size={64} className="text-blue-500" /> }],
      'c_safe_password': [{ type: 'question', question: "Was macht ein gutes Passwort?", options: [{ text: "Lange und kompliziert", correct: true }, { text: "Kurz und einfach", correct: false }], feedbackSuccess: "Ja!", feedbackError: "Lange Passwörter sind sicherer." }],
      'c_safe_online': [{ type: 'slide', title: "Online-Sicherheit", text: "Gib keine persönlichen Daten im Internet preis.", icon: <Globe size={64} className="text-green-500" /> }],
      'c_safe_scam': [{ type: 'slide', title: "Betrug erkennen", text: "Wenn etwas zu gut klingt, ist es meist Betrug.", icon: <AlertTriangle size={64} className="text-orange-500" /> }],
      'c_adv_invest': [{ type: 'slide', title: "Investieren lernen", text: "Investieren bedeutet, Geld arbeiten zu lassen.", icon: <TrendingUp size={64} className="text-green-500" /> }],
      'c_adv_budget': [{ type: 'question', question: "Warum Budget-Apps nutzen?", options: [{ text: "Ausgaben tracken", correct: true }, { text: "Mehr ausgeben", correct: false }], feedbackSuccess: "Genau!", feedbackError: "Apps helfen beim Sparen." }],
      'c_adv_future': [{ type: 'slide', title: "Zukunftsvision", text: "Denke an deine Träume und spare dafür.", icon: <Star size={64} className="text-purple-500" /> }],
      'c_adv_goals': [{ type: 'slide', title: "Finanzielle Ziele", text: "Setze dir klare Ziele und verfolge sie.", icon: <Target size={64} className="text-red-500" /> }]
  };

  const getStatus = (levelId: string, sectionIndex: number, levelIndex: number) => {
    if (user.completedLevels.includes(levelId)) return 'completed';
    if (sectionIndex === 0 && levelIndex === 0) return 'current';
    if (levelIndex > 0) {
        const prevInSec = SECTIONS[sectionIndex].levels[levelIndex - 1].id;
        if (user.completedLevels.includes(prevInSec)) return 'current';
    } else if (sectionIndex > 0) {
        const prevSec = SECTIONS[sectionIndex - 1];
        const lastInPrev = prevSec.levels[prevSec.levels.length - 1].id;
        if (user.completedLevels.includes(lastInPrev)) return 'current';
    }
    return 'locked';
  };

  const getIcon = (level: Level, status: string) => {
    if (status === 'locked') return <Lock size={24} className="text-slate-500/50" />;
    if (status === 'completed') return <Check size={32} strokeWidth={4} className="text-white" />;
    switch (level.icon) {
      case 'zap': return <Zap size={32} fill="currentColor" className="text-white" />;
      case 'star': return <Star size={32} fill="currentColor" className="text-white" />;
      case 'game': return <Gamepad2 size={32} fill="currentColor" className="text-white" />;
      case 'calc': return <Calculator size={32} className="text-white" />;
      default: return <Play size={32} fill="currentColor" className="text-white" />;
    }
  };

  const getStatusColor = (status: string, sectionColorBase: string) => {
    if (status === 'locked') return 'bg-slate-700 shadow-[0_4px_0_#334155]';
    if (status === 'completed') return 'bg-violet-500 shadow-[0_6px_0_#4c1d95]'; 
    return `${sectionColorBase} shadow-lg animate-pulse-slow`; 
  };

  const getPositionStyle = (pos: string) => {
     if (pos === 'left') return { left: '30%' };
     if (pos === 'right') return { left: '70%' };
     return { left: '50%' };
  };

  const paths = useMemo(() => {
    const VB_CENTER = 150;
    const VB_OFFSET = 60; // 60/300 = 20% from center -> 30% and 70% total
    const VB_Y_START = 16; // Matches pt-4 in DOM
    const VB_HEADER_H = 104; // py-3(24) + text-lg(28) + border-4(4) + mb-12(48) = 104
    const VB_LEVEL_H = 120; // Exact height of h-[120px] container
    
    let fullPath = `M ${VB_CENTER} ${VB_Y_START} `;
    let activePath = `M ${VB_CENTER} ${VB_Y_START} `;
    let currentY = VB_Y_START;
    let prevX = VB_CENTER;
    let prevY = VB_Y_START;
    let isPathActive = true; 

    SECTIONS.forEach((section) => {
        currentY += VB_HEADER_H;
        section.levels.forEach((level) => {
            let nextX = VB_CENTER;
            if (level.position === 'left') nextX = VB_CENTER - VB_OFFSET;
            if (level.position === 'right') nextX = VB_CENTER + VB_OFFSET;
            
            const nextY = currentY + (VB_LEVEL_H / 2);
            
            const curve = `C ${prevX} ${prevY + (nextY - prevY) * 0.5}, ${nextX} ${nextY - (nextY - prevY) * 0.5}, ${nextX} ${nextY} `;
            fullPath += curve;
            if (isPathActive) activePath += curve;
            if (!user.completedLevels.includes(level.id)) isPathActive = false;
            
            prevX = nextX; 
            prevY = nextY; 
            currentY += VB_LEVEL_H; 
        });
    });
    return { fullPath, activePath, height: currentY };
  }, [user.completedLevels, SECTIONS]); 

  const activeContent = selectedLevel ? LEVEL_CONTENTS[selectedLevel.contentId] : [];
  const activeSlide = activeContent[currentSlideIndex];

  const startLevel = () => {
    setIsPlaying(true);
    setCurrentSlideIndex(0);
    setQuizAnswerState('idle');
    onLevelStart();
  };

  const handleQuizAnswer = (correct: boolean) => {
    setQuizAnswerState(correct ? 'correct' : 'wrong');
  };

  const nextSlide = () => {
    if (!selectedLevel) return;
    const content = LEVEL_CONTENTS[selectedLevel.contentId] || [];
    if (currentSlideIndex < content.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      setQuizAnswerState('idle');
    } else {
      onCompleteLevel(selectedLevel.id, selectedLevel.reward);
      setIsPlaying(false);
      setSelectedLevel(null);
      onLevelEnd();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e2e] relative overflow-hidden h-full">
        <div className="bg-[#2a2a3c] p-4 flex justify-between items-center z-20 shadow-lg border-b border-white/5 md:px-8">
            <div className="flex gap-2">
                <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                    <Heart size={16} className="text-red-500" fill="currentColor" />
                    <span className="text-red-500 font-bold">∞</span>
                </div>
                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] font-black text-yellow-900">€</div>
                    <span className="text-yellow-500 font-bold">{user.coins}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {isStreakFrozen && (
                    <div className="flex items-center gap-1.5 bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-500/30 animate-pulse">
                         <Snowflake size={16} className="text-blue-400" />
                         <span className="text-blue-400 text-xs font-black uppercase tracking-tighter">{t.streakFrozen}</span>
                    </div>
                )}
                <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                     <Flame size={16} className="text-blue-500" fill="currentColor" />
                     <span className="text-blue-500 font-bold">{user.streak}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-32 pt-4 relative md:flex md:justify-center">
            <div className="w-full relative max-w-md">
                {/* SVG Line Background */}
                <svg className="absolute top-0 left-0 w-full pointer-events-none opacity-20" viewBox={`0 0 300 ${paths.height}`} preserveAspectRatio="none" style={{ height: paths.height }}>
                    <path d={paths.fullPath} stroke="white" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20 20" />
                </svg>
                <svg className="absolute top-0 left-0 w-full pointer-events-none z-0" viewBox={`0 0 300 ${paths.height}`} preserveAspectRatio="none" style={{ height: paths.height }}>
                    <path d={paths.activePath} stroke="#8b5cf6" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg" />
                </svg>

                {/* Level Nodes */}
                <div className="w-full relative z-10">
                    {SECTIONS.map((section, sIdx) => (
                        <div key={section.id}>
                            <div className={`${section.color} py-3 px-6 text-center shadow-md z-10 mx-6 rounded-2xl mb-12 relative border-b-4 border-black/10`}>
                                <h2 className="text-white font-black text-lg uppercase tracking-wider">{section.title}</h2>
                            </div>
                            <div className="flex flex-col w-full relative h-auto">
                                {section.levels.map((level, lIdx) => {
                                    const status = getStatus(level.id, sIdx, lIdx);
                                    return (
                                        <div key={level.id} className="relative w-full h-[120px]">
                                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300" style={getPositionStyle(level.position)}>
                                                <button 
                                                    onClick={() => status !== 'locked' && setSelectedLevel(level)} 
                                                    disabled={status === 'locked'} 
                                                    className={`w-24 h-24 rounded-[2rem] flex items-center justify-center relative z-10 transition-all active:translate-y-1 active:shadow-none border-4 border-[#1e1e2e] ${getStatusColor(status, section.color)}`}
                                                >
                                                    {getIcon(level, status)}
                                                    {status === 'current' && (
                                                        <div className="absolute -top-12 bg-white text-slate-900 px-3 py-1 rounded-xl font-bold text-sm whitespace-nowrap animate-bounce shadow-lg z-30">
                                                            Start!
                                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45"></div>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {selectedLevel && !isPlaying && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                <div className="bg-[#1e1e2e] border-2 border-slate-700 w-full max-sm rounded-3xl p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl">
                    <button onClick={() => setSelectedLevel(null)} className="absolute -top-4 -right-4 bg-slate-700 text-white p-3 rounded-full border-4 border-[#1e1e2e]"><X size={24} /></button>
                    <div className="text-center">
                        <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-slate-700 text-white`}>
                           {selectedLevel.type === 'game' ? <Gamepad2 size={40} /> : selectedLevel.type === 'quiz' ? <Check size={40} /> : <School size={40} />}
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">{selectedLevel.title}</h3>
                        <div className="flex justify-center gap-4 mb-6">
                            <div className="bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-700"><Clock size={16} className="text-blue-400" /><span className="text-white font-bold">{selectedLevel.duration}</span></div>
                            <div className="bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-700"><div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] font-black text-yellow-900">€</div><span className="text-white font-bold">+{selectedLevel.reward}</span></div>
                        </div>
                        <button onClick={startLevel} className="w-full bg-[#58cc02] text-white font-black text-xl py-4 rounded-2xl shadow-[0_6px_0_#46a302] active:translate-y-1 active:shadow-none uppercase tracking-wide">{t.start}</button>
                    </div>
                </div>
            </div>
        )}

        {isPlaying && activeSlide && (
             <div className="fixed inset-0 z-50 flex flex-col bg-[#1e1e2e]">
                 <div className="p-6 pb-2 relative flex items-center justify-center">
                     <div className="absolute left-6 top-5"><button onClick={() => { setIsPlaying(false); onLevelEnd(); }} className="text-slate-400 flex items-center gap-2 font-bold"><ArrowLeft size={28} strokeWidth={3} /></button></div>
                     <div className="h-4 bg-slate-700 rounded-full overflow-hidden w-full max-w-xs mx-auto"><div className="h-full bg-[#58cc02] transition-all duration-500" style={{ width: `${((currentSlideIndex + 1) / activeContent.length) * 100}%` }}></div></div>
                 </div>
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-right-10 duration-300 w-full max-w-md mx-auto" key={currentSlideIndex}>
                      {activeSlide.type === 'slide' && (
                          <><div className="mb-8 p-8 bg-slate-800 rounded-[2.5rem] inline-block shadow-lg border border-slate-700">{activeSlide.icon}</div><h2 className="text-3xl font-black text-white mb-6">{activeSlide.title}</h2><p className="text-xl text-slate-300 font-medium leading-relaxed">{activeSlide.text}</p></>
                      )}
                      {activeSlide.type === 'question' && (
                          <div className="w-full"><h2 className="text-2xl font-black text-white mb-8">{activeSlide.question}</h2><div className="grid gap-4 w-full">{activeSlide.options.map((opt, idx) => {
                                      let btnClass = "bg-slate-800 border-b-4 border-slate-950 text-white";
                                      if (quizAnswerState === 'correct' && opt.correct) btnClass = "bg-emerald-500 border-b-4 border-emerald-700 text-white";
                                      if (quizAnswerState === 'wrong' && !opt.correct) btnClass = "opacity-50 bg-slate-800 text-slate-400";
                                      return (<button key={idx} onClick={() => handleQuizAnswer(opt.correct)} disabled={quizAnswerState === 'correct'} className={`p-5 rounded-2xl font-bold text-lg transition-all active:scale-95 ${btnClass}`}>{opt.text}</button>)
                                  })}</div>
                              {quizAnswerState !== 'idle' && (<div className={`mt-8 p-4 rounded-2xl ${quizAnswerState === 'correct' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}><div className="flex items-center justify-center gap-2 font-bold mb-1">{quizAnswerState === 'correct' ? <Check /> : <X />} {quizAnswerState === 'correct' ? "Richtig!" : "Falsch"}</div><p className="text-sm">{quizAnswerState === 'correct' ? activeSlide.feedbackSuccess : activeSlide.feedbackError}</p></div>)}
                          </div>
                      )}
                 </div>
                 <div className="p-6 pb-10 border-t border-slate-700 bg-[#1e1e2e]">
                     {(activeSlide.type === 'slide' || quizAnswerState === 'correct') ? (
                         <button onClick={nextSlide} className="w-full bg-[#58cc02] text-white font-black text-xl py-5 rounded-2xl shadow-[0_6px_0_#46a302] active:translate-y-1 active:shadow-none uppercase tracking-wide">{currentSlideIndex === activeContent.length - 1 ? 'Beenden!' : 'Weiter'}</button>
                     ) : (
                         <button disabled className="w-full bg-slate-700 text-slate-500 font-bold text-xl py-5 rounded-2xl cursor-not-allowed">Wähle eine Antwort</button>
                     )}
                 </div>
             </div>
        )}
    </div>
  );
};