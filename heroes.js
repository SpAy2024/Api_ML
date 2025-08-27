const heroes = [
  {
    id: 1,
    nombre: "Alucard",
    rol: "Fighter",
    winRate: "52%",
    imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/100_262dcfb1e67c19e273ac2409098c8b5d.png",
    skills: [
      {
        nombre: "Groundsplitter",
        descripcion: "Alucard salta hacia adelante y causa daño físico a los enemigos.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/alucard_groundsplitter.png"
      },
      {
        nombre: "Whirling Smash",
        descripcion: "Alucard golpea en círculo causando daño a los enemigos cercanos.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/alucard_whirlingsmash.png"
      },
      {
        nombre: "Fission Wave",
        descripcion: "Lanza una onda de energía hacia adelante causando gran daño.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/alucard_fissionwave.png"
      }
    ]
  },
  {
    id: 2,
    nombre: "Miya",
    rol: "Marksman",
    winRate: "48%",
    imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/101_7d31e1d8af5e4e41f60be1c3981c9b3a.png",
    skills: [
      {
        nombre: "Fission Shot",
        descripcion: "Miya dispara flechas dobles, causando más daño.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/miya_fissionshot.png"
      },
      {
        nombre: "Rain of Arrows",
        descripcion: "Dispara una lluvia de flechas que ralentiza y daña a los enemigos.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/miya_rainofarrows.png"
      },
      {
        nombre: "Turbo Stealth",
        descripcion: "Miya se vuelve invisible y aumenta su velocidad de ataque.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/miya_turbostealth.png"
      }
    ]
  },
  {
    id: 3,
    nombre: "Eudora",
    rol: "Mage",
    winRate: "55%",
    imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage/102_5a5a1a3cf6a724b456f25c759e6fef11.png",
    skills: [
      {
        nombre: "Forked Lightning",
        descripcion: "Eudora lanza rayos hacia adelante causando daño mágico.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/eudora_forkedlightning.png"
      },
      {
        nombre: "Electric Arrow",
        descripcion: "Lanza un rayo que aturde al objetivo.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/eudora_electricarrow.png"
      },
      {
        nombre: "Thunderstruck",
        descripcion: "Invoca un rayo masivo que inflige gran daño mágico.",
        imagen: "https://akmweb.youngjoygame.com/web/svnres/img/mlbb/skill/eudora_thunderstruck.png"
      }
    ]
  }
];

module.exports = heroes;
