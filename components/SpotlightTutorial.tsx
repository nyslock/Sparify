import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Language, ViewState, getTranslations } from '../types';

export interface TutorialStep {
    id: string;
    elementId: string;
    title: string;
    description: string;
    screen?: ViewState;
    /** Scroll behaviour when element found. Default: 'smooth' */
    scrollBehavior?: 'smooth' | 'none';
}

interface SpotlightTutorialProps {
    steps: TutorialStep[];
    language: Language;
    onComplete: () => void;
    onSkip: () => void;
    currentScreen: ViewState;
    onNavigate?: (screen: ViewState) => void;
}

interface ElemRect { left: number; top: number; width: number; height: number; }

const PAD = 14;          // padding around highlighted element (px)
const TIP_W = 360;       // tooltip max-width
const TIP_H_EST = 210;   // estimated tooltip height

export const SpotlightTutorial: React.FC<SpotlightTutorialProps> = ({
    steps, language, onComplete, onSkip, currentScreen, onNavigate
}) => {
    const [stepIdx, setStepIdx] = useState(0);
    const [elemRect, setElemRect] = useState<ElemRect | null>(null);
    const [fading, setFading] = useState(false);
    const observerRef = useRef<ResizeObserver | null>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const tCommon = getTranslations(language).common;
    const step = steps[stepIdx];

    // ------------------------------------------------------------------
    // Find & measure element
    // ------------------------------------------------------------------
    const measureElement = useCallback(() => {
        if (!step) return;
        const el =
            document.getElementById(step.elementId) ??
            (step.elementId === 'tutorial-connect'
                ? document.getElementById('tutorial-connect-mobile')
                : null);
        if (el) {
            const r = el.getBoundingClientRect();
            setElemRect({ left: r.left, top: r.top, width: r.width, height: r.height });
        } else {
            setElemRect(null);
        }
    }, [step]);

    // ------------------------------------------------------------------
    // On step change: navigate → wait → scroll into view → measure
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!step) return;

        // Clear previous timers & observer
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        if (observerRef.current) observerRef.current.disconnect();

        // Reset rect while transitioning
        setElemRect(null);

        // Navigate to screen if needed
        if (step.screen && step.screen !== currentScreen && onNavigate) {
            onNavigate(step.screen);
        }

        // Try to find element, with retries (for lazy-loaded / animated screens)
        const tryFind = (attempt: number) => {
            const el =
                document.getElementById(step.elementId) ??
                (step.elementId === 'tutorial-connect'
                    ? document.getElementById('tutorial-connect-mobile')
                    : null);

            if (el) {
                // Scroll into view so it's visible
                if (step.scrollBehavior !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }
                // Wait for scroll animation, then measure
                const t = setTimeout(measureElement, step.scrollBehavior === 'none' ? 0 : 420);
                timersRef.current.push(t);

                // Observe for size changes
                observerRef.current = new ResizeObserver(measureElement);
                observerRef.current.observe(el);
            } else if (attempt < 10) {
                const t = setTimeout(() => tryFind(attempt + 1), 250);
                timersRef.current.push(t);
            }
        };

        // First attempt after short delay (screen may still be animating)
        const init = setTimeout(() => tryFind(0), 350);
        timersRef.current.push(init);

        window.addEventListener('resize', measureElement);
        window.addEventListener('scroll', measureElement, true);
        return () => {
            timersRef.current.forEach(clearTimeout);
            if (observerRef.current) observerRef.current.disconnect();
            window.removeEventListener('resize', measureElement);
            window.removeEventListener('scroll', measureElement, true);
        };
    }, [stepIdx, currentScreen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ------------------------------------------------------------------
    // Navigation
    // ------------------------------------------------------------------
    const go = (delta: number) => {
        const next = stepIdx + delta;
        if (next < 0 || next >= steps.length) return;
        setFading(true);
        setTimeout(() => { setStepIdx(next); setFading(false); }, 200);
    };

    if (!step) return null;

    // ------------------------------------------------------------------
    // Tooltip placement
    // ------------------------------------------------------------------
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spotL = elemRect ? elemRect.left - PAD : 0;
    const spotT = elemRect ? elemRect.top - PAD : 0;
    const spotW = elemRect ? elemRect.width + PAD * 2 : 0;
    const spotH = elemRect ? elemRect.height + PAD * 2 : 0;

    // Compute tooltip CSS position
    let tipStyle: React.CSSProperties = {};
    let centered = !elemRect;

    if (elemRect) {
        const tipW = Math.min(TIP_W, vw - 32);
        const tipLeft = Math.max(16, Math.min(elemRect.left + elemRect.width / 2 - tipW / 2, vw - tipW - 16));
        const spaceBelow = vh - (elemRect.top + elemRect.height + PAD);
        const spaceAbove = elemRect.top - PAD;

        if (spaceBelow >= TIP_H_EST) {
            tipStyle = { top: spotT + spotH + 16, left: tipLeft, width: tipW };
        } else if (spaceAbove >= TIP_H_EST) {
            tipStyle = { bottom: vh - spotT + 16, left: tipLeft, width: tipW };
        } else {
            centered = true; // not enough space above or below
        }
    }

    const isLast = stepIdx === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-auto select-none">

            {/* ── base dark overlay ── */}
            <div className="absolute inset-0 bg-black/70" />

            {/* ── SVG cutout spotlight ── */}
            {elemRect && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                        <mask id="sl-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            <rect x={spotL} y={spotT} width={spotW} height={spotH} rx="18" fill="black" />
                        </mask>
                    </defs>
                    <rect x="0" y="0" width="100%" height="100%"
                        fill="rgba(0,0,0,0.68)" mask="url(#sl-mask)" />
                </svg>
            )}

            {/* ── animated ring around highlighted element ── */}
            {elemRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: spotL, top: spotT, width: spotW, height: spotH,
                        border: '3px solid rgba(99,102,241,0.95)',
                        borderRadius: 18,
                        boxShadow: '0 0 0 4px rgba(99,102,241,0.18), 0 0 48px rgba(99,102,241,0.55)',
                        animation: 'sl-ring 2s ease-in-out infinite',
                    }}
                />
            )}

            {/* ── Tooltip card ── */}
            {centered ? (
                /* fallback: centred modal when element is off-screen or not found */
                <div className="absolute inset-0 flex items-end sm:items-center justify-center p-4 pointer-events-none">
                    <div className={`pointer-events-auto w-full max-w-sm transition-all duration-200 mb-4 sm:mb-0 ${fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                        <Card step={step} stepIdx={stepIdx} steps={steps} isLast={isLast}
                            tCommon={tCommon} onPrev={() => go(-1)} onNext={() => isLast ? onComplete() : go(1)} onSkip={onSkip} />
                    </div>
                </div>
            ) : (
                <div
                    className={`absolute pointer-events-auto transition-all duration-200 ${fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    style={tipStyle}
                >
                    <Card step={step} stepIdx={stepIdx} steps={steps} isLast={isLast}
                        tCommon={tCommon} onPrev={() => go(-1)} onNext={() => isLast ? onComplete() : go(1)} onSkip={onSkip} />
                </div>
            )}

            <style>{`
                @keyframes sl-ring {
                    0%,100% { opacity:1; box-shadow:0 0 0 4px rgba(99,102,241,.18), 0 0 48px rgba(99,102,241,.55); }
                    50%      { opacity:.8; box-shadow:0 0 0 8px rgba(99,102,241,.10), 0 0 70px rgba(99,102,241,.75); }
                }
            `}</style>
        </div>
    );
};

