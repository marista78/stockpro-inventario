import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import StockMovements from './pages/StockMovements';
import Scanner from './pages/Scanner';
import Reports from './pages/Reports';
import Maintenance from './pages/Maintenance';
import Users from './pages/Users';
import './pages/Categories.css';
import './pages/Suppliers.css';
import './pages/StockMovements.css';
import './pages/Users.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <InventoryProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventario" element={<Inventory />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/proveedores" element={<Suppliers />} />
                <Route path="/movimientos" element={<StockMovements />} />
                <Route path="/escaner" element={<Scanner />} />
                <Route path="/reportes" element={<Reports />} />
                <Route path="/mantenimiento" element={<Maintenance />} />
                <Route path="/usuarios" element={<Users />} />
              </Route>
            </Routes>
          </ToastProvider>
        </InventoryProvider>
      </SettingsProvider>
    </AuthProvider>
  </BrowserRouter>
  );
}
