const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const HEROES_FILE = path.join(__dirname, "heroes.js");
let heroes = require("./heroes.js");

// Guardar héroes
function saveHeroes() {
  const content = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
  fs.writeFileSync(HEROES_FILE, content, "utf8");
  console.log(`💾 Guardados: ${heroes.length} héroes`);
  return true;
}

// SERVIR PANEL
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-style.css"));
});

app.get("/admin-script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-script.js"));
});

// NUEVO: Scraper con Puppeteer
app.post("/api/scrape-hero", async (req, res) => {
  let browser = null;
  
  try {
    const { heroId, heroName } = req.body;
    
    if (!heroId && !heroName) {
      return res.status(400).json({ 
        error: "Se requiere heroId o heroName" 
      });
    }
    
    console.log(`🕸️ Iniciando scraper para: ${heroId || heroName}`);
    
    // Configurar Puppeteer para Render
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    let heroData;
    
    if (heroId) {
      heroData = await scrapeByHeroId(page, heroId);
    } else {
      heroData = await scrapeByHeroName(page, heroName);
    }
    
    await browser.close();
    
    if (!heroData || !heroData.nombre) {
      return res.status(404).json({ 
        error: "No se pudo obtener información del héroe",
        suggestion: "Prueba con otro ID o usa el formulario manual"
      });
    }
    
    res.json({
      success: true,
      message: "Datos obtenidos exitosamente",
      hero: heroData,
      source: "web-scraper"
    });
    
  } catch (error) {
    console.error("❌ Error en scraper:", error);
    
    if (browser) {
      await browser.close();
    }
    
    res.status(500).json({ 
      error: "Error en el scraper",
      details: error.message,
      fallback: "Usa el formulario manual o prueba IDs conocidos"
    });
  }
});

