'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare, MoreVertical, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Detect device type
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
        setDeviceType('ios');
      } else if (/Android/.test(ua)) {
        setDeviceType('android');
      } else {
        setDeviceType('desktop');
      }

      // Check if already in standalone/PWA mode
      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      ) {
        setIsInstalled(true);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Top Banner on Agent Page */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3.5 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-2.5 mb-3 border border-blue-400/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold leading-tight truncate flex items-center gap-1.5">
              <span>Install AgentPulse App</span>
              <span className="text-[9px] bg-emerald-400/90 text-slate-950 font-extrabold px-1.5 py-0.2 rounded-full uppercase">PWA</span>
            </div>
            <div className="text-[11px] text-blue-100 truncate">
              Add to home screen for 1-tap offline GPS tracking
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg hover:bg-white/20 text-blue-200 hover:text-white transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Instructions Modal for Manual Installation (iOS Safari, Android Chrome, Desktop) */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">How to Install AgentPulse</h3>
                  <p className="text-[11px] text-slate-500">Run as a standalone app on your device</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deviceType === 'ios' && (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Follow these 2 steps in Safari on iPhone:</p>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Tap the Share Button</span>
                    <span className="text-[11px] text-slate-500">Look at the bottom bar of Safari and tap the Share icon (<Share className="w-3 h-3 inline text-blue-600" />).</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Tap &quot;Add to Home Screen&quot;</span>
                    <span className="text-[11px] text-slate-500">Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="w-3 h-3 inline text-slate-700" />), then tap <strong>Add</strong>.</span>
                  </div>
                </div>
              </div>
            )}

            {deviceType === 'android' && (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Follow these 2 steps in Chrome on Android:</p>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Tap the Chrome Menu</span>
                    <span className="text-[11px] text-slate-500">Tap the three dots (<MoreVertical className="w-3 h-3 inline text-slate-700" />) in the top-right corner of Chrome.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Tap &quot;Install app&quot; or &quot;Add to Home screen&quot;</span>
                    <span className="text-[11px] text-slate-500">Tap <strong>Install</strong> to add the AgentPulse app to your Android home screen and app drawer!</span>
                  </div>
                </div>
              </div>
            )}

            {deviceType === 'desktop' && (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">To install on your PC / Mac:</p>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Use the Chrome / Edge Address Bar</span>
                    <span className="text-[11px] text-slate-500">Look at the right side of your browser address bar and click the <strong>Install</strong> icon (computer with down arrow).</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
