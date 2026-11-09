// Configuración admin-script.js
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
    heroes: `${API_BASE_URL}/api/heroes`,
    stats: `${API_BASE_URL}/api/stats`,
    export: `${API_BASE_URL}/api/export`
};

// Estado de la aplicación
let appState = {
    isLoading: false,
    nextId: 1,
    totalHeroes: 0,
    recentHeroes: []
};

// Elementos DOM
const elements = {
    form: document.getElementById('heroForm'),
    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn'),
    exampleBtn: document.getElementById('exampleBtn'),
    heroPreview: document.getElementById('heroPreview'),
    nextIdElement: document.getElementById('nextId'),
    totalHeroesElement: document.getElementById('totalHeroes'),
    apiStatusText: document.getElementById('apiStatusText'),
    recentList: document.getElementById('recentList'),
    copyJsonBtn: document.getElementById('copyJsonBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText'),
    closeNotification: document.querySelector('.close-notification')
};

// Inicialización
async function init() {
    try {
        await checkAPIStatus();
        await loadStats();
        setupEventListeners();
        setupFormListeners();
        updatePreview();
        showNotification('Panel de administración listo ✅', 'success');
    } catch (error) {
        console.error('Error al inicializar:', error);
        showNotification('Error al conectar con el servidor ❌', 'error');
    }
}

// Verificar estado de la API
async function checkAPIStatus() {
    try {
        const response = await fetch('/');
        if (response.ok) {
            updateApiStatus('Conectado', 'success');
        } else {
            updateApiStatus('Error de conexión', 'error');
        }
    } catch (error) {
        updateApiStatus('Servidor no disponible', 'error');
        throw error;
    }
}

// Actualizar estado de la API en UI
function updateApiStatus(text, type) {
    if (!elements.apiStatusText) return;
    
    elements.apiStatusText.textContent = text;
    elements.apiStatusText.className = 'info-value';
    
    switch (type) {
        case 'success':
            elements.apiStatusText.classList.add('status-ready');
            break;
        case 'error':
            elements.apiStatusText.classList.add('status-error');
            break;
        case 'loading':
            elements.apiStatusText.classList.add('status-loading');
            break;
    }
}

// Cargar estadísticas
async function loadStats() {
    try {
        updateApiStatus('Cargando...', 'loading');
        const response = await fetch(API_ENDPOINTS.stats);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        appState.nextId = data.nextId;
        appState.totalHeroes = data.totalHeroes;
        appState.recentHeroes = data.recentHeroes || [];
        
        updateUI();
        updateApiStatus('Conectado', 'success');
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        updateApiStatus('Error al cargar datos', 'error');
        // Valores por defecto
        appState.nextId = 1;
        appState.totalHeroes = 0;
        appState.recentHeroes = [];
        updateUI();
    }
}

// Actualizar UI con los datos cargados
function updateUI() {
    if (elements.nextIdElement) {
        elements.nextIdElement.textContent = appState.nextId;
    }
    
    if (elements.totalHeroesElement) {
        elements.totalHeroesElement.textContent = appState.totalHeroes;
    }
    
    updateRecentHeroesList();
}

