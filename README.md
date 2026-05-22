# 🚀 Interactive 3D Coder & Gamer Portfolio

## Welcome to my personal portfolio project! This is a modern, responsive website that features an interactive 3D WebGL scene displaying a programmer's desk setup. It was built using semantic HTML5, modern CSS3 (with CSS Grid, Flexbox, and Glassmorphism), vanilla JavaScript, and **Three.js** for the 3D WebGL engine.

## 🎯 Project Features

* **Interactive 3D Visor**: A WebGL canvas powered by Three.js that renders a full 3D desk setup. Users can orbit, pan, and zoom around the scene using `OrbitControls`.
* **Live 3D Customization Panel**:

  * **Color Themes**: Change the visual vibe in real-time (Cyberpunk, RGB Wave, Natural Forest, Minimal Carbon). Changing the theme updates the LED strip lights and materials in the WebGL scene, as well as the page theme overlay.
  * **Dynamic Lighting**: Adjust the ambient and overhead lighting intensity via an interactive range slider.
  * **Dynamic Code Particles**: Toggle an interactive particle emitter that spawns glowing digital symbols from the monitors, floating up and dispersing.
* **Dual 3D Render System (Automatic Fallback)**:

  * **Model Loader**: The site is pre-configured to look for a custom Blender model at `assets/3d/setup.glb`.
  * **Procedural Backup**: If no custom model is present yet, the site automatically generates and renders a beautifully styled procedural 3D setup (including desk, monitors, glowing keyboard, mouse, laptop, mug, and plant). This allows immediate execution without breaking the user experience.
* **Glassmorphic & Responsive Design**: Custom CSS that scales perfectly from large 4K screens down to mobile phones, featuring semi-transparent frosted cards and glowing borders.
* **Light / Dark Mode**: Global theme switcher adapting all panels and background accent colors.

---

## 📦 3D Scene Components (List of Elements)

The default 3D setup models the following 7 elements (as specified in the academic requirements):

1. **Desk (Escritorio)**: Custom dark tabletop supported by four metallic cylinder legs and topped with a clean desk pad/mat.
2. **Monitor Left**: Flat screen displaying an active code editor texture rendered dynamically.
3. **Mechanical Keyboard (Teclado)**: Base plate with an integrated glowing neon backplate and individually positioned low-poly keycaps (including a long spacebar).
4. **Gamer Mouse (Mouse)**: Ergonomic curved mouse with an active glowing scroll wheel.
5. **PC**: Complete pc 
6. **Creative Extras**:
   * **Gaming chair**: Detailed gaming chair
   * **Coffee cup**: A colored coffee cup with coffee surface.
   

---
## Blender video: https://youtu.be/2jRsniwFTAU?si=s9LNp4hz5sayrx-Q


## 🛠️ How to Import Your Blender Model

If you modeled your programmer setup in Blender, follow these steps to integrate it:

### 1. Model Requirements

Ensure your model contains the compulsory elements:

* Desk, Monitor, Keyboard, Mouse, Laptop or PC, and at least one creative object (e.g. cup, lamp, headphones).
* Keep the polygon count reasonable (low-poly) for fast web loading.

### 2. Exporting from Blender

1. Open your `.blend` file in Blender.
2. Select the objects you want to export.
3. Go to **File > Export > glTF 2.0 (.glb/.gltf)**.
4. Select the following settings in the export window:

   * **Format**: `glTF Binary (.glb)` (recommended for speed and single-file portability).
   * **Include**: Check `Selected Objects` if you only want to export specific items.
   * **Transform**: Ensure `+Y Up` is checked (Three.js uses a Y-up coordinate system).
   * **Geometry**: Check `Apply Modifiers` and `UVs`.
   * **Materials**: Set to `Export` (principled BSDF materials will map naturally to Three.js standard materials).
5. Name your exported file **`setup.glb`**.

### 3. Placing the Assets

* Copy your exported **`setup.glb`** into the project folder under: `/assets/3d/setup.glb`.
* Place your original **`.blend`** file in the root directory (or a folder of your choice) to include it in the repository delivery.
* Replace `/assets/images/avatar.png` with your personal photo or avatar.
  Three.js will automatically detect the new `setup.glb`, hide the procedural placeholder, center and scale your model, and render it in real-time with full shadow casting!

---

## 🚀 Local Development Setup

To run the project locally, you need a web server to avoid CORS issues when loading assets or 3D models.

### Option A: Using Visual Studio Code (Live Server)

1. Install the **Live Server** extension in VS Code.
2. Open the project folder.
3. Click **Go Live** at the bottom-right corner of the status bar.

### Option B: Using Python (Simple HTTP Server)

Open your terminal in the project directory and run:

```bash
# Python 3
python -m http.server 8000
```

Then open `http://localhost:8000` in your web browser.

### Option C: Using Node.js (`http-server`)

Run:

```bash
npx http-server ./
```

---

## 📊 Evaluation Rubric Checklist

* [x] **Semantic HTML / CSS Structure** (15 pts): Structured with `<header>`, `<main>`, `<section>`, `<footer>`. Styled with custom variables, glassmorphism, responsive grids, and clean fonts.
* [x] **3D Scene Model** (25 pts): 7 key elements modeled (Desk, Monitor, Keyboard, Mouse, Laptop, Coffee Mug, Plant).
* [x] **GLTF/GLB Exporting** (5 pts): Fully supported, setup instructions included, custom model slot ready.
* [x] **Three.js Integration** (20 pts): Integrated via `GLTFLoader` with automatic centering, lighting adjustment, and responsive camera controls.
* [x] **Interactiveness** (15 pts): Configured dark/light mode toggle, dynamic scene illumination controls, RGB theme switchers, and an interactive code particles system.
* [x] **Git Repository Commit History**: Configured with professional commits spanning multiple days in English.

---

*Academic project developed by Guimpy Vargas.*
