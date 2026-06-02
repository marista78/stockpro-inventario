import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const InventoryContext = createContext(null);

const mapMovementFromDB = (m) => {
  if (!m) return null;
  let extra = {};
  let cleanObservations = m.observations || '';
  if (m.observations && m.observations.includes('||JSON:')) {
    try {
      const parts = m.observations.split('||JSON:');
      cleanObservations = parts[0].trim();
      const jsonStr = parts[1].split('||')[0];
      extra = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error parsing extra data in observations:', e);
    }
  }
  return {
    ...m,
    productId: m.product_id,
    productName: m.product_name,
    observations: cleanObservations,
    ...extra
  };
};

export function InventoryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: catData, error: catError },
        { data: prodData, error: prodError },
        { data: supData, error: supError },
        { data: movData, error: movError }
      ] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('movements').select('*').order('date', { ascending: false })
      ]);

      if (catError) throw catError;
      if (prodError) throw prodError;
      if (supError) throw supError;
      if (movError) throw movError;

      setCategories(catData || []);
      setProducts((prodData || []).map(p => ({
        ...p,
        categoryId: p.category_id,
        minStock: p.min_stock,
        expiryDate: p.expiry_date,
        entryDate: p.entry_date,
        image: p.image_url,
        imageUrl: p.image_url
      })));
      setSuppliers((supData || []).map(s => ({
        ...s,
        leadTime: s.lead_time
      })));
      setMovements((movData || []).map(mapMovementFromDB));
    } catch (err) {
      console.error('Error fetching data from Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper for DB inserts/updates
  const mapProductToDB = (p) => ({
    id: p.id || uuidv4(),
    name: p.name,
    sku: p.sku,
    category_id: p.categoryId,
    brand: p.brand,
    supplier: p.supplier,
    unit: p.unit,
    stock: p.stock,
    min_stock: p.minStock,
    price: p.price,
    image_url: p.image || p.imageUrl,
    batch: p.batch,
    expiry_date: p.expiryDate || null,
    entry_date: p.entryDate || null,
    provider: p.provider
  });

  const mapMovementToDB = (m) => {
    let serializedObs = m.observations || '';
    if (m.voucherType || m.voucherSerial || m.buyerName || m.buyerDocument) {
      const extraData = {
        voucherType: m.voucherType,
        voucherSerial: m.voucherSerial,
        buyerName: m.buyerName,
        buyerDocument: m.buyerDocument
      };
      if (serializedObs.includes('||JSON:')) {
        serializedObs = serializedObs.split('||JSON:')[0].trim();
      }
      serializedObs = `${serializedObs} ||JSON:${JSON.stringify(extraData)}||`.trim();
    }

    let dbDate = m.date;
    if (dbDate) {
      try {
        const parsedDate = new Date(dbDate);
        if (!isNaN(parsedDate.getTime())) {
          dbDate = parsedDate.toISOString();
        }
      } catch (e) {
        console.error('Error formatting date for Supabase:', e);
      }
    } else {
      dbDate = new Date().toISOString();
    }

    return {
      id: m.id || uuidv4(),
      product_id: m.productId,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      responsible: m.responsible,
      date: dbDate,
      batch: m.batch,
      product_name: m.productName,
      observations: serializedObs
    };
  };

  const mapSupplierToDB = (s) => ({
    id: s.id || uuidv4(),
    name: s.name,
    contact: s.contact,
    phone: s.phone,
    email: s.email,
    ruc: s.ruc,
    address: s.address,
    lead_time: s.leadTime
  });

  // Categories
  const addCategory = useCallback(async (cat) => {
    const dbCat = { ...cat, id: cat.id || uuidv4() };
    const { data, error } = await supabase
      .from('categories')
      .insert([dbCat])
      .select()
      .single();
    
    if (error) throw error;
    setCategories(prev => [...prev, data]);
    return data;
  }, []);

  const updateCategory = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setCategories(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // Products
  const addProduct = useCallback(async (prod) => {
    const dbProd = mapProductToDB(prod);
    const { data, error } = await supabase
      .from('products')
      .insert([dbProd])
      .select()
      .single();
    
    if (error) throw error;
    const mapped = { 
      ...data, 
      categoryId: data.category_id, 
      minStock: data.min_stock, 
      expiryDate: data.expiry_date, 
      entryDate: data.entry_date, 
      image: data.image_url,
      imageUrl: data.image_url 
    };
    setProducts(prev => [...prev, mapped]);
    return mapped;
  }, []);

  const updateProduct = useCallback(async (id, updates) => {
    const existing = products.find(p => p.id === id);
    const oldName = existing?.name;

    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.image !== undefined) dbUpdates.image_url = updates.image;
    if (updates.batch !== undefined) dbUpdates.batch = updates.batch;
    if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate;
    if (updates.entryDate !== undefined) dbUpdates.entry_date = updates.entryDate;
    if (updates.provider !== undefined) dbUpdates.provider = updates.provider;

    // Campos comunes que se comparten entre todos los lotes del mismo producto
    const sharedUpdates = {};
    if (dbUpdates.name !== undefined) sharedUpdates.name = dbUpdates.name;
    if (dbUpdates.sku !== undefined) sharedUpdates.sku = dbUpdates.sku;
    if (dbUpdates.category_id !== undefined) sharedUpdates.category_id = dbUpdates.category_id;
    if (dbUpdates.brand !== undefined) sharedUpdates.brand = dbUpdates.brand;
    if (dbUpdates.unit !== undefined) sharedUpdates.unit = dbUpdates.unit;
    if (dbUpdates.min_stock !== undefined) sharedUpdates.min_stock = dbUpdates.min_stock;
    if (dbUpdates.image_url !== undefined) sharedUpdates.image_url = dbUpdates.image_url;
    if (dbUpdates.price !== undefined) sharedUpdates.price = dbUpdates.price;

    let updatedProducts = [];

    // Si hay cambios compartidos y conocemos el nombre original, actualizamos todos los lotes relacionados en Supabase
    if (Object.keys(sharedUpdates).length > 0 && oldName) {
      const { data: multipleData, error: multError } = await supabase
        .from('products')
        .update(sharedUpdates)
        .eq('name', oldName)
        .select();

      if (multError) throw multError;
      updatedProducts = multipleData || [];
    }

    // Siempre actualizamos el lote específico con todos sus campos específicos (como stock, batch, provider, etc.)
    const { data: specificData, error: specError } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (specError) throw specError;

    const mapped = { 
      ...specificData, 
      categoryId: specificData.category_id, 
      minStock: specificData.min_stock, 
      expiryDate: specificData.expiry_date, 
      entryDate: specificData.entry_date, 
      image: specificData.image_url,
      imageUrl: specificData.image_url 
    };

    setProducts(prev => {
      let nextProducts = prev;
      if (updatedProducts.length > 0) {
        const mappedUpdates = updatedProducts.map(u => ({
          ...u,
          categoryId: u.category_id,
          minStock: u.min_stock,
          expiryDate: u.expiry_date,
          entryDate: u.entry_date,
          image: u.image_url,
          imageUrl: u.image_url
        }));
        nextProducts = prev.map(p => {
          const match = mappedUpdates.find(u => u.id === p.id);
          return match ? match : p;
        });
      }
      return nextProducts.map(p => p.id === id ? mapped : p);
    });

    return mapped;
  }, [products]);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const importProducts = useCallback(async (newProducts) => {
    const dbProds = newProducts.map(mapProductToDB);
    const { data, error } = await supabase
      .from('products')
      .insert(dbProds)
      .select();
    
    if (error) throw error;
    const mapped = data.map(d => ({ 
      ...d, 
      categoryId: d.category_id, 
      minStock: d.min_stock, 
      expiryDate: d.expiry_date, 
      entryDate: d.entry_date, 
      image: d.image_url,
      imageUrl: d.image_url 
    }));
    setProducts(prev => [...prev, ...mapped]);
    return mapped;
  }, []);

  const clearInventory = useCallback(async () => {
    const { error: movError } = await supabase.from('movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: prodError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (movError) throw movError;
    if (prodError) throw prodError;
    
    setProducts([]);
    setMovements([]);
  }, []);

  // Stock Movements
  const addMovement = useCallback(async (mov) => {
    let product;
    const isNewBatch = mov.loteMode === 'new';

    if (isNewBatch) {
      const baseProduct = products.find(p => p.id === mov.productId);
      if (!baseProduct) throw new Error('Producto base no encontrado');

      const newProductData = {
        ...baseProduct,
        id: uuidv4(),
        stock: 0,
        price: Number(mov.purchasePrice) || baseProduct.price || 0,
        batch: mov.newBatchCode,
        provider: mov.newBatchProvider,
        entryDate: mov.date ? mov.date.split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: null
      };

      const dbProduct = mapProductToDB(newProductData);

      const { data: insertedProduct, error: prodInsertError } = await supabase
        .from('products')
        .insert([dbProduct])
        .select()
        .single();

      if (prodInsertError) throw prodInsertError;

      product = {
        ...insertedProduct,
        categoryId: insertedProduct.category_id,
        minStock: insertedProduct.min_stock,
        expiryDate: insertedProduct.expiry_date,
        entryDate: insertedProduct.entry_date,
        image: insertedProduct.image_url,
        imageUrl: insertedProduct.image_url
      };

      setProducts(prev => [...prev, product]);
      mov.productId = product.id;
    } else {
      product = products.find(p => p.id === mov.productId);
    }

    if (!product) throw new Error('Producto no encontrado');
    
    const currentStock = Number(product.stock || 0);
    const currentPrice = Number(product.price || 0);
    const movQty = Number(mov.quantity || 0);
    const movPrice = Number(mov.purchasePrice || 0);
    
    let newQty = currentStock;
    let newPrice = currentPrice;

    if (mov.type === 'entrada') {
      newQty = currentStock + movQty;
      // Cálculo de Precio Promedio Ponderado (PPP)
      if (newQty > 0) {
        newPrice = ((currentStock * currentPrice) + (movQty * movPrice)) / newQty;
      } else {
        newPrice = movPrice;
      }
    } else {
      newQty = Math.max(0, currentStock - movQty);
    }
    
    const { error: prodError } = await supabase
      .from('products')
      .update({ 
        stock: newQty,
        price: newPrice,
        provider: mov.newBatchProvider || product.provider || ''
      })
      .eq('id', mov.productId);
      
    if (prodError) throw prodError;

    const dbMov = mapMovementToDB({
      ...mov,
      productName: product.name,
      batch: product.batch || ''
    });

    const { data: movData, error: movError } = await supabase
      .from('movements')
      .insert([dbMov])
      .select()
      .single();
      
    if (movError) throw movError;
    if (!movData) throw new Error('No se recibió confirmación del movimiento desde la base de datos.');

    const mappedMov = mapMovementFromDB(movData);
    setProducts(prev => prev.map(p => p.id === mov.productId ? { ...p, stock: newQty, price: newPrice, provider: mov.newBatchProvider || p.provider || '' } : p));
    setMovements(prev => [mappedMov, ...prev]);
    return mappedMov;
  }, [products]);

  const deleteMovement = useCallback(async (id, currentUser = 'Sistema') => {
    const mov = movements.find(m => m.id === id);
    if (!mov) throw new Error('Movimiento no encontrado');
    
    const product = products.find(p => p.id === mov.productId);
    if (!product) throw new Error('Producto no encontrado');

    const revertedStock = mov.type === 'entrada' ? product.stock - mov.quantity : product.stock + mov.quantity;
    
    const { error: prodError } = await supabase.from('products').update({ stock: revertedStock }).eq('id', mov.productId);
    if (prodError) throw prodError;

    if (mov.type === 'salida') {
      // Registrar un nuevo ingreso compensatorio e indicar que la salida ha sido anulada
      const updatedOriginalObservations = `[ANULADO] ${mov.observations || ''}`.trim();
      const { error: updateMovError } = await supabase
        .from('movements')
        .update({ observations: updatedOriginalObservations })
        .eq('id', id);
      if (updateMovError) throw updateMovError;

      const newMovId = uuidv4();
      const newMovReason = mov.reason === 'Venta' ? 'Devolución Cliente' : 'Ajuste Positivo';
      const newMovObservations = `Ingreso de compensación por anulación de salida ID: ${mov.id.slice(0, 8)}`;
      const currentDate = new Date().toISOString();

      const dbNewMov = {
        id: newMovId,
        product_id: mov.productId,
        type: 'entrada',
        quantity: mov.quantity,
        reason: newMovReason,
        responsible: currentUser,
        date: currentDate,
        batch: mov.batch || '',
        product_name: mov.productName,
        observations: newMovObservations
      };

      const { data: insertedMov, error: insertMovError } = await supabase
        .from('movements')
        .insert([dbNewMov])
        .select()
        .single();
      if (insertMovError) throw insertMovError;
      if (!insertedMov) throw new Error('No se recibió confirmación de la devolución desde la base de datos.');

      const mappedInsertedMov = mapMovementFromDB(insertedMov);

      setProducts(prev => prev.map(p => p.id === mov.productId ? { ...p, stock: revertedStock } : p));
      setMovements(prev => {
        const updatedOriginal = { ...mov, observations: updatedOriginalObservations };
        const withUpdatedOriginal = prev.map(m => m.id === id ? updatedOriginal : m);
        return [mappedInsertedMov, ...withUpdatedOriginal];
      });
    } else {
      // Comportamiento original para Entrada
      const { error: movError } = await supabase.from('movements').delete().eq('id', id);
      if (movError) throw movError;

      setProducts(prev => prev.map(p => p.id === mov.productId ? { ...p, stock: revertedStock } : p));
      setMovements(prev => prev.filter(m => m.id !== id));
    }
  }, [movements, products]);

  const updateMovement = useCallback(async (id, newData) => {
    const oldMov = movements.find(m => m.id === id);
    if (!oldMov) throw new Error('Movimiento no encontrado');

    const product = products.find(p => p.id === oldMov.productId);
    if (!product) throw new Error('Producto no encontrado');

    let tempQty = oldMov.type === 'entrada' ? product.stock - oldMov.quantity : product.stock + oldMov.quantity;
    const newQty = newData.type === 'entrada' ? tempQty + newData.quantity : tempQty - newData.quantity;
    
    if (newQty < 0) throw new Error('Stock insuficiente para esta modificación');

    await supabase.from('products').update({ stock: newQty }).eq('id', oldMov.productId);
    
    const dbUpdates = mapMovementToDB(newData);
    const { data, error } = await supabase.from('movements').update(dbUpdates).eq('id', id).select().single();
    
    if (error) throw error;
    if (!data) throw new Error('No se recibió confirmación de la actualización desde la base de datos.');

    const mappedMov = mapMovementFromDB(data);
    setProducts(prev => prev.map(p => p.id === oldMov.productId ? { ...p, stock: newQty } : p));
    setMovements(prev => prev.map(m => m.id === id ? mappedMov : m));
  }, [movements, products]);

  const addMultiBatchMovement = useCallback(async (data) => {
    if (data.type !== 'salida') return addMovement(data);

    const relevantBatches = products
      .filter(p => p.name.trim().toLowerCase() === data.productName.trim().toLowerCase() && p.stock > 0)
      .sort((a, b) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate) : (a.entryDate ? new Date(a.entryDate) : new Date(0));
        const dateB = b.expiryDate ? new Date(b.expiryDate) : (b.entryDate ? new Date(b.entryDate) : new Date(0));
        return dateA - dateB;
      });

    const totalAvailable = relevantBatches.reduce((s, p) => s + Number(p.stock || 0), 0);
    const requiredQty = Number(data.quantity || 0);
    
    if (totalAvailable < requiredQty) throw new Error(`Stock insuficiente. Solo hay ${totalAvailable} unidades.`);

    let remaining = requiredQty;
    const movementsToInsert = [];
    const updatedProductStates = [];

    for (const batch of relevantBatches) {
      if (remaining <= 0) break;
      const take = Math.min(Number(batch.stock || 0), remaining);
      const newBatchStock = batch.stock - take;
      
      await supabase.from('products').update({ stock: newBatchStock }).eq('id', batch.id);

      const dbMov = mapMovementToDB({
        ...data,
        productId: batch.id,
        quantity: take,
        batch: batch.batch || 'S/L',
        observations: `${data.observations || ''} (Auto-despacho lote ${batch.batch || 'S/L'})`.trim()
      });

      const { data: movData, error } = await supabase.from('movements').insert([dbMov]).select().single();
      if (error) throw error;
      if (!movData) throw new Error('No se recibió confirmación del movimiento multilote desde la base de datos.');

      movementsToInsert.push(mapMovementFromDB(movData));
      updatedProductStates.push({ id: batch.id, stock: newBatchStock });
      remaining -= take;
    }

    setProducts(prev => prev.map(p => {
      const update = updatedProductStates.find(u => u.id === p.id);
      return update ? { ...p, stock: update.stock } : p;
    }));
    setMovements(prev => [...movementsToInsert, ...prev]);
  }, [addMovement, products]);

  // Suppliers
  const addSupplier = useCallback(async (sup) => {
    const dbSup = mapSupplierToDB(sup);
    const { data, error } = await supabase
      .from('suppliers')
      .insert([dbSup])
      .select()
      .single();
    
    if (error) throw error;
    const mapped = { ...data, leadTime: data.lead_time };
    setSuppliers(prev => [...prev, mapped]);
    return mapped;
  }, []);

  const updateSupplier = useCallback(async (id, updates) => {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contact !== undefined) dbUpdates.contact = updates.contact;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.ruc !== undefined) dbUpdates.ruc = updates.ruc;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.leadTime !== undefined) dbUpdates.lead_time = updates.leadTime;

    const { data, error } = await supabase
      .from('suppliers')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    const mapped = { ...data, leadTime: data.lead_time };
    setSuppliers(prev => prev.map(s => s.id === id ? mapped : s));
    return mapped;
  }, []);

  const deleteSupplier = useCallback(async (id) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  // Stats & Alerts
  const lowStockProducts = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const key = p.name.trim().toLowerCase();
      if (!groups[key]) groups[key] = { ...p, totalStock: 0 };
      groups[key].totalStock += Number(p.stock || 0);
    });
    return Object.values(groups).filter(p => p.totalStock < p.minStock);
  }, [products]);

  const reorderProducts = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const key = p.name.trim().toLowerCase();
      if (!groups[key]) groups[key] = { ...p, totalStock: 0 };
      groups[key].totalStock += Number(p.stock || 0);
    });
    return Object.values(groups).filter(p => {
      const total = p.totalStock || 0;
      const min = p.minStock || 0;
      return min > 0 && total >= min && total <= min * 1.5;
    });
  }, [products]);

  const totalValue = useMemo(() => products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0), [products]);
  const getCategoryById = useCallback((id) => categories.find(c => String(c.id) === String(id)), [categories]);

  const calculateSuggestedROP = useCallback((productId) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const relevantMovs = movements.filter(m => m.productId === productId && m.type === 'salida' && new Date(m.date) >= thirtyDaysAgo);
    const totalSold = relevantMovs.reduce((sum, m) => sum + m.quantity, 0);
    const firstMovDate = relevantMovs.length > 0 ? new Date(relevantMovs[relevantMovs.length - 1].date) : new Date();
    const daysDiff = Math.max(7, Math.ceil((new Date() - firstMovDate) / (1000 * 60 * 60 * 24)));
    const avgDailySales = totalSold / daysDiff;
    const supplier = suppliers.find(s => s.name.trim().toLowerCase() === (prod.provider || '').trim().toLowerCase());
    const leadTime = supplier?.leadTime || 3;
    const suggested = Math.ceil(avgDailySales * leadTime * 1.15);
    return suggested > 0 ? suggested : (prod.minStock || 5);
  }, [products, movements, suppliers]);

  return (
    <InventoryContext.Provider value={{
      categories, products, movements, suppliers, loading,
      lowStockProducts, reorderProducts, totalValue,
      addCategory, updateCategory, deleteCategory,
      addProduct, updateProduct, deleteProduct, importProducts, clearInventory,
      addMovement, deleteMovement, updateMovement, addMultiBatchMovement,
      addSupplier, updateSupplier, deleteSupplier,
      getCategoryById, calculateSuggestedROP, refresh: fetchData
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);
