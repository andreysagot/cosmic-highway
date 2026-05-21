```markdown
# 🌌 Autopista Cósmica 3D (Cosmic Highway)

Un sintetizador visual interactivo y reactivo de audio en tiempo real construido con JavaScript moderno (ES6+), WebGL y Three.js. La arquitectura simula un viaje a hipervelocidad a través de un túnel espacial, un fondo estelar cinemático y un agujero negro con lente gravitacional, todos reaccionando dinámicamente a las frecuencias de audio capturadas en tiempo real.

---

## ✨ Características Principales

* **Análisis Espectral de Audio en Tiempo Real:** Utiliza la API Web Audio nativa y Transformadas Rápidas de Fourier (FFT) para separar y analizar dinámicas de frecuencias (Sub-graves, Graves, Medios y Agudos).
* **Geometría Procedimental y Coordenadas Polares:** El túnel espacial se construye dinámicamente mediante matemáticas polares en la CPU, deformando su radio y curvatura según la inercia del audio.
* **Shaders Personalizados Avanzados (GLSL):**
  * *Lente Gravitacional de Einstein:* Distorsión espacial hiperrealista alrededor del Agujero Negro.
  * *Corrimiento Doppler:* Efectos de *blueshift* y *redshift* en el disco de acreción basados en el ángulo de visión de la cámara.
  * *Difracción Telescópica (Spikes):* Estrellas renderizadas con patrones de difracción aditivos similares a los capturados por el telescopio James Webb.
* **Rendimiento de Producción (Cero Fugas de Memoria):** Ciclo de renderizado altamente optimizado con asignación de memoria constante O(1). Todas las operaciones vectoriales utilizan variables en caché preasignadas, eliminando por completo los micro-cortes producidos por el *Garbage Collector*.
* **Perfilado DPR Automático (Throttling):** Detección de dispositivos móviles para limitar el *Device Pixel Ratio* (DPR), previniendo el estrangulamiento térmico y el consumo excesivo de batería.

---

## 📂 Estructura de la Arquitectura

El proyecto sigue un patrón de diseño limpio, separando la lógica de la CPU, los shaders de la GPU, los controladores de entrada y el ciclo de vida de las entidades.

```text
├── src/
│   ├── config/
│   │   └── AppConfig.js          # Ajustes físicos, límites de renderizado y configuración FFT
│   ├── core/
│   │   ├── Engine.js             # Inicialización WebGL, luces, ResizeObserver y Throttling
│   │   ├── EntityManager.js      # Orquestador del ciclo de vida de los modelos 3D
│   │   └── index.js              # Barril de exportaciones del núcleo
│   ├── entities/
│   │   ├── AudioHighway.js       # Matriz polar reactiva del túnel principal
│   │   ├── Stars.js              # Enjambre de partículas con destellos cinemáticos
│   │   ├── BlackHole.js          # Agujero negro masivo con disco de acreción
│   │   └── index.js              # Barril de exportaciones de entidades
│   ├── audio/
│   │   └── AudioManager.js       # Web Audio API, analizador FFT y suavizado (ADSR)
│   ├── ui/
│   │   └── UIManager.js          # Gestión del DOM, overlays y modo Fullscreen nativo
│   ├── utils/
│   │   └── MathUtils.js          # Funciones de utilidad pura (Clamp, Lerp, Smoothstep)
│   └── App.js                    # Bucle principal (Render Loop) y punto de entrada
├── index.html                    # Lienzo DOM y punto de entrada para Vite
├── style.css                     # Estilos UI / Reset global sin scroll
└── package.json                  # Dependencias y scripts de empaquetado

```

---

## 🚀 Instalación y Desarrollo Local

Este proyecto utiliza **Vite** para ofrecer un entorno de desarrollo ultrarrápido con resolución nativa de módulos ES6+.

### Requisitos Previos

* [Node.js](https://nodejs.org/) (versión 16+ recomendada)
* Un navegador moderno con soporte para WebGL 2.0 y Web Audio API.

### 🌐 Demo
Puedes ver la experiencia en funcionamiento aquí:
**[👉 Visitar Autopista Cósmica](https://highway.sagot.space)**

*(Nota: Asegúrate de habilitar el micrófono o audio cuando el navegador lo solicite para que las visualizaciones reaccionen a la música o al sonido de tu entorno).*

### Pasos de Instalación

1. **Clonar el repositorio:**
```bash
git clone [https://github.com/andreysagot/cosmic-highway.git](https://github.com/andreysagot/cosmic-highway.git)
cd autopista-cosmica

```


2. **Instalar dependencias de Node:**
```bash
npm install

```


3. **Iniciar el servidor local (Desarrollo):**
```bash
npm run dev

```


4. **Abrir la simulación:**
Haz clic en el enlace local proporcionado por la terminal (usualmente `http://localhost:5173`).

### Compilar para Producción

Para generar los archivos estáticos minimizados y optimizados para desplegar en tu hosting:

```bash
npm run build

```

---

## 🎛️ Uso y Controles

* **Botón de Inicialización:** Haz clic en "Iniciar Experiencia" para conectar el micrófono o canal estéreo virtual.
* **Pantalla Completa:** Recomendado para máxima inmersión.
* **Panel de Control:** Permite activar o desactivar la geometría de la "Autopista" para aislar visualmente el vuelo estelar y el agujero negro de fondo.

---

## 🛠️ Stack Tecnológico

* **Core:** Vanilla JavaScript (ES2022+)
* **Gráficos 3D:** [Three.js](https://threejs.org/) (^0.165.0)
* **Shaders:** GLSL (OpenGL Shading Language)
* **Audio:** Web Audio API (Analizador FFT de 512 bins)
* **Monitorización:** Stats.js (FPS y latencia)
* **Build Tool:** [Vite](https://vitejs.dev/)

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**.

```

```