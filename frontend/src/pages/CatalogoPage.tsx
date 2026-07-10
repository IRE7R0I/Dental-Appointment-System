import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { TratamientoCatalogo, ObraSocial } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import { globalCache } from '../services/cache';

export default function CatalogoPage() {
  const { user, getAccessToken } = useAuth();
  const toast = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isAdminOrSecretaria = user?.rol === 'admin' || user?.rol === 'secretaria';
  const token = getAccessToken();

  const [tratamientos, setTratamientos] = useState<TratamientoCatalogo[]>(globalCache.catalogo.tratamientos);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>(globalCache.catalogo.obrasSociales);
  const [isLoading, setIsLoading] = useState(!globalCache.catalogo.hasLoaded);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Modal confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'tratamiento' | 'obra_social';
    id: number;
    name: string;
  } | null>(null);

  // Modal tratamiento
  const [showModalT, setShowModalT] = useState(false);
  const [editT, setEditT] = useState<TratamientoCatalogo | null>(null);
  const [tNombre, setTNombre] = useState('');
  const [tArs, setTArs] = useState('');
  const [tUsd, setTUsd] = useState('');
  const [tDuracion, setTDuracion] = useState('30');
  const [tCategoria, setTCategoria] = useState('');
  const [tError, setTError] = useState('');
  const [tLoading, setTLoading] = useState(false);

  // Modal obra social
  const [showModalO, setShowModalO] = useState(false);
  const [oNombre, setONombre] = useState('');
  const [oError, setOError] = useState('');
  const [oLoading, setOLoading] = useState(false);

  const authHeaders = (): HeadersInit =>
    token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

  const fetchData = async () => {
    try {
      const [tr, os] = await Promise.all([
        fetch('/api/catalogo/tratamientos').then(r => r.json()),
        fetch('/api/catalogo/obras-sociales').then(r => r.json()),
      ]);
      globalCache.catalogo.tratamientos = tr;
      globalCache.catalogo.obrasSociales = os;
      globalCache.catalogo.hasLoaded = true;

      if (isMountedRef.current) {
        setTratamientos(tr);
        setObrasSociales(os);
      }
    } catch { /* silent */ } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categorias = [...new Set(tratamientos.map(t => t.categoria).filter(Boolean))] as string[];
  const tratFiltrados = filtroCategoria ? tratamientos.filter(t => t.categoria === filtroCategoria) : tratamientos;

  // ── CRUD Tratamientos ──
  const openCreateT = () => {
    setEditT(null); setTNombre(''); setTArs(''); setTUsd(''); setTDuracion('30'); setTCategoria(''); setTError('');
    setShowModalT(true);
  };

  const saveTratamiento = async (e: React.FormEvent) => {
    e.preventDefault(); setTError(''); setTLoading(true);
    if (!tNombre.trim()) { setTError('El nombre es obligatorio'); setTLoading(false); return; }
    if (!tArs && !tUsd) { setTError('Debe especificar al menos un precio (ARS o USD)'); setTLoading(false); return; }
    const body: Record<string, any> = { nombre: tNombre.trim(), duracion_minutos: parseInt(tDuracion) || 30 };
    if (tArs) body.precio_ars = parseFloat(tArs);
    if (tUsd) body.precio_usd = parseFloat(tUsd);
    if (tCategoria) body.categoria = tCategoria;
    try {
      const url = editT ? `/api/catalogo/tratamientos/${editT.id}` : '/api/catalogo/tratamientos';
      const res = await fetch(url, {
        method: editT ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Error'); }
      setShowModalT(false);
      toast.success(editT ? `Tratamiento "${tNombre}" guardado con éxito` : `Tratamiento "${tNombre}" creado con éxito`);
      fetchData();
    } catch (err: any) { setTError(err.message); }
    setTLoading(false);
  };

  const deleteTratamiento = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/catalogo/tratamientos/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        toast.success(`Tratamiento "${name}" desactivado con éxito`);
        fetchData();
      } else {
        toast.error('Error al desactivar el tratamiento');
      }
    } catch {
      toast.error('Error de red al desactivar el tratamiento');
    }
  };

  // ── CRUD Obras Sociales ──
  const createObraSocial = async (e: React.FormEvent) => {
    e.preventDefault(); setOError(''); setOLoading(true);
    if (!oNombre.trim()) { setOError('El nombre es obligatorio'); setOLoading(false); return; }
    try {
      const res = await fetch('/api/catalogo/obras-sociales', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ nombre: oNombre.trim() }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Error'); }
      setShowModalO(false);
      const tempONombre = oNombre;
      setONombre('');
      toast.success(`Obra social "${tempONombre}" creada con éxito`);
      fetchData();
    } catch (err: any) { setOError(err.message); }
    setOLoading(false);
  };

  const deleteObraSocial = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/catalogo/obras-sociales/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        toast.success(`Obra social "${name}" eliminada con éxito`);
        fetchData();
      } else {
        toast.error('Error al eliminar la obra social');
      }
    } catch {
      toast.error('Error de red al eliminar la obra social');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    if (type === 'tratamiento') {
      await deleteTratamiento(id, name);
    } else {
      await deleteObraSocial(id, name);
    }
    setDeleteConfirm(null);
  };

  if (isLoading) return <div className="p-6 max-w-6xl mx-auto"><div className="bg-white rounded-[24px] p-8 shadow-sm text-center text-slate-400">Cargando...</div></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-slide-up">
      {/* ── Tratamientos ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Catálogo de Tratamientos</h1>
            <p className="text-sm text-slate-500">Servicios odontológicos con precios base</p>
          </div>
          {isAdminOrSecretaria && (
            <button onClick={openCreateT}
              className="bg-[#0061a4] hover:bg-[#004d8a] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">add</span>Nuevo Tratamiento
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFiltroCategoria('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filtroCategoria ? 'bg-[#c2e7ff] text-[#001d35]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Todas
          </button>
          {categorias.map(cat => (
            <button key={cat} onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroCategoria === cat ? 'bg-[#c2e7ff] text-[#001d35]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Nombre</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">ARS</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">USD</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Dur.</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Categoría</th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tratFiltrados.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{t.nombre}</td>
                  <td className="px-6 py-4 text-slate-600">{t.precio_ars ? `$ ${Math.round(t.precio_ars).toLocaleString('es-AR')}` : '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{t.precio_usd ? `$${t.precio_usd}` : '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{t.duracion_minutos}min</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">{t.categoria || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdminOrSecretaria && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setDeleteConfirm({ type: 'tratamiento', id: t.id, name: t.nombre })}
                          className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"><span className="material-symbols-rounded text-lg">delete</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {tratFiltrados.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Sin tratamientos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Tratamiento ── */}
      <Modal
        isOpen={showModalT}
        onClose={() => setShowModalT(false)}
        title={editT ? 'Editar tratamiento' : 'Nuevo tratamiento'}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={saveTratamiento} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre *</label>
            <input value={tNombre} onChange={e => setTNombre(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio ARS</label>
              <input type="number" step="0.01" value={tArs} onChange={e => setTArs(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio USD</label>
              <input type="number" step="0.01" value={tUsd} onChange={e => setTUsd(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duración (min)</label>
              <input type="number" value={tDuracion} onChange={e => setTDuracion(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
              <input value={tCategoria} onChange={e => setTCategoria(e.target.value)} placeholder="Ej: Cirugía"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" />
            </div>
          </div>
          {tError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{tError}</div>}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowModalT(false)}
              className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" disabled={tLoading}
              className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow">
              {tLoading ? 'Guardando...' : editT ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Obras Sociales ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Obras Sociales</h2>
          {user?.rol === 'admin' && (
            <button onClick={() => { setShowModalO(true); setONombre(''); setOError(''); }}
              className="bg-[#0061a4] hover:bg-[#004d8a] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">add</span>Nueva Obra Social
            </button>
          )}
        </div>
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Nombre</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Estado</th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {obrasSociales.map(os => (
                <tr key={os.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{os.nombre}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user?.rol === 'admin' && (
                      <button onClick={() => setDeleteConfirm({ type: 'obra_social', id: os.id, name: os.nombre })}
                        className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <span className="material-symbols-rounded text-lg">delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal obra social */}
      <Modal
        isOpen={showModalO}
        onClose={() => setShowModalO(false)}
        title="Nueva obra social"
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={createObraSocial} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
            <input value={oNombre} onChange={e => setONombre(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" required />
          </div>
          {oError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{oError}</div>}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowModalO(false)}
              className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" disabled={oLoading}
              className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow">
              {oLoading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
      {/* ── Modal Confirmar Eliminación ── */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm ? (deleteConfirm.type === 'tratamiento' ? 'Desactivar Tratamiento' : 'Eliminar Obra Social') : ''}
        message={deleteConfirm ? `¿Estás seguro de que querés ${deleteConfirm.type === 'tratamiento' ? 'desactivar' : 'eliminar'} "${deleteConfirm.name}"?` : ''}
        confirmText={deleteConfirm ? `Sí, ${deleteConfirm.type === 'tratamiento' ? 'desactivar' : 'eliminar'}` : ''}
      />
    </div>
  );
}
