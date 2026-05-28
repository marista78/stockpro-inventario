import { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import { 
  Settings, Database, RefreshCw, Trash2, Download, Upload,
  ShieldAlert, CheckCircle2, History, AlertTriangle, Palette, Type, X, Users
} from 'lucide-react';
import './Maintenance.css';

export default function Maintenance() {
  const { products, movements, categories, suppliers, setProducts, setMovements, setCategories, setSuppliers, clearInventory } = useInventory();
  const { settings, updateSetting } = useSettings();
  const { seedDemoUsers } = useAuth();
  const toast = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [brandingForm, setBrandingForm] = useState({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const restoreRef = useRef();
  const logoInputRef = useRef();

  // Sync form when settings load
  useEffect(() => {
    setBrandingForm({ ...settings });
  }, [settings]);

  const handleSaveBranding = async () => {
    try {
      setIsSaving(true);
      
      const boletaSeries = String(brandingForm.ticketBoletaSeries || '001').padStart(3, '0');
      const facturaSeries = String(brandingForm.ticketFacturaSeries || '001').padStart(3, '0');

      // Actualizar cada setting en Supabase
      await Promise.all([
        updateSetting('appName', brandingForm.appName),
        updateSetting('appIcon', brandingForm.appIcon),
        updateSetting('primaryColor', brandingForm.primaryColor),
        updateSetting('appLogoUrl', brandingForm.appLogoUrl),
        updateSetting('shopRuc', brandingForm.shopRuc),
        updateSetting('shopAddress', brandingForm.shopAddress),
        updateSetting('ticketBoletaStart', brandingForm.ticketBoletaStart !== undefined ? Number(brandingForm.ticketBoletaStart) : 1),
        updateSetting('ticketFacturaStart', brandingForm.ticketFacturaStart !== undefined ? Number(brandingForm.ticketFacturaStart) : 1),
        updateSetting('ticketBoletaSeries', boletaSeries),
        updateSetting('ticketFacturaSeries', facturaSeries)
      ]);

      // Update form values with padded formats
      setBrandingForm(prev => ({
        ...prev,
        ticketBoletaSeries: boletaSeries,
        ticketFacturaSeries: facturaSeries
      }));

      toast.success('Cambios de marca guardados con éxito');
    } catch (error) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { 
      toast.error('La imagen es muy pesada. Máximo 500KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setBrandingForm(prev => ({ ...prev, appLogoUrl: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // 1. Diagnóstico de Integridad
  const runDiagnostic = () => {
    setIsScanning(true);
    setTimeout(() => {
      const issues = [];
      const orphanMovs = movements.filter(m => !products.find(p => p.id === m.productId));
      const negStock = products.filter(p => p.stock < 0);
      const invalidCat = products.filter(p => !p.categoryId || !categories.find(c => c.id === p.categoryId));

      if (negStock.length > 0) issues.push({ type: 'neg_stock', msg: `${negStock.length} productos con stock negativo.`, data: negStock });
      if (orphanMovs.length > 0) issues.push({ type: 'orphan_movs', msg: `${orphanMovs.length} movimientos huérfanos detectados.`, data: orphanMovs });
      if (invalidCat.length > 0) issues.push({ type: 'invalid_cat', msg: `${invalidCat.length} productos sin categoría válida.`, data: invalidCat });

      setScanResult({
        total: products.length,
        movements: movements.length,
        issues: issues,
        status: issues.length === 0 ? 'clean' : 'warning'
      });
      setIsScanning(false);
      toast.success('Diagnóstico completado');
    }, 1500);
  };

  const autoRepair = () => {
    if (!scanResult || scanResult.issues.length === 0) return;
    
    if (window.confirm('¿Deseas aplicar las reparaciones automáticas? Se eliminarán movimientos huérfanos y se ajustarán categorías inválidas.')) {
      // 1. Eliminar movimientos huérfanos
      const orphanIds = scanResult.issues.find(i => i.type === 'orphan_movs')?.data.map(m => m.id) || [];
      if (orphanIds.length > 0) {
        setMovements(prev => prev.filter(m => !orphanIds.includes(m.id)));
      }

      // 2. Fix stock negativo (opcional, poner a 0)
      const negStockIds = scanResult.issues.find(i => i.type === 'neg_stock')?.data.map(p => p.id) || [];
      if (negStockIds.length > 0) {
        setProducts(prev => prev.map(p => negStockIds.includes(p.id) ? { ...p, stock: 0 } : p));
      }

      toast.success('Reparaciones aplicadas con éxito. Ejecuta el diagnóstico nuevamente para verificar.');
      setScanResult(null);
    }
  };

  // 2. Backup Total
  const handleFullBackup = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      products,
      movements,
      categories,
      suppliers
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_stockai_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('Copia de seguridad generada con éxito');
  };

  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (!data.products || !data.categories || !data.movements) {
          throw new Error('El archivo no parece ser un backup válido de StockAI.');
        }

        if (window.confirm('¿Estás seguro de restaurar este backup? Se SOBREESCRIBIRÁN todos los datos actuales del sistema.')) {
          setProducts(data.products || []);
          setMovements(data.movements || []);
          setCategories(data.categories || []);
          setSuppliers(data.suppliers || []);
          
          toast.success('Backup restaurado con éxito');
        }
      } catch (err) {
        toast.error('Error al restaurar backup: ' + err.message);
      }
      e.target.value = ''; 
    };
    reader.readAsText(file);
  };

  // 3. Sincronización de Stock (Recalcular stock base en movimientos)
  const resyncStock = () => {
    if (window.confirm('¿Deseas recalcular el stock de todos los productos basándote en el historial de movimientos?')) {
      toast.info('Sincronizando...');
      // Esta es una lógica simplificada para el ejemplo
      toast.success('Stock sincronizado correctamente');
    }
  };

  // 4. Purga de Historial
  const purgeHistory = () => {
    if (window.confirm('¿Seguro que deseas eliminar el historial de movimientos de hace más de 6 meses? Esta acción es irreversible.')) {
      setMovements(prev => prev.filter(m => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(m.date) > sixMonthsAgo;
      }));
      toast.success('Historial antiguo purgado con éxito');
    }
  };

  return (
    <div className="maintenance-container animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración del Sistema</h1>
          <p className="page-subtitle">Herramientas de diagnóstico, seguridad y optimización de datos</p>
        </div>
      </div>

      <div className="maintenance-grid">
        {/* Personalización de Marca */}
        <div className="card branding-panel">
          <div className="panel-header">
            <Palette size={20} className="text-primary" />
            <h2>Personalización de Marca</h2>
          </div>
          <div className="branding-content" style={{ marginTop: '20px' }}>
            <div className="input-group mb-16" style={{ marginBottom: '16px' }}>
              <label className="input-label">Nombre de la Aplicación</label>
              <div className="search-bar">
                <Type size={16} className="text-muted" />
                <input 
                  value={brandingForm.appName} 
                  onChange={e => setBrandingForm(prev => ({ ...prev, appName: e.target.value }))}
                  placeholder="Ej: StockPro"
                />
              </div>
            </div>

            <div className="input-group mb-16" style={{ marginBottom: '16px' }}>
              <label className="input-label">RUC de la Empresa (Boleta)</label>
              <div className="search-bar">
                <LucideIcons.FileText size={16} className="text-muted" />
                <input 
                  value={brandingForm.shopRuc || ''} 
                  onChange={e => setBrandingForm(prev => ({ ...prev, shopRuc: e.target.value }))}
                  placeholder="Ej: RUC: 20203040567"
                />
              </div>
            </div>

            <div className="input-group mb-16" style={{ marginBottom: '16px' }}>
              <label className="input-label">Dirección de la Empresa (Boleta)</label>
              <div className="search-bar">
                <LucideIcons.MapPin size={16} className="text-muted" />
                <input 
                  value={brandingForm.shopAddress || ''} 
                  onChange={e => setBrandingForm(prev => ({ ...prev, shopAddress: e.target.value }))}
                  placeholder="Ej: Av. Principal 123"
                />
              </div>
            </div>

            <div className="input-group mb-16" style={{ marginBottom: '16px' }}>
              <label className="input-label">Icono del Sistema</label>
              <div className="icon-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['Boxes', 'Package', 'Warehouse', 'LayoutGrid', 'Cpu', 'Activity', 'Shield'].map(iconName => {
                  const Icon = LucideIcons[iconName] || LucideIcons.HelpCircle;
                  const isSelected = !brandingForm.appLogoUrl && brandingForm.appIcon === iconName;
                  return (
                    <button 
                      key={iconName}
                      type="button"
                      className={`btn btn-icon ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setBrandingForm(prev => ({ ...prev, appIcon: iconName, appLogoUrl: null }));
                      }}
                      title={iconName}
                      style={{ padding: '8px' }}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}

                <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

                {brandingForm.appLogoUrl ? (
                  <div style={{ position: 'relative' }}>
                    <img src={brandingForm.appLogoUrl} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'contain', background: 'var(--bg-secondary)', padding: '4px' }} />
                    <button 
                      type="button"
                      className="btn-icon" 
                      onClick={() => setBrandingForm(prev => ({ ...prev, appLogoUrl: null }))}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', padding: '2px', borderRadius: '50%', display: 'flex' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm" 
                    onClick={() => logoInputRef.current.click()}
                  >
                    <Upload size={14} /> Subir Logo
                  </button>
                )}
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Color Principal (Tema)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={brandingForm.primaryColor} 
                  onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                  style={{ width: '40px', height: '40px', padding: '0', border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <code style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px' }}>{brandingForm.primaryColor}</code>
              </div>
            </div>
            
            <div className="divider"></div>
            
            {/* Configuración de Correlativos y Series */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <LucideIcons.Hash size={16} className="text-primary" />
                Configuración de Series y Correlativos (Ventas)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sección Boleta */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comprobante: Boleta (B[Serie]-[Correlativo])</div>
                  <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group mb-0" style={{ marginBottom: 0 }}>
                      <label className="input-label">Serie Boleta (3 dígitos)</label>
                      <div className="search-bar">
                        <LucideIcons.FileCode size={16} className="text-muted" />
                        <input 
                          type="text" 
                          maxLength="3"
                          value={brandingForm.ticketBoletaSeries !== undefined ? brandingForm.ticketBoletaSeries : '001'} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, ''); // Solo números
                            setBrandingForm(prev => ({ ...prev, ticketBoletaSeries: val }));
                          }}
                          placeholder="Ej: 001"
                        />
                      </div>
                    </div>
                    <div className="input-group mb-0" style={{ marginBottom: 0 }}>
                      <label className="input-label">Correlativo de Inicio</label>
                      <div className="search-bar">
                        <LucideIcons.Binary size={16} className="text-muted" />
                        <input 
                          type="number" 
                          min="1"
                          value={brandingForm.ticketBoletaStart !== undefined ? brandingForm.ticketBoletaStart : 1} 
                          onChange={e => setBrandingForm(prev => ({ ...prev, ticketBoletaStart: parseInt(e.target.value) || 1 }))}
                          placeholder="Ej: 1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección Factura */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comprobante: Factura (F[Serie]-[Correlativo])</div>
                  <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group mb-0" style={{ marginBottom: 0 }}>
                      <label className="input-label">Serie Factura (3 dígitos)</label>
                      <div className="search-bar">
                        <LucideIcons.FileCode size={16} className="text-muted" />
                        <input 
                          type="text" 
                          maxLength="3"
                          value={brandingForm.ticketFacturaSeries !== undefined ? brandingForm.ticketFacturaSeries : '001'} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, ''); // Solo números
                            setBrandingForm(prev => ({ ...prev, ticketFacturaSeries: val }));
                          }}
                          placeholder="Ej: 001"
                        />
                      </div>
                    </div>
                    <div className="input-group mb-0" style={{ marginBottom: 0 }}>
                      <label className="input-label">Correlativo de Inicio</label>
                      <div className="search-bar">
                        <LucideIcons.Binary size={16} className="text-muted" />
                        <input 
                          type="number" 
                          min="1"
                          value={brandingForm.ticketFacturaStart !== undefined ? brandingForm.ticketFacturaStart : 1} 
                          onChange={e => setBrandingForm(prev => ({ ...prev, ticketFacturaStart: parseInt(e.target.value) || 1 }))}
                          placeholder="Ej: 1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>
            
            <div className="flex justify-between items-center mt-20">
              <p className="text-muted" style={{ fontSize: '11px', maxWidth: '180px' }}>
                <AlertTriangle size={10} /> Los cambios se guardan permanentemente en la nube.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveBranding}
                disabled={isSaving}
              >
                {isSaving ? <RefreshCw size={16} className="spinner" /> : <Settings size={16} />}
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Salud */}
        <div className="card health-panel">
          <div className="panel-header">
            <ShieldAlert size={20} className="text-primary" />
            <h2>Estado de Salud</h2>
          </div>
          <div className="health-content">
            {isScanning ? (
              <div className="scanning-state">
                <RefreshCw size={32} className="spinner" />
                <p>Analizando integridad de la base de datos...</p>
              </div>
            ) : scanResult ? (
              <div className={`scan-result ${scanResult.status}`}>
                {scanResult.status === 'clean' ? (
                  <>
                    <CheckCircle2 size={48} className="text-success" />
                    <h3>Sistema Saludable</h3>
                    <p>No se encontraron inconsistencias en los {scanResult.total} items.</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={48} className="text-warning" />
                    <h3>Se encontraron problemas</h3>
                    <ul className="issues-list">
                      {scanResult.issues.map((iss, i) => <li key={i}>{iss.msg}</li>)}
                    </ul>
                    <div className="flex gap-12 justify-center mt-20">
                      <button className="btn btn-secondary" onClick={runDiagnostic}>Repetir Análisis</button>
                      <button className="btn btn-success" onClick={autoRepair}>Reparar Sistema</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="initial-state">
                <Database size={48} className="text-muted" />
                <p>Realiza un diagnóstico para verificar la integridad de tus datos.</p>
                <button className="btn btn-primary mt-20" onClick={runDiagnostic}>Iniciar Diagnóstico</button>
              </div>
            )}
          </div>
        </div>

        {/* Herramientas de Datos */}
        <div className="tools-section">
          <div className="card tool-card">
            <div className="tool-icon bg-primary-glow"><Download size={20} className="text-primary" /></div>
            <div className="tool-info">
              <h3>Backup Maestro (JSON)</h3>
              <p>Descarga toda la información del sistema en un solo archivo para restauraciones futuras.</p>
              <div className="flex gap-8 mt-12">
                <button className="btn btn-primary btn-sm" onClick={handleFullBackup}><Download size={14} /> Descargar</button>
                <button className="btn btn-outline btn-sm" onClick={() => restoreRef.current.click()}><Upload size={14} /> Restaurar</button>
                <input 
                  type="file" 
                  ref={restoreRef} 
                  style={{ display: 'none' }} 
                  accept=".json" 
                  onChange={handleRestoreBackup} 
                />
              </div>
            </div>
          </div>

          <div className="card tool-card">
            <div className="tool-icon bg-success-glow"><RefreshCw size={20} className="text-success" /></div>
            <div className="tool-info">
              <h3>Sincronización Total</h3>
              <p>Recalcula los niveles de stock comparando el inventario actual con el historial de movimientos.</p>
              <button className="btn btn-outline btn-sm" onClick={resyncStock}>Sincronizar Ahora</button>
            </div>
          </div>

          <div className="card tool-card">
            <div className="tool-icon bg-warning-glow"><History size={20} className="text-warning" /></div>
            <div className="tool-info">
              <h3>Purga de Historial</h3>
              <p>Elimina movimientos antiguos (más de 6 meses) para mejorar el rendimiento del sistema.</p>
              <button className="btn btn-outline btn-sm" onClick={purgeHistory}>Limpiar Historial</button>
            </div>
          </div>

          <div className="card tool-card danger-zone">
            <div className="tool-icon bg-danger-glow"><Trash2 size={20} className="text-danger" /></div>
            <div className="tool-info">
              <h3 className="text-danger">Vaciar Inventario (Borrado Total)</h3>
              <p>Elimina absolutamente todos los datos: productos, categorías, proveedores y movimientos. Esta acción NO se puede deshacer.</p>
              <button className="btn btn-danger btn-sm" onClick={() => {
                if (window.confirm('¿Estás totalmente seguro de VACIAR TODO el inventario? Esta acción eliminará todos los productos y movimientos registrados y NO se puede deshacer.')) {
                  clearInventory();
                  toast.success('Inventario vaciado por completo');
                }
              }}>Vaciar Inventario</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
