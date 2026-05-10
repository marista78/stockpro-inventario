import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';

const InventoryContext = createContext(null);

const INITIAL_CATEGORIES = [
  { id: '1', name: 'Electrónica', color: '#4f46e5' },
  { id: '2', name: 'Ropa', color: '#06b6d4' },
  { id: '3', name: 'Alimentos', color: '#22c55e' },
  { id: '4', name: 'Herramientas', color: '#f59e0b' },
];

const INITIAL_SUPPLIERS = [
  { id: '1', name: 'TechDistri S.A.', contact: 'Juan Pérez', phone: '987654321', email: 'ventas@techdistri.com', ruc: '20123456789', address: 'Av. Industrial 123, Lima', leadTime: 5 },
  { id: '2', name: 'FashionCorp', contact: 'María García', phone: '912345678', email: 'm.garcia@fashioncorp.pe', ruc: '20987654321', address: 'Calle Comercio 456, Gamarra', leadTime: 3 },
  { id: '3', name: 'Global Logistics SAC', contact: 'Carlos Ruiz', phone: '955443322', email: 'info@globallogistics.com', ruc: '20556677881', address: 'Calle Los Robles 789, Callao', leadTime: 7 },
  { id: '4', name: 'Distribuidora Norte', contact: 'Ana Beltrán', phone: '944332211', email: 'ventas@norte.pe', ruc: '20443322115', address: 'Jr. Libertad 456, Trujillo', leadTime: 4 },
  { id: '5', name: 'ProHogar Perú', contact: 'Luis Mendoza', phone: '933221100', email: 'l.mendoza@prohogar.pe', ruc: '20332211009', address: 'Av. Brasil 3455, Magdalena', leadTime: 10 },
];

const INITIAL_PRODUCTS = [
  { 
    id: '1', name: 'Laptop HP 15"', sku: 'LAP-001', categoryId: '1', price: 12500, stock: 8, minStock: 3, 
    unit: 'Unidad', brand: 'HP', provider: 'TechDistri S.A.', entryDate: '2026-05-01', batch: 'L-2026-001', expiryDate: '',
    image: null, createdAt: new Date().toISOString() 
  },
  { 
    id: '2', name: 'Camiseta Polo', sku: 'ROP-001', categoryId: '2', price: 280, stock: 45, minStock: 10, 
    unit: 'Unidad', brand: 'Lacoste', provider: 'FashionCorp', entryDate: '2026-04-15', batch: 'B-2026-44', expiryDate: '',
    image: null, createdAt: new Date().toISOString() 
  },
  { 
    id: '3', name: 'Arroz 1kg', sku: 'ALI-001', categoryId: '3', price: 35, stock: 2, minStock: 20, 
    unit: 'Kg', brand: 'Morelos', provider: 'Distribuidora Norte', entryDate: '2026-05-05', batch: 'LOT-9988', expiryDate: '2027-05-05',
    image: null, createdAt: new Date().toISOString() 
  },
  { 
    id: '4', name: 'Taladro Bosch', sku: 'HER-001', categoryId: '4', price: 1850, stock: 5, minStock: 2, 
    unit: 'Unidad', brand: 'Bosch', provider: 'Global Logistics SAC', entryDate: '2026-03-20', batch: 'SER-4455', expiryDate: '',
    image: null, createdAt: new Date().toISOString() 
  },
];

