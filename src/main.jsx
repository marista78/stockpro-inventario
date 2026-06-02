import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Manejo automático de actualizaciones del Service Worker (PWA)
if ('serviceWorker' in navigator) {
  // Solo queremos recargar la página si la app ya estaba controlada
  // por un service worker anterior (es decir, es una actualización, no la primera instalación).
  const isControlled = !!navigator.serviceWorker.controller;
  
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isControlled) {
      window.location.reload();
    }
  });
}

// Escucha global para errores de carga de módulos (fallbacks de actualización)
window.addEventListener('error', (e) => {
  const isScriptError = e.message && (
    e.message.includes('Failed to load module script') || 
    e.message.includes('ChunkLoadError')
  );
  if (isScriptError) {
    console.warn('Error de carga de script detectado. Recargando aplicación...', e);
    window.location.reload();
  }
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

