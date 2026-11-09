//server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Octokit } = require("@octokit/rest");

const app = express();

// server.js (Api_ML)
// server.js (Api_ML)
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const axios = require('axios');


///////////////////
// Función para sanitizar textos
function sanitize(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\n\r]+/g, ' ')   // Elimina saltos de línea
    .replace(/"/g, "'")         // Reemplaza comillas dobles por simples
    .replace(/\s+/g, ' ')       // Colapsa espacios múltiples
    .trim();
}

// ✅ Lógica para cargar credenciales (local o Render)


// ✅ Cargar credenciales de Firebase (local o Render)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  // Producción (Render): leer desde variable de entorno
  const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
  serviceAccount = JSON.parse(json);
  console.log('✅ Firebase configurado desde variable de entorno');
} else {
  // Desarrollo local: leer desde archivo
  serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Firebase configurado desde archivo local');
}

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://comidas-b1396-default-rtdb.firebaseio.com"
});
const db = getDatabase(firebaseApp);

// ✅ CONFIGURACIÓN CORS ESPECÍFICA PARA GITHUB PAGES
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman o curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://spay2024.github.io',
      'https://api-ml-0c18.onrender.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Origen bloqueado por CORS:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};



app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Manejar peticiones preflight

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ 
  auth: GITHUB_TOKEN,
  userAgent: 'MLBB API v2.0'
});

const REPO_OWNER = "SpAy2024";
const REPO_NAME = "Api_ML";
const HEROES_FILE_PATH = "heroes.js";

// Cargar héroes desde el archivo local
let heroes = [];
try {
  heroes = require("./heroes.js");
  console.log(`✅ ${heroes.length} héroes cargados desde heroes.js`);
} catch (error) {
  console.error("❌ Error al cargar heroes.js:", error.message);
  heroes = [];
}

// Función para actualizar el archivo en GitHub
async function updateHeroesOnGitHub() {
  try {
    if (!GITHUB_TOKEN) {
      console.warn("⚠️ GITHUB_TOKEN no configurado. Los cambios no se guardarán en GitHub.");
      return { success: false, message: "GitHub token no configurado" };
    }

    // 1. Obtener el SHA del archivo actual
    const { data: fileData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: HEROES_FILE_PATH
    });

    // 2. Crear contenido nuevo
    const content = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
    const contentBase64 = Buffer.from(content).toString('base64');

    // 3. Actualizar el archivo en GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: HEROES_FILE_PATH,
      message: `Actualización automática: ${new Date().toLocaleString()}`,
      content: contentBase64,
      sha: fileData.sha,
      committer: {
        name: 'MLBB API Bot',
        email: 'bot@mlbb-api.com'
      },
      author: {
        name: 'MLBB API',
        email: 'api@mlbb.com'
      }
    });

    console.log("✅ Archivo heroes.js actualizado en GitHub");
    
    // 4. También actualizar localmente
    fs.writeFileSync(path.join(__dirname, "heroes.js"), content, "utf8");
    console.log("💾 Archivo heroes.js actualizado localmente");

    return { success: true, message: "Archivo actualizado en GitHub" };
  } catch (error) {
    console.error("❌ Error al actualizar GitHub:", error.message);
    
    // Fallback: guardar solo localmente
    try {
      const content = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
      fs.writeFileSync(path.join(__dirname, "heroes.js"), content, "utf8");
      console.log("💾 Archivo guardado localmente (fallback)");
      return { success: false, message: "Guardado localmente, pero GitHub falló: " + error.message };
    } catch (localError) {
      console.error("❌ Error al guardar localmente:", localError.message);
      return { success: false, message: "Error completo: " + error.message };
    }
  }
}

// Ruta para el panel de administración
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Servir archivos CSS y JS del panel
app.get("/admin-style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-style.css"), {
    headers: { "Content-Type": "text/css" }
  });
});

app.get("/admin-script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-script.js"), {
    headers: { "Content-Type": "application/javascript" }
  });
});