const INITIAL_MOVEMENTS = [
  { id: '1', productId: '1', type: 'entrada', quantity: 10, reason: 'Compra inicial', date: new Date().toISOString(), productName: 'Laptop HP 15"' },
  { id: '2', productId: '3', type: 'salida', quantity: 18, reason: 'Venta', date: new Date().toISOString(), productName: 'Arroz 1kg' },
];

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function InventoryProvider({ children }) {
  const [categories, setCategories] = useState(() => load('sp_categories', INITIAL_CATEGORIES));
  const [products, setProducts] = useState(() => load('sp_products', INITIAL_PRODUCTS));
  const [suppliers, setSuppliers] = useState(() => load('sp_suppliers', INITIAL_SUPPLIERS));
  const [movements, setMovements] = useState(() => load('sp_movements', INITIAL_MOVEMENTS));

  // Migración: Asegurar que los proveedores iniciales existan (si se agregaron nuevos al código)
  useEffect(() => {
    const existingNames = new Set(suppliers.map(s => s.name.trim().toLowerCase()));
    const missing = INITIAL_SUPPLIERS.filter(s => !existingNames.has(s.name.trim().toLowerCase()));
    if (missing.length > 0) {
      setSuppliers(prev => [...prev, ...missing]);
    }
  }, []);

  useEffect(() => { save('sp_categories', categories); }, [categories]);
  useEffect(() => { save('sp_products', products); }, [products]);
  useEffect(() => { save('sp_movements', movements); }, [movements]);
  useEffect(() => { save('sp_suppliers', suppliers); }, [suppliers]);

  // Categories
  const addCategory = useCallback((cat) => {
    const newCat = { ...cat, id: Date.now().toString() };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback((id, data) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const deleteCategory = useCallback((id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // Products
  const addProduct = useCallback((prod) => {
    const newProd = { ...prod, id: Date.now().toString(), createdAt: new Date().toISOString() };
    setProducts(prev => [...prev, newProd]);
    return newProd;
  }, []);

  const importProducts = useCallback((newProducts) => {
    const processed = newProducts.map((p, index) => ({
      ...p,
      id: (Date.now() + index).toString(),
      createdAt: new Date().toISOString()
    }));
    setProducts(prev => [...prev, ...processed]);
  }, []);

  const updateProduct = useCallback((id, data) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const clearInventory = useCallback(() => {
    setProducts([]);
    setMovements([]);
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  // Stock Movements
  const addMovement = useCallback((mov) => {
    const product = products.find(p => p.id === mov.productId);
    if (!product) throw new Error('Producto no encontrado');
    const currentStock = Number(product.stock || 0);
    const movQty = Number(mov.quantity || 0);
    const newQty = mov.type === 'entrada' ? currentStock + movQty : currentStock - movQty;
    if (newQty < 0) throw new Error('Stock insuficiente');
    
    setProducts(prev => {
      // Mantenemos el producto incluso si el stock es 0 para poder revertir movimientos después
      return prev.map(p => p.id === mov.productId ? { ...p, stock: newQty } : p);
    });

    const newMov = { 
      ...mov, 
      id: Date.now().toString(), 
      date: mov.date || new Date().toISOString(), 
      productName: product.name,
      batch: product.batch || ''
    };
    setMovements(prev => [newMov, ...prev]);
    return newMov;
  }, [products]);

  const deleteMovement = useCallback((id) => {
    setMovements(prev => {
      const mov = prev.find(m => m.id === id);
      if (!mov) return prev;

      setProducts(currProducts => {
        const product = currProducts.find(p => p.id === mov.productId);
        if (!product) return currProducts; // Si el producto ya no existe, no hacemos nada con el stock
        
        const restoredQty = mov.type === 'entrada' ? product.stock - mov.quantity : product.stock + mov.quantity;
        return currProducts.map(p => p.id === mov.productId ? { ...p, stock: Math.max(0, restoredQty) } : p);
      });

      return prev.filter(m => m.id !== id);
    });
  }, []);

  const updateMovement = useCallback((id, newData) => {
    setMovements(prev => {
      const oldMov = prev.find(m => m.id === id);
      if (!oldMov) return prev;

      setProducts(currProducts => {
        const product = currProducts.find(p => p.id === oldMov.productId);
        if (!product) return currProducts;

        // 1. Revertir cambio anterior
        let tempQty = oldMov.type === 'entrada' ? product.stock - oldMov.quantity : product.stock + oldMov.quantity;
        
        // 2. Aplicar nuevo cambio
        const newQty = newData.type === 'entrada' ? tempQty + newData.quantity : tempQty - newData.quantity;
        
        if (newQty < 0) throw new Error('Stock insuficiente para esta modificación');

        return currProducts.map(p => p.id === oldMov.productId ? { ...p, stock: newQty } : p);
      });

      return prev.map(m => m.id === id ? { ...m, ...newData } : m);
    });
  }, []);

  // Salida inteligente Multilote (FIFO/FEFO)
  const addMultiBatchMovement = useCallback((data) => {
    if (data.type !== 'salida') return addMovement(data);

    // Obtener todos los lotes del mismo producto con stock
    const relevantBatches = products
      .filter(p => {
        if (!p?.name || !data?.productName) return false;
        return p.name.trim().toLowerCase() === data.productName.trim().toLowerCase() && p.stock > 0;
      })
      .sort((a, b) => {
        // Ordenar por Vencimiento (FEFO), si no tienen vencimiento por Fecha de Entrada (FIFO)
        const dateA = a.expiryDate ? new Date(a.expiryDate) : (a.entryDate ? new Date(a.entryDate) : new Date(0));
        const dateB = b.expiryDate ? new Date(b.expiryDate) : (b.entryDate ? new Date(b.entryDate) : new Date(0));
        return dateA - dateB;
      });

    const totalAvailable = relevantBatches.reduce((s, p) => s + Number(p.stock || 0), 0);
    const requiredQty = Number(data.quantity || 0);
    
    if (totalAvailable < requiredQty) {
      throw new Error(`Stock insuficiente. Solo hay ${totalAvailable} unidades en total.`);
    }

    let remaining = requiredQty;
    const newMovements = [];
    const updatedProductStocks = {}; // productId -> newStock

    for (const batch of relevantBatches) {
      if (remaining <= 0) break;
      const take = Math.min(Number(batch.stock || 0), remaining);
      
      const movId = (Date.now() + newMovements.length).toString();
      newMovements.push({
        ...data,
        id: movId,
        productId: batch.id,
        quantity: take,
        batch: batch.batch || 'S/L',
        date: data.date || new Date().toISOString(),
        observations: `${data.observations || ''} (Auto-despacho de lote ${batch.batch || 'S/L'})`.trim()
      });

      updatedProductStocks[batch.id] = batch.stock - take;
      remaining -= take;
    }

    setProducts(prev => prev.map(p => updatedProductStocks[p.id] !== undefined ? { ...p, stock: updatedProductStocks[p.id] } : p));
    setMovements(prev => [...newMovements, ...prev]);
    return newMovements;
  }, [products, addMovement]);

  // Suppliers
  const addSupplier = useCallback((sup) => {
    const newSup = { ...sup, id: Date.now().toString() };
    setSuppliers(prev => [...prev, newSup]);
    return newSup;
  }, []);

  const updateSupplier = useCallback((id, data) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const deleteSupplier = useCallback((id) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  // Alerts
  // Alerts (Consolidated by name)
  const lowStockProducts = useMemo(() => {
    const groups = {};
    (products || []).forEach(p => {
      if (!p) return;
      const key = (p.name || '').trim().toLowerCase();
      if (!groups[key]) groups[key] = { ...p, totalStock: 0 };
      groups[key].totalStock += (Number(p.stock) || 0);
    });
    return Object.values(groups).filter(p => (p.totalStock || 0) < (p.minStock || 0));
  }, [products]);

  const reorderProducts = useMemo(() => {
    const groups = {};
    (products || []).forEach(p => {
      if (!p) return;
      const key = (p.name || '').trim().toLowerCase();
      if (!groups[key]) groups[key] = { ...p, totalStock: 0 };
      groups[key].totalStock += (Number(p.stock) || 0);
    });
    return Object.values(groups).filter(p => 
      (p.totalStock || 0) >= (p.minStock || 0) && 
      (p.totalStock || 0) <= (p.minStock || 0) * 1.5
    );
  }, [products]);

  // Stats
  const totalValue = (products || []).reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  const getCategoryById = useCallback((id) => categories.find(c => String(c.id) === String(id)), [categories]);

  // Inteligencia de Reorden (ROP)
  const calculateSuggestedROP = useCallback((productId) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return 0;

    // 1. Obtener salidas de este producto (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const relevantMovs = movements.filter(m => 
      m.productId === productId && 
      m.type === 'salida' && 
      new Date(m.date) >= thirtyDaysAgo
    );

    const totalSold = relevantMovs.reduce((sum, m) => sum + m.quantity, 0);
    
    // 2. Calcular promedio diario (mínimo 7 días para evitar sesgos)
    const firstMovDate = relevantMovs.length > 0 ? new Date(relevantMovs[relevantMovs.length - 1].date) : new Date();
    const daysDiff = Math.max(7, Math.ceil((new Date() - firstMovDate) / (1000 * 60 * 60 * 24)));
    const avgDailySales = totalSold / daysDiff;

    // 3. Obtener Lead Time del proveedor
    const supplier = suppliers.find(s => (s?.name || '').trim().toLowerCase() === (prod.provider || '').trim().toLowerCase());
    const leadTime = supplier?.leadTime || 3; // 3 días por defecto si no hay proveedor

    // 4. ROP = (Ventas Diarias * Lead Time) + 15% Seguridad
    const baseROP = avgDailySales * leadTime;
    const suggested = Math.ceil(baseROP * 1.15);

    return suggested > 0 ? suggested : (prod.minStock || 5);
  }, [products, movements, suppliers]);

    return (
      <InventoryContext.Provider value={{
        categories, setCategories, products, setProducts, movements, setMovements, lowStockProducts, reorderProducts, totalValue,
        addCategory, updateCategory, deleteCategory,
        addProduct, updateProduct, deleteProduct, importProducts, clearInventory, getCategoryById,
        calculateSuggestedROP,
        addMovement,
        addMultiBatchMovement,
        updateMovement,
        deleteMovement,
        suppliers, setSuppliers, addSupplier, updateSupplier, deleteSupplier
      }}>
        {children}
      </InventoryContext.Provider>
    );
}

export const useInventory = () => useContext(InventoryContext);
