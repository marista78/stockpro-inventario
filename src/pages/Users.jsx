import { useState } from 'react';
import { 
  Users as UsersIcon, Plus, Search, Edit2, Trash2, 
  Shield, User, Mail, Calendar, X, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Users.css';

const PERMISSIONS = [
  { id: 'inventory', label: 'Gestionar Inventario' },
  { id: 'categories', label: 'Gestionar Categorías' },
  { id: 'suppliers', label: 'Gestionar Proveedores' },
  { id: 'movements', label: 'Registrar Movimientos' },
  { id: 'reports', label: 'Ver Reportes' },
  { id: 'ai', label: 'Usar Asistente IA' }
];

export default function Users() {
  const { users, addUser, updateUser, deleteUser, user: currentUser } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    permissions: {
      inventory: true,
      categories: true,
      suppliers: true,
      movements: true,
      reports: true
    }
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Siempre vacío al abrir
        role: user.role,
        permissions: user.permissions || {
          inventory: true,
          categories: true,
          suppliers: true,
          movements: true,
          reports: true
        }
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        permissions: {
          inventory: true,
          categories: true,
          suppliers: true,
          movements: true,
          reports: true
        }
      });
    }
    setShowModal(true);
  };

  const handlePermissionChange = (permId) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permId]: !prev.permissions[permId]
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Al editar, solo enviar password si no está vacío
        const dataToUpdate = { ...formData };
        if (!dataToUpdate.password) {
          delete dataToUpdate.password;
        }
        updateUser(editingId, dataToUpdate);
        toast.success('Usuario actualizado con éxito');
      } else {
        addUser(formData);
        toast.success('Usuario creado con éxito');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        deleteUser(id);
        toast.success('Usuario eliminado');
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="users-page page-content">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra los accesos y roles del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </header>

      <div className="card">
        <div className="table-controls" style={{ marginBottom: '20px' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper" style={{ maxHeight: 'none', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ minWidth: '250px' }}>Usuario</th>
                <th style={{ minWidth: '200px' }}>Email</th>
                <th style={{ minWidth: '150px' }}>Rol</th>
                <th style={{ minWidth: '150px' }}>Registro</th>
                <th className="text-right" style={{ minWidth: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {u.name[0].toUpperCase()}
                      </div>
                      <span className="user-name">{u.name}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role}`}>
                      {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                      {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <div className="date-cell">
                      <Calendar size={14} />
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="actions-cell">
                      <button 
                        className="btn btn-ghost btn-icon" 
                        onClick={() => handleOpenModal(u)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-icon btn-danger-hover" 
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentUser.id}
                        title="Eliminar"
                        style={{ color: u.id === currentUser.id ? 'var(--text-subtle)' : '' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <UsersIcon size={32} />
              </div>
              <p>No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn-icon btn-ghost" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Nombre Completo</label>
                    <input 
                      className="input"
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Correo Electrónico</label>
                    <input 
                      className="input"
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="usuario@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Contraseña</label>
                    <input 
                      className="input"
                      type="password" 
                      required={!editingId}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder={editingId ? 'Dejar en blanco para no cambiar' : '********'}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Rol de Usuario</label>
                    <div className="role-selector horizontal">
                      <label className={`role-option-mini ${formData.role === 'admin' ? 'active' : ''}`}>
                        <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                        <Shield size={14} /> Admin
                      </label>
                      <label className={`role-option-mini ${formData.role === 'user' ? 'active' : ''}`}>
                        <input type="radio" name="role" value="user" checked={formData.role === 'user'} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                        <User size={14} /> Usuario
                      </label>
                    </div>
                  </div>
                </div>

                {formData.role === 'user' && (
                  <div className="permissions-section">
                    <div className="divider"><span>Permisos del Usuario</span></div>
                    <div className="permissions-grid">
                      {PERMISSIONS.map(perm => (
                        <label key={perm.id} className="perm-item">
                          <input 
                            type="checkbox" 
                            checked={formData.permissions[perm.id]} 
                            onChange={() => handlePermissionChange(perm.id)}
                          />
                          <div className="perm-check">
                            {formData.permissions[perm.id] ? <Check size={12} /> : null}
                          </div>
                          <span>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