app.post("/api/heroes", async (req, res) => {
  try {
    const nuevoHeroe = req.body;
    
    // Validaciones básicas
    if (!nuevoHeroe.nombre || !nuevoHeroe.rol || !nuevoHeroe.winRate) {
      return res.status(400).json({ 
        error: "Datos incompletos", 
        campos_requeridos: ["nombre", "rol", "winRate"] 
      });
    }
    
    // Calcular nuevo ID (el más alto + 1)
    const nuevoId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
    
    // Crear héroe con estructura completa
    const nuevo = {
      id: nuevoId,
      nombre: nuevoHeroe.nombre,
      rol: nuevoHeroe.rol,
      winRate: nuevoHeroe.winRate,
      imagen: nuevoHeroe.imagen || "",
      icon: nuevoHeroe.icon || "",
      guia: nuevoHeroe.guia || "",
      counters: nuevoHeroe.counters || [],
      skills: nuevoHeroe.skills || [],
      linea: nuevoHeroe.linea || ""
    };
    
    // Agregar al array en memoria
    heroes.push(nuevo);

    // ✅ GUARDAR EN FIREBASE
    // ✅ GUARDAR EN FIREBASE
// ✅ GUARDAR EN FIREBASE (con sanitización)
let firebaseSuccess = false;
try {
  const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
  const data = snapshot.val();
  let firebaseHeroes = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {}).filter(Boolean);

  // Adaptar y sanitizar las skills
  const skillsAdapted = (nuevo.skills || []).map(skill => ({
    type: sanitize(skill.nombre || skill.type || 'Passive'),
    description: sanitize(skill.descripcion || skill.description || '')
  }));

  // Adaptar y sanitizar los counters
  const countersAdapted = (nuevo.counters || []).map(c => sanitize(c));

  const existingIndex = firebaseHeroes.findIndex(h => h.data?.hero_id === nuevoId);
  const newHeroData = {
    data: { hero_id: nuevoId },
    detail: {
      heroId: nuevoId,
      name: sanitize(nuevo.nombre),
      role: sanitize(Array.isArray(nuevo.rol) ? nuevo.rol[0] : nuevo.rol),
      stats: {
        winRate: sanitize(nuevo.winRate),
        pickRate: sanitize(nuevo.pickRate || '0%'),
        banRate: sanitize(nuevo.banRate || '0%')
      },
      lore: sanitize(nuevo.lore || "Descripción no disponible."),
      skills: skillsAdapted,
      combos: [],
      counters: countersAdapted,  // ✅ Añadido
      poster: sanitize(nuevo.imagen),
      roleIcon: sanitize(nuevo.icon)
    }
  };

  if (existingIndex !== -1) {
    firebaseHeroes[existingIndex] = newHeroData;
  } else {
    firebaseHeroes.push(newHeroData);
  }

  await db.ref('mlbb/heroes-detailed').set(firebaseHeroes);
  firebaseSuccess = true;
  console.log(`✅ Héroe ${nuevo.nombre} guardado en Firebase`);
} catch (fbError) {
  console.warn('⚠️ No se pudo guardar en Firebase:', fbError.message);
}

    // Actualizar en GitHub
    const githubResult = await updateHeroesOnGitHub();

    // ✅ UNA SOLA RESPUESTA (corregido)
    res.status(201).json({
      success: true,
      message: `Héroe "${nuevo.nombre}" agregado exitosamente`,
      hero: nuevo,
      nextId: nuevoId + 1,
      totalHeroes: heroes.length,
      firebase: firebaseSuccess ? 'Guardado' : 'Falló',
      githubUpdate: githubResult
    });
    
  } catch (error) {
    console.error("Error al agregar héroe:", error);
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message 
    });
  }
});
    
  


