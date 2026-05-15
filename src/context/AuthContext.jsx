import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext(null);

const DEFAULT_PERMISSIONS = {
  inventory: true,
  categories: true,
  suppliers: true,
  movements: true,
  reports: true,
  scanner: true,
  ia: true
};

const DEFAULT_ADMIN_USER = {
  id: 'admin-default',
  email: 'admin@stockpro.com',
  name: 'Administrador',
  role: 'admin',
  permissions: { ...DEFAULT_PERMISSIONS },
  isDefault: true
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        // Fallback for demo mode: check localStorage for a session
        const savedUser = localStorage.getItem('demo_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          // AUTO-LOGIN: If no session, use the default admin user
          setUser(DEFAULT_ADMIN_USER);
        }
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        const savedUser = localStorage.getItem('demo_user');
        if (!savedUser) {
          setUser(DEFAULT_ADMIN_USER);
        }
      }
    });

    fetchUsers();
    return () => subscription.unsubscribe();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error) {
      setUsers((data || []).map(u => ({
        ...u,
        createdAt: u.created_at
      })));
    }
  };

  const fetchProfile = async (authUser) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();
    
    if (data) {
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        permissions: data.permissions || { ...DEFAULT_PERMISSIONS },
        createdAt: data.created_at
      };
      setUser(userData);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    // 1. Try Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!authError) return authData;

    // 2. Try Public Users Table (Demo Mode)
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    if (profileData) {
      const userData = {
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        role: profileData.role,
        permissions: profileData.permissions || { ...DEFAULT_PERMISSIONS }
      };
      setUser(userData);
      localStorage.setItem('demo_user', JSON.stringify(userData));
      return { user: userData };
    }

    throw authError || profileError || new Error('Credenciales incorrectas');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('demo_user');
    setUser(null);
  };

  const addUser = async (userData) => {
    const newUser = {
      ...userData,
      id: userData.id || uuidv4(),
      permissions: userData.permissions || { ...DEFAULT_PERMISSIONS },
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('users').insert([newUser]).select().single();
    if (error) throw error;
    fetchUsers();
    return data;
  };

  const updateUser = async (id, updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    
    fetchUsers();
    if (user && user.id === id) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      if (localStorage.getItem('demo_user')) {
        localStorage.setItem('demo_user', JSON.stringify(updatedUser));
      }
    }
    return data;
  };

  const deleteUser = async (id) => {
    if (user && user.id === id) throw new Error('No puedes eliminar tu propia cuenta');
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    fetchUsers();
  };

  const seedDemoUsers = async () => {
    const demoUsers = [
      {
        id: uuidv4(),
        name: 'Admin Demo',
        email: 'admin@demo.com',
        password: 'demo',
        role: 'admin',
        permissions: { ...DEFAULT_PERMISSIONS }
      },
      {
        id: uuidv4(),
        name: 'Vendedor Demo',
        email: 'ventas@demo.com',
        password: 'demo',
        role: 'user',
        permissions: { ...DEFAULT_PERMISSIONS, categories: false, suppliers: false }
      },
      {
        id: uuidv4(),
        name: 'Logística Demo',
        email: 'logistica@demo.com',
        password: 'demo',
        role: 'user',
        permissions: { ...DEFAULT_PERMISSIONS, reports: false }
      },
      {
        id: uuidv4(),
        name: 'Invitado Demo',
        email: 'invitado@demo.com',
        password: 'demo',
        role: 'user',
        permissions: { ...DEFAULT_PERMISSIONS, movements: false, ia: false }
      },
      {
        id: uuidv4(),
        name: 'Supervisor Demo',
        email: 'supervisor@demo.com',
        password: 'demo',
        role: 'user',
        permissions: { ...DEFAULT_PERMISSIONS, scanner: true }
      }
    ];

    for (const u of demoUsers) {
      await supabase.from('users').upsert(u, { onConflict: 'email' });
    }
    fetchUsers();
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
      deleteUser,
      seedDemoUsers,
      refreshUsers: fetchUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
