import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Pencil, Trash2, Users, X, Phone, Mail, MapPin, CreditCard, Clock } from 'lucide-react';
import './Suppliers.css';

const EMPTY = { name: '', contact: '', phone: '', email: '', ruc: '', address: '', leadTime: '' };

function SupplierModal({ supplier, products, onSave, onClose }) {
  const [form, setForm] = useState(supplier || EMPTY);
  const [prodSearch, setProdSearch] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Productos únicos para el selector
  const uniqueProducts = useMemo(() => {
    const seen = new Set();
    return products.filter(p => {
      const name = p.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Qué productos tiene este proveedor actualmente
  const [selectedProds, setSelectedProds] = useState(() => {
    if (!supplier) return [];
    const supName = supplier.name.trim().toLowerCase();
    return uniqueProducts
      .filter(p => p.provider?.trim().toLowerCase() === supName)
      .map(p => p.name.trim().toLowerCase());
  });

  const toggleProduct = (pName) => {
    const name = pName.trim().toLowerCase();
    setSelectedProds(prev => 
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave(form, selectedProds);
  };

  const filteredProds = uniqueProducts.filter(p => 
    p.name.toLowerCase().includes(prodSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal animate-slide">
        <div className="modal-header">
          <h2 className="modal-title">{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Nombre de la Empresa *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: TechDistri S.A." required />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Contacto (Persona)</label>
                <input className="input" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="input-group">
                <label className="input-label">RUC / ID</label>
                <input className="input" value={form.ruc} onChange={e => set('ruc', e.target.value)} placeholder="Ej: 20123456789" />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Teléfono</label>
                <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Ej: 987 654 321" />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="proveedor@ejemplo.com" />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Dirección</label>
                <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Av. Principal 123..." />
              </div>
              <div className="input-group">
                <label className="input-label">Lead Time (Días)</label>
                <input className="input" type="number" value={form.leadTime} onChange={e => set('leadTime', e.target.value)} placeholder="Ej: 3" />
              </div>
            </div>

            {/* Selector de Productos */}
            <div className="divider mt-20"><span>Productos Suministrados</span></div>
            <div className="sup-prod-manager">
              <div className="search-bar mini mb-12">
                <Search size={14} />
                <input 
                  placeholder="Buscar producto para vincular..." 
                  value={prodSearch} 
                  onChange={e => setProdSearch(e.target.value)}
                />
              </div>
              <div className="sup-prod-list">
                {filteredProds.map((p, idx) => {
                  const isSelected = selectedProds.includes(p.name.trim().toLowerCase());
                  return (
                    <div 
                      key={idx} 
                      className={`sup-prod-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleProduct(p.name)}
                    >
                      <div className={`checkbox-mini ${isSelected ? 'checked' : ''}`} />
                      <span className="p-name">{p.name}</span>
                      {p.provider && !isSelected && (
                        <span className="p-current-sup">(De: {p.provider})</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> {supplier ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const { user } = useAuth();
  const { products, updateProduct, suppliers, addSupplier, updateSupplier, deleteSupplier, loading } = useInventory();
  const toast = useToast();
  const [search, setSearch] = useState('');
  
  const canManage = user?.role === 'admin' || user?.permissions?.suppliers;
  const [showModal, setShowModal] = useState(false);
  const [editSup, setEditSup] = useState(null);

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data, selectedProductNames) => {
    try {
      let finalSupName = data.name;
      let oldName = editSup?.name;

      if (editSup) {
        await updateSupplier(editSup.id, data);
      } else {
        await addSupplier(data);
      }

      // Actualizar los productos en el inventario (Cloud)
      const updates = products.map(p => {
        const pName = p.name.trim().toLowerCase();
        const currentProv = p.provider?.trim().toLowerCase();
        
        // Si el producto está en la nueva lista seleccionada para este proveedor
        if (selectedProductNames.includes(pName)) {
          if (currentProv !== finalSupName.trim().toLowerCase()) {
            return updateProduct(p.id, { provider: finalSupName });
          }
        }
        // Si el producto TENÍA a este proveedor pero ya NO está seleccionado
        else if (oldName && currentProv === oldName.trim().toLowerCase()) {
          return updateProduct(p.id, { provider: '' });
        }
        return null;
      }).filter(Boolean);

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      toast.success(editSup ? 'Proveedor actualizado' : 'Proveedor registrado');
      setShowModal(false);
      setEditSup(null);
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`¿Eliminar al proveedor "${s.name}"?`)) return;
    try {
      await deleteSupplier(s.id);
      toast.success('Proveedor eliminado');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner" />
        <p className="text-muted">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">{suppliers.length} empresas registradas</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setEditSup(null); setShowModal(true); }}>
            <Plus size={16} /> Nuevo Proveedor
          </button>
        )}
      </div>

      <div className="inv-filters card mb-16">
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <input placeholder="Buscar por nombre, contacto o RUC..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Users size={28} /></div>
          <p>No se encontraron proveedores</p>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Registrar uno</button>}
        </div>
      ) : (
        <div className="suppliers-grid">
          {filtered.map(s => (
            <div key={s.id} className="card sup-card card-hover">
              <div className="sup-card-header">
                <div className="sup-avatar">
                  {s.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="sup-header-info">
                  <h3 className="sup-name">{s.name}</h3>
                  <span className="sup-contact">{s.contact || 'Sin contacto'}</span>
                </div>
              </div>
              
              <div className="sup-details">
                <div className="sup-detail-item">
                  <CreditCard size={14} className="text-muted" />
                  <span>{s.ruc || 'RUC no registrado'}</span>
                </div>
                <div className="sup-detail-item">
                  <Phone size={14} className="text-muted" />
                  <span>{s.phone || 'Sin teléfono'}</span>
                </div>
                <div className="sup-detail-item">
                  <Mail size={14} className="text-muted" />
                  <span className="truncate">{s.email || 'Sin correo'}</span>
                </div>
                <div className="sup-detail-item">
                  <MapPin size={14} className="text-muted" />
                  <span className="truncate">{s.address || 'Sin dirección'}</span>
                </div>
                <div className="sup-detail-item">
                  <Clock size={14} className="text-primary" />
                  <span className="fw-600">Entrega: {s.leadTime || '?'} días</span>
                </div>
              </div>

              {/* Productos asociados */}
              <div className="sup-products-preview">
                <h4 className="preview-label">Productos Suministrados:</h4>
                <div className="preview-tags">
                  {products
                    .filter(p => p.provider?.trim().toLowerCase() === s.name.trim().toLowerCase() && p.stock > 0)
                    .reduce((acc, p) => acc.find(x => x.name === p.name) ? acc : [...acc, p], []) // Únicos por nombre
                    .slice(0, 3)
                    .map((p, idx) => (
                      <span key={idx} className="preview-tag">{p.name}</span>
                    ))
                  }
                  {products.filter(p => p.provider?.trim().toLowerCase() === s.name.trim().toLowerCase() && p.stock > 0).length > 3 && (
                    <span className="preview-tag more">+{products.filter(p => p.provider?.trim().toLowerCase() === s.name.trim().toLowerCase() && p.stock > 0).length - 3} más</span>
                  )}
                  {products.filter(p => p.provider?.trim().toLowerCase() === s.name.trim().toLowerCase() && p.stock > 0).length === 0 && (
                    <span className="text-muted" style={{ fontSize: '11px' }}>Sin productos vinculados</span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="sup-card-footer">
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditSup(s); setShowModal(true); }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={() => handleDelete(s)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SupplierModal 
          supplier={editSup} 
          products={products}
          onSave={handleSave} 
          onClose={() => { setShowModal(false); setEditSup(null); }} 
        />
      )}
    </div>
  );
}
