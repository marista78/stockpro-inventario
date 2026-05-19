import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useInventory } from '../context/InventoryContext';
import { Camera, CameraOff, QrCode, Package } from 'lucide-react';
import './Scanner.css';

export default function Scanner() {
  const { products } = useInventory();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const qrRef = useRef(null);
  const html5QrRef = useRef(null);

  const startScan = async () => {
    setResult(null); setError('');
    try {
      html5QrRef.current = new Html5Qrcode('qr-reader');
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          try {
            const data = JSON.parse(decoded);
            const product = products.find(p => p.id === data.id || p.sku === data.sku);
            if (product) setResult(product);
            else setResult({ name: data.name || decoded, sku: data.sku || '—', notFound: true });
          } catch {
            setResult({ name: decoded, sku: '—', notFound: true });
          }
          stopScan();
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  };

  const stopScan = () => {
    html5QrRef.current?.stop().catch(() => {}).finally(() => {
      html5QrRef.current?.clear();
      setScanning(false);
    });
  };

  useEffect(() => () => { stopScan(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Escáner QR</h1>
          <p className="page-subtitle">Escanea el código QR de un producto con tu cámara</p>
        </div>
      </div>

      <div className="scanner-layout">
        <div className="card scanner-card">
          <div className="scanner-preview">
            <div id="qr-reader" className={`qr-reader ${scanning ? 'active' : ''}`} />
            {!scanning && (
              <div className="scanner-placeholder">
                <QrCode size={64} style={{ opacity: 0.3 }} />
                <p>La cámara aparecerá aquí</p>
              </div>
            )}
          </div>

          {error && <div className="scanner-error">{error}</div>}

          <div className="scanner-controls">
            {!scanning ? (
              <button className="btn btn-primary" onClick={startScan}>
                <Camera size={18} /> Iniciar Escáner
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopScan}>
                <CameraOff size={18} /> Detener
              </button>
            )}
          </div>

          <p className="scanner-tip">
            💡 Apunta la cámara al código QR generado desde la página de Inventario.
          </p>
        </div>

        {result && (
          <div className="card scanner-result animate-slide">
            <h2 className="section-title" style={{ marginBottom: 16 }}>
              {result.notFound ? '⚠️ Producto no encontrado' : '✅ Producto encontrado'}
            </h2>
            {!result.notFound ? (
              <div className="result-product">
                <div className="result-thumb">
                  {result.image ? <img src={result.image} alt={result.name} /> : <Package size={32} />}
                </div>
                <div className="result-info">
                  <h3 className="result-name">{result.name}</h3>
                  <p className="result-sku">SKU: {result.sku}</p>
                  <div className="result-stats">
                    <div className="result-stat">
                      <span className="result-stat-label">Stock</span>
                      <span className="result-stat-value">{result.stock}</span>
                    </div>
                    <div className="result-stat">
                      <span className="result-stat-label">Precio</span>
                      <span className="result-stat-value">{result.price?.toLocaleString('es-PE')} S/</span>
                    </div>
                    <div className="result-stat">
                      <span className="result-stat-label">Estado</span>
                      <span className={`badge ${result.stock <= result.minStock ? 'badge-danger' : 'badge-success'}`}>
                        {result.stock <= result.minStock ? 'Bajo stock' : 'OK'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">El código escaneado no corresponde a ningún producto registrado: <code>{result.name}</code></p>
            )}
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => { setResult(null); startScan(); }}>
              Escanear otro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
