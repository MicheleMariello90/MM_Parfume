import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message || "Errore durante l'accesso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#000', 
      color: '#fff', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' 
    }}>
      <form onSubmit={handleLogin} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        width: '320px', 
        padding: '40px', 
        backgroundColor: '#050505',
        border: '1px solid #1a1a1a', 
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        
        {/* LOGO - CENTRATO E SENZA SCRITTE SOTTO */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <img 
            src="logo.png" 
            alt="Logo Aura Lab" 
            style={{ width: '140px', height: '140px', objectFit: 'contain' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>

        <input 
          type="email" 
          placeholder="Email" 
          required
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{ 
            padding: '14px', 
            borderRadius: '12px', 
            border: '1px solid #222', 
            backgroundColor: '#111', 
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          required
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ 
            padding: '14px', 
            borderRadius: '12px', 
            border: '1px solid #222', 
            backgroundColor: '#111', 
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        
        <button 
          disabled={loading} 
          style={{ 
            padding: '14px', 
            borderRadius: '12px', 
            border: 'none', 
            backgroundColor: '#2563eb', 
            color: '#fff', 
            fontWeight: 'bold', 
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            fontSize: '12px',
            letterSpacing: '0.1em',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        >
          {loading ? 'VERIFICA...' : 'ENTRA'}
        </button>
      </form>
    </div>
  );
};