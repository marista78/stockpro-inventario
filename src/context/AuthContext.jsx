import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'sp_users';

const DEFAULT_PERMISSIONS = {
  inventory: true,
  categories: true,
  suppliers: true,
  movements: true,
  reports: true,
  ai: true
};

const INITIAL_USERS = [
  { 
    id: '1', 
    email: 'admin@stockpro.com', 
    password: 'admin123', 
    name: 'Martin Arista', 
    role: 'admin', 
    createdAt: new Date().toISOString(),
    permissions: { ...DEFAULT_PERMISSIONS }
  },
  { 
    id: '2', 
    email: 'demo@demo.com', 
    password: 'demo123', 
    name: 'Usuario Demo', 
    role: 'user', 
    createdAt: new Date().toISOString(),
    permissions: { 
      inventory: true,
      categories: true,
      suppliers: false,
      movements: true,
      reports: true
    }
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar base de datos de usuarios primero
    const savedUsers = localStorage.getItem(STORAGE_KEY);
    let currentUsers = INITIAL_USERS;
    if (savedUsers) {
      currentUsers = JSON.parse(savedUsers);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    }
    setUsers(currentUsers);

    // Cargar sesión y asegurar que tenga ID y permisos
    const savedUser = localStorage.getItem('sp_user');
    if (savedUser) {
      let parsed = JSON.parse(savedUser);
      const dbUser = currentUsers.find(u => u.email === parsed.email);
      
      if (dbUser) {
        parsed = { 
          ...parsed, 
          id: dbUser.id, 
          role: dbUser.role,
          permissions: dbUser.permissions || { ...DEFAULT_PERMISSIONS }
        };
        localStorage.setItem('sp_user', JSON.stringify(parsed));
      }
      setUser(parsed);
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) throw new Error('Credenciales incorrectas');
    const userData = { 
      id: found.id, 
      email: found.email, 
      name: found.name, 
      role: found.role,
      permissions: found.permissions || { ...DEFAULT_PERMISSIONS }
    };
    setUser(userData);
    localStorage.setItem('sp_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sp_user');
  };

  // Gestión de Usuarios
  const addUser = (userData) => {
    // Validar email duplicado
    if (users.some(u => u.email === userData.email)) {
      throw new Error('Este correo electrónico ya está registrado');
    }

    const newUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      permissions: userData.permissions || { ...DEFAULT_PERMISSIONS }
    };
    setUsers(prev => {
      const next = [...prev, newUser];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateUser = (id, updates) => {
    // Validar email duplicado si se está cambiando
    if (updates.email && users.some(u => u.email === updates.email && u.id !== id)) {
      throw new Error('Este correo electrónico ya está en uso por otro usuario');
    }

    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    
    // Actualizar sesión si es el usuario actual
    setUser(prev => {
      if (prev && prev.id === id) {
        const updated = { ...prev, ...updates };
        // No guardar el password en la sesión del localStorage por seguridad
        const { password, ...sessionData } = updated;
        localStorage.setItem('sp_user', JSON.stringify(sessionData));
        return updated;
      }
      return prev;
    });
  };

  const deleteUser = (id) => {
    if (user && user.id === id) throw new Error('No puedes eliminar tu propia cuenta');
    setUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users, 
      loading, 
      login, 
      logout,
      addUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
