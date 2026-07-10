import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      success(`¡Bienvenido, ${username}!`);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 35, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-[84px] h-[84px] bg-[#eaf4fe] rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-sm border border-white/50">
            <span className="material-symbols-rounded text-[60px] text-[#0061a4] filled">dentistry</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            OdontoGest
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Iniciá sesión para continuar
          </p>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4] transition-all"
                placeholder="Ingresá tu usuario"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4] transition-all"
                  placeholder="Ingresá tu contraseña"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-xl">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl animate-pulse-soft">
                {error}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.015, y: -0.5 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0061a4] hover:bg-[#004d8a] text-white font-medium py-2.5 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow cursor-pointer"
            >
              {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          OdontoGest v2.x &mdash; Gestión de consultorio odontológico
        </p>
      </motion.div>
    </div>
  );
}