// Scraping por ID con Puppeteer
async function scrapeByHeroId(page, heroId) {
  try {
    // URL de la página de héroe
    const url = `https://www.mobilelegends.com/hero/detail?channelid=2819992&heroid=${heroId}`;
    
    console.log(`🌐 Navegando a: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Esperar a que cargue el contenido
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Tomar screenshot para debug (opcional)
    // await page.screenshot({ path: `debug-${heroId}.png` });
    
    // Extraer datos del HTML
    const heroData = await page.evaluate(() => {
      const data = {};
      
      // 1. Obtener título
      data.nombre = document.title.split(' - ')[0] || document.title;
      
      // 2. Buscar en meta tags
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(tag => {
        const property = tag.getAttribute('property');
        const content = tag.getAttribute('content');
        
        if (property === 'og:title' && content) {
          data.nombre = content.split(' - ')[0];
        }
        
        if (property === 'og:image' && content) {
          data.imagen = content;
        }
        
        if (property === 'og:description' && content) {
          data.descripcion = content;
        }
      });
      
      // 3. Buscar imágenes de héroe
      const images = document.querySelectorAll('img');
      for (const img of images) {
        const src = img.src;
        const alt = img.alt.toLowerCase();
        
        // Filtrar imágenes relevantes
        if (src.includes('hero') || src.includes('avat') || alt.includes('hero')) {
          if (!data.imagen && src.includes('akmweb')) {
            data.imagen = src;
          }
          
          if (src.includes('icon') || src.includes('small')) {
            data.icon = src;
          }
        }
      }
      
      // 4. Intentar encontrar rol (más difícil sin JS)
      // Buscar en texto de la página
      const bodyText = document.body.innerText.toLowerCase();
      const roles = ['tirador', 'asesino', 'mago', 'tanque', 'combatiente', 'soporte'];
      
      for (const role of roles) {
        if (bodyText.includes(role)) {
          data.rol = role.charAt(0).toUpperCase() + role.slice(1);
          break;
        }
      }
      
      // 5. Win rate por defecto
      data.winRate = "50%";
      
      // 6. Habilidades por defecto
      data.skills = [
        {
          nombre: "Habilidad Básica",
          descripcion: "Habilidad del héroe",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_placeholder.png"
        },
        {
          nombre: "Habilidad 2",
          descripcion: "Segunda habilidad",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_placeholder.png"
        },
        {
          nombre: "Habilidad 3",
          descripcion: "Tercera habilidad",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_placeholder.png"
        },
        {
          nombre: "Ultimate",
          descripcion: "Habilidad definitiva",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_ultimate.png"
        }
      ];
      
      return data;
    });
    
    // Si no encontramos imagen, usar placeholder
    if (!heroData.imagen) {
      heroData.imagen = `https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_hero_placeholder.png`;
    }
    
    if (!heroData.icon) {
      heroData.icon = heroData.imagen.replace('homepage/', 'gms/').replace('.png', '_icon.png');
    }
    
    if (!heroData.rol) {
      heroData.rol = "Tirador";
    }
    
    // URL de guía
    heroData.guia = `https://img.mobilelegends.com/group1/M00/00/BB/rBEABWWBg0iAEVjjAAC2G6fDQV8498.jpg`;
    
    console.log(`✅ Datos obtenidos para: ${heroData.nombre}`);
    return heroData;
    
  } catch (error) {
    console.error(`❌ Error scraping ID ${heroId}:`, error.message);
    return null;
  }
}

// Scraping por nombre
async function scrapeByHeroName(page, heroName) {
  try {
    // URL de búsqueda
    const searchUrl = `https://www.mobilelegends.com/search?keyword=${encodeURIComponent(heroName)}`;
    
    console.log(`🔍 Buscando: ${heroName}`);
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Esperar resultados
    await page.waitForSelector('a[href*="/hero/"]', { timeout: 10000 });
    
    // Encontrar primer enlace a héroe
    const heroLink = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/hero/"]');
      return links.length > 0 ? links[0].href : null;
    });
    
    if (!heroLink) {
      throw new Error("No se encontró el héroe");
    }
    
    // Extraer ID del enlace
    const heroIdMatch = heroLink.match(/heroid=(\d+)/);
    if (!heroIdMatch) {
      throw new Error("No se pudo extraer ID del héroe");
    }
    
    const heroId = heroIdMatch[1];
    console.log(`🔗 ID encontrado: ${heroId}`);
    
    // Scrapear por el ID encontrado
    return await scrapeByHeroId(page, heroId);
    
  } catch (error) {
    console.error(`❌ Error buscando "${heroName}":`, error.message);
    return null;
  }
}

// API EXISTENTE
app.get("/", (req, res) => {
  res.json({ 
    mensaje: "API MLBB con Web Scraper 🚀",
    totalHeroes: heroes.length,
    nextId: heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1,
    endpoints: {
      heroes: "/api/heroes",
      scrape: "/api/scrape-hero (POST)",
      admin: "/admin"
    },
    version: "4.0.0"
  });
});

app.get("/api/heroes", (req, res) => {
  res.json(heroes);
});

app.post("/api/heroes", (req, res) => {
  try {
    const nuevoHeroe = req.body;
    
    if (!nuevoHeroe.nombre || !nuevoHeroe.rol || !nuevoHeroe.winRate) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
    
    const nuevoId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
    
    const nuevo = {
      id: nuevoId,
      nombre: nuevoHeroe.nombre,
      rol: nuevoHeroe.rol,
      winRate: nuevoHeroe.winRate,
      imagen: nuevoHeroe.imagen || "",
      icon: nuevoHeroe.icon || "",
      guia: nuevoHeroe.guia || "",
      skills: nuevoHeroe.skills || [],
      linea: nuevoHeroe.linea || ""
    };
    
    heroes.push(nuevo);
    saveHeroes();
    
    res.status(201).json({
      success: true,
      message: `Héroe "${nuevo.nombre}" agregado`,
      hero: nuevo,
      nextId: nuevoId + 1
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stats", (req, res) => {
  const nextId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
  
  res.json({
    totalHeroes: heroes.length,
    nextId: nextId,
    recentHeroes: heroes.slice(-5).reverse()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor con Puppeteer en puerto ${PORT}`);
  console.log(`🕸️ Web Scraper activo`);
});
