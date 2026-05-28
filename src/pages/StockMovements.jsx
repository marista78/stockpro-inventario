import { useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Plus, ArrowUpCircle, ArrowDownCircle, Search, X, Filter,
  Layers, Package, Calendar, User, MessageSquare, 
  ArrowRight, Info, History, ShieldCheck, Download,
  Printer, Receipt
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import './StockMovements.css';

const UNIT_ABBR = {
  'Unidad': 'Und.', 'Unidades': 'Und.',
  'Caja': 'Cja.', 'Cajas': 'Cja.',
  'Paquete': 'Paq.', 'Paquetes': 'Paq.',
  'Kg': 'Kg', 'Kilogramo': 'Kg', 'Kilogramos': 'Kg',
  'Litro': 'Lt.', 'Litros': 'Lt.',
  'Metro': 'Mt.', 'Metros': 'Mt.',
};

const abreviar = (unit) => UNIT_ABBR[unit] || unit;

/* ─────────────────────────────────────────────
   TICKET MODAL — Papel térmico de salida
───────────────────────────────────────────── */
function TicketModal({ ticketData, onClose, shopName }) {
  const { settings } = useSettings();
  const shopRuc = settings.shopRuc || '';
  const shopAddress = settings.shopAddress || '';
  const ticketRef = useRef();
  // El correlativo viene del formulario, ya generado
  const correlativo = ticketData.voucherSerial || `TKT-${Date.now().toString().slice(-8)}`;
  const voucherLabel = ticketData.voucherType === 'Factura' ? 'FACTURA DE VENTA' : 'BOLETA DE VENTA';

  const handlePrint = () => {
    const content = ticketRef.current.innerHTML;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket ${correlativo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; }
    .ticket-inner { width: 100%; max-width: 320px; margin: 0 auto; padding: 20px 18px; }
    b { font-weight: 700; }
    table { width:100%; border-collapse:collapse; font-size:10px; }
    th { text-align:left; font-size:9px; font-weight:700; border-bottom:1px solid #000; padding:3px 0; }
    td { padding:4px 0; vertical-align:top; }
    @media print {
      body { margin: 0; }
      @page { margin: 8mm; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="ticket-inner">${content}</div>
  <script>window.onload = function(){ window.print(); window.addEventListener('afterprint', function(){ window.close(); }); }<\/script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank', 'width=420,height=750');
    // Liberar el blob URL después de que la ventana lo haya cargado
    if (win) {
      win.onload = () => URL.revokeObjectURL(url);
    }
  };

  const qty     = ticketData.quantity || 0;
  const price   = ticketData.purchasePrice || 0;
  const total   = qty * price;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal animate-slide" style={{ maxWidth: '420px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Header del modal de ticket */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Ticket Generado</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Contenido del ticket */}
        <div style={{ background: 'var(--bg-secondary)', overflowY: 'auto', flex: 1, padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100%', paddingBottom: '16px' }}>
            <div
              ref={ticketRef}
              className="ticket-paper"
              style={{
                width: '300px',
                background: '#fff',
                color: '#111',
                fontFamily: "'Courier New', monospace",
                padding: '20px 18px',
                borderRadius: '4px 4px 0 0',
                position: 'relative',
                boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
              }}
            >
              {/* Borde dentado superior */}
              <div style={{ position: 'absolute', top: '-10px', left: 0, right: 0, height: '10px', backgroundImage: 'radial-gradient(circle at 50% 0%, #fff 60%, transparent 60%)', backgroundSize: '16px 10px', backgroundRepeat: 'repeat-x' }} />

              {/* Encabezado */}
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>{shopName}</div>
                {shopRuc && (
                  <div style={{ fontSize: '10px', color: '#333', marginTop: '3px', fontFamily: "'Courier New', monospace" }}>{shopRuc}</div>
                )}
                {shopAddress && (
                  <div style={{ fontSize: '10px', color: '#333', marginTop: '1px', fontFamily: "'Courier New', monospace" }}>{shopAddress}</div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #bbb', margin: '6px 0' }} />

              {/* Tipo de comprobante + correlativo — bien visible */}
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>{voucherLabel}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#222', marginTop: '2px' }}>N° {correlativo}</div>
              </div>

              <div style={{ borderTop: '1px dashed #bbb', margin: '6px 0' }} />

              {/* Meta datos */}
              <div style={{ fontSize: '10px', lineHeight: '1.8' }}>
                <div><b>Fecha:</b> {ticketData.date ? format(new Date(ticketData.date), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                <div><b>Cajero:</b> {ticketData.responsible || '—'}</div>
                {ticketData.buyerName    && <div><b>Cliente:</b>    {ticketData.buyerName}</div>}
                {ticketData.buyerDocument && <div><b>Doc. ({ticketData.voucherType === 'Factura' ? 'RUC' : 'DNI'}):</b> {ticketData.buyerDocument}</div>}
              </div>

              <div style={{ borderTop: '1px dashed #bbb', margin: '10px 0' }} />

              {/* Tabla de items */}
              <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #aaa' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '4px', fontSize: '9px' }}>DESCRIPCIÓN</th>
                    <th style={{ textAlign: 'center', paddingBottom: '4px', fontSize: '9px' }}>CANT</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px', fontSize: '9px' }}>P.U.</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px', fontSize: '9px' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ paddingTop: '6px', paddingRight: '4px', lineHeight: '1.3', maxWidth: '110px', wordBreak: 'break-word' }}>{ticketData.productName}</td>
                    <td style={{ textAlign: 'center', paddingTop: '6px' }}>{qty}</td>
                    <td style={{ textAlign: 'right', paddingTop: '6px' }}>{price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', paddingTop: '6px', fontWeight: 700 }}>{(qty * price).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ borderTop: '1px double #000', marginTop: '10px', paddingTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span>Subtotal:</span><span>S/ {total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, marginTop: '4px' }}>
                  <span>TOTAL:</span><span>S/ {total.toFixed(2)}</span>
                </div>
              </div>

              {ticketData.observations && (
                <div style={{ marginTop: '10px', fontSize: '10px', fontStyle: 'italic', color: '#555', borderTop: '1px dashed #bbb', paddingTop: '6px' }}>
                  Obs: {ticketData.observations}
                </div>
              )}

              <div style={{ borderTop: '1px dashed #bbb', margin: '12px 0 4px' }} />

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#555' }}>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#000', marginBottom: '2px' }}>¡GRACIAS POR SU COMPRA!</div>
                <div style={{ fontSize: '9px' }}>Conserve este comprobante</div>
              </div>

              {/* Borde dentado inferior */}
              <div style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, height: '10px', backgroundImage: 'radial-gradient(circle at 50% 100%, #fff 60%, transparent 60%)', backgroundSize: '16px 10px', backgroundRepeat: 'repeat-x' }} />
            </div>
          </div>
        </div>

        {/* Footer del modal */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={16} /> Imprimir Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MOVEMENT MODAL
───────────────────────────────────────────── */
function MovementModal({ products, suppliers, onSave, onDelete, onClose, editData }) {
  const { user, users } = useAuth();
  const isEditing = !!editData;
  const [selectedBaseProduct, setSelectedBaseProduct] = useState(isEditing ? products.find(p => p.id === editData.productId) : null);
  const [form, setForm] = useState(editData ? {
    ...editData,
    loteMode: 'existing',
    newBatchProvider: products.find(p => p.id === editData.productId)?.provider || '',
  } : { 
    type: 'entrada',
    productId: '',
    loteMode: 'existing',
    quantity: '',
    reason: 'Compra',
    responsible: user?.name || '',
    observations: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    newBatchCode: `LOT-${format(new Date(), 'yyyyMMdd')}-001`,
    newBatchProvider: '',
    newBatchPrice: '',
    buyerName: '',
    buyerDocument: '',
    voucherType: 'Boleta', // 'Boleta' | 'Factura'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Búsqueda de productos
  const filteredProductsForSearch = useMemo(() => {
    if (!searchQuery) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ).reduce((acc, p) => acc.find(x => x.name === p.name) ? acc : [...acc, p], []); // Unicos por nombre
  }, [products, searchQuery]);

  const selectedProductBase = selectedBaseProduct;

  // Nombre del producto seleccionado (para agrupación)
  const selectedGroupName = useMemo(() => {
    if (!selectedProductBase) return null;
    return selectedProductBase.name;
  }, [selectedProductBase]);

  const batchesForProduct = useMemo(() => {
    if (!selectedBaseProduct) return [];
    return products.filter(p => 
      p.name.trim().toLowerCase() === selectedBaseProduct.name.trim().toLowerCase() && 
      (p.stock > 0 || (isEditing && p.id === form.productId))
    );
  }, [products, selectedBaseProduct, isEditing, form.productId]);

  const totalStock = useMemo(() => {
    return batchesForProduct.reduce((sum, p) => sum + p.stock, 0);
  }, [batchesForProduct]);

  // Correlativo auto-generado según tipo de comprobante y cantidad de movimientos registrados
  const { movements } = useInventory();
  const voucherSerial = useMemo(() => {
    const salesCount = (movements || []).filter(m => m.type === 'salida' && m.reason === 'Venta').length + 1;
    const num = String(salesCount).padStart(5, '0');
    return form.voucherType === 'Factura' ? `F001-${num}` : `B001-${num}`;
  }, [movements, form.voucherType]);
  const productHistory = useMemo(() => {
    if (!selectedProductBase) return [];
    return (movements || [])
      .filter(m => m.productName === selectedProductBase.name)
      .sort((a, b) => {
        const dA = new Date(a.date).getTime();
        const dB = new Date(b.date).getTime();
        return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
      })
      .slice(0, 5);
  }, [movements, selectedProductBase]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.productId && form.loteMode === 'existing') return;
    
    onSave({
      ...form,
      productName: selectedProductBase?.name,
      quantity: parseInt(form.quantity),
      purchasePrice: parseFloat(form.newBatchPrice) || selectedProductBase?.price || 0,
      voucherSerial: (form.type === 'salida' && form.reason === 'Venta') ? voucherSerial : undefined,
    });
  };

  const totalCalculated = (parseInt(form.quantity) || 0) * (parseFloat(form.newBatchPrice) || selectedProductBase?.price || 0);

  return (
    <div className="modal-overlay">
      <div className="modal animate-slide modal-movements">
        <div className="modal-header">
          <h2 className="modal-title">Registrar Movimiento de Inventario</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body overflow-y">
            {isEditing && (
              <div className="alert-banner mb-24 bg-warning-glow text-warning p-12 rounded border border-warning flex items-center gap-12">
                <Info size={20} />
                <div className="fs-13">
                  <strong>Modo Edición:</strong> Al modificar este registro, el stock se ajustará automáticamente revirtiendo el valor anterior y aplicando el nuevo.
                </div>
              </div>
            )}

            {/* BANNER COMPROBANTE — visible en la parte superior cuando es Salida por Venta */}
            {!isEditing && form.type === 'salida' && form.reason === 'Venta' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0.06) 100%)',
                border: '1px solid rgba(79,70,229,0.35)',
                borderRadius: '10px', padding: '12px 16px', marginBottom: '20px'
              }}>
                <Receipt size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '6px' }}>TIPO DE COMPROBANTE</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Boleta', 'Factura'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set('voucherType', t)}
                        style={{
                          padding: '5px 18px', borderRadius: '20px', border: '1.5px solid',
                          borderColor: form.voucherType === t ? 'var(--primary)' : 'var(--border)',
                          background: form.voucherType === t ? 'var(--primary)' : 'transparent',
                          color: form.voucherType === t ? '#fff' : 'var(--text-muted)',
                          fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>N° CORRELATIVO</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>{voucherSerial}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Generado automáticamente</div>
                </div>
              </div>
            )}
            
            {/* TIPO DE MOVIMIENTO */}
            <div className="type-toggle-large" style={{ opacity: isEditing ? 0.6 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
              <button 
                type="button" 
                className={`large-type-btn entrada ${form.type === 'entrada' ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, type: 'entrada', reason: 'Compra' }))}
              >
                <ArrowUpCircle size={24} />
                <div className="text-left">
                  <div className="fw-700">Entrada</div>
                  <div className="fs-10 fw-400 opacity-70">Aumenta el stock</div>
                </div>
              </button>
              <button 
                type="button" 
                className={`large-type-btn salida ${form.type === 'salida' ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, type: 'salida', reason: 'Venta' }))}
              >
                <ArrowDownCircle size={24} />
                <div className="text-left">
                  <div className="fw-700">Salida</div>
                  <div className="fs-10 fw-400 opacity-70">Disminuye el stock</div>
                </div>
              </button>
            </div>

            <div className="movement-grid-main">
              {/* COLUMNA IZQUIERDA: PRODUCTO Y CANTIDAD */}
              <div className="col-left">
                <div className="section-title">
                  <span className="section-number">1</span> SELECCIONAR PRODUCTO
                </div>
                
                <div className="input-group" style={{ position: 'relative', opacity: isEditing ? 0.6 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
                  <div className="search-bar">
                    <Search size={16} />
                    <input 
                      placeholder="Buscar por nombre o SKU..." 
                      value={searchQuery || (isEditing ? editData.productName : '')}
                      readOnly={isEditing}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        if (!e.target.value) {
                          setForm(p => ({ ...p, productId: '' }));
                          setSelectedBaseProduct(null);
                        }
                      }}
                    />
                    {selectedProductBase && !isEditing && (
                      <button type="button" className="btn btn-ghost btn-icon" style={{ padding: '0 4px' }}
                        onClick={() => { 
                          setSearchQuery(''); 
                          set('productId', ''); 
                          setSelectedBaseProduct(null);
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {searchQuery.length > 0 && filteredProductsForSearch.length > 0 && !selectedProductBase && (
                    <div className="search-results-dropdown">
                      {filteredProductsForSearch.map(p => (
                        <div key={p.id} className="search-result-item" onClick={() => { 
                          setSearchQuery(p.name); 
                          set('productId', p.id); 
                          setSelectedBaseProduct(p);
                        }}>
                          <Package size={14} />
                          <span>{p.name}</span>
                          <span className="fs-10 text-muted ml-auto">{p.sku}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProductBase && (
                  <div className="product-selection-card mt-16 animate-fade">
                    <div className="prod-preview-img">
                      <Package size={40} className="text-muted" />
                    </div>
                    <div className="prod-preview-info">
                      <div className="flex justify-between items-start">
                        <h3>{selectedProductBase.name}</h3>
                        <span className="prod-badge-status">Activo</span>
                      </div>
                      <div className="prod-meta-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="meta-item"><span className="meta-label">SKU</span><span className="meta-val">{selectedProductBase.sku}</span></div>
                        <div className="meta-item"><span className="meta-label">Categoría</span><span className="meta-val">{selectedProductBase.categoryId}</span></div>
                        <div className="meta-item"><span className="meta-label">Marca</span><span className="meta-val">{selectedProductBase.brand || 'Genérico'}</span></div>
                        <div className="meta-item"><span className="meta-label">Unidad</span><span className="meta-val">{selectedProductBase.unit}</span></div>
                        <div className="meta-item"><span className="meta-label">Stock Total</span><span className="meta-val text-success">{totalStock} und.</span></div>
                        <div className="meta-item"><span className="meta-label">Lotes Activos</span><span className="meta-val">{batchesForProduct.length} lotes</span></div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-24">
                  <div className="section-title">
                    <span className="section-number">3</span> CANTIDAD
                  </div>
                  <div className="grid-2 items-end">
                    <div className="input-group mb-0">
                      <label className="input-label">Cantidad a {form.type === 'entrada' ? 'ingresar' : 'retirar'} *</label>
                      <div className="input-with-suffix">
                        <input className="input" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" />
                        <span className="input-suffix">{selectedProductBase ? abreviar(selectedProductBase.unit) : 'Und.'}</span>
                      </div>
                    </div>
                    <div className="fs-12 text-muted mb-8">
                      <Info size={14} className="inline mr-4" />
                      Stock final: <span className="fw-700 text-primary">
                        {form.type === 'entrada' ? (totalStock + (parseInt(form.quantity) || 0)) : (totalStock - (parseInt(form.quantity) || 0))}
                      </span>
                    </div>
                  </div>

                  {form.type === 'entrada' && (
                    <div className="input-group mt-16">
                      <label className="input-label">Precio Unitario de Ingreso (S/) *</label>
                      <input 
                        className="input" 
                        type="number" 
                        step="0.01" 
                        value={form.newBatchPrice} 
                        onChange={e => set('newBatchPrice', e.target.value)} 
                        placeholder={selectedProductBase?.price || "0.00"} 
                      />
                      <p className="fs-10 text-muted mt-4">
                        El sistema recalculará el precio promedio del producto automáticamente.
                      </p>
                    </div>
                  )}

                  <div className="auto-summary-box mt-20">
                    <div className="preview-label mb-12">RESUMEN AUTOMÁTICO</div>
                    <div className="summary-row"><span>Cantidad</span><span className="fw-700">{form.quantity || 0}</span></div>
                    <div className="summary-row"><span>Precio unitario</span><span>S/ {(parseFloat(form.newBatchPrice) || selectedProductBase?.price || 0).toFixed(2)}</span></div>
                    <div className="summary-total">
                      <span className="total-label">TOTAL</span>
                      <span className="total-val">S/ {totalCalculated.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: LOTE, MOTIVO, ETC */}
              <div className="col-right">
                <div className="section-title">
                  <span className="section-number">2</span> SELECCIONAR LOTE
                </div>

                <div className="lote-mode-toggle" style={{ opacity: isEditing ? 0.6 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
                  <div className={`mode-option ${form.loteMode === 'existing' ? 'active' : ''}`} onClick={() => set('loteMode', 'existing')}>
                    <div className="radio-circle" /><span>Usar lote existente</span>
                  </div>
                  {form.type === 'entrada' && (
                    <div className={`mode-option ${form.loteMode === 'new' ? 'active' : ''}`} onClick={() => set('loteMode', 'new')}>
                      <div className="radio-circle" /><span>Crear nuevo lote</span>
                    </div>
                  )}
                </div>

                <div className="card p-16 bg-secondary-glow mb-24" style={{ opacity: isEditing ? 0.6 : 1, pointerEvents: isEditing ? 'none' : 'auto' }}>
                  {form.loteMode === 'existing' ? (
                    form.type === 'entrada' ? (
                      <div className="grid-2">
                        <div className="input-group mb-0">
                          <label className="input-label">Elegir lote activo *</label>
                          <select 
                            className={`input ${form.productId === 'AUTO_FIFO' ? 'border-primary' : ''}`}
                            value={form.productId} 
                            onChange={e => {
                              const val = e.target.value;
                              set('productId', val);
                              const selBatch = batchesForProduct.find(b => b.id === val);
                              if (selBatch) {
                                set('newBatchProvider', selBatch.provider || '');
                              }
                            }} 
                            disabled={!selectedProductBase || isEditing}
                          >
                            <option value="">Seleccionar lote...</option>
                            {isEditing ? (
                              <option value={editData.productId}>{editData.batch || 'General'}</option>
                            ) : batchesForProduct.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.batch || 'General'} — Stock: {p.stock} {abreviar(p.unit)} {p.expiryDate ? `(Vence: ${p.expiryDate})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group mb-0">
                          <label className="input-label">Proveedor</label>
                          <select 
                            className="input" 
                            value={form.newBatchProvider} 
                            onChange={e => set('newBatchProvider', e.target.value)}
                            disabled={isEditing}
                          >
                            <option value="">Seleccionar proveedor...</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="input-group mb-0">
                        <label className="input-label">Elegir lote activo *</label>
                        <select 
                          className={`input ${form.productId === 'AUTO_FIFO' ? 'border-primary' : ''}`}
                          value={form.productId} 
                          onChange={e => set('productId', e.target.value)} 
                          disabled={!selectedProductBase || isEditing}
                        >
                          <option value="">Seleccionar lote...</option>
                          {form.type === 'salida' && totalStock > 0 && !isEditing && (
                            <option value="AUTO_FIFO" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                              ⚡ [AUTO] Distribuir entre lotes (FIFO/FEFO)
                            </option>
                          )}
                          {isEditing ? (
                            <option value={editData.productId}>{editData.batch || 'General'}</option>
                          ) : batchesForProduct.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.batch || 'General'} — Stock: {p.stock} {abreviar(p.unit)} {p.expiryDate ? `(Vence: ${p.expiryDate})` : ''}
                            </option>
                          ))}
                        </select>
                        {form.type === 'salida' && form.productId && form.productId !== 'AUTO_FIFO' && !isEditing && (
                          (() => {
                            const selBatch = batchesForProduct.find(b => b.id === form.productId);
                            if (selBatch && parseInt(form.quantity) > selBatch.stock) {
                              return (
                                <div className="alert-inline alert-warning mt-8 fs-11">
                                  <Info size={12} className="mr-4" />
                                  Este lote no alcanza. El sistema solo tomará {selBatch.stock}. 
                                  <button type="button" className="btn-link ml-4" onClick={() => set('productId', 'AUTO_FIFO')}>
                                    Usar auto-distribución para los {form.quantity}
                                  </button>
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    )
                  ) : (
                    <div className="grid-2">
                      <div className="input-group mb-0"><label className="input-label">Código *</label><input className="input" value={form.newBatchCode} onChange={e => set('newBatchCode', e.target.value)} /></div>
                      <div className="input-group mb-0"><label className="input-label">Proveedor *</label><select className="input" value={form.newBatchProvider} onChange={e => set('newBatchProvider', e.target.value)}><option value="">Sel...</option>{suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                    </div>
                  )}
                </div>

                <div className="section-title">
                  <span className="section-number">4</span> MOTIVO
                </div>
                <select className="input mb-16" value={form.reason} onChange={e => set('reason', e.target.value)}>
                  {form.type === 'entrada' ? (
                    <><option value="Compra">Compra</option><option value="Devolución Cliente">Devolución Cliente</option><option value="Ajuste Positivo">Ajuste Positivo</option></>
                  ) : (
                    <><option value="Venta">Venta</option><option value="Merma">Merma / Pérdida</option><option value="Devolución Proveedor">Devolución Proveedor</option><option value="Ajuste Negativo">Ajuste Negativo</option></>
                  )}
                </select>

                <div className="grid-2 mb-16">
                  <div>
                    <div className="section-title"><span className="section-number">5</span> FECHA</div>
                    <input type="datetime-local" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                  <div>
                    <div className="section-title"><span className="section-number">6</span> RESPONSABLE</div>
                    <select className="input" value={form.responsible} onChange={e => set('responsible', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* DATOS DEL COMPRADOR — solo salida por Venta */}
                {form.type === 'salida' && form.reason === 'Venta' && (
                  <>
                    <div className="section-title" style={{ marginTop: '4px' }}>
                      <span className="section-number">7</span> DATOS DEL COMPRADOR
                    </div>
                    <div className="grid-2 mb-16">
                      <div className="input-group mb-0">
                        <label className="input-label">Nombre del cliente</label>
                        <input
                          className="input"
                          placeholder="Ej: Juan Pérez"
                          value={form.buyerName}
                          onChange={e => set('buyerName', e.target.value)}
                          maxLength={80}
                        />
                      </div>
                      <div className="input-group mb-0">
                        <label className="input-label">{form.voucherType === 'Factura' ? 'N° RUC' : 'N° DNI'}</label>
                        <input
                          className="input"
                          placeholder={form.voucherType === 'Factura' ? 'Ej: 20123456789' : 'Ej: 12345678'}
                          value={form.buyerDocument}
                          onChange={e => set('buyerDocument', e.target.value)}
                          maxLength={20}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="section-title">
                  <span className="section-number">{form.type === 'salida' && form.reason === 'Venta' ? '8' : '7'}</span> OBSERVACIONES
                </div>
                <div className="input-group">
                  <textarea className="input" rows="2" placeholder="Notas..." value={form.observations} onChange={e => set('observations', e.target.value)} maxLength={200} />
                  <div style={{ fontSize: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>{form.observations.length}/200</div>
                </div>
              </div>
            </div>

            {/* HISTORIAL RECIENTE */}
            {selectedProductBase && (
              <div className="modal-history-section animate-fade">
                <div className="section-title">
                  <History size={16} /> ÚLTIMOS MOVIMIENTOS DE ESTE PRODUCTO
                </div>
                <table className="table mini">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Lote</th>
                      <th>Cantidad</th>
                      <th>Motivo</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productHistory.map(m => (
                      <tr key={m.id}>
                        <td>{m.date ? format(new Date(m.date), 'dd/MM/yyyy HH:mm') : '—'}</td>
                        <td><span className={`mov-type ${m.type} fs-10`}>{m.type === 'entrada' ? 'Entrada' : 'Salida'}</span></td>
                        <td><span className="batch-tag">{m.batch}</span></td>
                        <td className={`fw-700 ${m.type === 'entrada' ? 'text-success' : 'text-danger'}`}>{m.type === 'entrada' ? '+' : '-'}{m.quantity}</td>
                        <td>{m.reason}</td>
                        <td>{m.responsible || 'Sistema'}</td>
                      </tr>
                    ))}
                    {productHistory.length === 0 && (
                      <tr><td colSpan="6" className="text-center text-muted">Sin historial reciente</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            {isEditing ? (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => onDelete(editData)}
                disabled={editData.observations?.startsWith('[ANULADO]')}
                title={editData.observations?.startsWith('[ANULADO]') ? 'Este movimiento ya ha sido anulado' : ''}
              >
                {editData.observations?.startsWith('[ANULADO]') 
                  ? 'Ya Anulado' 
                  : (editData.type === 'salida' ? 'Anular y Devolver Stock' : 'Eliminar Registro')}
              </button>
            ) : <div />}
            <div className="flex gap-12">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Guardar Cambios' : 'Registrar Movimiento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockMovements() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { products, movements, suppliers, addMovement, addMultiBatchMovement, updateMovement, deleteMovement } = useInventory();
  const toast = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canManage = user?.role === 'admin' || user?.permissions?.movements;

  const filtered = movements.filter(m => {
    const matchSearch = 
      m.productName?.toLowerCase().includes(search.toLowerCase()) || 
      m.reason?.toLowerCase().includes(search.toLowerCase()) ||
      m.batch?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || m.type === filterType;
    
    let matchDate = true;
    if (m.date) {
      const mDate = format(new Date(m.date), 'yyyy-MM-dd');
      if (startDate && mDate < startDate) matchDate = false;
      if (endDate && mDate > endDate) matchDate = false;
    }

    return matchSearch && matchType && matchDate;
  });

  const sortedMovements = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filtered]);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updateMovement(editData.id, data);
        toast.success('Movimiento actualizado');
        setShowModal(false);
        setEditData(null);
      } else {
        if (data.productId === 'AUTO_FIFO') {
          await addMultiBatchMovement(data);
          toast.success('Salida multilote procesada correctamente');
          setShowModal(false);
        } else {
          await addMovement(data);
          toast.success('Movimiento registrado');
          setShowModal(false);
          setEditData(null);
          // Mostrar ticket solo para salida por Venta
          if (data.type === 'salida' && data.reason === 'Venta') {
            setTicketData(data);
          }
        }
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleDelete = async (mov) => {
    const isSalida = mov.type === 'salida';
    const confirmMsg = isSalida
      ? '¿Estás seguro de anular esta salida? Se creará un nuevo movimiento de ingreso por devolución y el stock será devuelto.'
      : '¿Estás seguro de eliminar este movimiento? El stock será revertido.';

    if (window.confirm(confirmMsg)) {
      try {
        await deleteMovement(mov.id, user?.name || 'Sistema');
        toast.success(isSalida ? 'Movimiento devuelto (ingreso registrado)' : 'Movimiento eliminado');
        setShowModal(false);
        setEditData(null);
      } catch (err) {
        toast.error('Error: ' + err.message);
      }
    }
  };

  const handleOpenEdit = (m) => {
    if (!canManage) return;
    setEditData(m);
    setShowModal(true);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Movimientos de Stock</h1>
          <p className="page-subtitle">{movements.length} operaciones registradas con trazabilidad avanzada</p>
        </div>
        <div className="flex" style={{ gap: '80px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => {
            const rows = sortedMovements.map(m => {
              const product = products.find(p => p.id === m.productId || p.name === m.productName);
              return {
                'Fecha': m.date ? format(new Date(m.date), "dd/MM/yyyy HH:mm") : '',
                'SKU': product?.sku || '',
                'Producto': m.productName,
                'Cantidad': m.quantity,
                'Tipo': m.type === 'entrada' ? 'Entrada' : 'Salida',
                'Lote': m.batch || '',
                'Motivo': m.reason || '',
                'Responsable': m.responsible || '',
                'Observaciones': m.observations || ''
              };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
            XLSX.writeFile(wb, `movimientos_${format(new Date(), 'yyyyMMdd')}.xlsx`);
          }}>
            <Download size={16} /> Exportar Excel
          </button>
          {canManage && (
            <button className="btn btn-primary" style={{ marginLeft: '32px' }} onClick={() => setShowModal(true)}>
              <Plus size={16} /> Nuevo Movimiento
            </button>
          )}
        </div>
      </div>

      <div className="inv-filters filter-bar mb-16" style={{ gap: '30px' }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <input placeholder="Buscar por producto, lote o motivo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <Filter size={14} className="text-primary" />
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
        </div>
        <div className="filter-group">
          <Calendar size={14} className="text-primary" />
          <input 
            type="date" 
            className="filter-select" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            placeholder="Desde"
          />
          <span className="text-muted" style={{ margin: '0 8px' }}>al</span>
          <input 
            type="date" 
            className="filter-select" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            placeholder="Hasta"
          />
          {(startDate || endDate) && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        {sortedMovements.length === 0 ? (
          <div className="empty-state">
            <Layers size={32} className="text-muted mb-8" />
            <p>No se encontraron movimientos</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Tipo</th>
                <th>Lote / Batch</th>
                <th>Motivo</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {sortedMovements.map(m => {
                const product = products.find(p => p.id === m.productId || p.name === m.productName);
                return (
                  <tr 
                    key={m.id} 
                    onDoubleClick={() => handleOpenEdit(m)}
                    style={{ cursor: canManage ? 'pointer' : 'default' }}
                    title={canManage ? 'Doble clic para editar' : ''}
                  >
                    <td className="text-muted">{m.date ? format(new Date(m.date), "dd/MM/yyyy HH:mm") : '—'}</td>
                    <td className="fw-500 text-primary">{product?.sku || '—'}</td>
                    <td className="fw-600">{m.productName}</td>
                    <td><span className={`mov-qty ${m.type}`}>{m.type === 'entrada' ? '+' : '-'}{m.quantity}</span></td>
                    <td>
                      <div className={`mov-type ${m.type}`}>
                        {m.type === 'entrada' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                        {m.type === 'entrada' ? 'Entrada' : 'Salida'}
                      </div>
                    </td>
                    <td>
                      <span className="batch-tag">{m.batch || '—'}</span>
                    </td>
                    <td className="text-muted">{m.reason || '—'}</td>
                    <td className="text-muted">{m.responsible || 'Sistema'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <MovementModal 
          products={products} 
          suppliers={suppliers}
          editData={editData}
          onSave={handleSave} 
          onDelete={handleDelete}
          onClose={() => { setShowModal(false); setEditData(null); }} 
        />
      )}

      {ticketData && (
        <TicketModal
          ticketData={ticketData}
          shopName={settings.appName || 'Mi Negocio'}
          onClose={() => setTicketData(null)}
        />
      )}
    </div>
  );
}
