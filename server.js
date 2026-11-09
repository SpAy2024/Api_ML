//server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Octokit } = require("@octokit/rest");
const app = express();

const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const axios = require('axios');

function sanitize(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\n\r]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
  serviceAccount = JSON.parse(json);
  console.log('✅ Firebase configurado desde variable de entorno');
} else {
  serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Firebase configurado desde archivo local');
}

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://comidas-b1396-default-rtdb.firebaseio.com"
});
const db = getDatabase(firebaseApp);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'https://spay2024.github.io', 'https://api-ml-0c18.onrender.com',
      'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'
    ];
    if (allowedOrigins.indexOf(origin) !== -1) callback(null, true);
    else callback(new Error('No permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN, userAgent: 'MLBB API v2.0' });
const REPO_OWNER = "SpAy2024";
const REPO_NAME = "Api_ML";
const HEROES_FILE_PATH = "heroes.js";

let heroes = [];
try {
  heroes = require("./heroes.js");
  console.log(`✅ ${heroes.length} héroes cargados desde heroes.js`);
} catch (error) { heroes = []; }

async function updateHeroesOnGitHub() {
  try {
    if (!GITHUB_TOKEN) return { success: false, message: "GitHub token no configurado" };
    const { data: fileData } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: HEROES_FILE_PATH });
    const content = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
    const contentBase64 = Buffer.from(content).toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER, repo: REPO_NAME, path: HEROES_FILE_PATH,
      message: `Actualización automática: ${new Date().toLocaleString()}`,
      content: contentBase64, sha: fileData.sha,
      committer: { name: 'MLBB API Bot', email: 'bot@mlbb-api.com' },
      author: { name: 'MLBB API', email: 'api@mlbb.com' }
    });
    fs.writeFileSync(path.join(__dirname, "heroes.js"), content, "utf8");
    return { success: true, message: "Archivo actualizado en GitHub" };
  } catch (error) {
    return { success: false, message: "Error: " + error.message };
  }
}

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));
app.get("/admin-style.css", (req, res) => res.sendFile(path.join(__dirname, "admin-style.css"), { headers: { "Content-Type": "text/css" } }));
app.get("/admin-script.js", (req, res) => res.sendFile(path.join(__dirname, "admin-script.js"), { headers: { "Content-Type": "application/javascript" } }));

