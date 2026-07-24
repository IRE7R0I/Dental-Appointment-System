import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { CustomSelect } from '../components/CustomSelect';
import { TratamientoCatalogo, ObraSocial } from '../types';
import { 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Tag, 
  Heart, 
  DollarSign, 
  Briefcase,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function CatalogoPage() {
  const [activeTab, setActiveTab] = useState<'tratamientos' | 'prepagas'>('tratamientos');
  const [tratamientos, setTratamientos] = useState<TratamientoCatalogo[]>([]);
  const [prepagas, setPrepagas] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('secretaria');

  // Modals state
  const [isTratamientoOpen, setIsTratamientoOpen] = useState(false);
  const [isEditTratamientoOpen, setIsEditTratamientoOpen] = useState(false);
  const [selectedTratamiento, setSelectedTratamiento] = useState<TratamientoCatalogo | null>(null);

  const [isPrepagaOpen, setIsPrepagaOpen] = useState(false);

  // Forms state
  const [newTrForm, setNewTrForm] = useState({
    nombre: '',
    categoria: 'General',
    precio_ars: '',
    precio_usd: ''
  });
  const [editTrForm, setEditTrForm] = useState({
    nombre: '',
    categoria: 'General',
    precio_ars: '',
    precio_usd: ''
  });
  const [newPrepagaName, setNewPrepagaName] = useState('');

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [trData, prepData] = await Promise.all([
        apiFetch('/api/catalogo/tratamientos'),
        apiFetch('/api/catalogo/obras-sociales')
      ]);
      setTratamientos(trData);
      setPrepagas(prepData);
    } catch (e: any) {
      showToast('Error cargando catálogos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUserRole(localStorage.getItem('user_role') || 'secretaria');
    loadData();
  }, []);

  // TRATAMIENTOS HANDLERS
  const handleCreateTratamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrForm.nombre || parseFloat(newTrForm.precio_ars) < 0 || parseFloat(newTrForm.precio_usd) < 0) {
      showToast('Por favor ingrese un nombre y valores de precio válidos (no negativos).', 'warning');
      return;
    }
    try {
      await apiFetch('/api/catalogo/tratamientos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: newTrForm.nombre,
          categoria: newTrForm.categoria,
          precio_ars: parseFloat(newTrForm.precio_ars) || 0,
          precio_usd: parseFloat(newTrForm.precio_usd) || 0
        })
      });
      showToast('Tratamiento de catálogo registrado.', 'success');
      setIsTratamientoOpen(false);
      setNewTrForm({ nombre: '', categoria: 'General', precio_ars: '', precio_usd: '' });
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEditTratamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTratamiento) return;
    if (!editTrForm.nombre || parseFloat(editTrForm.precio_ars) < 0 || parseFloat(editTrForm.precio_usd) < 0) {
      showToast('Por favor ingrese datos válidos.', 'warning');
      return;
    }
    try {
      await apiFetch(`/api/catalogo/tratamientos/${selectedTratamiento.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: editTrForm.nombre,
          categoria: editTrForm.categoria,
          precio_ars: parseFloat(editTrForm.precio_ars) || 0,
          precio_usd: parseFloat(editTrForm.precio_usd) || 0
        })
      });
      showToast('Tratamiento de catálogo actualizado.', 'success');
      setIsEditTratamientoOpen(false);
      setSelectedTratamiento(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openEditTrModal = (tr: TratamientoCatalogo) => {
    setSelectedTratamiento(tr);
    setEditTrForm({
      nombre: tr.nombre,
      categoria: tr.categoria,
      precio_ars: String(tr.precio_ars),
      precio_usd: String(tr.precio_usd)
    });
    setIsEditTratamientoOpen(true);
  };

  const toggleTratamientoActive = async (id: number, currentActive: boolean) => {
    try {
      await apiFetch(`/api/catalogo/tratamientos/${id}/activo`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !currentActive })
      });
      showToast('Estado del tratamiento de catálogo actualizado.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // PREPAGAS / OBRAS SOCIALES HANDLERS
  const handleCreatePrepaga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrepagaName.trim()) return;
    try {
      await apiFetch('/api/catalogo/obras-sociales', {
        method: 'POST',
        body: JSON.stringify({ nombre: newPrepagaName })
      });
      showToast('Obra social / Prepaga registrada correctamente.', 'success');
      setIsPrepagaOpen(false);
      setNewPrepagaName('');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTogglePrepagaActive = async (id: number, currentActive: boolean) => {
    try {
      await apiFetch(`/api/catalogo/obras-sociales/${id}/activo`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !currentActive })
      });
      showToast('Estado de prepaga modificado.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Both admin and secretaria are authorized to manage treatments and medical coverages
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'secretaria';

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-warm-900 tracking-tight">
            Configuración de Catálogos
          </h2>
          <p className="text-xs text-neutral-warm-600 mt-1">
            Administración de nomenclador de prestaciones odontológicas y convenios con aseguradoras médicas
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            {activeTab === 'tratamientos' ? (
              <button
                onClick={() => setIsTratamientoOpen(true)}
                className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <PlusCircle size={16} strokeWidth={2.5} />
                <span>Registrar Prestación</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPrepagaOpen(true)}
                className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <PlusCircle size={16} strokeWidth={2.5} />
                <span>Registrar Cobertura</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-neutral-warm-100/60">
        <button
          onClick={() => setActiveTab('tratamientos')}
          className={`px-5 py-3 text-xs font-bold tracking-tight transition-all border-b-2 cursor-pointer ${
            activeTab === 'tratamientos'
              ? 'border-[#1D9E75] text-[#085041]'
              : 'border-transparent text-neutral-warm-600 hover:text-neutral-warm-900'
          }`}
        >
          Nomenclador de Prestaciones
        </button>
        <button
          onClick={() => setActiveTab('prepagas')}
          className={`px-5 py-3 text-xs font-bold tracking-tight transition-all border-b-2 cursor-pointer ${
            activeTab === 'prepagas'
              ? 'border-[#1D9E75] text-[#085041]'
              : 'border-transparent text-neutral-warm-600 hover:text-neutral-warm-900'
          }`}
        >
          Obras Sociales & Prepagas
        </button>
      </div>

      {/* TAB 1 CONTENT: TRATAMIENTOS CATALOG */}
      {activeTab === 'tratamientos' && (
        <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight">
            Nomenclador de Prácticas Odontológicas
          </h3>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600">Cargando nomenclador...</div>
            ) : tratamientos.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
                No hay tratamientos cargados en el nomenclador.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-neutral-warm-50 text-neutral-warm-600 text-[10px] uppercase tracking-wider font-normal bg-[#FAF9F5]">
                    <th className="py-3 px-4 sticky left-0 bg-[#FAF9F5] z-20 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Categoría</th>
                    <th className="py-3 px-4">Descripción de la práctica</th>
                    <th className="py-3 px-4">Valor Base Pesos</th>
                    <th className="py-3 px-4">Valor Base Dólares</th>
                    <th className="py-3 px-4">Vigente</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-warm-50">
                  {tratamientos.map(t => (
                    <tr key={t.id} className="hover:bg-neutral-warm-50/20 transition-colors group">
                      <td className="py-3.5 px-4 font-semibold text-neutral-warm-900 sticky left-0 bg-white z-10 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-[#FAF9F5] transition-colors">
                        <span className="bg-neutral-warm-50 text-neutral-warm-900 border border-neutral-warm-100 px-2 py-0.5 rounded text-[10px] tracking-tight">
                          {t.categoria}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-warm-900">
                        {t.nombre}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-warm-900 font-mono">
                        $ {t.precio_ars.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-warm-900 font-mono">
                        U$S {t.precio_usd.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          t.activo ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]' : 'bg-[#FCEBEB] text-[#A32D2D] border-[#FCEBEB]'
                        }`}>
                          {t.activo ? 'Vigente' : 'Inactivo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditTrModal(t)}
                              className="px-2 py-1 rounded border border-neutral-warm-100 hover:bg-neutral-warm-50 text-[10px] font-medium text-neutral-warm-900 transition-colors cursor-pointer"
                            >
                              Modificar
                            </button>
                            
                            <button
                              onClick={() => toggleTratamientoActive(t.id, t.activo)}
                              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                t.activo 
                                  ? 'text-[#A32D2D] bg-[#FCEBEB] hover:bg-red-100' 
                                  : 'text-[#3B6D11] bg-[#EAF3DE] hover:bg-green-100'
                              }`}
                            >
                              {t.activo ? 'Suspender' : 'Habilitar'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2 CONTENT: PREPAGAS */}
      {activeTab === 'prepagas' && (
        <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight">
            Convenios con Obras Sociales & Seguros de Salud
          </h3>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600">Cargando prepagas...</div>
            ) : prepagas.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
                No hay convenios cargados.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-warm-50 text-neutral-warm-600 text-[10px] uppercase tracking-wider font-normal bg-[#FAF9F5]">
                    <th className="py-3 px-4 sticky left-0 bg-[#FAF9F5] z-20 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">ID</th>
                    <th className="py-3 px-4">Denominación del Convenio</th>
                    <th className="py-3 px-4">Vigencia del Contrato</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-warm-50">
                  {prepagas.map(p => (
                    <tr key={p.id} className="hover:bg-neutral-warm-50/20 transition-colors group">
                      <td className="py-3.5 px-4 font-mono font-medium text-neutral-warm-600 sticky left-0 bg-white z-10 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-[#FAF9F5] transition-colors">
                        #{p.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-warm-900">
                        {p.name || p.nombre}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          p.activo ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]' : 'bg-[#FCEBEB] text-[#A32D2D] border-[#FCEBEB]'
                        }`}>
                          {p.activo ? 'Vigente' : 'Inactivo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleTogglePrepagaActive(p.id, p.activo)}
                            className={`px-2.5 py-1.5 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 ml-auto ${
                              p.activo 
                                ? 'text-[#A32D2D] bg-[#FCEBEB] hover:bg-red-100' 
                                : 'text-[#3B6D11] bg-[#EAF3DE] hover:bg-green-100'
                            }`}
                          >
                            {p.activo ? 'Rescindir' : 'Reincorporar'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: CREATE TRATAMIENTO --- */}
      <Modal isOpen={isTratamientoOpen} onClose={() => setIsTratamientoOpen(false)} title="Registrar Práctica en Nomenclador">
        <form onSubmit={handleCreateTratamiento} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Denominación de la Práctica *
            </label>
            <input
              type="text"
              required
              value={newTrForm.nombre}
              onChange={e => setNewTrForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Endodoncia Unirradicular"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Categoría Clínico-Prestacional
            </label>
            <CustomSelect
              value={newTrForm.categoria}
              onChange={val => setNewTrForm(prev => ({ ...prev, categoria: String(val) }))}
              options={[
                { value: 'General', label: 'General / Cons. Básica' },
                { value: 'Ortodoncia', label: 'Ortodoncia y Correctores' },
                { value: 'Implantes', label: 'Cirugía e Implantes' },
                { value: 'Prevención', label: 'Prevención y Flúor' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Valor Base Pesos ARS *
              </label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={newTrForm.precio_ars}
                onChange={e => setNewTrForm(prev => ({ ...prev, precio_ars: e.target.value }))}
                placeholder="0.00"
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Valor Base Dólares USD *
              </label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={newTrForm.precio_usd}
                onChange={e => setNewTrForm(prev => ({ ...prev, precio_usd: e.target.value }))}
                placeholder="0.00"
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTratamientoOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Crear Prestación
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 1B: EDIT TRATAMIENTO --- */}
      <Modal isOpen={isEditTratamientoOpen} onClose={() => setIsEditTratamientoOpen(false)} title="Modificar Práctica del Nomenclador">
        <form onSubmit={handleEditTratamiento} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Denominación de la Práctica *
            </label>
            <input
              type="text"
              required
              value={editTrForm.nombre}
              onChange={e => setEditTrForm(prev => ({ ...prev, nombre: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Categoría Clínico-Prestacional
            </label>
            <CustomSelect
              value={editTrForm.categoria}
              onChange={val => setEditTrForm(prev => ({ ...prev, categoria: String(val) }))}
              options={[
                { value: 'General', label: 'General / Cons. Básica' },
                { value: 'Ortodoncia', label: 'Ortodoncia y Correctores' },
                { value: 'Implantes', label: 'Cirugía e Implantes' },
                { value: 'Prevención', label: 'Prevención y Flúor' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Valor Base Pesos ARS *
              </label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={editTrForm.precio_ars}
                onChange={e => setEditTrForm(prev => ({ ...prev, precio_ars: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Valor Base Dólares USD *
              </label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={editTrForm.precio_usd}
                onChange={e => setEditTrForm(prev => ({ ...prev, precio_usd: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditTratamientoOpen(false);
                setSelectedTratamiento(null);
              }}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: CREATE PREPAGA --- */}
      <Modal isOpen={isPrepagaOpen} onClose={() => setIsPrepagaOpen(false)} title="Registrar Convenio Prepaga / Obra Social">
        <form onSubmit={handleCreatePrepaga} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Denominación del Seguro Médico / Prepaga *
            </label>
            <input
              type="text"
              required
              value={newPrepagaName}
              onChange={e => setNewPrepagaName(e.target.value)}
              placeholder="Ej: OSDE, Swiss Medical, Galeno"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPrepagaOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Guardar Convenio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
