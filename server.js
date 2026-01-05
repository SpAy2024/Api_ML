const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const heroes = require("./heroes");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      export: "/api/export"
    },
    totalHeroes: heroes.length,
    version: "1.0.0"
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

// Agregar nuevo héroe (MEJORADA para guardar en archivo)
app.post("/api/heroes", (req, res) => {
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
      skills: nuevoHeroe.skills || [],
      linea: nuevoHeroe.linea || ""
    };
    
    // Agregar al array en memoria
    heroes.push(nuevo);
    
    // Guardar en el archivo heroes.js
    guardarHeroesEnArchivo();
    
    res.status(201).json({
      success: true,
      message: `Héroe "${nuevo.nombre}" agregado exitosamente`,
      hero: nuevo,
      nextId: nuevoId + 1,
      totalHeroes: heroes.length
    });
    
  } catch (error) {
    console.error("Error al agregar héroe:", error);
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
    rolesCount: contarRoles()
  });
});

// Nueva ruta: Exportar todos los datos como JSON
app.get("/api/export", (req, res) => {
  res.json(heroes);
});

// Función para guardar héroes en el archivo
function guardarHeroesEnArchivo() {
  try {
    const contenido = `const heroes = ${JSON.stringify(heroes, null, 2)};\n\nmodule.exports = heroes;`;
    fs.writeFileSync(path.join(__dirname, "heroes.js"), contenido, "utf8");
    console.log(`📁 Archivo heroes.js actualizado (${heroes.length} héroes)`);
  } catch (error) {
    console.error("❌ Error al guardar archivo:", error);
  }
}

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
  console.log(`🎮 Héroes disponibles: ${heroes.map(h => h.nombre).join(', ')}`);
});