app.post("/api/heroes", async (req, res) => {
  try {
    const nuevoHeroe = req.body;
    if (!nuevoHeroe.nombre || !nuevoHeroe.rol || !nuevoHeroe.winRate) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // ✅ Usar el ID oficial si viene, si no, generar uno
    const nuevoId = nuevoHeroe.heroId || (heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1);

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
    heroes.push(nuevo);

    let firebaseSuccess = false;
    try {
      const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
      const data = snapshot.val();
      let firebaseHeroes = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {}).filter(Boolean);

      const skillsAdapted = (nuevo.skills || []).map(skill => ({
        type: sanitize(skill.nombre || skill.type || 'Passive'),
        description: sanitize(skill.descripcion || skill.description || ''),
        imagen: sanitize(skill.imagen || '')
      }));
      const countersAdapted = (nuevo.counters || []).map(c => sanitize(c));

      // ✅ Buscar si ya existe por hero_id (evita duplicados)
      const existingIndex = firebaseHeroes.findIndex(h => h.data?.hero_id === nuevoId);
      const newHeroData = {
        data: { hero_id: nuevoId },
        detail: {
          heroId: nuevoId,
          name: sanitize(nuevo.nombre),
          role: sanitize(Array.isArray(nuevo.rol) ? nuevo.rol[0] : nuevo.rol),
          stats: { winRate: sanitize(nuevo.winRate), pickRate: sanitize(nuevo.pickRate || '0%'), banRate: sanitize(nuevo.banRate || '0%') },
          lore: sanitize(nuevo.lore || "Descripción no disponible."),
          skills: skillsAdapted,
          combos: [],
          counters: countersAdapted,
          poster: sanitize(nuevo.imagen),
          roleIcon: sanitize(nuevo.icon)
        }
      };
      if (existingIndex !== -1) firebaseHeroes[existingIndex] = newHeroData;
      else firebaseHeroes.push(newHeroData);
      await db.ref('mlbb/heroes-detailed').set(firebaseHeroes);
      firebaseSuccess = true;
    } catch (fbError) { console.warn('⚠️ Firebase:', fbError.message); }

    const githubResult = await updateHeroesOnGitHub();
    res.status(201).json({
      success: true, message: `Héroe "${nuevo.nombre}" guardado`,
      hero: nuevo, nextId: nuevoId + 1, totalHeroes: heroes.length,
      firebase: firebaseSuccess ? 'Guardado' : 'Falló', githubUpdate: githubResult
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno", details: error.message });
  }
});

app.get("/api/scrape-hero/:heroId", async (req, res) => {
  const { heroId } = req.params;
  try {
    const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
    const data = snapshot.val();
    const heroes = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {}).filter(Boolean);
    const hero = heroes.find(h => h.data?.hero_id === parseInt(heroId));
    if (hero) res.json({ success: true, source: 'firebase', data: hero.detail });
    else res.status(404).json({ success: false, error: 'Héroe no encontrado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/heroes/:id", async (req, res) => {
  try {
    const heroId = parseInt(req.params.id);
    const updatedData = req.body;
    const heroIndex = heroes.findIndex(h => h.id === heroId);
    if (heroIndex === -1) return res.status(404).json({ error: "Héroe no encontrado" });
    updatedData.id = heroId;
    heroes[heroIndex] = updatedData;

    try {
      const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
      const data = snapshot.val();
      let firebaseHeroes = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {}).filter(Boolean);
      const skillsAdapted = (updatedData.skills || []).map(skill => ({
        type: sanitize(skill.nombre || skill.type || 'Passive'),
        description: sanitize(skill.descripcion || skill.description || ''),
        imagen: sanitize(skill.imagen || '')
      }));
      const countersAdapted = (updatedData.counters || []).map(c => sanitize(c));
      const existingIndex = firebaseHeroes.findIndex(h => h.data?.hero_id === heroId);
      const newHeroData = {
        data: { hero_id: heroId },
        detail: {
          heroId, name: sanitize(updatedData.nombre), role: sanitize(updatedData.rol),
          stats: { winRate: sanitize(updatedData.winRate), pickRate: '0%', banRate: '0%' },
          lore: "Descripción no disponible.", skills: skillsAdapted, combos: [],
          counters: countersAdapted, poster: sanitize(updatedData.imagen), roleIcon: sanitize(updatedData.icon)
        }
      };
      if (existingIndex !== -1) firebaseHeroes[existingIndex] = newHeroData;
      else firebaseHeroes.push(newHeroData);
      await db.ref('mlbb/heroes-detailed').set(firebaseHeroes);
    } catch (fbError) { console.warn('⚠️ Firebase:', fbError.message); }

    const githubResult = await updateHeroesOnGitHub();
    res.json({ success: true, message: `Héroe "${updatedData.nombre}" actualizado`, hero: updatedData, githubUpdate: githubResult });
  } catch (error) {
    res.status(500).json({ error: "Error interno", details: error.message });
  }
});

app.delete("/api/heroes/:id", async (req, res) => {
  try {
    const heroId = parseInt(req.params.id);
    const heroIndex = heroes.findIndex(h => h.id === heroId);
    if (heroIndex === -1) return res.status(404).json({ error: "Héroe no encontrado" });
    const deletedHero = heroes[heroIndex];
    heroes.splice(heroIndex, 1);
    const githubResult = await updateHeroesOnGitHub();
    res.json({ success: true, message: `Héroe "${deletedHero.nombre}" eliminado`, hero: deletedHero, totalHeroes: heroes.length, githubUpdate: githubResult });
  } catch (error) {
    res.status(500).json({ error: "Error interno", details: error.message });
  }
});

app.get("/api/stats", (req, res) => {
  const nextId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
  res.json({
    totalHeroes: heroes.length, nextId,
    recentHeroes: heroes.slice(-5).reverse().map(h => ({ id: h.id, nombre: h.nombre, rol: h.rol, icon: Array.isArray(h.icon) ? h.icon[0] : h.icon })),
    githubSync: !!GITHUB_TOKEN, lastUpdate: new Date().toISOString()
  });
});

app.get("/api/export", (req, res) => res.json(heroes));

app.post("/api/update-github", async (req, res) => {
  try {
    const result = await updateHeroesOnGitHub();
    res.json({ success: result.success, message: result.message, totalHeroes: heroes.length, timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel de administración: http://localhost:${PORT}/admin`);
  console.log(`📈 Total de héroes cargados: ${heroes.length}`);
  console.log(`🔗 GitHub Sync: ${GITHUB_TOKEN ? '✅ Configurado' : '❌ No configurado'}`);
});
