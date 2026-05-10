import { useInventory } from '../context/InventoryContext';
import { Package, DollarSign, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import './Dashboard.css';

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="stat-card card card-hover">
      <div className="stat-card-top">
        <div className="stat-card-icon" style={{ background: `${color}20`, color }}>
          <Icon size={22} />
        </div>
        {trend !== undefined && (
          <span className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { products, movements, categories, lowStockProducts, reorderProducts, totalValue } = useInventory();

  // Last 7 days chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayMovs = movements.filter(m => {
      if (!m.date) return false;
      const mDate = new Date(m.date);
      return format(mDate, 'yyyy-MM-dd') === dateStr;
    });
    return {
      day: format(date, 'EEE', { locale: es }),
      Entradas: dayMovs.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
      Salidas: dayMovs.filter(m => m.type === 'salida').reduce((s, m) => s + m.quantity, 0),
    };
  });

  const recentMovs = movements.slice(0, 5);

  // Products expiring in the next 30 days
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  const expiringSoon = products
    .filter(p => p.expiryDate && new Date(p.expiryDate) >= now && new Date(p.expiryDate) <= thirtyDaysLater)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-24">
        <StatCard icon={Package} label="Total Productos" value={products.length} sub={`${categories.length} categorías`} color="var(--primary)" trend={12} />
        <StatCard icon={DollarSign} label="Valor del Stock" value={`S/ ${totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} color="var(--accent)" trend={5} />
        <StatCard icon={AlertTriangle} label="Bajo Stock" value={lowStockProducts.length} sub="Acción Urgente" color="var(--danger)" />
        <StatCard icon={TrendingUp} label="Punto Reorden" value={reorderProducts.length} sub="Proyectar Compras" color="var(--warning)" />
      </div>

      <div className="dashboard-grid">
        {/* Chart */}
        <div className="card dashboard-chart-card">
          <h2 className="section-title">Actividad de los últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="Entradas" 
                stroke="var(--primary)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }} 
              />
              <Line 
                type="monotone" 
                dataKey="Salidas" 
                stroke="var(--accent)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Low Stock Alerts */}
          <div className="card" style={{ flex: 1 }}>
            <h2 className="section-title">
              <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
              Bajo Stock
            </h2>
            {lowStockProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>✅ Stock al día</p>
              </div>
            ) : (
              <div className="alert-list">
                {lowStockProducts.slice(0, 3).map(p => (
                  <div key={p.id} className="alert-item">
                    <div className="alert-info">
                      <span className="alert-name">{p.name}</span>
                      <span className="alert-sku">{p.brand} · {p.sku}</span>
                    </div>
                    <div className="alert-stock">
                      <span className="badge badge-danger">{p.stock} {p.unit || 'uds'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiration Alerts */}
          <div className="card" style={{ flex: 1 }}>
            <h2 className="section-title">
              <Calendar size={16} style={{ color: 'var(--danger)' }} />
              Vencimientos
            </h2>
            {expiringSoon.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>📦 Sin vencimientos</p>
              </div>
            ) : (
              <div className="alert-list">
                {expiringSoon.slice(0, 3).map(p => (
                  <div key={p.id} className="alert-item" style={{ background: 'var(--danger-light)', borderColor: 'hsla(0, 72%, 57%, 0.2)' }}>
                    <div className="alert-info">
                      <span className="alert-name">{p.name}</span>
                      <span className="alert-sku">Lote: {p.batch || '—'}</span>
                    </div>
                    <div className="alert-stock">
                      <span className="badge badge-warning" style={{ fontSize: '11px', background: 'var(--bg-card)' }}>
                        {format(new Date(p.expiryDate), 'd MMM', { locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="card mt-24">
        <h2 className="section-title mb-16">Actividad Reciente</h2>
        {recentMovs.length === 0 ? (
          <div className="empty-state"><p>Sin movimientos registrados</p></div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentMovs.map(m => (
                  <tr key={m.id}>
                    <td><span className="fw-500">{m.productName}</span></td>
                    <td>
                      <span className={`badge ${m.type === 'entrada' ? 'badge-success' : 'badge-danger'}`}>
                        {m.type === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                      </span>
                    </td>
                    <td className="fw-600">{m.quantity}</td>
                    <td className="text-muted">{m.reason}</td>
                    <td className="text-muted">{m.date ? format(new Date(m.date), 'dd/MM/yyyy HH:mm') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
