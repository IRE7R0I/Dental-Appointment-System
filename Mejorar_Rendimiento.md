# Explicación Técnica de la Optimización de Rendimiento en el Perfil del Paciente

Este documento detalla las causas raíz del retraso (lag) y los bloqueos visuales que ocurrían al navegar y realizar acciones contables (como registrar pagos y abrir el historial de cuentas) en la sección de **Perfil del Paciente** (`PerfilPacientePage.tsx`), así como las soluciones técnicas implementadas para lograr una experiencia instantánea.

---

## 1. Causas Raíz del Rendimiento Lento (Lag)

El micro-lag y las congelaciones de pantalla se debían a cuatro factores principales que afectaban al renderizado y ciclo de vida de React:

### A. Operaciones de Filtrado y Agrupamiento Redundantes (Falta de Memoización)
Cada vez que el usuario interactuaba con un input, escribía una nota clínica o cambiaba un estado simple en la pantalla del perfil, React disparaba un renderizado completo del componente. Al no existir caché (memoización), el componente recalculaba de manera síncrona en cada renderizado:
- La lista completa de pacientes filtrada y ordenada (`pacientesFiltrados`).
- La agrupación compleja de todos los turnos, tratamientos y cobros para construir el historial (`movimientosAgrupados`).
- El cálculo de totales acumulados de caja en pesos y dólares (`totalCajaCobradoARS` / `USD`).
Esto provocaba que la CPU ejecutara bucles repetitivos innecesarios constantemente, ralentizando la velocidad de respuesta táctil y de escritura.

### B. Carga Síncrona Bloqueante (Lógica de API "Todo o Nada")
Antes de la optimización, al hacer clic sobre un paciente para entrar en su perfil, el estado `loadingPerfil` se ponía en `true` y bloqueaba la pantalla completa con un indicador de carga general. 
- La aplicación se quedaba congelada esperando a que **las tres promesas** de la API (`getCuentaCorriente`, `getHistorialPaciente`, `getPagos`) se resolvieran simultáneamente.
- Si el servidor tardaba 1.5 segundos en responder, el usuario veía una pantalla de carga vacía durante 1.5 segundos antes de poder ver cualquier información, lo que transmitía sensación de lentitud y falta de fluidez.

### C. Conflicto de Animaciones concurrentes (Framer Motion vs. CSS Transitions)
El contenedor de la vista del perfil de paciente tenía asignada una animación de entrada vía clases CSS tradicionales (`animate-fade-slide-up`) en conjunto con transiciones de Framer Motion controladas por React. 
- Esto provocaba un comportamiento conocido como *Layout Thrashing*, donde el navegador calculaba estilos por CSS al mismo tiempo que la librería de JavaScript recalculaba las posiciones en el DOM, resultando en saltos visuales y stuttering (tirones).

### D. Bloqueo de Desmontaje por AnimatePresence
Al pasar de una subvista a otra (por ejemplo, del Perfil a la pantalla de Cuentas o Métodos de Pago), `AnimatePresence` mantenía la subvista vieja montada en el DOM esperando a que terminara su animación de salida (`exit`). Como resultado:
- El renderizado de la nueva subvista se retrasaba de forma artificial.
- La interfaz permanecía estática o en blanco por unas décimas de segundo antes de cambiar de sección.

---

## 2. Soluciones Implementadas

Para lograr transiciones instantáneas a **0ms** y un comportamiento fluido al registrar pagos, aplicamos las siguientes soluciones:

### A. Memoización Selectiva con `useMemo`
Envolvimos los cálculos complejos dentro del hook `useMemo` de React. Ahora, las listas y acumuladores solo se recalculan si sus datos de origen cambian de verdad:
- **`pacientesFiltrados`** solo se recalcula si cambia la lista original `pacientes`, el término de `busqueda`, el `filtroOS` o el criterio de `orden`.
- **`movimientosAgrupados`** solo procesa la ordenación de turnos y cobros cuando se actualiza la cuenta corriente (`cuentaSel`) o la lista de pagos (`pagosSel`).
- Las sumas acumulativas de caja se mantienen estables durante la interacción del usuario.

### B. Carga Progresiva Asíncrona (Skeleton / Local Loading)
Cambiamos la estrategia de carga para dar respuesta visual inmediata al usuario:
1. **Renderizado Instantáneo (0ms)**: Al hacer clic en un paciente, la subvista del perfil se abre inmediatamente. La cabecera del paciente (Nombre, Apellido, DNI) y el panel izquierdo con los datos de contacto y notas clínicas guardadas localmente se muestran al instante sin tiempos de espera.
2. **Cargadores Locales por Tarjeta**: Solo los componentes que requieren datos del servidor ("Balances de cuenta corriente" y el "Historial Clínico/Timeline") muestran un spinner de carga pequeño en su propio contenedor mientras la API resuelve las promesas en segundo plano.

### C. Limpieza y Unificación de Animaciones
- Eliminamos la animación de CSS `animate-fade-slide-up` del contenedor del perfil para dejar que Framer Motion maneje de forma exclusiva y limpia la transición por hardware.
- Eliminamos el prop `exit` en los contenedores de las subvistas contables e internas para que el desmontaje sea instantáneo.
- Configuramos `AnimatePresence` en modo `mode="popLayout"` para que los elementos entrantes se posicionen correctamente sin empujar la pantalla ni causar saltos de scroll molestos.

---

## 3. Beneficios Obtenidos

- **Cero Lag al Escribir y Registrar**: Registrar un cobro rápido o escribir notas clínicas ya no genera renders que congelen el teclado o la interfaz.
- **Acceso Inmediato al Perfil**: El cambio de vista al hacer clic en un paciente es instantáneo.
- **Consistencia de Estilos**: Al integrar el componente unificado `<Badge>` para el estado financiero (DEUDOR/AL DÍA) y obra social (Particular en azul, otras en gris), no solo mejoramos el rendimiento sino que la aplicación adquirió una estética profesional de alta gama.
