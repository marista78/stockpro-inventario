import { useState, useRef, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Pencil, Trash2, QrCode, X, Upload, Package, Filter, Download, ChevronRight, ChevronLeft, Layers, AlertTriangle, Info } from 'lucide-react';
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

    const fileRef = useRef();

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 800000) {
        alert('La imagen es muy pesada. Máximo 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        set('image', evt.target.result);
      };
      reader.readAsDataURL(file);
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="input-label">SKU / Código *</label>
                    <button 
                      type="button" 
                      className="text-primary fw-600 sku-gen-btn" 
                      style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => {
                        const category = categories.find(c => c.id === form.categoryId);
                        const prefix = category ? category.name.substring(0, 3).toUpperCase() : 'SKU';
                        const random = Math.floor(1000 + Math.random() * 9000);
                        set('sku', `${prefix}-${random}`);
                      }}
                    >
                      Generar automático
                    </button>
                  </div>
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
                <label className="input-label">Imagen del Producto</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div 
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px dashed var(--border)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    {form.image ? (
                      <img src={form.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={24} className="text-muted" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        className="input" 
                        value={form.image || ''} 
                        onChange={e => set('image', e.target.value)} 
                        placeholder="Pegar URL o subir archivo..." 
                        style={{ fontSize: '12px' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-icon" 
                        onClick={() => fileRef.current.click()}
                        title="Subir archivo"
                      >
                        <Upload size={16} />
                      </button>
                    </div>
                    <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                  </div>
                </div>
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

function ProductDetailModal({ productGroup, categories, onClose, getCategoryById, calculateSuggestedROP, onEdit, onDelete, canManage, onNavigate }) {
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') onNavigate(-1);
      if (e.key === 'ArrowRight') onNavigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  return (
    <>
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

          <div className="divider mt-12"><span>Especificaciones</span></div>
          <div className="tech-info-grid">
            <div className="t-item">
              <strong>Marca:</strong> {main.brand || '---'}
            </div>
            <div className="t-item">
              <strong>Categoría:</strong> {cat?.name || '---'}
            </div>
          </div>

          <div className="divider mt-12"><span>Lotes / Batches Disponibles</span></div>
          <div className="batches-table-mini">
            <table>
              <thead>
                <tr>
                  <th>Nº Lote</th>
                  <th>Stock del Lote</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {productGroup.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.batch || 'S/L'}</td>
                    <td>{item.stock} {abreviar(item.unit)}</td>
                    <td>{item.provider || '---'}</td>
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
    </>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const { 
    products, categories, setCategories, addProduct, updateProduct, 
    deleteProduct, importProducts, clearInventory, getCategoryById, 
    calculateSuggestedROP, loading 
  } = useInventory();
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

  const handleNavigate = (direction) => {
    if (!viewProductGroup || !groupedProducts.length) return;
    const currentIndex = groupedProducts.findIndex(g => g.id === viewProductGroup.id);
    let nextIndex = currentIndex + direction;
    
    if (nextIndex < 0) nextIndex = groupedProducts.length - 1;
    if (nextIndex >= groupedProducts.length) nextIndex = 0;
    
    setViewProductGroup(groupedProducts[nextIndex]);
    setSelectedGroupId(groupedProducts[nextIndex].id);
  };

   // Agrupación inteligente con recuperación de errores
   const groupedProducts = useMemo(() => {
     try {
       const groups = {};
       const prodsArray = Array.isArray(products) ? products : [];
       
       prodsArray.forEach(p => {
         if (!p) return;

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

  const handleSave = async (data, productToEdit = editProduct) => {
    try {
      if (productToEdit) {
        const isQuickImageUpdate = Object.keys(data).length === 1 && data.image;
        
        if (isQuickImageUpdate) {
          const nameToUpdate = productToEdit.name;
          const updates = products
            .filter(p => p.name === nameToUpdate)
            .map(p => updateProduct(p.id, { image: data.image }));
          
          await Promise.all(updates);
          
          // Actualizar la vista previa inmediata si el modal de detalles está abierto
          if (viewProductGroup && viewProductGroup.main.name === nameToUpdate) {
            setViewProductGroup(prev => prev ? ({
              ...prev,
              main: { ...prev.main, image: data.image },
              items: prev.items.map(item => ({ ...item, image: data.image }))
            }) : null);
          }
          
          toast.success('Imagen actualizada para todos los lotes');
        } else {
          await updateProduct(productToEdit.id, data);
          
          // Actualizar vista previa si es el mismo producto
          if (viewProductGroup && viewProductGroup.main.id === productToEdit.id) {
            setViewProductGroup(prev => prev ? ({
              ...prev,
              main: { ...prev.main, ...data }
            }) : null);
          }
          
          toast.success('Producto / Lote actualizado');
        }
      } else {
        await addProduct(data);
        toast.success('Producto creado');
      }
      setShowModal(false);
      setEditProduct(null);
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    }
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
    reader.onload = async (evt) => {
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

        // Collect new categories first
        for (const cols of rows) {
          const catName = String(cols[4] || '').trim();
          if (catName && !newCats.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
            const { data: newCat, error } = await supabase.from('categories').insert([{ name: catName, color: '#6366f1' }]).select().single();
            if (!error) {
              newCats.push(newCat);
              hasNew = true;
            }
          }
        }
        if (hasNew) setCategories(newCats);

        const newProds = rows.map(cols => {
          if (!cols || !cols[1]) return null;
          const [sku, name, brand, unit, catName, stock, minStock, price, batch, provider, entryDate, expiryDate] = cols;
          const category = newCats.find(c => c.name.toLowerCase() === String(catName || '').trim().toLowerCase());
          return {
            sku: String(sku || ''), name: String(name || ''), brand: String(brand || ''), unit: String(unit || 'Unidad'),
            categoryId: category?.id || null, stock: parseInt(stock) || 0, minStock: parseInt(minStock) || 0,
            price: parseFloat(price) || 0, batch: String(batch || ''), provider: String(provider || ''),
            entryDate: excelDateToJS(entryDate) || null, expiryDate: excelDateToJS(expiryDate) || null, image: null
          };
        }).filter(Boolean);
        
        if (newProds.length) { 
          await importProducts(newProds); 
          toast.success(`${newProds.length} productos importados`); 
        }
      } catch (err) { 
        toast.error('Error al importar: ' + err.message); 
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner" />
        <p className="text-muted">Cargando inventario desde la nube...</p>
      </div>
    );
  }

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
                onClick={async () => {
                  if (confirm('¿Estás totalmente seguro de VACIAR TODO el inventario? Esta acción eliminará todos los productos y movimientos registrados y NO se puede deshacer.')) {
                    try {
                      await clearInventory();
                      toast.success('Inventario vaciado por completo');
                    } catch (err) {
                      toast.error('Error al vaciar inventario');
                    }
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
        <div className="modal-overlay" onClick={() => setViewProductGroup(null)}>
          <div className="modal modal-lg animate-slide" onClick={(e) => e.stopPropagation()}>
            {/* Botones de Navegación Internos */}
            <button 
              className="nav-arrow prev" 
              onClick={(e) => { e.stopPropagation(); handleNavigate(-1); }}
              title="Anterior (←)"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              className="nav-arrow next" 
              onClick={(e) => { e.stopPropagation(); handleNavigate(1); }}
              title="Siguiente (→)"
            >
              <ChevronRight size={24} />
            </button>

            <ProductDetailModal 
              productGroup={viewProductGroup} 
              categories={categories}
              onClose={() => setViewProductGroup(null)}
              getCategoryById={getCategoryById}
              calculateSuggestedROP={calculateSuggestedROP}
              canManage={canManage}
              onNavigate={handleNavigate}
              onEdit={(p, updates) => { 
                if (updates) {
                  handleSave(updates, p);
                } else {
                  setEditProduct(p); 
                  setShowModal(true); 
                  setViewProductGroup(null); 
                }
              }}
              onDelete={async (p) => { 
                if (confirm('¿Eliminar este lote?')) { 
                  try {
                    await deleteProduct(p.id); 
                    setViewProductGroup(null); 
                    toast.success('Producto eliminado');
                  } catch (err) {
                    toast.error('Error al eliminar');
                  }
                } 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
