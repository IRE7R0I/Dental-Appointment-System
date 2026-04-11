const modal = document.getElementById('modalTurno');
const busquedaInput = document.getElementById('busquedaPaciente');
const resultados = document.getElementById('resultadosBusqueda');

// 1. Abrir y cerrar modal
function abrirModal() { modal.classList.remove('hidden'); }
function cerrarModal() { modal.classList.add('hidden'); }

// 2. Programar el botón del Header
document.getElementById('btnAsignarTurno').onclick = abrirModal;

// 3. Búsqueda de pacientes en tiempo real
busquedaInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim(); // .trim() para evitar espacios vacíos

    if (query.length < 2) {
        resultados.classList.add('hidden');
        resultados.innerHTML = ''; // Limpiamos todo
        return;
    }

    // Mientras busca, podemos dejar el cartel de "buscando..." o simplemente esperar
    const response = await fetch('/pacientes/');
    const pacientes = await response.json();

    // Filtramos
    const filtrados = pacientes.filter(p => 
        p.dni.includes(query) || 
        p.nombre.toLowerCase().includes(query.toLowerCase()) ||
        p.apellido.toLowerCase().includes(query.toLowerCase())
    );

    // Vaciamos los resultados anteriores antes de decidir qué mostrar
    resultados.innerHTML = '';

    if (filtrados.length > 0) {
        resultados.innerHTML = filtrados.map(p => `
            <div class="px-4 py-3 hover:bg-[#e6f2fd] cursor-pointer border-b border-slate-50" 
                 onclick="seleccionarPaciente('${p.dni}', '${p.nombre} ${p.apellido}')">
                <p class="font-bold text-slate-800 text-sm">${p.nombre} ${p.apellido}</p>
                <p class="text-xs text-slate-500">DNI: ${p.dni}</p>
            </div>
        `).join('');
    } else {
        // Solo si realmente no hay nadie, mostramos el botón de registro
        resultados.innerHTML = `
            <div class="px-4 py-3">
                <p class="text-sm text-slate-500 mb-2">No se encontró el paciente</p>
                <button type="button" onclick="abrirRegistroRapido('${query}')" 
                        class="text-sm font-bold text-[#0061a4] hover:underline">
                    + Registrar como nuevo paciente
                </button>
            </div>
        `;
    }
    
    resultados.classList.remove('hidden');
});

function seleccionarPaciente(dni, nombreCompleto) {
    busquedaInput.value = nombreCompleto;
    document.getElementById('dniSeleccionado').value = dni;
    resultados.classList.add('hidden');
}

// 4. Guardar el turno
document.getElementById('formTurno').onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
        fecha_hora: document.getElementById('fechaHora').value,
        motivo: document.getElementById('motivo').value,
        dni_paciente: document.getElementById('dniSeleccionado').value,
        id_doctor: parseInt(document.getElementById('idDoctor').value)
    };

    const response = await fetch('/turnos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        alert("¡Turno asignado con éxito!");
        location.reload(); // Recargamos para ver el nuevo turno en la tabla
    } else {
        const error = await response.json();
        alert("Error: " + error.detail);
    }
};

async function abrirRegistroRapido(valorIngresado) {
    const nombre = prompt("Ingrese el Nombre del nuevo paciente:");
    const apellido = prompt("Ingrese el Apellido:");
    
    if (!nombre || !apellido) return;

    const nuevoPaciente = {
        dni: valorIngresado, // Usamos lo que ya escribió en el buscador
        nombre: nombre,
        apellido: apellido,
        // Los demás campos pueden ser nulos por ahora
    };

    const response = await fetch('/pacientes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoPaciente)
    });

    if (response.ok) {
        const p = await response.json();
        alert("Paciente registrado con éxito");
        seleccionarPaciente(p.dni, `${p.nombre} ${p.apellido}`);
    } else {
        alert("Error al registrar paciente. Quizás el DNI ya existe.");
    }
}