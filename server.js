const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Octokit } = require("@octokit/rest");

const app = express();
app.use(cors());
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
  console.error("❌ Error al cargar héroes.js:", error.message);
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

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ 
    mensaje: "API Mobile Legends funcionando 🚀",
    endpoints: {
      heroes: "/api/heroes",
      heroById: "/api/heroes/:id",
      adminPanel: "/admin",
      stats: "/api/stats",
      export: "/api/export",
      update: "/api/update-github"
    },
    totalHeroes: heroes.length,
    nextId: heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1,
    version: "2.0.0",
    githubSync: !!GITHUB_TOKEN
  });
});

// Listar todos los héroes
app.get("/api/heroes", (req, res) => {
  res.json(heroes);
});

// Obtener héroe por ID
app.get("/api/heroes/:id", (req, res) => {
  const hero = heroes.find(h => h.id === parseInt(req.params.id));
  hero ? res.json(hero) : res.status(404).json({ error: "Héroe no encontrado" });
});

// Agregar nuevo héroe
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
      counters: nuevoHeroe.counters || [], // Agregar counters
      skills: nuevoHeroe.skills || [],
      linea: nuevoHeroe.linea || ""
    };
    
    // Agregar al array en memoria
    heroes.push(nuevo);
    
    // Actualizar en GitHub
    const githubResult = await updateHeroesOnGitHub();
    
    res.status(201).json({
      success: true,
      message: `Héroe "${nuevo.nombre}" agregado exitosamente`,
      hero: nuevo,
      nextId: nuevoId + 1,
      totalHeroes: heroes.length,
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
    heroes[heroIndex] = updatedData;
    
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

