// CONFIGURACIÓN
const API_URL = window.location.origin;
const API_ENDPOINTS = {
    heroes: `${API_URL}/api/heroes`,
    stats: `${API_URL}/api/stats`
};

// ESTADO
let appState = {
    heroes: [],
    nextId: 1,
    totalHeroes: 0,
    currentHero: null,
    isEditing: false
};

// CACHE DE ELEMENTOS
const elements = {
    // Formulario
    form: document.getElementById('heroForm'),
    heroId: document.getElementById('heroId'),
    heroName: document.getElementById('heroName'),
    heroRole: document.getElementById('heroRole'),
    winRate: document.getElementById('winRate'),
    linea: document.getElementById('linea'),
    heroImage: document.getElementById('heroImage'),
    iconImage: document.getElementById('iconImage'),
    guideImage: document.getElementById('guideImage'),
    skillsContainer: document.getElementById('skillsContainer'),
    
    // Botones
    saveBtn: document.getElementById('saveBtn'),
    clearBtn: document.getElementById('clearBtn'),
    autoFillBtn: document.getElementById('autoFillBtn'),
    refreshStatsBtn: document.getElementById('refreshStatsBtn'),
    exportBtn: document.getElementById('exportBtn'),
    backupBtn: document.getElementById('backupBtn'),
    deleteAllBtn: document.getElementById('deleteAllBtn'),
    
    // Visualización
    previewContainer: document.getElementById('previewContainer'),
    heroesList: document.getElementById('heroesList'),
    totalHeroes: document.getElementById('totalHeroes'),
    nextId: document.getElementById('nextId'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText')
};

// ========== FUNCIONES PRINCIPALES ==========

// INICIALIZAR
async function init() {
    console.log('🚀 Iniciando panel admin...');
    
    // Cargar datos iniciales
    await loadStats();
    await loadHeroes();
    
    // Configurar eventos
    setupEventListeners();
    
    // Generar campos de habilidades
    generateSkillsFields();
    
    // Configurar preview en tiempo real
    setupRealTimePreview();
    
    showNotification('✅ Panel listo para usar!', 'success');
}

// CARGAR ESTADÍSTICAS
async function loadStats() {
    try {
        const response = await fetch(API_ENDPOINTS.stats);
        if (!response.ok) throw new Error('Error cargando stats');
        
        const data = await response.json();
        
        appState.totalHeroes = data.totalHeroes;
        appState.nextId = data.nextId;
        
        elements.totalHeroes.textContent = data.totalHeroes;
        elements.nextId.textContent = data.nextId;
        
    } catch (error) {
        console.error('Error stats:', error);
        showNotification('⚠️ Error cargando estadísticas', 'warning');
    }
}

// CARGAR HÉROES
async function loadHeroes() {
    try {
        const response = await fetch(API_ENDPOINTS.heroes);
        if (!response.ok) throw new Error('Error cargando héroes');
        
        appState.heroes = await response.json();
        renderHeroesList();
        
    } catch (error) {
        console.error('Error héroes:', error);
        showNotification('⚠️ Error cargando lista de héroes', 'warning');
    }
}

// RENDERIZAR LISTA DE HÉROES
function renderHeroesList() {
    if (!elements.heroesList) return;
    
    if (appState.heroes.length === 0) {
        elements.heroesList.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #aaa;">
                <i class="fas fa-user-slash" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>No hay héroes registrados</p>
            </div>
        `;
        return;
    }
    
    elements.heroesList.innerHTML = appState.heroes.map(hero => `
        <div class="hero-item" onclick="loadHeroToForm(${hero.id})">
            <img src="${hero.icon || hero.imagen || 'https://via.placeholder.com/50x50'}" 
                 alt="${hero.nombre}"
                 onerror="this.src='https://via.placeholder.com/50x50'">
            <div>
                <div style="font-weight: bold; color: #00ff88;">${hero.nombre}</div>
                <div style="font-size: 0.9rem; color: #aaa;">
                    ${Array.isArray(hero.rol) ? hero.rol.join(', ') : hero.rol}
                    <span style="margin-left: 10px; background: #333; padding: 2px 8px; border-radius: 10px;">
                        ID: ${hero.id}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// CARGAR HÉROE AL FORMULARIO
async function loadHeroToForm(heroId) {
    try {
        const response = await fetch(`${API_ENDPOINTS.heroes}/${heroId}`);
        if (!response.ok) throw new Error('Héroe no encontrado');
        
        const hero = await response.json();
        appState.currentHero = hero;
        appState.isEditing = true;
        
        // Llenar formulario
        fillForm(hero);
        
        showNotification(`📝 Editando: ${hero.nombre}`, 'info');
        
    } catch (error) {
        showNotification('❌ Error cargando héroe', 'error');
    }
}

// LLENAR FORMULARIO
function fillForm(hero) {
    elements.heroId.value = hero.id;
    elements.heroName.value = hero.nombre || '';
    elements.heroRole.value = hero.rol || '';
    elements.winRate.value = hero.winRate || '';
    elements.linea.value = hero.linea || '';
    elements.heroImage.value = hero.imagen || '';
    elements.iconImage.value = hero.icon || '';
    elements.guideImage.value = hero.guia || '';
    
    // Llenar habilidades
    if (hero.skills && hero.skills.length >= 4) {
        for (let i = 0; i < 4; i++) {
            const skill = hero.skills[i];
            document.getElementById(`skill${i+1}Name`).value = skill.nombre || '';
            document.getElementById(`skill${i+1}Desc`).value = skill.descripcion || '';
            document.getElementById(`skill${i+1}Image`).value = skill.imagen || '';
        }
    }
    
    // Actualizar botón
    elements.saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> ACTUALIZAR HÉROE';
    updatePreview();
}

// GENERAR CAMPOS DE HABILIDADES
function generateSkillsFields() {
    if (!elements.skillsContainer) return;
    
    const skills = [
        { number: 1, label: 'HABILIDAD 1' },
        { number: 2, label: 'HABILIDAD 2' },
        { number: 3, label: 'HABILIDAD 3' },
        { number: 4, label: 'ULTIMATE' }
    ];
    
    elements.skillsContainer.innerHTML = skills.map(skill => `
        <div class="skill-card">
            <h4>${skill.label}</h4>
            <div class="form-group">
                <label>Nombre *</label>
                <input type="text" id="skill${skill.number}Name" required 
                       placeholder="Ej: Buff, AOE, CC">
            </div>
            <div class="form-group">
                <label>Descripción *</label>
                <textarea id="skill${skill.number}Desc" required rows="3" 
                          placeholder="Descripción de la habilidad..."></textarea>
            </div>
            <div class="form-group">
                <label>Imagen *</label>
                <input type="url" id="skill${skill.number}Image" required 
                       placeholder="https://akmweb.../skill.png">
            </div>
        </div>
    `).join('');
}

// CONFIGURAR EVENTOS
function setupEventListeners() {
    // Formulario
    if (elements.form) {
        elements.form.addEventListener('submit', handleSubmit);
    }
    
    // Botones
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', clearForm);
    }
    
    if (elements.autoFillBtn) {
        elements.autoFillBtn.addEventListener('click', autoFillForm);
    }
    
    if (elements.refreshStatsBtn) {
        elements.refreshStatsBtn.addEventListener('click', loadStats);
    }
    
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportData);
    }
    
    if (elements.backupBtn) {
        elements.backupBtn.addEventListener('click', createBackup);
    }
    
    if (elements.deleteAllBtn) {
        elements.deleteAllBtn.addEventListener('click', confirmDeleteAll);
    }
}

