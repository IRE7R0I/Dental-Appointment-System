// Scroll automático a la línea roja
window.onload = function () {
  const grid = document.getElementById("calendarGrid");
  grid.scrollTop = 500; // Carga cerca del horario actual
};

// --- LÓGICA DE FILTROS POR PROFESIONAL ---
function filtrarDoctor(doctorSeleccionado) {
  const colDario = document.getElementById("col-dario");
  const colFabiana = document.getElementById("col-fabiana");
  const headDario = document.getElementById("head-dario");
  const headFabiana = document.getElementById("head-fabiana");

  const btnDario = document.getElementById("btn-dario");
  const btnFabiana = document.getElementById("btn-fabiana");
  const btnAmbos = document.getElementById("btn-ambos");

  // 1. Resetear el diseño visual de todos los botones
  [btnDario, btnFabiana, btnAmbos].forEach((btn) => {
    btn.className =
      "px-4 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-transparent";
  });

  // 2. Aplicar lógica según el filtro
  if (doctorSeleccionado === "Dario") {
    colDario.style.display = "block";
    headDario.style.display = "flex";
    colFabiana.style.display = "none";
    headFabiana.style.display = "none";
    btnDario.className =
      "px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-[#0061a4] shadow-sm transition-all";
  } else if (doctorSeleccionado === "Fabiana") {
    colDario.style.display = "none";
    headDario.style.display = "none";
    colFabiana.style.display = "block";
    headFabiana.style.display = "flex";
    btnFabiana.className =
      "px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-[#0061a4] shadow-sm transition-all";
  } else {
    // Ambos
    colDario.style.display = "block";
    headDario.style.display = "flex";
    colFabiana.style.display = "block";
    headFabiana.style.display = "flex";
    btnAmbos.className =
      "px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-[#0061a4] shadow-sm transition-all";
  }
}

// --- LÓGICA DEL SELECTOR DE VISTA (Día/Semana/Mes) ---
function cambiarVista(vista) {
  const btnDia = document.getElementById("btn-dia");
  const btnSemana = document.getElementById("btn-semana");
  const btnMes = document.getElementById("btn-mes");

  // Resetear estilos
  [btnDia, btnSemana, btnMes].forEach((btn) => {
    btn.className =
      "px-4 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-transparent text-slate-800";
  });

  // Activar el clickeado
  if (vista === "Dia") {
    btnDia.className =
      "px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-slate-800 shadow-sm transition-all";
  } else if (vista === "Semana") {
    btnSemana.className =
      "px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-slate-800 shadow-sm transition-all";
    alert(
      '¡Atención! 🛠️ Acá en Python vamos a programar que la grilla cambie de "Columnas por Doctores" a "Columnas Lunes a Viernes".',
    );
  } else if (vista === "Mes") {
    btnMes.className =
      "px-4 py-1.5 rounded-lg text-sm font-bold bg-white text-slate-800 shadow-sm transition-all";
    alert(
      "¡Atención! 🛠️ En la vista Mensual, el diseño pasará a ser una grilla de 30 cuadrados como un calendario clásico.",
    );
  }
}

// --- LÓGICA DEL MODAL ---
function abrirModalTurno(hora, doctor) {
  document.getElementById("modalHoraText").innerText = hora;
  document.getElementById("modalDocText").innerText = "Dr(a). " + doctor;
  const modal = document.getElementById("demoModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function cerrarModal() {
  const modal = document.getElementById("demoModal");
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}
