// Configuración admin-script.js
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
    heroes: `${API_BASE_URL}/api/heroes`,
    stats: `${API_BASE_URL}/api/stats`,
    export: `${API_BASE_URL}/api/export`
};

let appState = { isLoading: false, nextId: 1, totalHeroes: 0, recentHeroes: [] };

const elements = {
    form: document.getElementById('heroForm'),
    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn'),
    heroPreview: document.getElementById('heroPreview'),
    nextIdElement: document.getElementById('nextId'),
    totalHeroesElement: document.getElementById('totalHeroes'),
    apiStatusText: document.getElementById('apiStatusText'),
    recentList: document.getElementById('recentList'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText'),
    closeNotification: document.querySelector('.close-notification')
};

async function init() {
    try {
        await checkAPIStatus();
        await loadStats();
        setupEventListeners();
        setupFormListeners();
        showNotification('Panel de administración listo ✅', 'success');
    } catch (error) {
        showNotification('Error al conectar con el servidor ❌', 'error');
    }
}

async function checkAPIStatus() {
    try {
        const response = await fetch('/');
        if (response.ok) updateApiStatus('Conectado', 'success');
        else updateApiStatus('Error de conexión', 'error');
    } catch (error) { updateApiStatus('Servidor no disponible', 'error'); throw error; }
}

function updateApiStatus(text, type) {
    if (!elements.apiStatusText) return;
    elements.apiStatusText.textContent = text;
    elements.apiStatusText.className = 'info-value';
    if (type === 'success') elements.apiStatusText.classList.add('status-ready');
    else if (type === 'error') elements.apiStatusText.classList.add('status-error');
}

async function loadStats() {
    try {
        const response = await fetch(API_ENDPOINTS.stats);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        appState.nextId = data.nextId;
        appState.totalHeroes = data.totalHeroes;
        appState.recentHeroes = data.recentHeroes || [];
        updateUI();
        updateApiStatus('Conectado', 'success');
    } catch (error) {
        updateApiStatus('Error al cargar datos', 'error');
    }
}

function updateUI() {
    if (elements.nextIdElement) elements.nextIdElement.textContent = appState.nextId;
    if (elements.totalHeroesElement) elements.totalHeroesElement.textContent = appState.totalHeroes;
    updateRecentHeroesList();
}

function updateRecentHeroesList() {
    if (!elements.recentList || !appState.recentHeroes) return;
    if (appState.recentHeroes.length === 0) {
        elements.recentList.innerHTML = `<p style="color: #666; text-align: center; padding: 20px;">No hay héroes recientes</p>`;
        return;
    }
    elements.recentList.innerHTML = appState.recentHeroes.map(hero => `
        <div class="hero-item">
            <img src="${hero.icon || 'https://via.placeholder.com/40x40?text=Hero'}" alt="${hero.nombre}" onerror="this.src='https://via.placeholder.com/40x40?text=Error'">
            <div class="hero-info">
                <div class="hero-name">${hero.nombre}</div>
                <div class="hero-role">
                    ${Array.isArray(hero.rol) ? hero.rol.join(', ') : hero.rol} 
                    <span class="hero-id">ID: ${hero.id}</span>
                </div>
            </div>
            <button class="btn-delete" onclick="deleteHero(${hero.id}, '${hero.nombre}')" title="Eliminar héroe">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

async function deleteHero(id, nombre) {
    if (!confirm(`¿Eliminar a "${nombre}" (ID: ${id})?`)) return;
    try {
        const response = await fetch(`${API_ENDPOINTS.heroes}/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Error HTTP ${response.status}`);
        showNotification(result.message || `✅ Héroe eliminado`, 'success');
        await loadStats();
    } catch (error) {
        showNotification(`❌ Error al eliminar: ${error.message}`, 'error');
    }
}

function setupEventListeners() {
    if (elements.resetBtn) elements.resetBtn.addEventListener('click', resetForm);
    if (elements.closeNotification) {
        elements.closeNotification.addEventListener('click', () => {
            elements.notification.classList.remove('show');
        });
    }
}

function setupFormListeners() {
    if (!elements.form) return;
    elements.form.addEventListener('submit', handleFormSubmit);
    const roleInput = document.getElementById('heroRole');
    if (roleInput) roleInput.addEventListener('blur', autoCompleteIcons);
}

function autoCompleteIcons() {
    const roleInput = document.getElementById('heroRole');
    const iconInput = document.getElementById('iconImage');
    if (!roleInput || !iconInput || iconInput.value.trim()) return;
    const roleIcons = {
        'tirador': 'https://akmweb.youngjoygame.com/web/gms/image/025c69a764924f4bac526a2662f1a0b9.png',
        'combatiente': 'https://akmweb.youngjoygame.com/web/gms/image/629e282165d4b63deceaf350426ea440.png',
        'asesino': 'https://akmweb.youngjoygame.com/web/gms/image/d0b8b65a47fc43dc7bb2bac447072fd2.png',
        'mago': 'https://akmweb.youngjoygame.com/web/gms/image/1c6985dd0caec2028ccb6d1b8ca95e0f.png',
        'tanque': 'https://akmweb.youngjoygame.com/web/gms/image/60638c59536d9505c9c731af13f7fdfd.png'
    };
    const roles = roleInput.value.trim().toLowerCase();
    if (!roles) return;
    const iconUrls = roles.split(',').map(r => r.trim()).filter(r => roleIcons[r]).map(r => roleIcons[r]);
    if (iconUrls.length > 0) iconInput.value = iconUrls.join(', ');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const heroData = getFormData();
    if (!validateFormData(heroData)) return;
    try {
        setLoading(true);
        const response = await fetch(API_ENDPOINTS.heroes, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(heroData)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        const result = await response.json();
        showNotification(result.message || '✅ Héroe agregado', 'success');
        await loadStats();
        resetForm();
    } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

function getFormData() {
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };
    const roleValue = getValue('heroRole');
    const roles = roleValue.includes(',') ? roleValue.split(',').map(r => r.trim()).filter(r => r) : roleValue;
    const iconValue = getValue('iconImage');
    const icons = iconValue.includes(',') ? iconValue.split(',').map(i => i.trim()).filter(i => i) : iconValue;
    const counters = [];
    for (let i = 1; i <= 6; i++) {
        const counterUrl = getValue(`counter${i}`);
        if (counterUrl) counters.push(counterUrl);
    }
    return {
        heroId: parseInt(getValue('heroId')) || null, // ✅ ID oficial
        nombre: getValue('heroName'),
        rol: roles,
        winRate: getValue('winRate'),
        imagen: getValue('heroImage'),
        icon: icons,
        guia: getValue('guideImage'),
        counters: counters.length > 0 ? counters : null,
        skills: [
            { nombre: getValue('skill1Name'), descripcion: getValue('skill1Desc'), imagen: getValue('skill1Image') },
            { nombre: getValue('skill2Name'), descripcion: getValue('skill2Desc'), imagen: getValue('skill2Image') },
            { nombre: getValue('skill3Name'), descripcion: getValue('skill3Desc'), imagen: getValue('skill3Image') },
            { nombre: getValue('skill4Name'), descripcion: getValue('skill4Desc'), imagen: getValue('skill4Image') }
        ]
    };
}

function validateFormData(data) {
    const requiredFields = [
        { value: data.nombre, name: 'Nombre', id: 'heroName' },
        { value: data.rol, name: 'Rol', id: 'heroRole' },
        { value: data.winRate, name: 'Win Rate', id: 'winRate' },
        { value: data.imagen, name: 'Imagen', id: 'heroImage' },
        { value: data.icon, name: 'Icono', id: 'iconImage' }
    ];
    const missingFields = [];
    requiredFields.forEach(field => {
        let isEmpty = Array.isArray(field.value) ? field.value.length === 0 : !field.value;
        if (isEmpty) missingFields.push(field.name);
    });
    if (missingFields.length > 0) {
        showNotification(`Faltan campos: ${missingFields.join(', ')}`, 'error');
        return false;
    }
    if (!/^\d+\.?\d*%$/.test(data.winRate)) {
        showNotification('Win Rate debe tener formato como: 49.5%', 'error');
        return false;
    }
    return true;
}

function resetForm() {
    if (elements.form) {
        elements.form.reset();
        for (let i = 1; i <= 6; i++) {
            const counterInput = document.getElementById(`counter${i}`);
            if (counterInput) counterInput.value = '';
        }
        showNotification('Formulario limpiado 🔄', 'info');
    }
}

function showNotification(message, type = 'info') {
    if (!elements.notification || !elements.notificationText) return;
    elements.notificationText.textContent = message;
    const colors = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#17a2b8' };
    elements.notification.style.background = colors[type] || colors.info;
    elements.notification.classList.add('show');
    setTimeout(() => elements.notification.classList.remove('show'), 4000);
}

function setLoading(isLoading) {
    appState.isLoading = isLoading;
    document.querySelectorAll('button').forEach(btn => btn.disabled = isLoading);
    document.querySelectorAll('input, textarea, select').forEach(input => input.disabled = isLoading);
    if (elements.saveBtn) {
        elements.saveBtn.innerHTML = isLoading 
            ? '<div class="spinner"></div> Guardando...' 
            : '<i class="fas fa-save"></i> Guardar Héroe';
    }
}

document.addEventListener('DOMContentLoaded', init);

// ✅ Cargar héroe por ID
document.addEventListener('DOMContentLoaded', () => {
    const loadBtn = document.getElementById('loadHeroBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            const heroId = document.getElementById('loadHeroId').value;
            if (!heroId) { showNotification('Ingresa un ID válido', 'error'); return; }
            try {
                loadBtn.disabled = true;
                loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
                const response = await fetch(`/api/scrape-hero/${heroId}`);
                const result = await response.json();
                if (result.success && result.data) {
                    // Rellenar campos
                    document.getElementById('heroId').value = result.data.heroId || ''; // ✅ ID oficial
                    document.getElementById('heroName').value = result.data.name || '';
                    document.getElementById('heroRole').value = result.data.role || '';
                    document.getElementById('winRate').value = result.data.stats?.winRate || '';
                    document.getElementById('heroImage').value = result.data.poster || '';
                    document.getElementById('iconImage').value = result.data.roleIcon || '';

                    // Habilidades
                    if (result.data.skills) {
                        result.data.skills.forEach((skill, index) => {
                            const i = index + 1;
                            const nameInput = document.getElementById(`skill${i}Name`);
                            const descInput = document.getElementById(`skill${i}Desc`);
                            const imgInput = document.getElementById(`skill${i}Image`);
                            if (nameInput) nameInput.value = skill.type || skill.nombre || '';
                            if (descInput) descInput.value = skill.description || skill.descripcion || '';
                            if (imgInput) imgInput.value = skill.imagen || '';
                        });
                    }

                    // Counters
                    if (result.data.counters) {
                        result.data.counters.forEach((counterUrl, index) => {
                            const i = index + 1;
                            if (i <= 6) {
                                const counterInput = document.getElementById(`counter${i}`);
                                if (counterInput) counterInput.value = counterUrl;
                            }
                        });
                    }

                    showNotification(`Datos de ${result.data.name} cargados`, 'success');
                } else {
                    showNotification('No se encontraron datos', 'error');
                }
            } catch (error) {
                showNotification('Error al cargar', 'error');
            } finally {
                loadBtn.disabled = false;
                loadBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Cargar';
            }
        });
    }
});
