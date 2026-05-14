import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar el estado de autenticación de Supabase en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // Optional: you can set redirectTo to ensure it forces returning here on login
      });
      if (error) throw error;
    } catch (error) {
      console.error("Supabase Login Error:", error.message);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  return { user, loading, loginWithGoogle, logout };
}
