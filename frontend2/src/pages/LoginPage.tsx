import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useToast } from '../components/Toast';
import { IconTooth } from '../components/IconTooth';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to home
    if (localStorage.getItem('access_token')) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Por favor ingrese todos los campos obligatorios.', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fallo de autenticación');
      }
      
      // Store session data
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Fetch role and details
      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      const meData = await meRes.json();
      if (meRes.ok) {
        localStorage.setItem('user_role', meData.rol);
        localStorage.setItem('user_username', meData.username);
        showToast(`¡Bienvenido de nuevo, ${meData.username}!`, 'success');
        navigate('/');
      } else {
        throw new Error('No se pudo verificar la sesión.');
      }
    } catch (err: any) {
      showToast(err.message || 'Credenciales inválidas o error de red.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F1EFE8]">
      <div className="w-full max-w-md bg-white border border-neutral-warm-100 rounded-xl shadow-md p-8 relative overflow-hidden transition-all hover:shadow-lg">
        {/* Top turquoise accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1D9E75]" />
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#E1F5EE] flex items-center justify-center text-[#1D9E75] mb-3">
            <IconTooth size={24} className="text-[#1D9E75] fill-[#E1F5EE]" />
          </div>
          <h2 className="text-xl font-medium text-neutral-warm-900 tracking-tight">
            OdontoGest
          </h2>
          <p className="text-xs text-neutral-warm-600 mt-1">
            Gestión Odontológica Profesional
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Usuario
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-warm-600">
                <User size={16} />
              </span>
              <input
                type="text"
                disabled={loading}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-lg border border-neutral-warm-100 bg-white text-neutral-warm-900 placeholder:text-neutral-warm-600/60 focus:outline-none focus:ring-1 focus:ring-[#1D9E75] focus:border-[#1D9E75] transition-all disabled:bg-neutral-warm-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-warm-600">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={loading}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full text-xs pl-10 pr-10 py-2.5 rounded-lg border border-neutral-warm-100 bg-white text-neutral-warm-900 placeholder:text-neutral-warm-600/60 focus:outline-none focus:ring-1 focus:ring-[#1D9E75] focus:border-[#1D9E75] transition-all disabled:bg-neutral-warm-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-warm-600 hover:text-neutral-warm-900 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#1D9E75] hover:bg-[#0F6E56] text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-md flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Autenticando...</span>
              </span>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-warm-50 text-center">
          <p className="text-[10px] text-neutral-warm-600">
            Administración: admin / admin123 • Secretaria: secretaria / sec123
          </p>
        </div>
      </div>
    </div>
  );
}
