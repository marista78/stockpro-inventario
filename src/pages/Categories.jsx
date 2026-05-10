import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { Plus, Pencil, Trash2, Tags, X } from 'lucide-react';

const COLORS = ['#4f46e5','#06b6d4','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b'];

function CategoryModal({ category, onSave, onClose }) {
  const [form, setForm] = useState(category || { name: '', color: COLORS[0] });
  const handleSubmit = (e) => { e.preventDefault(); if (!form.name) return; onSave(form); };

  return (
    <div className="modal-overlay">
      <div className="modal animate-slide" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">{category ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Nombre *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Electrónica" required />
            </div>
            <div className="input-group">
              <label className="input-label">Color</label>
              <div className="color-picker">
                {COLORS.map(c => (
                  <button key={c} type="button" className={`color-option ${form.color === c ? 'selected' : ''}`}
                    style={{ background: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />
                ))}
              </div>
              <div className="color-preview">
                <span className="cat-preview-badge" style={{ background: form.color + '22', color: form.color, border: `1px solid ${form.color}44` }}>
                  <span className="color-dot" style={{ background: form.color }} /> {form.name || 'Vista previa'}
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Plus size={16} />{category ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Categories() {
  const { user } = useAuth();
  const { categories, products, addCategory, updateCategory, deleteCategory } = useInventory();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);

  const canManage = user?.role === 'admin' || user?.permissions?.categories;

  const handleSave = (data) => {
    if (editCat) { updateCategory(editCat.id, data); toast.success('Categoría actualizada'); }
    else { addCategory(data); toast.success('Categoría creada'); }
    setShowModal(false); setEditCat(null);
  };

  const handleDelete = (c) => {
    const count = products.filter(p => p.categoryId === c.id).length;
    if (count > 0) { toast.warning(`No puedes eliminar "${c.name}": tiene ${count} producto(s)`); return; }
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    deleteCategory(c.id); toast.success('Categoría eliminada');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">{categories.length} categorías registradas</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setEditCat(null); setShowModal(true); }}>
            <Plus size={16} /> Nueva Categoría
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Tags size={28} /></div>
          <p>No hay categorías. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className="grid-3">
          {categories.map(c => {
            const count = products.filter(p => p.categoryId === c.id).length;
            return (
              <div key={c.id} className="card card-hover cat-card">
                <div className="cat-card-color" style={{ background: `linear-gradient(135deg, ${c.color}33, ${c.color}11)`, borderColor: c.color + '44' }}>
                  <span className="cat-icon" style={{ background: c.color + '22', color: c.color }}>
                    <Tags size={20} />
                  </span>
                </div>
                <div className="cat-card-info">
                  <h3 className="cat-card-name">{c.name}</h3>
                  <span className="cat-card-count">{count} productos</span>
                </div>
                {canManage && (
                  <div className="cat-card-actions">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditCat(c); setShowModal(true); }}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <CategoryModal category={editCat} onSave={handleSave} onClose={() => { setShowModal(false); setEditCat(null); }} />}
    </div>
  );
}
