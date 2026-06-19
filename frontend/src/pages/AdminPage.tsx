import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface User {
  id: number;
  username: string;
  rol: string;
  activo: boolean;
  creado_en: string;
}

export default function AdminPage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; username: string } | null>(null);

  // Modal crear
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Modal editar
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCurrentPassword, setEditCurrentPassword] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [showEditCurrPass, setShowEditCurrPass] = useState(false);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const token = getAccessToken();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } catch { /* silent */ }
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Crear usuario ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newUsername, password: newPassword, rol: 'secretaria' }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Error'); }
      setShowCreate(false);
      setNewUsername('');
      setNewPassword('');
      setShowNewPass(false);
      toast.success(`Usuario "${newUsername}" creado con éxito`);
      fetchUsers();
    } catch (err: any) { setCreateError(err.message); }
    setCreateLoading(false);
  };

  // ── Editar usuario ──
  const openEdit = (u: User) => {
    setEditTarget(u);
    setEditUsername(u.username);
    setEditPassword('');
    setEditCurrentPassword('');
    setShowEditPass(false);
    setShowEditCurrPass(false);
    setEditError('');
    setEditLoading(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError('');
    setEditLoading(true);
    try {
      const body: Record<string, string> = {};
      if (editUsername !== editTarget.username) body.username = editUsername;
      if (editPassword) {
        body.password = editPassword;
        // current_password solo para self-edit (admin cambiando su propia pass)
        if (editTarget.rol === 'admin') {
          if (!editCurrentPassword) { setEditError('Debe ingresar la contraseña actual para cambiarla'); setEditLoading(false); return; }
          body.current_password = editCurrentPassword;
        }
      }
      if (Object.keys(body).length === 0) { setEditError('No hay cambios para guardar'); setEditLoading(false); return; }
      const res = await fetch(`/api/admin/usuarios/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Error'); }
      setEditTarget(null);
      toast.success(`Usuario "${editUsername}" actualizado con éxito`);
      fetchUsers();
    } catch (err: any) { setEditError(err.message); }
    setEditLoading(false);
  };

  // ── Acciones rápidas ──
  const handleToggleActivo = async (userId: number) => {
    const targetUser = users.find(u => u.id === userId);
    const action = targetUser?.activo ? 'desactivado' : 'activado';
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}/toggle-activo`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`Usuario "${targetUser?.username}" ${action} con éxito`);
        fetchUsers();
      } else {
        toast.error('Error al cambiar estado del usuario');
      }
    } catch {
      toast.error('Error de red al cambiar estado del usuario');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/admin/usuarios/${deleteConfirm.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`Usuario "${deleteConfirm.username}" eliminado con éxito`);
        fetchUsers();
      } else {
        toast.error('Error al eliminar el usuario');
      }
    } catch {
      toast.error('Error de red al eliminar el usuario');
    }
    setDeleteConfirm(null);
  };

  // ── Render ──
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-[family-name:var(--font-display)]">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administrá las cuentas del personal
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); setShowNewPass(false); }}
          className="bg-[#0061a4] hover:bg-[#004d8a] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-rounded text-lg">add</span>
          Nuevo Usuario
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 text-center text-slate-400">
          Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Usuario</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Rol</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Estado</th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800">{u.username}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      u.rol === 'admin'
                        ? 'bg-[#eaf4fe] text-[#0061a4]'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-sm ${
                      u.activo ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {u.rol !== 'admin' ? (
                        <>
                          <button onClick={() => openEdit(u)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Editar usuario">
                            <span className="material-symbols-rounded text-lg">edit</span>
                          </button>
                          <button onClick={() => handleToggleActivo(u.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              u.activo ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'
                            }`}
                            title={u.activo ? 'Desactivar' : 'Activar'}>
                            <span className="material-symbols-rounded text-lg">
                              {u.activo ? 'block' : 'check_circle'}
                            </span>
                          </button>
                          <button onClick={() => setDeleteConfirm({ id: u.id, username: u.username })}
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar">
                            <span className="material-symbols-rounded text-lg">delete</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(u)}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#0061a4] hover:bg-[#eaf4fe] transition-colors"
                            title="Editar mi usuario">
                            <span className="material-symbols-rounded text-lg">edit</span>
                          </button>
                          <div className="w-9" />
                          <div className="w-9" />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Crear ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nuevo Usuario</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Usuario</label>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
                <div className="relative">
                  <input type={showNewPass ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4]" required />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    <span className="material-symbols-rounded text-xl">{showNewPass ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>
              {createError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{createError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 bg-[#0061a4] hover:bg-[#004d8a] text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50">
                  {createLoading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Editar ── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar: {editTarget.username}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de usuario</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Nueva contraseña <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <input type={showEditPass ? 'text' : 'password'} value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4]"
                    placeholder="Dejá vacío para mantener" />
                  <button type="button" onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    <span className="material-symbols-rounded text-xl">{showEditPass ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>
              {editPassword && editTarget.rol === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña actual <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showEditCurrPass ? 'text' : 'password'} value={editCurrentPassword}
                      onChange={(e) => setEditCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] focus:border-[#0061a4]"
                      placeholder="Ingresá la contraseña actual" required />
                    <button type="button" onClick={() => setShowEditCurrPass(!showEditCurrPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      <span className="material-symbols-rounded text-xl">{showEditCurrPass ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </div>
                </div>
              )}
              {editError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{editError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 bg-[#0061a4] hover:bg-[#004d8a] text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50">
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminación ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-[24px] p-6 w-full max-w-xs shadow-xl border border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-rounded text-2xl text-red-500">delete</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Eliminar Usuario</h2>
            <p className="text-sm text-slate-500 mb-6">¿Estás seguro de que querés eliminar definitivamente a "{deleteConfirm.username}"?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors"
              >
                No
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl transition-all"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
