// API BASE URL
const API_BASE = window.location.origin;
const API_ENDPOINTS = {
    heroes: `${API_BASE}/api/heroes`,
    stats: `${API_BASE}/api/stats`,
    scrape: `${API_BASE}/api/scrape-hero`
};

// Estado
let appState = {
    totalHeroes: 0,
    nextId: 1,
    currentHero: null,
    isScraping: false
};

// Elementos
const elements = {
    // Scraper
    heroIdInput: document.getElementById('heroIdInput'),
    heroNameInput: document.getElementById('heroNameInput'),
    scrapeByIdBtn: document.getElementById('scrapeByIdBtn'),
    scrapeByNameBtn: document.getElementById('scrapeByNameBtn'),
    scraperResults: document.getElementById('scraperResults'),
    
    // Formulario
    form: document.getElementById('heroForm'),
    heroName: document.getElementById('heroName'),
    heroRole: document.getElementById('heroRole'),
    winRate: document.getElementById('winRate'),
    heroImage: document.getElementById('heroImage'),
    iconImage: document.getElementById('iconImage'),
    
    // Info
    totalHeroes: document.getElementById('totalHeroes'),
    nextId: document.getElementById('nextId')
};

// Inicialización
async function init() {
    await loadStats();
    setupEventListeners();
    
    // Cargar habilidades dinámicamente
    loadSkillsFields();
}

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch(API_ENDPOINTS.stats);
        const data = await response.json();
        
        appState.totalHeroes = data.totalHeroes;
        appState.nextId = data.nextId;
        
        elements.totalHeroes.textContent = data.totalHeroes;
        elements.nextId.textContent = data.nextId;
        
    } catch (error) {
        console.error('Error cargando stats:', error);
    }
}

// Setup listeners
function setupEventListeners() {
    // Scraper
    if (elements.scrapeByIdBtn) {
        elements.scrapeByIdBtn.addEventListener('click', scrapeById);
    }
    
    if (elements.scrapeByNameBtn) {
        elements.scrapeByNameBtn.addEventListener('click', scrapeByName);
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Quick actions
    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const heroId = btn.dataset.id;
            elements.heroIdInput.value = heroId;
            switchTab('by-id');
            scrapeById();
        });
    });
}

// Scraping por ID
async function scrapeById() {
    const heroId = elements.heroIdInput?.value.trim();
    
    if (!heroId) {
        showNotification('Ingresa un ID de héroe', 'error');
        return;
    }
    
    await scrapeHero({ heroId });
}

// Scraping por nombre
async function scrapeByName() {
    const heroName = elements.heroNameInput?.value.trim();
    
    if (!heroName) {
        showNotification('Ingresa un nombre de héroe', 'error');
        return;
    }
    
    await scrapeHero({ heroName });
}

// Función principal de scraping
async function scrapeHero(data) {
    try {
        setScraping(true);
        
        const response = await fetch(API_ENDPOINTS.scrape, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayScrapedData(result.hero);
            fillFormWithData(result.hero);
            showNotification('¡Datos obtenidos exitosamente!', 'success');
        } else {
            showNotification(result.error || 'Error al obtener datos', 'error');
        }
        
    } catch (error) {
        console.error('Error en scraping:', error);
        showNotification('Error de conexión', 'error');
    } finally {
        setScraping(false);
    }
}

// Mostrar datos scrapeados
function displayScrapedData(hero) {
    if (!elements.scraperResults) return;
    
    elements.scraperResults.innerHTML = `
        <div class="scraped-hero-card">
            <div class="scraped-header">
                <img src="${hero.imagen || 'https://via.placeholder.com/100x100'}" 
                     alt="${hero.nombre}"
                     class="scraped-avatar">
                <div class="scraped-info">
                    <h3>${hero.nombre}</h3>
                    <div class="scraped-role">${hero.rol}</div>
                    <div class="scraped-winrate">${hero.winRate}</div>
                </div>
            </div>
            
            <div class="scraped-skills">
                <h4>Habilidades detectadas:</h4>
                <div class="skills-list">
                    ${hero.skills.map((skill, i) => `
                        <div class="skill-item">
                            <strong>${skill.nombre}</strong>
                            <p>${skill.descripcion}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="scraped-actions">
                <button class="btn btn-small" onclick="fillFormWithData(${JSON.stringify(hero).replace(/"/g, '&quot;')})">
                    <i class="fas fa-check"></i> Usar estos datos
                </button>
            </div>
        </div>
    `;
}

// Llenar formulario con datos scrapeados
function fillFormWithData(hero) {
    if (elements.heroName) elements.heroName.value = hero.nombre || '';
    if (elements.heroRole) elements.heroRole.value = hero.rol || '';
    if (elements.winRate) elements.winRate.value = hero.winRate || '';
    if (elements.heroImage) elements.heroImage.value = hero.imagen || '';
    if (elements.iconImage) elements.iconImage.value = hero.icon || '';
    
    // Llenar habilidades
    if (hero.skills && hero.skills.length >= 4) {
        for (let i = 0; i < 4; i++) {
            const skill = hero.skills[i];
            const skillName = document.getElementById(`skill${i+1}Name`);
            const skillDesc = document.getElementById(`skill${i+1}Desc`);
            const skillImg = document.getElementById(`skill${i+1}Image`);
            
            if (skillName) skillName.value = skill.nombre || '';
            if (skillDesc) skillDesc.value = skill.descripcion || '';
            if (skillImg) skillImg.value = skill.imagen || '';
        }
    }
    
    showNotification('Formulario completado automáticamente', 'success');
}

// Cambiar tab
function switchTab(tabId) {
    // Remover active de todos
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activar seleccionado
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// Control scraping UI
function setScraping(isScraping) {
    appState.isScraping = isScraping;
    
    const buttons = document.querySelectorAll('.btn-scrape');
    buttons.forEach(btn => {
        btn.disabled = isScraping;
        if (isScraping) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...';
        } else {
            btn.innerHTML = '<i class="fas fa-search"></i> Obtener datos';
        }
    });
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Implementar notificación
    alert(`${type.toUpperCase()}: ${message}`);
}

// Cargar campos de habilidades dinámicamente
function loadSkillsFields() {
    const container = document.querySelector('.skills-grid');
    if (!container) return;
    
    const skillsHTML = `
        ${[1,2,3,4].map(i => `
            <div class="skill-group">
                <h4>Habilidad ${i} ${i === 4 ? '(Ultimate)' : ''}</h4>
                <div class="form-group">
                    <label for="skill${i}Name">Nombre *</label>
                    <input type="text" id="skill${i}Name" required>
                </div>
                <div class="form-group">
                    <label for="skill${i}Desc">Descripción *</label>
                    <textarea id="skill${i}Desc" required rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="skill${i}Image">URL Imagen *</label>
                    <input type="url" id="skill${i}Image" required>
                </div>
            </div>
        `).join('')}
    `;
    
    container.innerHTML = skillsHTML;
}

// Inicializar
document.addEventListener('DOMContentLoaded', init);