// MANEJAR ENVÍO DEL FORMULARIO
async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        const heroData = getFormData();
        
        if (!validateForm(heroData)) {
            return;
        }
        
        // Determinar si es crear o actualizar
        const isUpdate = appState.isEditing && appState.currentHero;
        
        const url = isUpdate 
            ? `${API_ENDPOINTS.heroes}/${appState.currentHero.id}`
            : API_ENDPOINTS.heroes;
        
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(heroData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`✅ ${result.message}`, 'success');
            
            // Recargar datos
            await loadStats();
            await loadHeroes();
            
            // Limpiar formulario si no es edición
            if (!isUpdate) {
                clearForm();
            }
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
        
    } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
        console.error('Submit error:', error);
    }
}

// OBTENER DATOS DEL FORMULARIO
function getFormData() {
    const heroData = {
        nombre: elements.heroName.value.trim(),
        rol: elements.heroRole.value,
        winRate: elements.winRate.value.trim(),
        linea: elements.linea.value.trim(),
        imagen: elements.heroImage.value.trim(),
        icon: elements.iconImage.value.trim(),
        guia: elements.guideImage.value.trim(),
        skills: []
    };
    
    // Agregar habilidades
    for (let i = 1; i <= 4; i++) {
        heroData.skills.push({
            nombre: document.getElementById(`skill${i}Name`).value.trim(),
            descripcion: document.getElementById(`skill${i}Desc`).value.trim(),
            imagen: document.getElementById(`skill${i}Image`).value.trim()
        });
    }
    
    return heroData;
}

// VALIDAR FORMULARIO
function validateForm(data) {
    // Validar campos requeridos
    if (!data.nombre || !data.rol || !data.winRate || !data.imagen || !data.icon) {
        showNotification('❌ Complete todos los campos obligatorios', 'error');
        return false;
    }
    
    // Validar habilidades
    for (let i = 0; i < data.skills.length; i++) {
        const skill = data.skills[i];
        if (!skill.nombre || !skill.descripcion || !skill.imagen) {
            showNotification(`❌ Complete la habilidad ${i + 1}`, 'error');
            return false;
        }
    }
    
    return true;
}

// LIMPIAR FORMULARIO
function clearForm() {
    elements.form.reset();
    elements.heroId.value = '';
    appState.currentHero = null;
    appState.isEditing = false;
    
    // Resetear botón
    elements.saveBtn.innerHTML = '<i class="fas fa-save"></i> GUARDAR HÉROE';
    
    updatePreview();
    showNotification('🧹 Formulario limpiado', 'info');
}

