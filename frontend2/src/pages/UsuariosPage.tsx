import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { CustomSelect } from '../components/CustomSelect';
import { User, ShieldAlert, PlusCircle, UserCheck, UserX, Lock, Trash2 } from 'lucide-react';

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('secretaria');

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Forms state
  const [newForm, setNewForm] = useState({
    username: '',
    password: '',
    rol: 'secretaria'
  });
  const [passForm, setPassForm] = useState({
    newPassword: ''
  });

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const usersData = await apiFetch('/api/admin/usuarios');
      setUsuarios(usersData);
    } catch (e: any) {
      showToast('Error cargando la lista de usuarios. Requiere privilegios de Administrador.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUserRole(localStorage.getItem('user_role') || 'secretaria');
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.username || !newForm.password) {
      showToast('Por favor complete todos los campos.', 'warning');
      return;
    }
    try {
      await apiFetch('/api/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify(newForm)
      });
      showToast('Usuario registrado con éxito.', 'success');
      setIsNewOpen(false);
      setNewForm({ username: '', password: '', rol: 'secretaria' });
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleUserActive = async (id: number, currentActive: boolean) => {
    try {
      await apiFetch(`/api/admin/usuarios/${id}/activo`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !currentActive })
      });
      showToast('Estado del usuario actualizado.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !passForm.newPassword) return;
    try {
      await apiFetch(`/api/admin/usuarios/${selectedUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: passForm.newPassword })
      });
      showToast('Contraseña restablecida con éxito.', 'success');
      setIsPassOpen(false);
      setSelectedUser(null);
      setPassForm({ newPassword: '' });
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openPassModal = (u: any) => {
    setSelectedUser(u);
    setIsPassOpen(true);
  };

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-warm-900 tracking-tight">
            Gestión de Usuarios
          </h2>
          <p className="text-xs text-neutral-warm-600 mt-1">
            Administración de credenciales de acceso, roles del sistema y bloqueo de cuentas
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsNewOpen(true)}
            className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <PlusCircle size={16} strokeWidth={2.5} />
            <span>Registrar Usuario</span>
          </button>
        )}
      </div>

      {!isAdmin ? (
        <div className="bg-white border border-[#A32D2D]/20 rounded-[24px] shadow-xs p-10 text-center text-xs text-neutral-warm-600 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-[#A32D2D]">
            <ShieldAlert size={20} />
          </div>
          <h3 className="font-semibold text-[#A32D2D] text-sm">Privilegios Insuficientes</h3>
          <p className="max-w-md">
            Solo las cuentas con rol de <strong>Administrador</strong> están autorizadas para visualizar, crear, habilitar o reestablecer contraseñas en el panel de usuarios.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight">
            Cuentas del Sistema Activas
          </h3>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600">Cargando usuarios...</div>
            ) : usuarios.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
                No hay cuentas registradas.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-neutral-warm-50 text-neutral-warm-600 text-[10px] uppercase tracking-wider font-normal bg-[#FAF9F5]">
                    <th className="py-3 px-4 sticky left-0 bg-[#FAF9F5] z-20 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">ID</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Rol del Sistema</th>
                    <th className="py-3 px-4">Habilitado</th>
                    <th className="py-3 px-4 text-right">Acciones de Cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-warm-50">
                  {usuarios.map(u => {
                    const isSelf = u.username === localStorage.getItem('user_username');
                    
                    return (
                      <tr key={u.id} className="hover:bg-neutral-warm-50/20 transition-colors group">
                        <td className="py-3.5 px-4 font-mono font-medium text-neutral-warm-600 sticky left-0 bg-white z-10 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-[#FAF9F5] transition-colors">
                          #{u.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-neutral-warm-900">
                          {u.username} {isSelf && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#E1F5EE] text-[#085041] text-[9px] font-normal italic">Tú</span>}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-warm-900 font-medium capitalize">
                          {u.rol}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            u.activo ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]' : 'bg-[#FCEBEB] text-[#A32D2D] border-[#FCEBEB]'
                          }`}>
                            {u.activo ? 'Habilitado' : 'Suspendido'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle active state */}
                            {!isSelf && (
                              <button
                                onClick={() => toggleUserActive(u.id, u.activo)}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                  u.activo 
                                    ? 'text-[#A32D2D] bg-[#FCEBEB] hover:bg-red-100' 
                                    : 'text-[#3B6D11] bg-[#EAF3DE] hover:bg-green-100'
                                }`}
                              >
                                {u.activo ? <UserX size={12} /> : <UserCheck size={12} />}
                                <span>{u.activo ? 'Inhabilitar' : 'Habilitar'}</span>
                              </button>
                            )}

                            {/* Reset password button */}
                            <button
                              onClick={() => openPassModal(u)}
                              className="text-neutral-warm-900 bg-[#F1EFE8] hover:bg-neutral-warm-100 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Lock size={12} />
                              <span>Cambiar Clave</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: REGISTER NEW USER --- */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Registrar Cuenta de Usuario">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Nombre de Usuario *
            </label>
            <input
              type="text"
              required
              value={newForm.username}
              onChange={e => setNewForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Ej: mariana.odontologa"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Contraseña de Acceso Obligatoria *
            </label>
            <input
              type="password"
              required
              value={newForm.password}
              onChange={e => setNewForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Rol del Sistema
            </label>
            <CustomSelect
              value={newForm.rol}
              onChange={val => setNewForm(prev => ({ ...prev, rol: String(val) }))}
              options={[
                { value: 'secretaria', label: 'Secretaría (Manejo administrativo estándar)' },
                { value: 'admin', label: 'Administrador (Control total y finanzas)' }
              ]}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: RESET PASSWORD --- */}
      <Modal isOpen={isPassOpen} onClose={() => setIsPassOpen(false)} title="Restablecer Contraseña de Acceso">
        {selectedUser && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="text-xs border-b border-neutral-warm-50 pb-2 text-neutral-warm-600">
              Usted está reestableciendo la clave del usuario: <strong className="text-neutral-warm-900 font-semibold">{selectedUser.username}</strong>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                required
                value={passForm.newPassword}
                onChange={e => setPassForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPassOpen(false)}
                className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Actualizar Clave
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
