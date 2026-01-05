const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cargar héroes
const HEROES_FILE = path.join(__dirname, "heroes.js");
let heroes = require("./heroes.js");

// Guardar héroes
function saveHeroes() {
  try {
    const content = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
    fs.writeFileSync(HEROES_FILE, content, "utf8");
    console.log(`✅ Guardados ${heroes.length} héroes`);
    return true;
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    return false;
  }
}

// ========== RUTAS DEL PANEL ==========
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-style.css"));
});

app.get("/admin-script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-script.js"));
});

// ========== API ENDPOINTS ==========
app.get("/", (req, res) => {
  res.json({
    mensaje: "API Mobile Legends FUNCIONANDO 🚀",
    totalHeroes: heroes.length,
    nextId: heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1,
    endpoints: {
      heroes: "/api/heroes",
      stats: "/api/stats",
      admin: "/admin"
    }
  });
});

// Obtener todos los héroes
app.get("/api/heroes", (req, res) => {
  res.json(heroes);
});

// Obtener héroe por ID
app.get("/api/heroes/:id", (req, res) => {
  const hero = heroes.find(h => h.id === parseInt(req.params.id));
  if (hero) {
    res.json(hero);
  } else {
    res.status(404).json({ error: "Héroe no encontrado" });
  }
});

// Agregar nuevo héroe
app.post("/api/heroes", (req, res) => {
  try {
    const nuevoHeroe = req.body;
    
    // Validaciones
    if (!nuevoHeroe.nombre || !nuevoHeroe.rol || !nuevoHeroe.winRate) {
      return res.status(400).json({ error: "Nombre, rol y winRate son obligatorios" });
    }
    
    // Calcular nuevo ID
    const nuevoId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
    
    // Crear héroe
    const hero = {
      id: nuevoId,
      nombre: nuevoHeroe.nombre,
      rol: nuevoHeroe.rol,
      winRate: nuevoHeroe.winRate,
      imagen: nuevoHeroe.imagen || "https://via.placeholder.com/300x400?text=MLBB+Hero",
      icon: nuevoHeroe.icon || "https://via.placeholder.com/100x100?text=Icon",
      guia: nuevoHeroe.guia || "",
      skills: nuevoHeroe.skills || [],
      linea: nuevoHeroe.linea || ""
    };
    
    // Validar 4 habilidades
    if (hero.skills.length !== 4) {
      return res.status(400).json({ error: "Deben ser exactamente 4 habilidades" });
    }
    
    // Agregar y guardar
    heroes.push(hero);
    saveHeroes();
    
    res.status(201).json({
      success: true,
      message: `🎉 Héroe "${hero.nombre}" creado con ID ${hero.id}`,
      hero: hero,
      nextId: nuevoId + 1,
      totalHeroes: heroes.length
    });
    
  } catch (error) {
    res.status(500).json({ error: "Error interno: " + error.message });
  }
});

// Actualizar héroe
app.put("/api/heroes/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = heroes.findIndex(h => h.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Héroe no encontrado" });
    }
    
    const updatedData = req.body;
    updatedData.id = id; // Mantener ID
    
    heroes[index] = updatedData;
    saveHeroes();
    
    res.json({
      success: true,
      message: `✏️ Héroe "${updatedData.nombre}" actualizado`,
      hero: updatedData
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar héroe
app.delete("/api/heroes/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const initialLength = heroes.length;
    
    heroes = heroes.filter(h => h.id !== id);
    
    if (heroes.length === initialLength) {
      return res.status(404).json({ error: "Héroe no encontrado" });
    }
    
    saveHeroes();
    
    res.json({
      success: true,
      message: `🗑️ Héroe eliminado`,
      totalHeroes: heroes.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas
app.get("/api/stats", (req, res) => {
  const nextId = heroes.length > 0 ? Math.max(...heroes.map(h => h.id)) + 1 : 1;
  
  res.json({
    totalHeroes: heroes.length,
    nextId: nextId,
    recentHeroes: heroes.slice(-5).reverse()
  });
});

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
  console.log(`📊 Panel: http://localhost:${PORT}/admin`);
  console.log(`👤 Total héroes: ${heroes.length}`);
});
