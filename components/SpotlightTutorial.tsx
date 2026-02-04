import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Language, getTranslations } from '../types';

export interface TutorialStep {
    id: string;
    elementId: string;
    title: string;
    description: string;
    screen?: 'DASHBOARD' | 'DETAIL';
}

interface SpotlightTutorialProps {
    steps: TutorialStep[];
    language: Language;
    onComplete: () => void;
    onSkip: () => void;
    currentScreen: 'DASHBOARD' | 'DETAIL';
    onNavigate?: (screen: 'DASHBOARD' | 'DETAIL') => void;
}

export const SpotlightTutorial: React.FC<SpotlightTutorialProps> = ({
    steps,
    language,
    onComplete,
    onSkip,
    currentScreen,
    onNavigate
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [elementRect, setElementRect] = useState<DOMRect | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const observerRef = useRef<ResizeObserver | null>(null);
    const t = getTranslations(language).common;

    const currentStep = steps[currentStepIndex];

    const updateElementPosition = () => {
        if (!currentStep) return;

        let element = document.getElementById(currentStep.elementId);

        // Fallback for mobile IDs if needed
        if (!element && currentStep.elementId === 'tutorial-connect') {
            element = document.getElementById('tutorial-connect-mobile');
        }

        if (element) {
            const rect = element.getBoundingClientRect();
            // Only update if rect actually changed or was null
            if (!elementRect ||
                rect.top !== elementRect.top ||
                rect.left !== elementRect.left ||
                rect.width !== elementRect.width ||
                rect.height !== elementRect.height) {
                setElementRect(rect);
            }
        } else {
            if (elementRect) setElementRect(null);
        }
    };

    useEffect(() => {
        // Check if we need to navigate to a different screen
        if (currentStep?.screen && currentStep.screen !== currentScreen && onNavigate) {
            onNavigate(currentStep.screen);
        }

        // Wait a bit then start checking for the element
        const timer = setTimeout(() => {
            updateElementPosition();
        }, 300);

        // Keep searching for the element for a few seconds (in case of slow renders/transitions)
        const interval = setInterval(() => {
            updateElementPosition();
        }, 500);

        // Stop checking after 3 seconds to save resources
        const stopSearch = setTimeout(() => {
            clearInterval(interval);
        }, 3000);

        // Set up resize observer to track element position changes
        const element = document.getElementById(currentStep?.elementId || '');
        if (element) {
            observerRef.current = new ResizeObserver(() => {
                updateElementPosition();
            });
            observerRef.current.observe(element);
        }

        // Also listen to window resize
        window.addEventListener('resize', updateElementPosition);
        window.addEventListener('scroll', updateElementPosition, true);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            clearTimeout(stopSearch);
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            window.removeEventListener('resize', updateElementPosition);
            window.removeEventListener('scroll', updateElementPosition, true);
        };
    }, [currentStep, currentScreen]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentStepIndex(currentStepIndex + 1);
                setIsTransitioning(false);
            }, 200);
        } else {
            onComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStepIndex > 0) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentStepIndex(currentStepIndex - 1);
                setIsTransitioning(false);
            }, 200);
        }
    };

    if (!currentStep) return null;

    // Calculate text card position (above or below spotlight)
    const textPosition = elementRect && elementRect.top > window.innerHeight / 2 ? 'above' : 'below';
    const textTop = elementRect && textPosition === 'above'
        ? Math.max(20, elementRect.top - 200)
        : elementRect
            ? Math.min(window.innerHeight - 200, elementRect.bottom + 20)
            : window.innerHeight / 2;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
            {/* Backdrop with blur - reduced blur if no spotlight to keep content readable */}
            <div className={`absolute inset-0 bg-black/60 transition-all duration-500 ${elementRect ? 'backdrop-blur-sm' : 'backdrop-blur-[1px]'}`} />

            {/* Spotlight cutout effect using SVG mask */}
            {elementRect && (
                <>
                    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                        <defs>
                            <mask id="spotlight-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                <rect
                                    x={elementRect.left - 8}
                                    y={elementRect.top - 8}
                                    width={elementRect.width + 16}
                                    height={elementRect.height + 16}
                                    rx="16"
                                    fill="black"
                                />
                            </mask>
                        </defs>
                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            fill="rgba(0, 0, 0, 0.7)"
                            mask="url(#spotlight-mask)"
                        />
                    </svg>

                    {/* Highlight ring around element */}
                    <div
                        className="absolute pointer-events-none transition-all duration-300 ease-out"
                        style={{
                            left: elementRect.left - 8,
                            top: elementRect.top - 8,
                            width: elementRect.width + 16,
                            height: elementRect.height + 16,
                            border: '3px solid rgba(99, 102, 241, 0.8)',
                            borderRadius: '16px',
                            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 30px rgba(99, 102, 241, 0.4)',
                            animation: 'pulse 2s infinite'
                        }}
                    />
                </>
            )}

            {/* Explanatory text card */}
            <div
                className={`absolute left-1/2 -translate-x-1/2 w-full max-w-md px-6 transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                style={{ top: `${textTop}px` }}
            >
                <div className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-indigo-100">
                    {/* Step indicator */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-1.5">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex
                                        ? 'w-8 bg-indigo-500'
                                        : idx < currentStepIndex
                                            ? 'w-1.5 bg-indigo-300'
                                            : 'w-1.5 bg-slate-200'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={onSkip}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-black text-slate-900 mb-2">{currentStep.title}</h3>
                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                        {currentStep.description}
                    </p>

                    {/* Navigation buttons */}
                    <div className="flex gap-3">
                        {currentStepIndex > 0 && (
                            <button
                                onClick={handlePrevious}
                                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <ArrowLeft size={18} />
                                Zurück
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 px-4 bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                        >
                            {currentStepIndex < steps.length - 1 ? (
                                <>
                                    Weiter
                                    <ArrowRight size={18} />
                                </>
                            ) : (
                                'Fertig'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
      `}</style>
        </div>
    );
};
