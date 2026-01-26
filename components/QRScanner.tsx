import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Eye, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import { ThemeColor, THEME_COLORS, Language, TRANSLATIONS } from '../types';
import jsQR from 'jsqr';

interface QRScannerProps {
  onClose: () => void;
  onFound: (code: string, isGuest: boolean) => Promise<{ success: boolean; message?: string }>;
  accentColor: ThemeColor;
  language: Language;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onClose, onFound, accentColor, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Refs for tracking state inside scan loop
  const isGuestModeRef = useRef(isGuestMode);
  const processingRef = useRef(processing);
  const scanErrorRef = useRef(scanError);
  // We need onFound in ref to call it inside the loop reliably without re-binding loop
  const onFoundRef = useRef(onFound);

  const t = TRANSLATIONS[language].scanner;

  // Sync state to refs
  useEffect(() => {
    isGuestModeRef.current = isGuestMode;
  }, [isGuestMode]);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  useEffect(() => {
    scanErrorRef.current = scanError;
  }, [scanError]);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let isMounted = true;

    const scan = async () => {
      if (!isMounted) return;

      // Skip frame processing if we are already busy or showing an error
      if (processingRef.current || scanErrorRef.current) {
          animationFrameId = requestAnimationFrame(scan);
          return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Sync canvas size
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get image data for jsQR
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Scan for QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && code.data.trim() !== "") {
             // 1. Draw Bounding Box Visual Feedback
             const loc = code.location;
             ctx.beginPath();
             ctx.lineWidth = 4;
             ctx.strokeStyle = "#FF3B58"; // Red scan color
             ctx.moveTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
             ctx.lineTo(loc.topRightCorner.x, loc.topRightCorner.y);
             ctx.lineTo(loc.bottomRightCorner.x, loc.bottomRightCorner.y);
             ctx.lineTo(loc.bottomLeftCorner.x, loc.bottomLeftCorner.y);
             ctx.lineTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
             ctx.stroke();

             // 2. Trigger Logic
             console.log("QR Code detected:", code.data);
             setProcessing(true); // Pause scanning logic via ref check
             
             try {
                const result = await onFoundRef.current(code.data, isGuestModeRef.current);
                
                if (!result.success) {
                    setScanError(result.message || "Code ungültig");
                    setProcessing(false);
                    // Clear error after 3 seconds to resume scanning
                    setTimeout(() => {
                        if (isMounted) setScanError(null);
                    }, 3000);
                } 
                // If success, component will unmount (view change), so no need to reset
             } catch (e) {
                 setScanError("Scan Fehler");
                 setProcessing(false);
                 setTimeout(() => { if (isMounted) setScanError(null); }, 3000);
             }
          } else {
             // Clear canvas if nothing found (to remove old boxes)
             // We are drawing the video frame anyway, so old boxes are gone, 
             // but we want the user to see the video clearly.
             // Actually, we drew the video on the canvas. 
             // If we want the canvas to be just an overlay, we shouldn't draw the video on it if it sits on top.
             // But jsQR needs the data. 
             // Solution: CSS makes canvas transparent? No. 
             // We can just clear the canvas AFTER extracting imageData if we want to use the <video> element for display.
             // Or we just use the canvas for display (and hide video).
             // Let's use canvas for display if we are drawing on it. 
             // Actually current CSS hides canvas 'hidden'. Let's make it visible and absolute.
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(scan);
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 } 
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready to play
          videoRef.current.onloadedmetadata = () => {
             setCameraActive(true);
             videoRef.current?.play().catch(e => console.error("Play failed", e));
             requestAnimationFrame(scan);
          };
        }
      } catch (err) {
        console.error("Camera access failed", err);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
        setProcessing(true);
        // REMOVED .toUpperCase() to fix input issues
        const result = await onFound(manualCode.trim(), isGuestMode);
        if (!result.success) {
            setScanError(result.message || "Code ungültig");
            setProcessing(false);
            setTimeout(() => setScanError(null), 3000);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-bold">Sparify Connect</h2>
        <button onClick={onClose} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
        
        {/* 1. Video Element (Source) - Hidden visually if canvas is used, or behind canvas */}
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" 
        />
        
        {/* 2. Canvas Element (Display + Feedback) */}
        {/* We use this to render the feed + bounding box */}
        <canvas 
            ref={canvasRef} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Loading / Placeholder State */}
        {!cameraActive && (
          <div className="text-gray-500 flex flex-col items-center absolute z-0">
            <Camera size={48} className="mb-4 opacity-50" />
            <p>{t.loading}</p>
          </div>
        )}
        
        {/* Scanner Overlay (Static UI Guidelines) */}
        {!scanError && !processing && (
            <div className={`relative w-64 h-64 border-4 rounded-[2rem] flex flex-col items-center justify-center transition-colors z-10 ${isGuestMode ? 'border-blue-400/50' : 'border-white/30'}`}>
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl -mt-1 -ml-1 ${isGuestMode ? 'border-blue-400' : 'border-white'}`}></div>
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl -mt-1 -mr-1 ${isGuestMode ? 'border-blue-400' : 'border-white'}`}></div>
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl -mb-1 -ml-1 ${isGuestMode ? 'border-blue-400' : 'border-white'}`}></div>
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl -mb-1 -mr-1 ${isGuestMode ? 'border-blue-400' : 'border-white'}`}></div>
                
                <div className={`w-full h-0.5 shadow-[0_0_15px_rgba(239,68,68,0.8)] absolute top-1/2 animate-[scan_2s_ease-in-out_infinite] ${isGuestMode ? 'bg-blue-400' : 'bg-red-500'}`}></div>
                
                <p className="absolute -bottom-16 text-white/80 text-sm font-bold bg-black/40 px-4 py-2 rounded-full backdrop-blur-md whitespace-nowrap">
                    {isGuestMode ? t.modeGuest : t.title}
                </p>
            </div>
        )}

        {/* ERROR OVERLAY */}
        {scanError && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200 p-6">
                <div className="bg-red-500 text-white p-6 rounded-3xl text-center shadow-2xl max-w-xs border-4 border-white/20">
                    <AlertCircle size={48} className="mx-auto mb-3 opacity-90" />
                    <h3 className="text-xl font-black mb-1">Hoppla!</h3>
                    <p className="font-bold text-red-100">{scanError}</p>
                </div>
            </div>
        )}

        {/* PROCESSING SPINNER */}
        {processing && !scanError && (
             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                 <div className="bg-white/10 p-8 rounded-full backdrop-blur-md border border-white/20 shadow-2xl">
                     <Loader2 size={48} className="text-white animate-spin" />
                 </div>
             </div>
        )}
      </div>

      {/* Manual Entry & Mode Switch */}
      <div className="bg-gray-900 p-6 pb-12 rounded-t-[2.5rem] -mt-6 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-8"></div>
        
        {/* Guest Mode Toggle */}
        <div className="bg-gray-800 rounded-2xl p-1.5 flex mb-6 border border-gray-700">
            <button 
                onClick={() => setIsGuestMode(false)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${!isGuestMode ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400'}`}
            >
                <UserCheck size={16} />
                {t.modeOwner}
            </button>
            <button 
                onClick={() => setIsGuestMode(true)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isGuestMode ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400'}`}
            >
                <Eye size={16} />
                {t.modeGuest}
            </button>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 ml-1">{t.manual}</h3>
        <form onSubmit={handleManualSubmit} className="flex gap-3">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="z.B. PIGGY-123"
            disabled={processing}
            className="flex-1 bg-gray-800 text-white px-5 py-4 rounded-2xl border border-gray-700 focus:outline-none focus:border-white transition-colors placeholder-gray-500 font-mono font-bold tracking-widest disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={processing}
            className={`${isGuestMode ? 'bg-blue-500 shadow-blue-500/30' : THEME_COLORS[accentColor]} text-white font-black px-6 py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100`}
          >
            Go
          </button>
        </form>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(100px); }
          90% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};