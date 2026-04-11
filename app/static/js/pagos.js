// --- 1. Lógica de Chips (Filtros Visuales) ---
function activarFiltro(botonClickeado) {
    const botones = document.getElementById('filter-chips').getElementsByTagName('button');
    for (let btn of botones) {
        btn.className = "chip-inactive px-4 py-2 rounded-full border transition-colors whitespace-nowrap";
    }
    botonClickeado.className = "chip-active px-4 py-2 rounded-full border transition-colors whitespace-nowrap";
}

// --- 2. Lógica del Side Sheet MULTIMONEDA ---
const modal = document.getElementById('modalCobro');
const sideSheet = document.getElementById('sideSheet');
const nombreText = document.getElementById('nombrePacienteCobro');
const deudaText = document.getElementById('montoDeudaCobro');
const monedaSelect = document.getElementById('monedaSelect');
const simboloInput = document.getElementById('simboloMonedaInput');
const deudaLabel = document.getElementById('deudaLabel');

// Event listener para cuando cambian la moneda en el selector manualmente
monedaSelect.addEventListener('change', function () {
    simboloInput.innerText = this.value === 'USD' ? 'U$D' : '$';
});

// Modificada para recibir 'moneda' ('ARS' o 'USD')
function abrirModalCobro(nombre, deuda, moneda) {
    nombreText.innerText = nombre;

    // Setear el selector y el input visual a la moneda correspondiente a la deuda
    monedaSelect.value = moneda;

    if (moneda === 'USD') {
        deudaText.innerText = "U$D " + deuda.toLocaleString('es-AR');
        simboloInput.innerText = 'U$D';
        deudaLabel.innerText = "Deuda Pendiente (Dólares)";
    } else {
        deudaText.innerText = "$ " + deuda.toLocaleString('es-AR');
        simboloInput.innerText = '$';
        deudaLabel.innerText = "Deuda Pendiente (Pesos)";
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        sideSheet.classList.remove('translate-x-full');
        sideSheet.classList.add('translate-x-0');
    }, 10);
}

function cerrarModalCobro() {
    sideSheet.classList.remove('translate-x-0');
    sideSheet.classList.add('translate-x-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function procesarCobro() {
    alert("✅ ¡Abono registrado con éxito!\n\nAcá Python se encarga de guardar si te pagaron en ARS, en cara chica, cara grande o USDT.");
    cerrarModalCobro();
}