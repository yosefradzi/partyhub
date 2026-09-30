# 🍍 PartyHub - PWA de Minijuegos para Jugar con Amigos

Una **Progressive Web App (PWA)** multijugador en tiempo real diseñada para jugar en grupo desde el móvil o el ordenador a través de **salas con código**.

---

## 🎮 Minijuegos Incluidos

### 1. 🍍 Tutti Frutti / Basta / Stop
* **Ruleta de Letras:** Animación de giro con sonidos y revelación de la letra de la ronda.
* **Categorías:** Nombre, País/Ciudad, Animal, Fruta/Comida, Cosa/Objeto, Color/Marca (¡y el anfitrión puede agregar o quitar categorías a su gusto!).
* **Botón ¡STOP!:** Al pulsar el botón de basta, suena la sirena de alarma y comienza una cuenta regresiva de 10 segundos para que los demás terminen sus palabras.
* **Fase de Votación y Revisión:**
  * Detección automática: palabras vacías o que no inicien con la letra puntúan **0 pts**.
  * Detección automática de duplicados entre jugadores (**+5 pts** si repetida, **+10 pts** si única).
  * Votación interactiva en vivo entre amigos para aprobar o anular palabras dudosas.
* **Podio Final:** Animación con fuegos artificiales de confeti y tabla acumulativa de posiciones.

### 2. 🕵️ El Impostor (Deducción Social)
* **Tarjeta Secreta:** Mantén pulsada la pantalla para revelar la palabra secreta en privado.
* **El Impostor:** 1 o 2 jugadores reciben únicamente la categoría y el rol de impostor.
* **Debate y Votación:** Ronda de pistas en vivo y votación para descubrir al sospechoso.
* **Robo de Victoria:** Si descubren al impostor, este tiene una última oportunidad de ganar si adivina la palabra secreta.

### 3. 💣 La Bomba de Palabras (Contrarreloj)
* **Reto por Sílabas:** La pantalla muestra una sílaba (ej: *"Contiene MA"*).
* **Mecha y Reloj:** La bomba pasa de jugador a jugador en tiempo real.
* **3 Vidas (❤️❤️❤️):** Si se acaba el tiempo antes de escribir una palabra válida, ¡la bomba estalla y pierdes una vida! El último sobreviviente se lleva la victoria.

---

## 🚀 Cómo Iniciar el Proyecto

### 1. Iniciar en Modo Desarrollo (Recomendado)
Para tener recarga en vivo (HMR) tanto en el cliente como en el servidor:

```bash
cd /Users/yosefradzi/.gemini/antigravity/scratch/minijuegos-party
npm run dev
```

* **Frontend (Vite):** [http://localhost:5173](http://localhost:5173)
* **Backend (Socket.io):** [http://localhost:3001](http://localhost:3001)

### 2. Iniciar en Modo Producción (Servidor Único)
Compila el frontend y sirve todo desde un solo puerto:

```bash
npm run build:client
npm start
```
Abre en tu navegador: [http://localhost:3001](http://localhost:3001)

---

## 📱 Jugar con Amigos en la Misma Red Wi-Fi

Para que tus amigos se conecten desde sus móviles a tu ordenador:
1. Averigua la IP local de tu ordenador (en Mac: `ipconfig getifaddr en0` o en Ajustes de Red, ej: `192.168.1.45`).
2. Inicia la app (`npm start` o `npm run dev`).
3. Tus amigos abren en el navegador de su teléfono: `http://192.168.1.45:3001` (o `:5173`).
4. ¡Crea una sala, dales el código de 4 letras o presiona **Compartir** para enviarles el enlace directo!

---

## 📲 Cómo Instalar la PWA en el Móvil

* **En Android (Chrome):**
  1. Abre el enlace de la sala en Chrome.
  2. Pulsa el botón **"Instalar como App PWA"** en la pantalla de inicio o en los 3 puntos de Chrome -> *"Instalar aplicación"*.
* **En iPhone / iPad (Safari):**
  1. Abre el enlace en Safari.
  2. Pulsa el botón de **Compartir** (icono de cuadrado con flecha hacia arriba).
  3. Selecciona **"Agregar a pantalla de inicio"** (Add to Home Screen).
  4. ¡Listo! Se abrirá como una aplicación nativa en pantalla completa sin barra de navegación.

---

## 🛠️ Estructura del Código

```
minijuegos-party/
├── server/
│   ├── index.js             # Servidor Express + Socket.io en tiempo real
│   ├── rooms.js             # Gestor de salas, anfitriones, chat y estados
│   └── games/
│       ├── tutifruti.js     # Lógica y validación del Tutti Frutti
│       ├── impostor.js      # Lógica de El Impostor y palabras secretas
│       └── bomba.js         # Lógica de La Bomba y turnos contrarreloj
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.tsx     # Selector de avatar/apodo, crear/unir y botón PWA
│   │   │   ├── Lobby.tsx    # Sala de espera, selector de juegos y chat
│   │   │   └── games/
│   │   │       ├── TuttiFruttiView.tsx  # Ruleta, campos, STOP y votación
│   │   │       ├── ImpostorView.tsx     # Tarjeta oculta, debate y votación
│   │   │       └── BombaView.tsx        # Bomba animada, mecha y vidas
│   │   ├── context/
│   │   │   └── SocketContext.tsx        # Conexión Socket.io reactiva
│   │   ├── utils/
│   │   │   └── soundEffects.ts          # Síntesis de sonido Web Audio y vibración háptica
│   │   └── types.ts                     # Interfaces TypeScript
│   └── vite.config.ts                   # Configuración Vite + Tailwind v4 + PWA
└── package.json
```

---

## 🌐 Despliegue en la Nube (Gratis)
Puedes desplegar este proyecto en plataformas como **Render**, **Railway** o **Fly.io**:
1. Sube este repositorio a GitHub.
2. Crea un **Web Service** en Render o Railway.
3. Comando de construcción: `npm install && npm run build:client`
4. Comando de inicio: `npm start`
5. ¡Listo! Tendrás una URL pública HTTPS para jugar con amigos desde cualquier parte del mundo.
