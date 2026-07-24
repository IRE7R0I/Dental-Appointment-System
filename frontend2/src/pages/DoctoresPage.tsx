import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { SelectorColorHex } from '../components/SelectorColorHex';
import { Doctor } from '../types';
import { PlusCircle, Trash2, ShieldAlert, CheckCircle, XCircle, Calendar, Settings } from 'lucide-react';
import { IconTooth } from '../components/IconTooth';
import { DoctorHorariosConfig } from '../components/DoctorHorariosConfig';

export function DoctoresPage() {
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('secretaria');

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
  const [isHorariosOpen, setIsHorariosOpen] = useState(false);
  const [selectedDocForHorarios, setSelectedDocForHorarios] = useState<Doctor | null>(null);

  // Forms state
  const [newForm, setNewForm] = useState({
    nombre: '',
    color_agenda: '#1D9E75'
  });
  const [editForm, setEditForm] = useState({
    nombre: '',
    color_agenda: '#1D9E75'
  });

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const docsData = await apiFetch('/api/doctores');
      setDoctores(docsData);
    } catch (e: any) {
      showToast('Error cargando odontólogos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUserRole(localStorage.getItem('user_role') || 'secretaria');
    loadData();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.nombre.trim()) {
      showToast('El nombre es requerido.', 'warning');
      return;
    }
    try {
      await apiFetch('/api/doctores', {
        method: 'POST',
        body: JSON.stringify(newForm)
      });
      showToast('Odontólogo registrado con éxito.', 'success');
      setIsNewOpen(false);
      setNewForm({ nombre: '', color_agenda: '#1D9E75' });
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEditDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await apiFetch(`/api/doctores/${selectedDoc.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      showToast('¡Ficha médica de odontólogo guardada!', 'success');
      setIsEditOpen(false);
      setSelectedDoc(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openEditModal = (doc: Doctor) => {
    setSelectedDoc(doc);
    setEditForm({
      nombre: doc.nombre,
      color_agenda: doc.color_agenda || '#1D9E75'
    });
    setIsEditOpen(true);
  };

  const toggleDoctorActive = async (id: number, currentActive: boolean) => {
    if (window.confirm(`¿Está seguro que desea ${currentActive ? 'dar de baja' : 'dar de alta'} a este profesional de la grilla activa?`)) {
      try {
        await apiFetch(`/api/doctores/${id}/activo`, {
          method: 'PATCH',
          body: JSON.stringify({ activo: !currentActive })
        });
        showToast('Estado del profesional actualizado.', 'success');
        loadData();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-warm-900 tracking-tight">
            Lista de Profesionales
          </h2>
          <p className="text-xs text-neutral-warm-600 mt-1">
            Registro de doctores y configuración cromática de grillas de agenda
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsNewOpen(true)}
            className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <PlusCircle size={16} strokeWidth={2.5} />
            <span>Registrar Odontólogo</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight">
          Listado de Profesionales
        </h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-warm-600">Cargando profesionales...</div>
        ) : doctores.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
            No hay profesionales registrados aún.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctores.map(doc => (
              <div 
                key={doc.id} 
                className={`border border-neutral-warm-100/60 rounded-2xl p-4.5 space-y-4 relative overflow-hidden transition-all hover:shadow-md ${
                  !doc.activo ? 'bg-neutral-warm-50/50 opacity-75' : 'bg-white'
                }`}
              >
                {/* Colored top bar reflecting doctor agenda color */}
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: doc.color_agenda }} />
                
                {/* Header card info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-neutral-warm-900 flex items-center gap-1.5">
                      <IconTooth size={14} style={{ color: doc.color_agenda }} />
                      <span>{doc.nombre}</span>
                    </h4>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                    doc.activo ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]' : 'bg-[#FCEBEB] text-[#A32D2D] border-[#FCEBEB]'
                  }`}>
                    {doc.activo ? 'Activo' : 'De Baja'}
                  </span>
                </div>

                {/* Body contact details */}
                <div className="space-y-1.5 text-xs text-neutral-warm-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: doc.color_agenda }} />
                    <span>Identificador Agenda: <strong className="font-semibold" style={{ color: doc.color_agenda }}>{doc.color_agenda}</strong></span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-neutral-warm-50 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedDocForHorarios(doc);
                      setIsHorariosOpen(true);
                    }}
                    className="px-2 py-1 rounded border border-neutral-warm-100 hover:bg-neutral-warm-50 text-[10px] font-medium text-neutral-warm-900 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Settings size={11} className="text-neutral-warm-600 animate-spin-hover" />
                    <span>Horarios</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditModal(doc)}
                        className="px-2 py-1 rounded border border-neutral-warm-100 hover:bg-neutral-warm-50 text-[10px] font-medium text-neutral-warm-900 transition-colors cursor-pointer"
                      >
                        Editar Ficha
                      </button>
                      
                      <button
                        onClick={() => toggleDoctorActive(doc.id, doc.activo)}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          doc.activo 
                            ? 'text-[#A32D2D] bg-[#FCEBEB] hover:bg-red-100' 
                            : 'text-[#3B6D11] bg-[#EAF3DE] hover:bg-green-100'
                        }`}
                      >
                        {doc.activo ? 'Dar de Baja' : 'Reincorporar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL 1: REGISTER DOCTOR --- */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Registrar Profesional de Odontología">
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={newForm.nombre}
              onChange={e => setNewForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Dr. Alejandro Maidana"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          {/* Hex agenda color picker */}
          <div className="space-y-1.5">
            <SelectorColorHex
              value={newForm.color_agenda}
              onChange={color => setNewForm(prev => ({ ...prev, color_agenda: color }))}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Registrar Profesional
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: EDIT DOCTOR --- */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modificar Ficha de Odontólogo">
        <form onSubmit={handleEditDoctor} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={editForm?.nombre || ''}
              onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          {/* Hex agenda color picker */}
          <div className="space-y-1.5">
            <SelectorColorHex
              value={editForm?.color_agenda || '#1D9E75'}
              onChange={color => setEditForm(prev => ({ ...prev, color_agenda: color }))}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedDoc(null);
              }}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Guardar Modificaciones
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: GESTIÓN DE HORARIOS --- */}
      {selectedDocForHorarios && (
        <Modal 
          isOpen={isHorariosOpen} 
          onClose={() => {
            setIsHorariosOpen(false);
            setSelectedDocForHorarios(null);
          }} 
          title={`Gestión de Horarios - Dr(a). ${selectedDocForHorarios.nombre}`}
          size="xl"
        >
          <DoctorHorariosConfig 
            doc={selectedDocForHorarios} 
            onClose={() => {
              setIsHorariosOpen(false);
              setSelectedDocForHorarios(null);
            }} 
          />
        </Modal>
      )}
    </div>
  );
}
