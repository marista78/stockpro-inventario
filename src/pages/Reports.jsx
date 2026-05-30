import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, BarChart3, Filter, Calendar, AlertCircle, TrendingUp, TrendingDown, Package, Inbox, Layers, Info } from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import * as XLSX from 'xlsx';
import './Reports.css';

const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

const abreviar = (unit) => UNIT_ABBR[unit] || unit;

function exportExcel(data, filename) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, filename);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <div className="tooltip-items">
          {payload.map(p => (
            <p key={p.name} className="tooltip-item">
              <span className="dot" style={{ background: p.color }}></span>
              {p.name}: <span className="val">{p.name.includes('Valor') || p.name.includes('Precio') ? `S/ ${p.value.toLocaleString('es-PE')}` : p.value}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const { user } = useAuth();
  const { products, categories, movements, suppliers, getCategoryById } = useInventory();
  
  if (user?.role !== 'admin' && !user?.permissions?.reports) {
    return (
      <div className="reports-container animate-fade">
        <div className="card text-center p-40" style={{ marginTop: '100px' }}>
          <AlertCircle size={48} className="text-danger mb-16 mx-auto" />
          <h2 className="page-title">Acceso Restringido</h2>
          <p className="text-muted">No tienes permisos para ver el dashboard de reportes. Contacta con un administrador.</p>
        </div>
      </div>
    );
  }
  
  // Filters State
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'abc'
  const [dateRange, setDateRange] = useState('current_month'); // '7', '30', '90', 'all', 'current_month'
  const [viewType, setViewType] = useState('days'); // 'days', 'months', 'years'
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '', 'low', 'out'

  // 1. Calcular Consumo Diario Promedio (DCR) por producto
  const productStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    
    let startDate;
    if (dateRange === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = dateRange === 'all' ? new Date(0) : subDays(now, parseInt(dateRange) || 30);
    }
    
    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.max(30, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // Ventana fija de 30 días para detección de Stock Muerto (evitar falsos positivos en periodos cortos)
    const thirtyDaysAgo = subDays(now, 30);
    const deadStockCheck = {};

    movements.forEach(m => {
      const mType = (m.type || '').toLowerCase();
      if (mType !== 'salida') return;
      
      const mDate = new Date(m.date);
      if (isNaN(mDate.getTime())) return;

      // 1. Identificar el producto de este movimiento por todas las vías posibles
      const productById = products.find(p => p.id === m.productId);
      
      // Creamos un set de posibles "llaves" de nombre para este movimiento
      const possibleNames = new Set();
      if (productById?.name) possibleNames.add(productById.name.trim().toLowerCase());
      if (m.productName) possibleNames.add(m.productName.trim().toLowerCase());
      
      // 2. Para cada nombre posible, registrar la rotación
      possibleNames.forEach(name => {
        if (!name) return;
        
        // 1. Para ROP (Punto de pedido) - Usa el filtro actual
        if (mDate >= startDate) {
          stats[name] = (stats[name] || 0) + (Number(m.quantity) || 0);
        }

        // 2. Para Stock Inmovilizado - Usa ventana mínima de 30 días
        if (mDate >= thirtyDaysAgo) {
          deadStockCheck[name] = (deadStockCheck[name] || 0) + (Number(m.quantity) || 0);
        }
      });
    });
    
    const finalStats = {};
    Object.keys(stats).forEach(k => {
      finalStats[k] = {
        dailyDemand: stats[k] / diffDays,
        hasRotation30: (deadStockCheck[k] || 0) > 0
      };
    });

    // Asegurar que productos en deadStockCheck pero no en stats (por el filtro) se marquen con rotación
    Object.keys(deadStockCheck).forEach(k => {
      if (!finalStats[k]) {
        finalStats[k] = { dailyDemand: 0, hasRotation30: true };
      }
    });

    return finalStats;
  }, [movements, products, dateRange]);

  // Derived Data with Grouping (to avoid duplicates in reports)
  const consolidatedProducts = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      if (!p?.name) return;
      const key = p.name.trim().toLowerCase();
      if (!groups[key]) {
        const supplier = suppliers.find(s => 
          (s?.name || '').trim().toLowerCase() === (p.provider || '').trim().toLowerCase()
        );
        const leadTime = parseInt(supplier?.leadTime) || 0;
        const stats = productStats[key] || { dailyDemand: 0, hasRotation30: false };
        
        const dailyDemand = stats.dailyDemand;
        const suggestedROP = Math.ceil(dailyDemand * leadTime);

        groups[key] = { 
          ...p, 
          totalStock: 0, 
          items: [], 
          leadTime, 
          dailyDemand, 
          suggestedROP,
          hasRotation30: stats.hasRotation30,
          effectiveMin: Math.max(p.minStock, suggestedROP)
        };
      }
      groups[key].totalStock += (Number(p.stock) || 0);
      groups[key].items.push(p);
    });
    
      return Object.values(groups).filter(p => {
        const matchCat = !filterCat || String(p.categoryId) === String(filterCat);
        const matchStatus = !filterStatus || 
          (filterStatus === 'low' ? (p.totalStock <= p.effectiveMin) : 
           filterStatus === 'reorder' ? (p.totalStock > p.effectiveMin && p.totalStock <= p.effectiveMin * 1.5) :
           filterStatus === 'out' ? p.totalStock === 0 : true);
        return matchCat && matchStatus;
      });
  }, [products, filterCat, filterStatus, productStats, suppliers]);

  // 5. Análisis ABC de los Productos Almacenados
  const abcAnalysis = useMemo(() => {
    const items = consolidatedProducts.map(p => {
      const value = (p.price || 0) * (p.totalStock || 0);
      return {
        id: p.id,
        sku: p.sku || '—',
        name: p.name,
        categoryId: p.categoryId,
        stock: p.totalStock || 0,
        price: p.price || 0,
        unit: p.unit || 'Unidad',
        value: value
      };
    });

    // Ordenar de mayor a menor valor
    items.sort((a, b) => b.value - a.value);

    // Sumar el valor total de todo el inventario
    const totalInventoryValue = items.reduce((sum, item) => sum + item.value, 0);

    // Calcular porcentaje y porcentaje acumulado
    let cumulativeValue = 0;
    const finalItems = items.map((item) => {
      cumulativeValue += item.value;
      const pct = totalInventoryValue > 0 ? (item.value / totalInventoryValue) * 100 : 0;
      const cumulativePct = totalInventoryValue > 0 ? (cumulativeValue / totalInventoryValue) * 100 : 0;

      // Clasificación ABC estándar:
      // A: hasta el 80% del valor acumulado
      // B: del 80% al 95%
      // C: del 95% al 100%
      let classification = 'C';
      if (cumulativePct <= 80) {
        classification = 'A';
      } else if (cumulativePct <= 95) {
        classification = 'B';
      }

      return {
        ...item,
        percentage: pct,
        cumulativePercentage: cumulativePct,
        classification: classification
      };
    });

    // Agrupar estadísticas por categoría A, B, C
    const stats = {
      A: { count: 0, totalValue: 0, items: [] },
      B: { count: 0, totalValue: 0, items: [] },
      C: { count: 0, totalValue: 0, items: [] }
    };

    finalItems.forEach(item => {
      stats[item.classification].count += 1;
      stats[item.classification].totalValue += item.value;
      stats[item.classification].items.push(item);
    });

    return {
      items: finalItems,
      stats,
      totalInventoryValue
    };
  }, [consolidatedProducts]);

  const filteredMovements = useMemo(() => {
    const now = new Date();
    let startDate;
    if (dateRange === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = dateRange === 'all' ? new Date(0) : subDays(now, parseInt(dateRange));
    }
    
    return movements.filter(m => {
      const mDate = new Date(m.date);
      const matchDate = isWithinInterval(mDate, { start: startOfDay(startDate), end: endOfDay(now) });
      const product = products.find(p => p.id === m.productId);
      const matchCat = !filterCat || (product && String(product.categoryId) === String(filterCat));
      return matchDate && matchCat;
    });
  }, [movements, products, dateRange, filterCat]);

  // KPIs
  const totalValue = consolidatedProducts.reduce((s, p) => s + p.price * p.totalStock, 0);
  const lowStockCount = consolidatedProducts.filter(p => p.totalStock < p.minStock && p.totalStock > 0).length;
  const outOfStockCount = consolidatedProducts.filter(p => p.totalStock === 0).length;
  
  // Chart: Stock by category
  const stockByCategory = categories.map(c => {
    const prods = products.filter(p => p.categoryId === c.id);
    return {
      name: c.name,
      Cantidad: prods.length,
      Valor: prods.reduce((s, p) => s + p.price * p.stock, 0),
    };
  }).filter(c => c.Cantidad > 0).sort((a, b) => b.Valor - a.Valor);

  // Chart: Trend (Movements aggregated by day, month or year)
  const trendData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    if (viewType === 'days') {
      let days;
      let startD;
      if (dateRange === 'current_month') {
        startD = new Date(now.getFullYear(), now.getMonth(), 1);
        days = Math.floor((now - startD) / (1000 * 60 * 60 * 24));
      } else {
        days = dateRange === 'all' ? 30 : parseInt(dateRange);
        startD = subDays(now, days);
      }

      for (let i = days; i >= 0; i--) {
        const d = subDays(now, i);
        const dateKey = format(d, 'yyyy-MM-dd');
        const dayMovs = filteredMovements.filter(m => format(new Date(m.date), 'yyyy-MM-dd') === dateKey);
        data.push({
          name: format(d, 'dd MMM', { locale: es }),
          Entradas: dayMovs.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
          Salidas: dayMovs.filter(m => m.type === 'salida').reduce((s, m) => s + m.quantity, 0),
        });
      }
    } else if (viewType === 'months') {
      // Show last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = format(d, 'yyyy-MM');
        const monthMovs = filteredMovements.filter(m => format(new Date(m.date), 'yyyy-MM') === monthKey);
        data.push({
          name: format(d, 'MMM yy', { locale: es }),
          Entradas: monthMovs.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
          Salidas: monthMovs.filter(m => m.type === 'salida').reduce((s, m) => s + m.quantity, 0),
        });
      }
    } else if (viewType === 'years') {
      // Show last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearMovs = filteredMovements.filter(m => new Date(m.date).getFullYear() === year);
        data.push({
          name: String(year),
          Entradas: yearMovs.filter(m => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
          Salidas: yearMovs.filter(m => m.type === 'salida').reduce((s, m) => s + m.quantity, 0),
        });
      }
    }
    const isMobile = window.innerWidth < 768;
    return isMobile ? data.filter((_, i) => i % 2 === 0) : data;
  }, [filteredMovements, viewType, dateRange]);

  // Distribution Pie (Frequency of operations)
  const totalEntradas = filteredMovements.filter(m => m.type === 'entrada').length;
  const totalSalidas = filteredMovements.filter(m => m.type === 'salida').length;
  const movPie = [
    { name: 'Entradas', value: totalEntradas },
    { name: 'Salidas', value: totalSalidas },
  ].filter(d => d.value > 0);

  const handleExportFiltered = () => {
    exportExcel(
      consolidatedProducts.map(p => ({
        Nombre: p.name, SKU: p.sku,
        Categoría: getCategoryById(p.categoryId)?.name || 'Sin categoría',
        Precio: p.price, Stock: p.totalStock,
        'Mínimo Manual': p.minStock,
        'Punto Pedido (Lead Time)': p.suggestedROP,
        'Valor Total': p.price * p.totalStock,
        Estado: p.totalStock === 0 ? 'Agotado' : (p.totalStock < p.effectiveMin ? 'Bajo Stock' : 'OK'),
      })),
      `reporte_filtrado_${format(new Date(), 'yyyyMMdd')}.xlsx`
    );
  };

  return (
    <div className="reports-container animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard de Reportes</h1>
          <p className="page-subtitle">Análisis avanzado de inventario y movimientos</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportFiltered}>
          <Download size={16} /> Exportar Selección
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="reports-tabs mb-16">
        <button 
          className={`report-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <BarChart3 size={16} />
          <span>Vista General</span>
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'abc' ? 'active' : ''}`}
          onClick={() => setActiveTab('abc')}
        >
          <Layers size={16} />
          <span>Análisis ABC</span>
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          {/* Filters Bar */}
      <div className="card filter-bar mb-24">
        <div className="filter-group">
          <TrendingUp size={16} className="text-primary" />
          <select value={viewType} onChange={e => setViewType(e.target.value)} className="filter-select">
            <option value="days">Ver por Días</option>
            <option value="months">Ver por Meses</option>
            <option value="years">Ver por Años</option>
          </select>
        </div>
        <div className="filter-group">
          <Calendar size={16} className="text-primary" />
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="filter-select">
            {viewType === 'days' ? (
              <>
                <option value="current_month">Mes Actual (Mayo)</option>
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
              </>
            ) : null}
            <option value="all">Todo el historial</option>
          </select>
        </div>
        <div className="filter-group">
          <Filter size={16} className="text-primary" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="filter-select">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <AlertCircle size={16} className="text-primary" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
            <option value="">Cualquier estado</option>
            <option value="low">Bajo Stock (Críticos)</option>
            <option value="out">Agotados (Sin Stock)</option>
          </select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="stats-grid mb-24">
        <div className="card kpi-card">
          <div className="kpi-icon-wrap bg-primary-glow">
            <TrendingUp size={20} className="text-primary" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Valor del Inventario</span>
            <span className="kpi-value">S/ {totalValue.toLocaleString('es-PE')}</span>
            <span className="kpi-trend text-success">Total acumulado</span>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon-wrap bg-warning-glow">
            <AlertCircle size={20} className="text-warning" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Productos Críticos</span>
            <span className="kpi-value">{lowStockCount}</span>
            <span className="kpi-trend text-warning">Requieren reposición</span>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon-wrap bg-danger-glow">
            <Package size={20} className="text-danger" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Agotados</span>
            <span className="kpi-value">{outOfStockCount}</span>
            <span className="kpi-trend text-danger">Stock en cero</span>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon-wrap bg-success-glow">
            <Inbox size={20} className="text-success" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Movimientos (Periodo)</span>
            <span className="kpi-value">{filteredMovements.length}</span>
            <span className="kpi-trend text-success">Entradas y salidas</span>
          </div>
        </div>
      </div>

      <div className="charts-main-grid">
        {/* Trend Area Chart */}
        <div className="card chart-card full-width">
          <div className="chart-header">
            <h2 className="chart-title">Tendencia de Movimientos</h2>
            <div className="chart-legend">
              <span className="legend-item"><span className="dot bg-success"></span> Entradas</span>
              <span className="legend-item"><span className="dot bg-danger"></span> Salidas</span>
            </div>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 300}>
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  height={45}
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="Entradas" 
                  stroke="var(--success)" 
                  strokeWidth={3} 
                  dot={window.innerWidth < 768 ? false : { r: 4, fill: 'var(--success)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Salidas" 
                  stroke="var(--danger)" 
                  strokeWidth={3} 
                  dot={window.innerWidth < 768 ? false : { r: 4, fill: 'var(--danger)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock por Categoría (Valor) */}
        <div className="card chart-card">
          <h2 className="chart-title">Valor por Categoría</h2>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockByCategory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `S/ ${v > 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Valor" fill="var(--primary)" radius={[6, 6, 0, 0]}>
                  {stockByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución Pie */}
        <div className="card chart-card">
          <h2 className="chart-title">Distribución de Operaciones</h2>
            <div className="chart-content">
              <ResponsiveContainer width="70%" height={280}>
                <PieChart>
                  <Pie data={movPie} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                    <Cell fill="var(--success)" />
                    <Cell fill="var(--danger)" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="pie-stats-table">
                <div className="pie-stat-row">
                  <span className="text-muted">Salidas</span>
                  <span className="pie-stat-sep">---</span>
                  <span className="fw-700 text-danger">{totalSalidas}</span>
                </div>
                <div className="pie-stat-row">
                  <span className="text-muted">Entradas</span>
                  <span className="pie-stat-sep">---</span>
                  <span className="fw-700 text-success">{totalEntradas}</span>
                </div>
              </div>
            </div>
        </div>



        {/* Tabla de Bajo Stock */}
        {/* Tabla de Bajo Stock */}
        <div className="card table-card full-width">
          <div className="chart-header">
            <h2 className="chart-title text-warning">Productos que Requieren Reposición (ROP Inteligente)</h2>
            <p className="text-muted" style={{ fontSize: '11px' }}>Cálculo basado en: Lead Time Proveedor × Consumo Diario Promedio</p>
          </div>
          <div className="table-wrapper mini">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock Actual</th>
                  <th>Consumo Diario</th>
                  <th>Lead Time</th>
                  <th>Punto Pedido</th>
                  <th>Faltante</th>
                  <th>Inversión Req.</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedProducts.filter(p => p.totalStock <= p.effectiveMin * 1.5).map(p => {
                  const missing = Math.max(0, p.effectiveMin - p.totalStock);
                  const isReorder = p.totalStock > p.effectiveMin && p.totalStock <= p.effectiveMin * 1.5;
                  const isLow = p.totalStock <= p.effectiveMin && p.totalStock > 0;
                  const isOut = p.totalStock === 0;
                  return (
                    <tr key={p.id}>
                      <td className="fw-600">
                        {p.name}
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.provider || 'Sin proveedor'}</div>
                      </td>
                      <td className={`fw-700 ${isOut ? 'text-danger' : isLow ? 'text-danger' : 'text-warning'}`}>
                        {p.totalStock} {abreviar(p.unit)}
                        <div style={{ fontSize: '9px', fontWeight: 500 }}>{isOut ? '(AGOTADO)' : isLow ? '(BAJO)' : '(REORDEN)'}</div>
                      </td>
                      <td className="text-muted">{(p.dailyDemand || 0).toFixed(2)} /día</td>
                      <td className="text-muted">{p.leadTime || 0} días</td>
                      <td className="fw-700 text-primary">{p.effectiveMin} {abreviar(p.unit)}</td>
                      <td className="text-danger fw-700">{missing} {abreviar(p.unit)}</td>
                      <td className="fw-700">S/ {(missing * p.price).toLocaleString('es-PE')}</td>
                    </tr>
                  );
                })}
                {consolidatedProducts.filter(p => p.totalStock <= p.effectiveMin * 1.5).length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-20 text-muted">No hay productos que requieran reposición bajo los filtros actuales</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de Rotación Cero */}
        <div className="card table-card full-width">
          <div className="chart-header">
            <h2 className="chart-title text-danger">Stock Inmovilizado (Rotación 0)</h2>
            <p className="text-muted" style={{ fontSize: '11px' }}>Productos con stock disponible pero sin ventas en los últimos 30 días</p>
          </div>
          <div className="table-wrapper mini">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock Estancado</th>
                  <th>Precio Unit.</th>
                  <th>Capital Detenido</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedProducts.filter(p => p.totalStock > 0 && !p.hasRotation30).map(p => {
                  const cat = getCategoryById(p.categoryId);
                  return (
                    <tr key={p.id}>
                      <td className="fw-500 text-primary">{p.sku || '—'}</td>
                      <td className="fw-600">{p.name}</td>
                      <td>
                        {cat ? (
                          <span className="badge" style={{ background: cat.color + '22', color: cat.color }}>
                            {cat.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="fw-700">{p.totalStock} {abreviar(p.unit)}</td>
                      <td>S/ {(p.price || 0).toLocaleString('es-PE')}</td>
                      <td className="fw-700 text-danger">S/ {(p.totalStock * p.price).toLocaleString('es-PE')}</td>
                      <td><span className="badge badge-muted">SIN ROTACIÓN</span></td>
                    </tr>
                  );
                })}
                {consolidatedProducts.filter(p => p.totalStock > 0 && !p.hasRotation30).length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-20 text-muted">No se detectó stock inmovilizado en este periodo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      ) : (
        <>
          {/* ABC Analysis View */}
          <div className="abc-summary-grid mb-24 animate-fade">
            <div className="card kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                <Layers size={20} className="text-success" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Zona A (Crítico / Alto Valor)</span>
                <span className="kpi-value">S/ {(abcAnalysis.stats.A.totalValue || 0).toLocaleString('es-PE')}</span>
                <span className="kpi-trend text-success">
                  {abcAnalysis.stats.A.count} prod. ({abcAnalysis.totalInventoryValue > 0 ? ((abcAnalysis.stats.A.totalValue / abcAnalysis.totalInventoryValue) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                <Layers size={20} className="text-warning" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Zona B (Medio / Intermedio)</span>
                <span className="kpi-value">S/ {(abcAnalysis.stats.B.totalValue || 0).toLocaleString('es-PE')}</span>
                <span className="kpi-trend text-warning">
                  {abcAnalysis.stats.B.count} prod. ({abcAnalysis.totalInventoryValue > 0 ? ((abcAnalysis.stats.B.totalValue / abcAnalysis.totalInventoryValue) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <Layers size={20} className="text-danger" />
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Zona C (Excedente / Bajo Valor)</span>
                <span className="kpi-value">S/ {(abcAnalysis.stats.C.totalValue || 0).toLocaleString('es-PE')}</span>
                <span className="kpi-trend text-danger">
                  {abcAnalysis.stats.C.count} prod. ({abcAnalysis.totalInventoryValue > 0 ? ((abcAnalysis.stats.C.totalValue / abcAnalysis.totalInventoryValue) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          </div>

          <div className="charts-main-grid mb-24 animate-fade">
            {/* ABC Value Distribution Pie */}
            <div className="card chart-card">
              <h2 className="chart-title">Distribución por Valor Monetario (ABC)</h2>
              <div className="chart-content">
                <ResponsiveContainer width="70%" height={260}>
                  <PieChart>
                    <Pie 
                      data={[
                        { name: 'Zona A', value: abcAnalysis.stats.A.totalValue || 0, color: '#10b981' },
                        { name: 'Zona B', value: abcAnalysis.stats.B.totalValue || 0, color: '#f59e0b' },
                        { name: 'Zona C', value: abcAnalysis.stats.C.totalValue || 0, color: '#ef4444' }
                      ].filter(d => d.value > 0)}
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={85} 
                      paddingAngle={8} 
                      dataKey="value" 
                      stroke="none"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="pie-stats-table">
                  <div className="pie-stat-row">
                    <span className="abc-badge class-a">A</span>
                    <span className="fw-700 text-success">{abcAnalysis.stats.A.count} prod.</span>
                  </div>
                  <div className="pie-stat-row">
                    <span className="abc-badge class-b">B</span>
                    <span className="fw-700 text-warning">{abcAnalysis.stats.B.count} prod.</span>
                  </div>
                  <div className="pie-stat-row">
                    <span className="abc-badge class-c">C</span>
                    <span className="fw-700 text-danger">{abcAnalysis.stats.C.count} prod.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="card chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <Info size={20} className="text-primary" />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>¿Qué es el Análisis ABC?</h3>
              </div>
              <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                Clasificación de productos basada en el <b>Principio de Pareto (regla del 80/20)</b> para priorizar el control y toma de decisiones en inventarios.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', lineHeight: '1.4' }}>
                  <span className="abc-badge class-a" style={{ alignSelf: 'flex-start', minWidth: '22px' }}>A</span>
                  <div>
                    <b>Alta Importancia:</b> Representan ~80% del valor total. Requieren controles estrictos, auditorías continuas y compras programadas de alta precisión.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', lineHeight: '1.4' }}>
                  <span className="abc-badge class-b" style={{ alignSelf: 'flex-start', minWidth: '22px' }}>B</span>
                  <div>
                    <b>Importancia Media:</b> Representan ~15% del valor total. Monitoreo regular y control intermedio de inventarios.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', lineHeight: '1.4' }}>
                  <span className="abc-badge class-c" style={{ alignSelf: 'flex-start', minWidth: '22px' }}>C</span>
                  <div>
                    <b>Baja Importancia:</b> Representan ~5% del valor total pero son el volumen más grande de artículos. Control simplificado, compras por volumen.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Classification Table */}
          <div className="card table-card full-width animate-fade">
            <div className="chart-header">
              <h2 className="chart-title">Clasificación Detallada de Inventario Almacenado</h2>
              <p className="text-muted" style={{ fontSize: '11px' }}>Ordenado en forma descendente por valor monetario de inventario (Stock × Precio)</p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Precio Unit.</th>
                    <th>Valor Total</th>
                    <th>% Part.</th>
                    <th>% Acumulado</th>
                    <th style={{ textAlign: 'center' }}>Clase ABC</th>
                  </tr>
                </thead>
                <tbody>
                  {abcAnalysis.items.map((item, idx) => {
                    const cat = getCategoryById(item.categoryId);
                    return (
                      <tr key={item.id || idx}>
                        <td className="fw-600 text-primary">{item.sku}</td>
                        <td className="fw-600">{item.name}</td>
                        <td>
                          {cat ? (
                            <span className="badge" style={{ background: cat.color + '22', color: cat.color }}>
                              {cat.name}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{item.stock} {abreviar(item.unit)}</td>
                        <td>S/ {(item.price || 0).toLocaleString('es-PE')}</td>
                        <td className="fw-700">S/ {(item.value || 0).toLocaleString('es-PE')}</td>
                        <td className="text-muted">{item.percentage.toFixed(2)}%</td>
                        <td className="text-muted">{item.cumulativePercentage.toFixed(2)}%</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`abc-badge class-${item.classification.toLowerCase()}`}>
                            Clase {item.classification}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {abcAnalysis.items.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-20 text-muted">No hay productos almacenados disponibles para clasificar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
