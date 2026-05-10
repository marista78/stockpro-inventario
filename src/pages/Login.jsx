import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Boxes, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      login(form.email, form.password);
      toast.success('¡Bienvenido de vuelta!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => setForm({ email: 'demo@demo.com', password: 'demo123' });

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-orb orb-3" />
      </div>

      <div className="login-card card animate-slide">
        <div className="login-logo">
          <div className="login-logo-icon"><Boxes size={28} /></div>
          <h1 className="login-logo-text">StockPro</h1>
        </div>
        <p className="login-subtitle">Sistema de gestión de inventario</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="input-label" htmlFor="email">Correo electrónico</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input
                id="email" type="email" className="input input-with-icon"
                placeholder="usuario@ejemplo.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="password" type={showPass ? 'text' : 'password'}
                className="input input-with-icon input-with-action"
                placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
              <button type="button" className="input-action" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-divider"><span>Acceso de demostración</span></div>

        <div className="demo-creds">
          <div className="demo-card" onClick={fillDemo}>
            <span className="demo-label">Usuario Demo</span>
            <span className="demo-email">demo@demo.com / demo123</span>
          </div>
          <div className="demo-card" onClick={() => setForm({ email: 'admin@stockpro.com', password: 'admin123' })}>
            <span className="demo-label">Administrador</span>
            <span className="demo-email">admin@stockpro.com / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
