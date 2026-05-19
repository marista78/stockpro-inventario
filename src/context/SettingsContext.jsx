import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    appName: 'StockPro',
    appIcon: 'Boxes',
    primaryColor: '#4f46e5',
    shopRuc: 'RUC: 20203040567',
    shopAddress: 'mi direccion'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*');
      
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // Table doesn't exist or is empty, use defaults
          console.warn('Settings table not found or empty, using defaults');
        } else {
          throw error;
        }
      }

      if (data && data.length > 0) {
        const mapped = {};
        data.forEach(s => {
          mapped[s.key] = s.value;
        });
        setSettings(prev => {
          const newSettings = { ...prev, ...mapped };
          applyTheme(newSettings.primaryColor);
          return newSettings;
        });
      } else {
        applyTheme(settings.primaryColor);
      }
    } catch (err) {
      console.error('Error fetching settings:', err.message);
      applyTheme(settings.primaryColor);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (color) => {
    if (!color) return;
    const root = document.documentElement;
    
    // Simple hex to hsl conversion or just use the hex
    root.style.setProperty('--primary', color);
    
    // Create variations (simplified for hex)
    root.style.setProperty('--primary-glow', color + '44');
    root.style.setProperty('--primary-dark', color); // Simplified
    root.style.setProperty('--primary-light', color); // Simplified
  };

  const updateSetting = async (key, value) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      if (key === 'primaryColor') applyTheme(value);

      // Try to upsert in Supabase
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating setting:', err.message);
      // Even if it fails in DB (table missing), it works in local state for the session
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