// Actualizar lista de héroes recientes
// Actualizar lista de héroes recientes
function updateRecentHeroesList() {
    if (!elements.recentList || !appState.recentHeroes) return;
    
    if (appState.recentHeroes.length === 0) {
        elements.recentList.innerHTML = `
            <p style="color: #666; text-align: center; padding: 20px;">
                No hay héroes recientes
            </p>
        `;
        return;
    }
    
    // ✅ Nuevo HTML con botón de eliminar
    elements.recentList.innerHTML = appState.recentHeroes.map(hero => `
        <div class="hero-item">
            <img src="${hero.icon || 'https://via.placeholder.com/40x40?text=Hero'}" 
                 alt="${hero.nombre}"
                 onerror="this.src='https://via.placeholder.com/40x40?text=Error'">
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

// ✅ Nueva función para eliminar un héroe
async function deleteHero(id, nombre) {
    if (!confirm(`¿Estás seguro de que quieres eliminar a "${nombre}" (ID: ${id})?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_ENDPOINTS.heroes}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Error HTTP ${response.status}`);
        }

        showNotification(result.message || `✅ Héroe "${nombre}" eliminado exitosamente`, 'success');
        
        // Recargar la lista de héroes
        await loadStats();

    } catch (error) {
        console.error('Error al eliminar héroe:', error);
        showNotification(`❌ Error al eliminar: ${error.message}`, 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Botones
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetForm);
    }
    
    if (elements.exampleBtn) {
        elements.exampleBtn.addEventListener('click', loadExampleData);
    }
    
    // Exportación
    if (elements.copyJsonBtn) {
        elements.copyJsonBtn.addEventListener('click', exportToClipboard);
    }
    
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', exportToFile);
    }
    
    // Notificación
    if (elements.closeNotification) {
        elements.closeNotification.addEventListener('click', () => {
            elements.notification.classList.remove('show');
        });
    }
    
    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'e':
                    e.preventDefault();
                    loadExampleData();
                    break;
                case 's':
                    e.preventDefault();
                    if (elements.form) {
                        elements.form.dispatchEvent(new Event('submit'));
                    }
                    break;
                case 'r':
                    e.preventDefault();
                    resetForm();
                    break;
            }
        }
    });
}

// Configurar listeners del formulario
function setupFormListeners() {
    if (!elements.form) return;
    
    // Envío del formulario
    elements.form.addEventListener('submit', handleFormSubmit);
    
    // Actualización en tiempo real
    const inputs = elements.form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });
    
    // Auto-completar iconos
    const roleInput = document.getElementById('heroRole');
    if (roleInput) {
        roleInput.addEventListener('blur', autoCompleteIcons);
    }
}

// Auto-completar iconos
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
    
    const iconUrls = roles.split(',')
        .map(r => r.trim())
        .filter(r => roleIcons[r])
        .map(r => roleIcons[r]);
    
    if (iconUrls.length > 0) {
        iconInput.value = iconUrls.join(', ');
        updatePreview();
    }
}

// Manejar envío del formulario
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const heroData = getFormData();
    
    if (!validateFormData(heroData)) {
        return;
    }
    
    try {
        setLoading(true);
        
        const response = await fetch(API_ENDPOINTS.heroes, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(heroData)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        showNotification(result.message || '✅ Héroe agregado exitosamente', 'success');
        
        // Recargar estadísticas
        await loadStats();
        
        // Resetear formulario
        resetForm();
        
    } catch (error) {
        console.error('Error al guardar héroe:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// Obtener datos del formulario
function getFormData() {
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };
    
    // Procesar roles
    const roleValue = getValue('heroRole');
    const roles = roleValue.includes(',') 
        ? roleValue.split(',').map(r => r.trim()).filter(r => r)
        : roleValue;
    
    // Procesar iconos
    const iconValue = getValue('iconImage');
    const icons = iconValue.includes(',')
        ? iconValue.split(',').map(i => i.trim()).filter(i => i)
        : iconValue;
    
    // Procesar counters
    const counters = [];
    for (let i = 1; i <= 6; i++) {
        const counterUrl = getValue(`counter${i}`);
        if (counterUrl) {
            counters.push(counterUrl);
        }
    }
    
    return {
        nombre: getValue('heroName'),
        rol: roles,
        winRate: getValue('winRate'),
        imagen: getValue('heroImage'),
        icon: icons,
        guia: getValue('guideImage'),
        counters: counters.length > 0 ? counters : null, // Agregar counters
        skills: [
            {
                nombre: getValue('skill1Name'),
                descripcion: getValue('skill1Desc'),
                imagen: getValue('skill1Image')
            },
            {
                nombre: getValue('skill2Name'),
                descripcion: getValue('skill2Desc'),
                imagen: getValue('skill2Image')
            },
            {
                nombre: getValue('skill3Name'),
                descripcion: getValue('skill3Desc'),
                imagen: getValue('skill3Image')
            },
            {
                nombre: getValue('skill4Name'),
                descripcion: getValue('skill4Desc'),
                imagen: getValue('skill4Image')
            }
        ]
    };
}
// Validar datos del formulario
function validateFormData(data) {
    // Validar campos obligatorios
    const requiredFields = [
        { value: data.nombre, name: 'Nombre del héroe', id: 'heroName' },
        { value: data.rol, name: 'Rol(es)', id: 'heroRole' },
        { value: data.winRate, name: 'Win Rate', id: 'winRate' },
        { value: data.imagen, name: 'Imagen principal', id: 'heroImage' },
        { value: data.icon, name: 'Icono(s)', id: 'iconImage' }
    ];
    
    const missingFields = [];
    requiredFields.forEach(field => {
        let isEmpty = false;
        
        if (Array.isArray(field.value)) {
            isEmpty = field.value.length === 0;
        } else {
            isEmpty = !field.value;
        }
        
        if (isEmpty) {
            missingFields.push(field.name);
            // Resaltar campo vacío
            const element = document.getElementById(field.id);
            if (element) {
                element.style.borderColor = 'var(--danger-color)';
                setTimeout(() => {
                    element.style.borderColor = '';
                }, 3000);
            }
        }
    });
    
    if (missingFields.length > 0) {
        showNotification(`Faltan campos: ${missingFields.join(', ')}`, 'error');
        return false;
    }
    
    // Validar formato de Win Rate
    if (!/^\d+\.?\d*%$/.test(data.winRate)) {
        showNotification('Win Rate debe tener formato como: 49.5%', 'error');
        const winRateInput = document.getElementById('winRate');
        if (winRateInput) {
            winRateInput.style.borderColor = 'var(--danger-color)';
            setTimeout(() => {
                winRateInput.style.borderColor = '';
            }, 3000);
        }
        return false;
    }
    
    // Validar counters (al menos 2 si se ingresaron algunos)
    if (data.counters) {
        const counterUrls = data.counters.filter(url => url.trim() !== '');
        if (counterUrls.length > 0 && counterUrls.length < 2) {
            showNotification('Se requieren al menos 2 contadores válidos', 'error');
            for (let i = 1; i <= 2; i++) {
                const counterInput = document.getElementById(`counter${i}`);
                if (counterInput && !counterInput.value.trim()) {
                    counterInput.style.borderColor = 'var(--danger-color)';
                    setTimeout(() => {
                        counterInput.style.borderColor = '';
                    }, 3000);
                }
            }
            return false;
        }
        
        // Validar que los contadores no sean más de 6
        if (counterUrls.length > 6) {
            showNotification('Máximo 6 contadores permitidos', 'error');
            return false;
        }
    }
    
    // Validar habilidades
    const skillFields = [
        { id: 'skill1Name', idDesc: 'skill1Desc', idImg: 'skill1Image' },
        { id: 'skill2Name', idDesc: 'skill2Desc', idImg: 'skill2Image' },
        { id: 'skill3Name', idDesc: 'skill3Desc', idImg: 'skill3Image' },
        { id: 'skill4Name', idDesc: 'skill4Desc', idImg: 'skill4Image' }
    ];
    
    const incompleteSkills = [];
    
    skillFields.forEach((skill, index) => {
        const name = document.getElementById(skill.id)?.value.trim();
        const desc = document.getElementById(skill.idDesc)?.value.trim();
        const img = document.getElementById(skill.idImg)?.value.trim();
        
        if (!name || !desc || !img) {
            incompleteSkills.push(`Habilidad ${index + 1}`);
            
            // Resaltar campos incompletos
            [skill.id, skill.idDesc, skill.idImg].forEach(id => {
                const element = document.getElementById(id);
                if (element && !element.value.trim()) {
                    element.style.borderColor = 'var(--danger-color)';
                    setTimeout(() => {
                        element.style.borderColor = '';
                    }, 3000);
                }
            });
        }
    });
    
    if (incompleteSkills.length > 0) {
        showNotification(`Complete: ${incompleteSkills.join(', ')}`, 'error');
        return false;
    }
    
    return true;
}

// Actualizar vista previa
function updatePreview() {
    if (!elements.heroPreview) return;
    
    const hero = getFormData();
    
    if (hero.nombre) {
        const roles = Array.isArray(hero.rol) ? hero.rol : [hero.rol];
        const icons = Array.isArray(hero.icon) ? hero.icon : [hero.icon];
        
        // Construir HTML de counters
        let countersHTML = '';
        if (hero.counters && hero.counters.length > 0) {
            countersHTML = `
                <div class="preview-counters">
                    <h4><i class="fas fa-crosshairs"></i> Counters</h4>
                    <div class="preview-counters-grid">
                        ${hero.counters.map((counter, index) => `
                            <div class="preview-counter-item">
                                <img src="${counter}" 
                                     alt="Counter ${index + 1}" 
                                     onerror="this.src='https://via.placeholder.com/50x50/2d3748/ffffff?text=C${index + 1}'">
                                <span class="counter-number">${index + 1}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        elements.heroPreview.innerHTML = `
            <div class="preview-hero-card">
                <div class="preview-header">
                    <img src="${hero.imagen || 'https://via.placeholder.com/80x80?text=Hero'}" 
                         alt="${hero.nombre}" 
                         class="preview-avatar"
                         onerror="this.src='https://via.placeholder.com/80x80?text=Error'">
                    <div class="preview-info">
                        <h3>${hero.nombre}</h3>
                        <div>
                            ${roles.map(role => `<span class="preview-role">${role}</span>`).join('')}
                        </div>
                        <div class="preview-winrate">Win Rate: ${hero.winRate || 'N/A'}</div>
                    </div>
                </div>
                
                ${countersHTML}
                
                <div class="preview-skills">
                    ${hero.skills.map((skill, index) => `
                        <div class="preview-skill">
                            <div class="skill-name">${skill.nombre || `Habilidad ${index + 1}`}</div>
                            <div class="skill-desc">${skill.descripcion || 'Descripción no disponible'}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="preview-footer">
                    <div class="preview-stats">
                        <span><i class="fas fa-id-card"></i> ID: ${appState.nextId}</span>
                        <span><i class="fas fa-images"></i> Iconos: ${icons.length}</span>
                        <span><i class="fas fa-bolt"></i> Habilidades: 4/4</span>
                        ${hero.counters ? `<span><i class="fas fa-crosshairs"></i> Counters: ${hero.counters.length}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    } else {
        elements.heroPreview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-user-plus"></i>
                <h3>Vista Previa del Héroe</h3>
                <p>Complete el formulario para ver cómo quedará el nuevo héroe</p>
                <div class="preview-info-box">
                    <p><i class="fas fa-info-circle"></i> El sistema asignará automáticamente el ID <strong>${appState.nextId}</strong></p>
                    <p><i class="fas fa-crosshairs"></i> Puede agregar hasta 6 counters</p>
                </div>
            </div>
        `;
    }
}
// Resetear formulario
function resetForm() {
    if (elements.form) {
        elements.form.reset();
        // Resetear counters específicamente
        for (let i = 1; i <= 6; i++) {
            const counterInput = document.getElementById(`counter${i}`);
            if (counterInput) {
                counterInput.value = '';
            }
        }
        updatePreview();
        showNotification('Formulario limpiado 🔄', 'info');
    }
}
// Cargar datos de ejemplo
function loadExampleData() {
    const exampleData = {
        heroName: 'Layla',
        heroRole: 'Tirador',
        winRate: '48.7%',
        heroImage: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_32c0d9d3a727a9052754296af6251435.png',
        iconImage: 'https://akmweb.youngjoygame.com/web/gms/image/025c69a764924f4bac526a2662f1a0b9.png',
        guideImage: 'https://img.mobilelegends.com/group1/M00/00/BB/rBEABWWBg0iAEVjjAAC2G6fDQV8498.jpg',
        // Agregar counters de ejemplo
        counter1: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_b4a5e537894bdc00787e80e4d3ada5dd.png',
        counter2: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/200_hero_icon.png',
        counter3: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/300_hero_icon.png',
        counter4: '',
        counter5: '',
        counter6: '',
        skill1Name: 'Disparo Lejano',
        skill1Desc: 'Aumenta el rango de ataque básico',
        skill1Image: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_fbe01740efd779f6059fd2313b427457.png',
        skill2Name: 'Bomba Vacía',
        skill2Desc: 'Lanza una bomba que ralentiza enemigos',
        skill2Image: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_de41566ded345f89064e32da9dfd8893.png',
        skill3Name: 'Misil Destructor',
        skill3Desc: 'Dispara un misil que causa gran daño',
        skill3Image: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_c5771dd5686278640dabfaa26839545c.png',
        skill4Name: 'Disparo Final',
        skill4Desc: 'Ultimate que atraviesa enemigos',
        skill4Image: 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_361546d795e6df7029a1cf1252e57ac8.png'
    };
    
    Object.keys(exampleData).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = exampleData[id];
        }
    });
    
    updatePreview();
    showNotification('Datos de ejemplo cargados ✨', 'success');
}
// Exportar a portapapeles
async function exportToClipboard() {
    try {
        const response = await fetch(API_ENDPOINTS.export);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const jsonString = JSON.stringify(data, null, 2);
        
        await navigator.clipboard.writeText(jsonString);
        showNotification(`✅ ${data.length} héroes copiados al portapapeles`, 'success');
    } catch (error) {
        console.error('Error al exportar:', error);
        showNotification('❌ Error al copiar datos', 'error');
    }
}

// Exportar a archivo
async function exportToFile() {
    try {
        const response = await fetch(API_ENDPOINTS.export);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `heroes-mlbb-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        showNotification(`✅ Archivo descargado (${data.length} héroes)`, 'success');
    } catch (error) {
        console.error('Error al exportar:', error);
        showNotification('❌ Error al descargar datos', 'error');
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    if (!elements.notification || !elements.notificationText) return;
    
    elements.notificationText.textContent = message;
    
    // Establecer color según tipo
    const colors = {
        success: 'linear-gradient(135deg, #28a745, #20c997)',
        error: 'linear-gradient(135deg, #dc3545, #e83e8c)',
        warning: 'linear-gradient(135deg, #ffc107, #fd7e14)',
        info: 'linear-gradient(135deg, #17a2b8, #6f42c1)'
    };
    
    elements.notification.style.background = colors[type] || colors.info;
    elements.notification.classList.add('show');
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 4000);
}

// Control de loading
function setLoading(isLoading) {
    appState.isLoading = isLoading;
    
    const buttons = document.querySelectorAll('button');
    const inputs = document.querySelectorAll('input, textarea, select');
    
    buttons.forEach(btn => {
        btn.disabled = isLoading;
    });
    
    inputs.forEach(input => {
        input.disabled = isLoading;
    });
    
    // Actualizar botón de guardar
    if (elements.saveBtn) {
        if (isLoading) {
            elements.saveBtn.innerHTML = '<div class="spinner"></div> Guardando...';
        } else {
            elements.saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Héroe';
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// Funciones para depuración (opcional)
window.debug = {
    getState: () => appState,
    getFormData: () => getFormData(),
    testAPI: () => checkAPIStatus(),
    reloadStats: () => loadStats()
};

// admin-script.js - Cargar héroe por ID
document.addEventListener('DOMContentLoaded', () => {
  const loadBtn = document.getElementById('loadHeroBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', async () => {
      const heroId = document.getElementById('loadHeroId').value;
      if (!heroId) {
        showNotification('Por favor, ingresa un ID válido', 'error');
        return;
      }

      try {
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        // Consultar tu bot de scraping (ml-scraper-api) o Firebase directamente
        const response = await fetch(`/api/scrape-hero/${heroId}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Rellenar el formulario con los datos
          document.getElementById('heroName').value = result.data.name || '';
          document.getElementById('heroRole').value = result.data.role || '';
          document.getElementById('winRate').value = result.data.stats?.winRate || '';
          document.getElementById('heroImage').value = result.data.poster || '';
          document.getElementById('iconImage').value = result.data.roleIcon || '';

          // Habilidades
          if (result.data.skills && result.data.skills.length > 0) {
            result.data.skills.forEach((skill, index) => {
              const i = index + 1;
              const nameInput = document.getElementById(`skill${i}Name`);
              const descInput = document.getElementById(`skill${i}Desc`);
              if (nameInput) nameInput.value = skill.type || '';
              if (descInput) descInput.value = skill.description || '';
            });
          }

          showNotification(`Datos de ${result.data.name} cargados correctamente`, 'success');
        } else {
          showNotification('No se encontraron datos para ese ID', 'error');
        }
      } catch (error) {
        console.error('Error al cargar:', error);
        showNotification('Error al cargar los datos', 'error');
      } finally {
        loadBtn.disabled = false;
        loadBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Cargar';
      }
    });
  }
});

