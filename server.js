const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivo de héroes
const HEROES_FILE = path.join(__dirname, "heroes.js");
let heroes = require("./heroes.js");

// Función para guardar héroes
function saveHeroes() {
  try {
    const content = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
    fs.writeFileSync(HEROES_FILE, content, "utf8");
    console.log(`💾 Héroes guardados: ${heroes.length}`);
    return true;
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    return false;
  }
}

// SERVIR ARCHIVOS DEL PANEL
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-style.css"));
});

app.get("/admin-script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-script.js"));
});

// NUEVO: Scraper automático
app.post("/api/scrape-hero", async (req, res) => {
  try {
    const { heroId, heroName } = req.body;
    
    if (!heroId && !heroName) {
      return res.status(400).json({ 
        error: "Se requiere heroId o heroName" 
      });
    }
    
    let heroData;
    
    if (heroId) {
      // Scrapear por ID
      heroData = await scrapeHeroById(heroId);
    } else {
      // Buscar por nombre
      heroData = await scrapeHeroByName(heroName);
    }
    
    if (!heroData) {
      return res.status(404).json({ 
        error: "No se pudo obtener información del héroe" 
      });
    }
    
    res.json({
      success: true,
      message: "Datos del héroe obtenidos exitosamente",
      hero: heroData,
      preview: true
    });
    
  } catch (error) {
    console.error("Error en scraper:", error);
    res.status(500).json({ 
      error: "Error al obtener datos del héroe",
      details: error.message 
    });
  }
});

// Scrapear héroe por ID
async function scrapeHeroById(heroId) {
  try {
    const url = `https://www.mobilelegends.com/hero/detail?channelid=2819992&heroid=${heroId}`;
    
    console.log(`🌐 Scrapeando: ${url}`);
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });
    
    const $ = cheerio.load(data);
    
    // Extraer información básica
    const heroName = $('title').text().split(' - ')[0] || `Héroe ${heroId}`;
    
    // Buscar datos en meta tags y scripts
    const scripts = $('script').text();
    const metaTags = $('meta');
    
    // Intentar extraer imagen del héroe
    let heroImage = '';
    metaTags.each((i, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property === 'og:image' && content) {
        heroImage = content;
      }
    });
    
    // Si no encontramos imagen, usar placeholder
    if (!heroImage) {
      heroImage = `https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_hero_placeholder.png`;
    }
    
    // Datos de ejemplo (mejorar con scraping real)
    const heroData = {
      nombre: heroName,
      rol: "Por definir", // Scrapear del HTML
      winRate: "50%", // Scrapear de estadísticas
      imagen: heroImage,
      icon: heroImage.replace('homepage/', 'gms/').replace('.png', '_icon.png'),
      guia: `https://img.mobilelegends.com/group1/M00/00/BB/rBEABWWBg0iAEVjjAAC2G6fDQV8498.jpg`,
      skills: [
        {
          nombre: "Habilidad 1",
          descripcion: "Descripción de habilidad obtenida del sitio",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_placeholder.png"
        },
        {
          nombre: "Habilidad 2",
          descripcion: "Segunda habilidad del héroe",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_placeholder.png"
        },
        {
          nombre: "Habilidad 3",
          descripcion: "Tercera habilidad del héroe",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_placeholder.png"
        },
        {
          nombre: "Ultimate",
          descripcion: "Habilidad definitiva del héroe",
          imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_skill_ultimate.png"
        }
      ]
    };
    
    return heroData;
    
  } catch (error) {
    console.error("Error scrapeando por ID:", error.message);
    return null;
  }
}

// Scrapear héroe por nombre
async function scrapeHeroByName(heroName) {
  try {
    // URL de búsqueda
    const searchUrl = `https://www.mobilelegends.com/search?keyword=${encodeURIComponent(heroName)}`;
    
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    
    // Buscar enlaces a héroes
    const heroLinks = $('a[href*="/hero/"]');
    
    if (heroLinks.length > 0) {
      const firstHeroLink = heroLinks.first().attr('href');
      const heroIdMatch = firstHeroLink.match(/heroid=(\d+)/);
      
      if (heroIdMatch) {
        return await scrapeHeroById(heroIdMatch[1]);
      }
    }
    
    return null;
    
  } catch (error) {
    console.error("Error scrapeando por nombre:", error.message);
    return null;
  }
}

// API endpoints existentes
app.get("/", (req, res) => {
  res.json({ 
    mensaje: "API Mobile Legends con Scraper 🚀",
    endpoints: {
      heroes: "/api/heroes",
      heroById: "/api/heroes/:id",
      adminPanel: "/admin",
      stats: "/api/stats",
      scrape: "/api/scrape-hero (POST)",
      export: "/api/export"
    },
    totalHeroes: heroes.length,
    version: "3.0.0"
  });
});

app.get("/api/heroes", (req, res) => {
  res.json(heroes);
});

app.get("/api/heroes/:id", (req, res) => {
  const hero = heroes.find(h => h.id === parseInt(req.params.id));
  hero ? res.json(hero) : res.status(404).json({ error: "Héroe no encontrado" });
});

app.post("/api/heroes", (req, res) => {
  try {
    const nuevoHeroe = req.body;
    
    if (!nuevoHeroe.nombre || !nuevoHeroe.rol || !nuevoHeroe.winRate) {
      return res.status(400).json({ 
        error: "Datos incompletos" 
      });
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
      nextId: nuevoId + 1,
      totalHeroes: heroes.length
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: "Error interno",
      details: error.message 
    });
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

app.get("/api/export", (req, res) => {
  res.json(heroes);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor con scraper en puerto ${PORT}`);
  console.log(`📊 Panel: http://localhost:${PORT}/admin`);
  console.log(`🔍 Scraper activo`);
});