// ── Tooltip card sub-component ────────────────────────────────────────────────
interface CardProps {
    step: TutorialStep;
    stepIdx: number;
    steps: TutorialStep[];
    isLast: boolean;
    tCommon: any;
    onPrev: () => void;
    onNext: () => void;
    onSkip: () => void;
}

const Card: React.FC<CardProps> = ({ step, stepIdx, steps, isLast, tCommon, onPrev, onNext, onSkip }) => (
    <div className="bg-white rounded-3xl p-5 shadow-2xl border border-indigo-100/60">
        {/* Progress dots + counter + close */}
        <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
                {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIdx ? 'w-6 bg-indigo-500' : i < stepIdx ? 'w-1.5 bg-indigo-300' : 'w-1.5 bg-slate-200'}`} />
                ))}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">{stepIdx + 1} / {steps.length}</span>
                <button onClick={onSkip} className="text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-full">
                    <X size={17} />
                </button>
            </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-black text-slate-900 mb-1.5 leading-snug">{step.title}</h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-5">{step.description}</p>

        {/* Buttons */}
        <div className="flex gap-2.5">
            {stepIdx > 0 && (
                <button onClick={onPrev}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-sm">
                    <ArrowLeft size={15} />
                    {tCommon?.prev || 'Zurück'}
                </button>
            )}
            <button onClick={onNext}
                className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-indigo-200 text-sm">
                {isLast
                    ? (tCommon?.finish || 'Fertig')
                    : <>{tCommon?.next || 'Weiter'}<ArrowRight size={15} /></>}
            </button>
        </div>
    </div>
);