// AUTO-COMPLETAR FORMULARIO
function autoFillForm() {
    // Datos de ejemplo para pruebas
    elements.heroName.value = 'Nuevo Héroe';
    elements.heroRole.value = 'Tirador';
    elements.winRate.value = '52.5%';
    elements.linea.value = 'Gold Lane';
    elements.heroImage.value = 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_32c0d9d3a727a9052754296af6251435.png';
    elements.iconImage.value = 'https://akmweb.youngjoygame.com/web/gms/image/025c69a764924f4bac526a2662f1a0b9.png';
    elements.guideImage.value = 'https://img.mobilelegends.com/group1/M00/00/BB/rBEABWWBg0iAEVjjAAC2G6fDQV8498.jpg';
    
    // Habilidades de ejemplo
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`skill${i}Name`).value = `Habilidad ${i}`;
        document.getElementById(`skill${i}Desc`).value = `Descripción de la habilidad ${i}`;
        document.getElementById(`skill${i}Image`).value = 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_fbe01740efd779f6059fd2313b427457.png';
    }
    
    updatePreview();
    showNotification('🤖 Formulario auto-completado', 'info');
}

// PREVIEW EN TIEMPO REAL
function setupRealTimePreview() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });
}

// ACTUALIZAR VISTA PREVIA
function updatePreview() {
    if (!elements.previewContainer) return;
    
    const heroData = getFormData();
    
    if (!heroData.nombre) {
        elements.previewContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #aaa;">
                <i class="fas fa-user-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>Los datos del héroe aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    const skillsHTML = heroData.skills.map((skill, index) => `
        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
            <div style="font-weight: bold; color: #00ff88;">${skill.nombre || `Habilidad ${index + 1}`}</div>
            <div style="font-size: 0.9rem; color: #ccc;">${skill.descripcion || 'Sin descripción'}</div>
        </div>
    `).join('');
    
    elements.previewContainer.innerHTML = `
        <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                <img src="${heroData.icon || heroData.imagen || 'https://via.placeholder.com/80x80'}" 
                     style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #00ff88;"
                     onerror="this.src='https://via.placeholder.com/80x80'">
                <div>
                    <h3 style="color: #00ff88; margin-bottom: 5px;">${heroData.nombre}</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <span style="background: #333; padding: 5px 10px; border-radius: 20px;">
                            ${heroData.rol || 'Sin rol'}
                        </span>
                        <span style="background: #333; padding: 5px 10px; border-radius: 20px;">
                            ${heroData.winRate || 'Sin win rate'}
                        </span>
                    </div>
                    ${heroData.linea ? `<div style="color: #aaa;">Línea: ${heroData.linea}</div>` : ''}
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="color: #00ff88; margin-bottom: 10px;">Habilidades:</h4>
                ${skillsHTML}
            </div>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <div style="color: #aaa; font-size: 0.9rem;">
                    ${appState.isEditing ? 'Modo: Edición' : 'Modo: Creación'}
                    • ID: ${appState.isEditing ? appState.currentHero.id : appState.nextId}
                </div>
            </div>
        </div>
    `;
}

// EXPORTAR DATOS
async function exportData() {
    try {
        const response = await fetch(API_ENDPOINTS.heroes);
        const heroes = await response.json();
        
        const jsonString = JSON.stringify(heroes, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mlbb-heroes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        showNotification('💾 JSON exportado exitosamente', 'success');
        
    } catch (error) {
        showNotification('❌ Error exportando datos', 'error');
    }
}

// CREAR BACKUP
function createBackup() {
    const backup = {
        timestamp: new Date().toISOString(),
        totalHeroes: appState.totalHeroes,
        heroes: appState.heroes
    };
    
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mlbb-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    showNotification('💾 Backup creado exitosamente', 'success');
}

// CONFIRMAR ELIMINAR TODOS
function confirmDeleteAll() {
    if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsta acción eliminará TODOS los héroes y NO se puede deshacer.')) {
        return;
    }
    
    if (!confirm('⛔ ¿REALMENTE SEGURO?\n\nSe eliminarán permanentemente todos los héroes.')) {
        return;
    }
    
    showNotification('❌ Función de eliminación masiva desactivada por seguridad', 'error');
}

// MOSTRAR NOTIFICACIÓN
function showNotification(message, type = 'info') {
    if (!elements.notification || !elements.notificationText) return;
    
    elements.notificationText.textContent = message;
    
    // Colores según tipo
    switch(type) {
        case 'success':
            elements.notification.style.borderLeftColor = '#00ff88';
            break;
        case 'error':
            elements.notification.style.borderLeftColor = '#ff4757';
            break;
        case 'warning':
            elements.notification.style.borderLeftColor = '#ffa502';
            break;
        default:
            elements.notification.style.borderLeftColor = '#3498db';
    }
    
    elements.notification.classList.add('show');
    
    // Auto-ocultar
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 4000);
}

// HACER FUNCIONES GLOBALES
window.loadHeroToForm = loadHeroToForm;
window.clearForm = clearForm;
window.autoFillForm = autoFillForm;

// INICIAR CUANDO EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', init);
