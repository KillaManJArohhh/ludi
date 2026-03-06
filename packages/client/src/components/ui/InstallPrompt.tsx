import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('ludi-install-dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('ludi-install-dismissed', '1');
  };

  return (
    <div className="mt-8 glass-panel rounded-xl p-4 w-full max-w-xs text-center">
      <p className="text-sm text-[#f0ece4] font-medium mb-2">Install Ludi</p>
      <p className="text-[10px] text-[#C4A35A]/40 mb-3">Add to your home screen for the best experience</p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={handleInstall}
          className="btn-primary px-4 py-2 rounded-lg text-white font-bold text-sm"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#C4A35A]/40 text-sm hover:text-[#C4A35A]/60 transition-colors px-2"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
