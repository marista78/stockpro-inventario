import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, ArrowLeftRight,
  QrCode, BarChart3, LogOut, AlertTriangle, Menu, X, Boxes, Truck, Settings, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useSettings } from '../context/SettingsContext';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import './Sidebar.css';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventario', icon: Package, label: 'Inventario', permission: 'inventory' },
  { to: '/categorias', icon: Tags, label: 'Categorías', permission: 'categories' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores', permission: 'suppliers' },
  { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos', permission: 'movements' },
  { to: '/usuarios', icon: Users, label: 'Usuarios', adminOnly: true },
  { to: '/escaner', icon: QrCode, label: 'Escáner QR' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/mantenimiento', icon: Settings, label: 'Configuración', adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { lowStockProducts, reorderProducts } = useInventory();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const AppIcon = LucideIcons[settings.appIcon] || LucideIcons.Boxes;

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleReset = () => {
    if (confirm('¿Estás seguro de reiniciar todos los datos? Se perderá la sesión actual.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const filteredNav = NAV.filter(item => {
    // Si no hay usuario, no mostramos nada
    if (!user) return false;

    // Los administradores siempre ven todo
    if (user.role?.toLowerCase() === 'admin') return true;
    
    // Si es una sección solo para administradores y no lo es, ocultar
    if (item.adminOnly) return false;
    
    // Para usuarios estándar, verificamos permisos específicos
    if (item.permission) {
      return !!(user.permissions && user.permissions[item.permission]);
    }
    
    // Secciones sin restricción (como Dashboard o Escáner)
    return true;
  });

  return (
    <>
      <button className="mobile-menu-btn btn btn-ghost btn-icon" onClick={() => setMobileOpen(true)}>
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            {settings.appLogoUrl ? (
              <img 
                src={settings.appLogoUrl} 
                alt="Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            ) : (
              <AppIcon size={22} />
            )}
          </div>
          <span className="sidebar-logo-text">{settings.appName}</span>
          <button className="mobile-close btn btn-ghost btn-icon" onClick={() => setMobileOpen(false)}>
            <LucideIcons.X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Inventario' && (
                <>
                  {(lowStockProducts || []).length > 0 ? (
                    <span className="sidebar-badge">
                      <AlertTriangle size={11} />
                      {(lowStockProducts || []).length}
                    </span>
                  ) : (reorderProducts || []).length > 0 ? (
                    <span className="sidebar-badge warning">
                      <AlertTriangle size={11} />
                      {(reorderProducts || []).length}
                    </span>
                  ) : null}
                </>
              )}
              {label === 'Reportes' && (
                <>
                  {(lowStockProducts || []).length > 0 ? (
                    <span className="sidebar-badge">
                      <AlertTriangle size={11} />
                    </span>
                  ) : (reorderProducts || []).length > 0 ? (
                    <span className="sidebar-badge warning">
                      <AlertTriangle size={11} />
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar-logout btn btn-ghost btn-icon tooltip-wrap" onClick={handleLogout}>
            <LogOut size={17} />
            <span className="tooltip">Cerrar sesión</span>
          </button>
          {user?.role?.toLowerCase() === 'admin' && (
            <button className="sidebar-logout btn btn-ghost btn-icon tooltip-wrap" onClick={handleReset} style={{ color: 'var(--text-subtle)' }}>
              <Settings size={17} />
              <span className="tooltip">Resetear Datos</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
