import { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Pencil, Trash2, QrCode, X, Upload, Package, Filter, Download, ChevronRight, Layers, AlertTriangle, Info } from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import './Inventory.css';

const excelDateToJS = (serial) => {
  if (!serial || isNaN(serial) || typeof serial === 'string') return serial;
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
};

const UNIT_ABBR = {
  'Unidad': 'Und.', 'Unidades': 'Und.',
  'Caja': 'Cja.', 'Cajas': 'Cja.',
  'Paquete': 'Paq.', 'Paquetes': 'Paq.',
  'Kg': 'Kg', 'Kilogramo': 'Kg', 'Kilogramos': 'Kg',
  'Litro': 'Lt.', 'Litros': 'Lt.',
  'Metro': 'Mt.', 'Metros': 'Mt.',
  'Par': 'Par', 'Pares': 'Par',
  'Rollo': 'Rol.', 'Rollos': 'Rol.',
};

const abreviar = (unit) => {
  if (!unit || typeof unit !== 'string') return '';
  return UNIT_ABBR[unit] || unit;
};

function ProductModal({ product, categories, onSave, onClose, calculateSuggestedROP }) {
  const [form, setForm] = useState(product || { 
    name: '', sku: '', categoryId: '', price: '', stock: '', minStock: '', 
    unit: 'Unidad', brand: '', provider: '', entryDate: new Date().toISOString().split('T')[0], batch: '', expiryDate: '',
    image: null
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  
  const suggested = product && calculateSuggestedROP ? calculateSuggestedROP(product.id) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) return;
    onSave({ 
      ...form, 
      price: parseFloat(form.price) || 0, 
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 0 
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal animate-slide">
        <div className="modal-header">
          <h2 className="modal-title">{product ? 'Editar Producto / Lote' : 'Nuevo Producto'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body overflow-y">
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Nombre del Producto *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ej: Monitor LED 24" />
              </div>
              <div className="input-group">
                <label className="input-label">SKU / Código *</label>
                <input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} required placeholder="Ej: MON-001" />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Categoría *</label>
                <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Precio Unitario *</label>
                <input className="input" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} required placeholder="0.00" />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Stock Actual</label>
                <input className="input" type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
              </div>
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label">Stock Mínimo (Alerta)</label>
                  {suggested && (
                    <span className="text-primary fw-600" style={{ fontSize: '11px', cursor: 'help' }} title="Sugerencia basada en ventas reales y lead time">
                      Sugerencia: {suggested}
                    </span>
                  )}
                </div>
                <input className="input" type="number" value={form.minStock} onChange={e => set('minStock', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Unidad de Medida</label>
                <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  <option value="Unidad">Unidad</option>
                  <option value="Caja">Caja</option>
                  <option value="Paquete">Paquete</option>
                  <option value="Kg">Kg</option>
                  <option value="Litro">Litro</option>
                  <option value="Metro">Metro</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Marca</label>
                <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ej: Samsung" />
              </div>
            </div>

            <div className="divider"><span>Información de Lote</span></div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Número de Lote / Batch</label>
                <input className="input" value={form.batch} onChange={e => set('batch', e.target.value)} placeholder="Ej: LT-2024-001" />
              </div>
              <div className="input-group">
                <label className="input-label">Proveedor</label>
                <input className="input" value={form.provider} onChange={e => set('provider', e.target.value)} placeholder="Nombre del proveedor" />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Fecha de Ingreso</label>
                <input className="input" type="date" value={form.entryDate} onChange={e => set('entryDate', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Fecha de Vencimiento</label>
                <input className="input" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">URL de Imagen (opcional)</label>
              <input className="input" value={form.image || ''} onChange={e => set('image', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{product ? 'Guardar Cambios' : 'Crear Producto'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductDetailModal({ productGroup, categories, onClose, getCategoryById, calculateSuggestedROP, onEdit, onDelete, canManage }) {
  const main = productGroup.main;
  const cat = getCategoryById(main.categoryId);
  const totalStock = productGroup.totalStock;
  const minStock = main.minStock;
  const isDanger = totalStock <= minStock;
  const isReorder = totalStock <= minStock * 1.5;
  const suggestedROP = calculateSuggestedROP(main.id);
  const fileRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      onEdit(main, { image: evt.target.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg animate-slide">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{main.name}</h2>
            <span className="text-muted" style={{ fontSize: '13px' }}>SKU: {main.sku} | {cat?.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {canManage && (
              <button className="btn btn-ghost btn-icon" style={{ color: 'var(--primary)' }} onClick={() => onEdit(main)}>
                <Pencil size={18} />
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        
        <div className="modal-body overflow-y">
          {/* Fila superior: imagen + stats */}
          <div className="detail-top-row">
            <div className="detail-image-box">
              {main.image ? <img src={main.image} alt={main.name} /> : <Package size={48} className="text-muted" />}
              {canManage && (
                <>
                  <button 
                    className="edit-image-trigger" 
                    onClick={() => fileRef.current.click()}
                    title="Cambiar imagen"
                  >
                    <Pencil size={14} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handleImageChange} 
                  />
                </>
              )}
            </div>
            <div className="detail-stats-col">
              <div className={`detail-qstat ${totalStock === 0 || isDanger ? 'danger' : isReorder ? 'warning' : 'success'}`}>
                <span className="qlabel">Stock Total</span>
                <span className="qvalue">{totalStock} {abreviar(main.unit)}</span>
              </div>
              <div className="detail-qstat primary">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="qlabel">Sugerencia Stock Mínimo</span>
                  <Info size={13} className="text-muted cursor-help" title="Cálculo inteligente basado en ventas de los últimos 30 días, el tiempo de entrega del proveedor y un 15% de stock de seguridad." />
                </div>
                <span className="qvalue">{suggestedROP} {abreviar(main.unit)}</span>
              </div>
            </div>
          </div>

          {/* Especificaciones */}
          <div className="divider mt-12"><span>Especificaciones</span></div>
          <div className="tech-info-grid">
            <div className="t-item"><strong>Marca:</strong> {main.brand || '—'}</div>
            <div className="t-item"><strong>Categoría:</strong> {cat?.name || '—'}</div>
          </div>

          {/* Tabla de lotes */}
          <h3 className="section-subtitle" style={{ marginTop: 24 }}>Lotes / Batches Disponibles</h3>
          <div className="batch-table-wrapper">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>N° Lote</th>
                  <th>Stock del Lote</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {productGroup.items.map(item => (
                  <tr key={item.id}>
                    <td className="fw-600">{item.batch || '—'}</td>
                    <td className={item.stock < 5 ? 'text-danger fw-700' : 'fw-600'}>{item.stock} {abreviar(item.unit)}</td>
                    <td className="text-muted">{item.provider || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          {canManage && (
            <button className="btn btn-primary" onClick={() => onEdit(main)}>
              <Pencil size={16} /> Editar Producto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const { products, categories, setCategories, addProduct, updateProduct, deleteProduct, importProducts, clearInventory, getCategoryById, calculateSuggestedROP } = useInventory();
  const toast = useToast();
  const importRef = useRef();
  const [search, setSearch] = useState('');
  
  const canManage = user?.role === 'admin' || user?.permissions?.inventory;
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editProduct, setEditProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [qrProduct, setQrProduct] = useState(null);
  const [viewProductGroup, setViewProductGroup] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Agrupación inteligente con recuperación de errores
  const groupedProducts = useMemo(() => {
    try {
      const groups = {};
      const prodsArray = Array.isArray(products) ? products : [];
      
      prodsArray.forEach(p => {
        if (!p) return;
        if ((Number(p.stock) || 0) <= 0) return;

        const name = String(p.name || 'Sin Nombre').trim();
        const key = name.toLowerCase() || 'default';
        if (!groups[key]) {
          groups[key] = { id: key, main: p, totalStock: 0, items: [] };
        }
        groups[key].totalStock += (Number(p.stock) || 0);
        groups[key].items.push(p);
      });

      const list = Object.values(groups);
      return list.filter(g => {
        const p = g.main;
        if (!p) return false;
        const name = String(p.name || '').toLowerCase();
        const sku = String(p.sku || '').toLowerCase();
        const s = search.toLowerCase();
        const matchSearch = name.includes(s) || sku.includes(s);
        const matchCat = !filterCat || String(p.categoryId) === String(filterCat);
        const matchStatus = !filterStatus || (
          filterStatus === 'low' ? (g.totalStock || 0) < (p.minStock || 0) : 
          filterStatus === 'reorder' ? (g.totalStock || 0) >= (p.minStock || 0) && (g.totalStock || 0) <= (p.minStock || 0) * 1.5 :
          filterStatus === 'ok' ? (g.totalStock || 0) > (p.minStock || 0) * 1.5 :
          true
        );
        return matchSearch && matchCat && matchStatus;
      });
    } catch (err) {
      console.error("Error grouping products:", err);
      return []; // Fallback seguro
    }
  }, [products, search, filterCat, filterStatus]);

  const handleSave = (data) => {
    if (editProduct) {
      // Si data tiene solo algunos campos (como la imagen), hacemos merge
      const isQuickImageUpdate = Object.keys(data).length === 1 && data.image;
      
      if (isQuickImageUpdate) {
        // Actualizar imagen para todos los productos con el mismo nombre (todos los lotes)
        const nameToUpdate = editProduct.name;
        products.forEach(p => {
          if (p.name === nameToUpdate) {
            updateProduct(p.id, { image: data.image });
          }
        });
        toast.success('Imagen actualizada para todos los lotes');
      } else {
        updateProduct(editProduct.id, data);
        toast.success('Producto / Lote actualizado');
      }
    } else {
      addProduct(data);
      toast.success('Producto creado');
    }
    setShowModal(false);
    setEditProduct(null);
  };

  const exportToExcel = () => {
    if (!products.length) return toast.error('No hay productos para exportar');
    const headers = ['SKU', 'Nombre', 'Marca', 'Unidad', 'Categoria', 'Stock', 'Stock Minimo', 'Precio Unitario', 'Lote', 'Proveedor', 'Fecha Ingreso', 'Fecha Vencimiento'];
    const rows = products.map(p => {
      const cat = getCategoryById(p.categoryId)?.name || 'Sin categoria';
      return [
        p.sku, p.name, p.brand || '', p.unit || '', cat, p.stock, p.minStock || 0, p.price, p.batch || '', p.provider || '', p.entryDate || '', p.expiryDate || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventario_stockpro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo preparado para Excel');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (json.length <= 1) return toast.error('El archivo está vacío');
        
        const rows = json.slice(1);
        const newCats = [...categories];
        let hasNew = false;

        rows.forEach(cols => {
          const catName = String(cols[4] || '').trim();
          if (catName && !newCats.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
            newCats.push({ id: 'cat-'+Date.now()+Math.random().toString(36).substr(2,4), name: catName, color: '#6366f1' });
            hasNew = true;
          }
        });
        if (hasNew) setCategories(newCats);

        const newProds = rows.map(cols => {
          if (!cols || !cols[1]) return null;
          const [sku, name, brand, unit, catName, stock, minStock, price, batch, provider, entryDate, expiryDate] = cols;
          const category = newCats.find(c => c.name.toLowerCase() === String(catName || '').trim().toLowerCase());
          return {
            sku: String(sku || ''), name: String(name || ''), brand: String(brand || ''), unit: String(unit || 'Unidad'),
            categoryId: category?.id || '', stock: parseInt(stock) || 0, minStock: parseInt(minStock) || 0,
            price: parseFloat(price) || 0, batch: String(batch || ''), provider: String(provider || ''),
            entryDate: excelDateToJS(entryDate) || '', expiryDate: excelDateToJS(expiryDate) || '', image: null
          };
        }).filter(Boolean);
        if (newProds.length) { importProducts(newProds); toast.success(`${newProds.length} productos importados`); }
      } catch (err) { toast.error('Error al importar'); }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario Consolidado</h1>
          <p className="page-subtitle">{groupedProducts.length} productos agrupados ({products.length} lotes totales)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={exportToExcel}><Download size={16} /> Exportar</button>
          {canManage && (
            <>
              <button 
                className="btn btn-ghost btn-danger-hover" 
                style={{ color: 'var(--danger)', borderColor: 'hsla(0, 72%, 51%, 0.2)' }}
                onClick={() => {
                  if (confirm('¿Estás totalmente seguro de VACIAR TODO el inventario? Esta acción eliminará todos los productos y movimientos registrados y NO se puede deshacer.')) {
                    clearInventory();
                    toast.success('Inventario vaciado por completo');
                  }
                }}
              >
                <Trash2 size={16} /> Vaciar Inventario
              </button>
              <button className="btn btn-secondary" onClick={() => importRef.current.click()}><Upload size={16} /> Importar</button>
              <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}><Plus size={16} /> Nuevo Producto</button>
            </>
          )}
          <input type="file" ref={importRef} style={{ display: 'none' }} accept=".xlsx, .xls, .csv" onChange={handleImport} />
        </div>
      </div>

      <div className="inv-filters filter-bar mb-16">
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <input placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        <div className="filter-group">
          <Filter size={14} className="text-primary" />
          <select 
            className="filter-select"
            value={filterCat} 
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <AlertTriangle size={14} className="text-primary" />
          <select 
            className="filter-select"
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="low">Stock Bajo</option>
            <option value="reorder">Punto Reorden</option>
            <option value="ok">Stock OK</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th>SKU</th>
              <th>Nombre del Producto</th>
              <th>Marca</th>
              <th>Unidad</th>
              <th>Categoría</th>
              <th>Stock Total</th>
              <th>Mínimo</th>
              <th>Precio Prom.</th>
              <th>Lotes</th>
              <th>Proveedor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {groupedProducts.map((g, index) => {
              const p = g.main;
              const cat = getCategoryById(p.categoryId);
              const isSelected = selectedGroupId === g.id;
              const hasMultipleBatches = g.items.length > 1;

              return (
                <tr 
                  key={g.id} 
                  className={isSelected ? 'selected' : ''} 
                  onClick={() => setSelectedGroupId(g.id)}
                  onDoubleClick={() => setViewProductGroup(g)}
                >
                  <td className="col-num">{index + 1}</td>
                  <td className="col-sku"><code className="sku">{p.sku}</code></td>
                  <td><span className="fw-600">{p.name}</span></td>
                  <td className="text-muted">{p.brand || '—'}</td>
                  <td className="text-muted">{abreviar(p.unit)}</td>
                  <td>
                    {cat ? (
                      <span className="cat-badge" style={{ background: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}44` }}>
                        <span className="color-dot" style={{ background: cat.color }} /> {cat.name}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className={`fw-700 ${(g.totalStock || 0) < (p.minStock || 0) ? 'text-warning' : ''}`}>
                    {g.totalStock || 0}
                  </td>
                  <td className="text-muted">{p.minStock || 0}</td>
                  <td className="fw-600">S/ {(p.price || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  <td>
                    {hasMultipleBatches ? (
                      <span className="batch-indicator">
                        <Layers size={12} /> {g.items.length} Lotes
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '12px' }}>{p.batch || '—'}</span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: '12px' }}>{p.provider || '—'}</td>
                  <td>
                    {(g.totalStock || 0) === 0 ? <span className="badge badge-danger">AGOTADO</span> : 
                     (g.totalStock || 0) < (p.minStock || 0) ? <span className="badge badge-danger">BAJO</span> : 
                     (g.totalStock || 0) <= (p.minStock || 0) * 1.5 ? <span className="badge badge-warning">REORDEN</span> :
                     <span className="badge badge-success">OK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ProductModal 
          product={editProduct} 
          categories={categories} 
          onSave={handleSave} 
          calculateSuggestedROP={calculateSuggestedROP}
          onClose={() => { setShowModal(false); setEditProduct(null); }} 
        />
      )}
      
      {qrProduct && (
        <div className="modal-overlay" onClick={() => setQrProduct(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Código QR del Producto</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setQrProduct(null)}><X size={18} /></button>
            </div>
            <div className="modal-body text-center p-40">
              <div className="qr-container"><QRCode value={JSON.stringify({ id: qrProduct.id, sku: qrProduct.sku })} size={180} /></div>
              <p className="fw-600 mt-20">{qrProduct.name}</p>
              <p className="text-muted">{qrProduct.sku}</p>
            </div>
          </div>
        </div>
      )}

      {viewProductGroup && (
        <ProductDetailModal 
          productGroup={viewProductGroup} 
          categories={categories}
          onClose={() => setViewProductGroup(null)}
          getCategoryById={getCategoryById}
          calculateSuggestedROP={calculateSuggestedROP}
          canManage={canManage}
          onEdit={(p) => { setEditProduct(p); setShowModal(true); setViewProductGroup(null); }}
          onDelete={(p) => { if (confirm('¿Eliminar este lote?')) { deleteProduct(p.id); setViewProductGroup(null); } }}
        />
      )}
    </div>
  );
}
