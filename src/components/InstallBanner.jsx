import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import './InstallBanner.css';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 3 seconds
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setVisible(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!visible || installed) return null;

  return (
    <div className="install-banner animate-slide">
      <div className="install-banner-icon">
        <Download size={20} />
      </div>
      <div className="install-banner-text">
        <span className="install-banner-title">Instalar StockPro</span>
        <span className="install-banner-sub">Úsala sin internet, como app nativa</span>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleInstall}>
        Instalar
      </button>
      <button className="btn btn-ghost btn-icon btn-sm install-banner-close" onClick={() => setVisible(false)}>
        <X size={16} />
      </button>
    </div>
  );
}