//////////////
// server.js (Api_ML) - NUEVO ENDPOINT
app.get("/api/scrape-hero/:heroId", async (req, res) => {
  const { heroId } = req.params;

  try {
    console.log(`🌐 Obteniendo datos del héroe ${heroId} desde la web oficial...`);

    const response = await axios.get(`https://www.mobilelegends.com/hero/detail?channelid=2727282&heroid=${heroId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // Aquí iría la lógica de parseo (similar a la de Puppeteer, pero con axios y cheerio)
    // Como es complicado sin Puppeteer, te sugiero que uses el endpoint de tu bot (ml-scraper-api)
    // y luego consultes Firebase.

    // Alternativa: consultar directamente Firebase
    const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
    const data = snapshot.val();
    const heroes = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {}).filter(Boolean);

    const hero = heroes.find(h => h.data?.hero_id === parseInt(heroId));

    if (hero) {
      res.json({ success: true, source: 'firebase', data: hero.detail });
    } else {
      res.status(404).json({ success: false, error: 'Héroe no encontrado en Firebase' });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar héroe existente
app.put("/api/heroes/:id", async (req, res) => {
  try {
    const heroId = parseInt(req.params.id);
    const updatedData = req.body;
    
    // Buscar el héroe
    const heroIndex = heroes.findIndex(h => h.id === heroId);
    
    if (heroIndex === -1) {
      return res.status(404).json({ error: "Héroe no encontrado" });
    }
    
    // Validaciones básicas
    if (!updatedData.nombre || !updatedData.rol || !updatedData.winRate) {
      return res.status(400).json({ 
        error: "Datos incompletos", 
        campos_requeridos: ["nombre", "rol", "winRate"] 
      });
    }
    
    // Preservar el ID original
    updatedData.id = heroId;
    
    // Actualizar el héroe
    // Después de actualizar el héroe en el array local...
heroes[heroIndex] = updatedData;

// ✅ ADAPTAR Y GUARDAR EN FIREBASE
try {
  const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
  const data = snapshot.val();
  let firebaseHeroes = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {}).filter(Boolean);

  const skillsAdapted = (updatedData.skills || []).map(skill => ({
    type: skill.nombre || skill.type || 'Passive',
    description: skill.descripcion || skill.description || ''
  }));

  const existingIndex = firebaseHeroes.findIndex(h => h.data?.hero_id === heroId);
  const newHeroData = {
    data: { hero_id: heroId },
    detail: {
      heroId: heroId,
      name: updatedData.nombre,
      role: Array.isArray(updatedData.rol) ? updatedData.rol[0] : updatedData.rol,
      stats: { winRate: updatedData.winRate, pickRate: null, banRate: null },
      lore: "",
      skills: skillsAdapted,
      combos: null,
      poster: updatedData.imagen,
      roleIcon: updatedData.icon
    }
  };

  if (existingIndex !== -1) {
    firebaseHeroes[existingIndex] = newHeroData;
  } else {
    firebaseHeroes.push(newHeroData);
  }

  await db.ref('mlbb/heroes-detailed').set(firebaseHeroes);
  console.log(`✅ Héroe ${updatedData.nombre} actualizado en Firebase`);
} catch (fbError) {
  console.warn('⚠️ No se pudo actualizar en Firebase:', fbError.message);
}
    
    // Actualizar en GitHub
    const githubResult = await updateHeroesOnGitHub();
    
    res.json({
      success: true,
      message: `Héroe "${updatedData.nombre}" actualizado exitosamente`,
      hero: updatedData,
      githubUpdate: githubResult
    });
    
  } catch (error) {
    console.error("Error al actualizar héroe:", error);
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message 
    });
  }
});

// Eliminar héroe
app.delete("/api/heroes/:id", async (req, res) => {
  try {
    const heroId = parseInt(req.params.id);
    const heroIndex = heroes.findIndex(h => h.id === heroId);
    
    if (heroIndex === -1) {
      return res.status(404).json({ error: "Héroe no encontrado" });
    }
    
    const deletedHero = heroes[heroIndex];
    
    // Eliminar el héroe
    heroes.splice(heroIndex, 1);
    
    // Actualizar en GitHub
    const githubResult = await updateHeroesOnGitHub();
    
    res.json({
      success: true,
      message: `Héroe "${deletedHero.nombre}" eliminado exitosamente`,
      hero: deletedHero,
      totalHeroes: heroes.length,
      githubUpdate: githubResult
    });
    
  } catch (error) {
    console.error("Error al eliminar héroe:", error);
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message 
    });
  }
});

// Nueva ruta: Estadísticas del sistema
app.get("/api/stats", (req, res) => {
  const nextId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
  
  res.json({
    totalHeroes: heroes.length,
    nextId: nextId,
    recentHeroes: heroes.slice(-5).reverse().map(h => ({
      id: h.id,
      nombre: h.nombre,
      rol: h.rol,
      icon: Array.isArray(h.icon) ? h.icon[0] : h.icon
    })),
    rolesCount: contarRoles(),
    githubSync: !!GITHUB_TOKEN,
    lastUpdate: new Date().toISOString()
  });
});

// Nueva ruta: Exportar todos los datos como JSON
app.get("/api/export", (req, res) => {
  res.json(heroes);
});

// Ruta para forzar actualización en GitHub
app.post("/api/update-github", async (req, res) => {
  try {
    const result = await updateHeroesOnGitHub();
    res.json({
      success: result.success,
      message: result.message,
      totalHeroes: heroes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Función auxiliar para contar roles
function contarRoles() {
  const rolesCount = {};
  heroes.forEach(hero => {
    if (Array.isArray(hero.rol)) {
      hero.rol.forEach(rol => {
        rolesCount[rol] = (rolesCount[rol] || 0) + 1;
      });
    } else {
      rolesCount[hero.rol] = (rolesCount[hero.rol] || 0) + 1;
    }
  });
  return rolesCount;
}

// Puerto dinámico para Render/Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel de administración: http://localhost:${PORT}/admin`);
  console.log(`📈 Total de héroes cargados: ${heroes.length}`);
  console.log(`🔗 GitHub Sync: ${GITHUB_TOKEN ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`🎮 Héroes disponibles: ${heroes.slice(0, 3).map(h => h.nombre).join(', ')}${heroes.length > 3 ? ` y ${heroes.length - 3} más` : ''}`);
});
