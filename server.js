const express = require("express");
const cors = require("cors");
const heroes = require("./heroes");

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ mensaje: "API Mobile Legends funcionando 🚀" });
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
app.post("/api/heroes", (req, res) => {
  const nuevo = {
    id: heroes.length + 1,
    nombre: req.body.nombre,
    rol: req.body.rol,
    winRate: req.body.winRate,
    imagen: req.body.imagen,
    skills: req.body.skills || []
  };
  heroes.push(nuevo);
  res.status(201).json(nuevo);
});

// Puerto dinámico para Render/Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
