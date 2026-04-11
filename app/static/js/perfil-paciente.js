// perfil-paciente.js
const viewList = document.getElementById('view-list');
const viewProfile = document.getElementById('view-profile');
const viewEdit = document.getElementById('view-edit');

function hideAll() {
    viewList.classList.add('hidden-view');
    viewProfile.classList.add('hidden-view');
    viewEdit.classList.add('hidden-view');
}

function showList() {
    hideAll();
    viewList.classList.remove('hidden-view');
    viewList.style.animation = 'none';
    viewList.offsetHeight; /* trigger reflow */
    viewList.style.animation = null; 
}

function showProfile() {
    hideAll();
    viewProfile.classList.remove('hidden-view');
    viewProfile.style.animation = 'none';
    viewProfile.offsetHeight; /* trigger reflow */
    viewProfile.style.animation = null;
}

function showEdit() {
    hideAll();
    viewEdit.classList.remove('hidden-view');
    viewEdit.style.animation = 'none';
    viewEdit.offsetHeight; /* trigger reflow */
    viewEdit.style.animation = null;
}

function saveProfile() {
    // Alerta temporal hasta que conectemos la base de datos
    alert("¡Cambios guardados con éxito en la base de datos de Mendoza! 🍷");
    showProfile();
}