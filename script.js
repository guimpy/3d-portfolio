/* ==========================================================================
   WEBGL & PORTFOLIO ENGINE - SEBASTIÁN VARGAS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // UI & DOM Interactions
    // ----------------------------------------------------------------------
    initUI();

    // ----------------------------------------------------------------------
    // Three.js 3D Viewport Setup
    // ----------------------------------------------------------------------
    init3D();
});

// Global Application State for 3D Scene
let scene, camera, renderer, controls;
let ambientLight, directionalLight;
let ledLights = []; // LED light objects for themes
let deskMaterial, screenMaterials = [], keyboardBacklight;
let proceduralGroup, customModelGroup;
let codeParticles = [];
let particlesEnabled = true;
let activeTheme = 'cyberpunk';
let rotationSpeed = 0.003;
let autoRotate = true;

// --------------------------------------------------------------------------
// 1. UI Navigation, Theme and Mobile Menu Setup
// --------------------------------------------------------------------------
function initUI() {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });

        // Close menu when clicking nav link on mobile
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileMenuBtn.querySelector('i').className = 'fa-solid fa-bars';
            });
        });
    }

    // Light / Dark Theme Toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    themeToggleBtn.addEventListener('click', () => {
        const body = document.body;
        const icon = themeToggleBtn.querySelector('i');
        
        body.classList.toggle('light-theme');
        body.classList.toggle('dark-theme');
        
        if (body.classList.contains('light-theme')) {
            icon.className = 'fa-solid fa-sun';
            // Adjust 3D lighting slightly for light theme
            if (ambientLight) ambientLight.intensity = 1.3;
        } else {
            icon.className = 'fa-solid fa-moon';
            // Adjust 3D lighting back for dark theme
            if (ambientLight) ambientLight.intensity = 0.8;
            const slider = document.getElementById('light-intensity');
            if (slider) slider.value = "1.0";
        }
    });

    // Navigation Link Active Highlighting (Scroll Spy)
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 250)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });

    // Interactive Floating Page-Background Particles (DOM-based)
    initBgParticles();
}

function initBgParticles() {
    const container = document.getElementById('ambient-particles');
    if (!container) return;
    
    const count = 40;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.backgroundColor = Math.random() > 0.5 ? 'var(--accent-cyan)' : 'var(--accent-pink)';
        particle.style.borderRadius = '50%';
        
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.opacity = Math.random() * 0.4 + 0.1;
        
        // Custom float animation speed
        const duration = Math.random() * 20 + 10;
        particle.style.transition = `transform ${duration}s linear, opacity ${duration}s ease`;
        
        container.appendChild(particle);
        
        // Randomly drift particles
        setTimeout(() => {
            animateParticle(particle, duration);
        }, 100);
    }
}

function animateParticle(element, duration) {
    const driftX = (Math.random() - 0.5) * 150;
    const driftY = (Math.random() - 0.5) * 150;
    element.style.transform = `translate(${driftX}px, ${driftY}px)`;
    
    setInterval(() => {
        const nextX = (Math.random() - 0.5) * 200;
        const nextY = (Math.random() - 0.5) * 200;
        element.style.transform = `translate(${nextX}px, ${nextY}px)`;
    }, duration * 1000);
}

// --------------------------------------------------------------------------
// 2. Three.js Initialization & Core Setup
// --------------------------------------------------------------------------
function init3D() {
    const container = document.getElementById('canvas-container');
    const loaderOverlay = document.getElementById('loader-overlay');
    if (!container) return;

    // Create Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

    // Create Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    resetCameraPosition();

    // Create WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Camera Controls (OrbitControls)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't orbit below desk height
    controls.minDistance = 5;
    controls.maxDistance = 25;
    
    // Deactivate auto rotation on user click/interaction
    controls.addEventListener('start', () => {
        autoRotate = false;
    });

    // Add Lights
    setupLights();

    // Grouping container for custom model loader and procedural scene
    proceduralGroup = new THREE.Group();
    customModelGroup = new THREE.Group();
    scene.add(proceduralGroup);
    scene.add(customModelGroup);

    // Generate beautiful default procedural setup
    createProceduralSetup();

    // Load custom GLTF model if it exists
    loadCustomModel(loaderOverlay);

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize);

    // Initialize 3D UI Control Listeners
    setup3DControls();

    // Start Rendering Loop
    animate();
}

function resetCameraPosition() {
    camera.position.set(0, 7, 13);
    if (controls) {
        controls.target.set(0, 3.2, 0);
    }
}

// --------------------------------------------------------------------------
// 3. Lighting Configuration
// --------------------------------------------------------------------------
function setupLights() {
    // Ambient Light
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Main Overhead Directional Light (Simulates bedroom lamp / window)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 12, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

    // Neon LED Glow lights (PointLights) simulating desk backlight strips
    // Left LED pointlight (Cyan)
    const ledLeft = new THREE.PointLight(0x00f0ff, 2.5, 8);
    ledLeft.position.set(-4, 3.6, -2);
    scene.add(ledLeft);
    ledLights.push(ledLeft);

    // Right LED pointlight (Pink/Magenta)
    const ledRight = new THREE.PointLight(0xff007f, 2.5, 8);
    ledRight.position.set(4, 3.6, -2);
    scene.add(ledRight);
    ledLights.push(ledRight);

    // Screen ambient bounce pointlight
    const deskGlow = new THREE.PointLight(0x00f0ff, 1.5, 4);
    deskGlow.position.set(0, 3.8, -0.5);
    scene.add(deskGlow);
    ledLights.push(deskGlow);
}

// --------------------------------------------------------------------------
// 4. Procedural Programmer Setup Generator
// --------------------------------------------------------------------------
function createProceduralSetup() {
    // Shared Materials
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1d24, roughness: 0.5, metalness: 0.8 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2d34, roughness: 0.3, metalness: 0.9 });
    const mouseMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2026, roughness: 0.4 });
    const plantPotMaterial = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.7 });
    const plantLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
    const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.1 });
    const coffeeMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.1 });

    // Desk Tabletop Material (Dynamic adjustments via themes)
    deskMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a24, 
        roughness: 0.4, 
        metalness: 0.1 
    });

    // Keyboard backlights
    keyboardBacklight = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.5
    });

    // Generate code screen canvas texture
    const codeScreenTexture = createCodeScreenTexture();
    const monitorScreenMaterial = new THREE.MeshBasicMaterial({ 
        map: codeScreenTexture,
    });
    screenMaterials.push(monitorScreenMaterial);

    // --- A. Desk Base ---
    // Desk Tabletop
    const deskGeo = new THREE.BoxGeometry(11, 0.4, 5.5);
    const deskMesh = new THREE.Mesh(deskGeo, deskMaterial);
    deskMesh.position.set(0, 3.0, 0);
    deskMesh.receiveShadow = true;
    deskMesh.castShadow = true;
    proceduralGroup.add(deskMesh);

    // Desk Legs (4 corners)
    const legGeo = new THREE.CylinderGeometry(0.15, 0.1, 3.0, 16);
    const legPositions = [
        [-5.2, 1.5, -2.4],
        [5.2, 1.5, -2.4],
        [-5.2, 1.5, 2.4],
        [5.2, 1.5, 2.4]
    ];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, legMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        proceduralGroup.add(leg);
    });

    // Desk Pad/Mat
    const matGeo = new THREE.BoxGeometry(7, 0.05, 3.2);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x0f0f13, roughness: 0.8 });
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.set(0, 3.21, 0.2);
    matMesh.receiveShadow = true;
    proceduralGroup.add(matMesh);

    // --- B. Dual Monitors ---
    // Left Monitor
    const monitorGroupLeft = new THREE.Group();
    monitorGroupLeft.position.set(-2.2, 3.2, -1.2);
    monitorGroupLeft.rotation.y = 0.25;

    // Monitor Base and Stand
    const monBaseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.06, 24);
    const monBaseLeft = new THREE.Mesh(monBaseGeo, metalMaterial);
    monBaseLeft.position.set(0, 0.03, 0);
    monBaseLeft.castShadow = true;
    monitorGroupLeft.add(monBaseLeft);

    const monStandGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 16);
    const monStandLeft = new THREE.Mesh(monStandGeo, metalMaterial);
    monStandLeft.position.set(0, 0.75, 0);
    monStandLeft.castShadow = true;
    monitorGroupLeft.add(monStandLeft);

    // Monitor Frame / Backing
    const monFrameGeo = new THREE.BoxGeometry(3.6, 2.1, 0.12);
    const monFrameLeft = new THREE.Mesh(monFrameGeo, metalMaterial);
    monFrameLeft.position.set(0, 1.6, 0);
    monFrameLeft.castShadow = true;
    monitorGroupLeft.add(monFrameLeft);

    // Monitor Screen Panel (Displaying Code)
    const monScreenGeo = new THREE.BoxGeometry(3.48, 1.98, 0.02);
    const monScreenLeft = new THREE.Mesh(monScreenGeo, monitorScreenMaterial);
    monScreenLeft.position.set(0, 1.6, 0.065);
    monitorGroupLeft.add(monScreenLeft);
    proceduralGroup.add(monitorGroupLeft);

    // Right Monitor
    const monitorGroupRight = new THREE.Group();
    monitorGroupRight.position.set(2.2, 3.2, -1.2);
    monitorGroupRight.rotation.y = -0.25;

    // Stand & Base
    const monBaseRight = new THREE.Mesh(monBaseGeo, metalMaterial);
    monBaseRight.position.set(0, 0.03, 0);
    monBaseRight.castShadow = true;
    monitorGroupRight.add(monBaseRight);

    const monStandRight = new THREE.Mesh(monStandGeo, metalMaterial);
    monStandRight.position.set(0, 0.75, 0);
    monStandRight.castShadow = true;
    monitorGroupRight.add(monStandRight);

    // Frame
    const monFrameRight = new THREE.Mesh(monFrameGeo, metalMaterial);
    monFrameRight.position.set(0, 1.6, 0);
    monFrameRight.castShadow = true;
    monitorGroupRight.add(monFrameRight);

    // Screen (sharing same map)
    const monScreenRight = new THREE.Mesh(monScreenGeo, monitorScreenMaterial);
    monScreenRight.position.set(0, 1.6, 0.065);
    monitorGroupRight.add(monScreenRight);
    proceduralGroup.add(monitorGroupRight);

    // --- C. Mechanical Keyboard & Glowing Keys ---
    const kbdGroup = new THREE.Group();
    kbdGroup.position.set(0, 3.22, 0.5);

    // Keyboard Base
    const kbdBaseGeo = new THREE.BoxGeometry(3.2, 0.08, 1.1);
    const kbdBase = new THREE.Mesh(kbdBaseGeo, metalMaterial);
    kbdBase.castShadow = true;
    kbdBase.receiveShadow = true;
    kbdGroup.add(kbdBase);

    // Glowing RGB strip plate
    const kbdLightGeo = new THREE.BoxGeometry(3.1, 0.02, 1.0);
    const kbdLight = new THREE.Mesh(kbdLightGeo, keyboardBacklight);
    kbdLight.position.set(0, 0.041, 0);
    kbdGroup.add(kbdLight);

    // Individual Keycaps simulated with smaller cube layout
    const keyGeo = new THREE.BoxGeometry(0.12, 0.06, 0.12);
    const keyMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.6 });
    for (let r = 0; r < 5; r++) { // rows
        for (let c = 0; c < 18; c++) { // cols
            // Skip a few spots randomly for stylized spacing
            if (r === 4 && (c < 4 || c > 13)) continue;
            
            const key = new THREE.Mesh(keyGeo, keyMat);
            const posX = -1.35 + c * 0.16 + (r % 2) * 0.02;
            const posZ = -0.4 + r * 0.2;
            key.position.set(posX, 0.07, posZ);
            kbdGroup.add(key);
        }
    }
    // Spacebar
    const spaceGeo = new THREE.BoxGeometry(1.2, 0.06, 0.12);
    const spacebar = new THREE.Mesh(spaceGeo, keyMat);
    spacebar.position.set(0, 0.07, 0.4);
    kbdGroup.add(spacebar);
    proceduralGroup.add(kbdGroup);

    // --- D. Gaming Mouse ---
    const mouseGroup = new THREE.Group();
    mouseGroup.position.set(2.4, 3.22, 0.6);
    mouseGroup.rotation.y = -0.05;

    // Body
    const mouseBodyGeo = new THREE.BoxGeometry(0.42, 0.14, 0.75);
    const mouseBody = new THREE.Mesh(mouseBodyGeo, mouseMaterial);
    mouseBody.castShadow = true;
    mouseBody.receiveShadow = true;
    mouseGroup.add(mouseBody);

    // Wheel (RGB glowing segment)
    const wheelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12);
    const wheelMat = keyboardBacklight;
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(0, 0.06, -0.15);
    wheel.rotation.z = Math.PI / 2;
    mouseGroup.add(wheel);
    proceduralGroup.add(mouseGroup);

    // --- E. Sleek Closed Laptop ---
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(-3.8, 3.22, 0.5);
    laptopGroup.rotation.y = 0.4;

    const lapBaseGeo = new THREE.BoxGeometry(2.4, 0.07, 1.7);
    const lapBase = new THREE.Mesh(lapBaseGeo, metalMaterial);
    lapBase.castShadow = true;
    lapBase.receiveShadow = true;
    laptopGroup.add(lapBase);

    // Closed lid (with tiny glowing logo)
    const lapLidGeo = new THREE.BoxGeometry(2.38, 0.05, 1.68);
    const lapLid = new THREE.Mesh(lapLidGeo, metalMaterial);
    lapLid.position.set(0, 0.06, 0);
    lapLid.castShadow = true;
    laptopGroup.add(lapLid);

    const logoGeo = new THREE.BoxGeometry(0.3, 0.01, 0.3);
    const logoMat = keyboardBacklight;
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, 0.09, 0);
    laptopGroup.add(logo);
    proceduralGroup.add(laptopGroup);

    // --- F. Coffee Mug (Creative Object 1) ---
    const mugGroup = new THREE.Group();
    mugGroup.position.set(4.0, 3.22, 0.8);

    // Mug body
    const mugGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 24);
    const mug = new THREE.Mesh(mugGeo, mugMaterial);
    mug.castShadow = true;
    mug.receiveShadow = true;
    mugGroup.add(mug);

    // Coffee surface
    const coffeeGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16);
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMaterial);
    coffee.position.set(0, 0.36, 0);
    mugGroup.add(coffee);

    // Handle
    const handleGeo = new THREE.TorusGeometry(0.2, 0.06, 12, 24, Math.PI);
    const handle = new THREE.Mesh(handleGeo, mugMaterial);
    handle.position.set(0.3, 0, 0);
    handle.rotation.z = -Math.PI / 2;
    mugGroup.add(handle);
    proceduralGroup.add(mugGroup);

    // --- G. Desk Plant (Creative Object 2) ---
    const plantGroup = new THREE.Group();
    plantGroup.position.set(-4.5, 3.22, -1.8);

    // Hexagonal Pot
    const potGeo = new THREE.CylinderGeometry(0.48, 0.32, 0.8, 6);
    const pot = new THREE.Mesh(potGeo, plantPotMaterial);
    pot.castShadow = true;
    pot.receiveShadow = true;
    plantGroup.add(pot);

    // Leaves
    const leafGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const leafPositions = [
        [0, 0.45, 0],
        [-0.2, 0.6, 0.15],
        [0.2, 0.55, -0.15],
        [0.1, 0.65, 0.2]
    ];
    leafPositions.forEach((pos, idx) => {
        const leaf = new THREE.Mesh(leafGeo, plantLeafMaterial);
        leaf.position.set(pos[0], pos[1], pos[2]);
        leaf.scale.set(1.0 - idx * 0.15, 1.0 - idx * 0.1, 1.0 - idx * 0.1);
        leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        leaf.castShadow = true;
        plantGroup.add(leaf);
    });
    proceduralGroup.add(plantGroup);
}

// Helper to draw a matrix code texture dynamically onto a 2D Canvas
function createCodeScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background color
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid matrix lines (simulating terminal/editor)
    ctx.strokeStyle = '#0e0e28';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Code lines drawing parameters
    const codeColors = ['#ff007f', '#00f0ff', '#38ef7d', '#ffffff', '#ffd000', '#9ca3af'];
    const tabSize = 25;
    ctx.font = 'bold 12px "JetBrains Mono", Courier, monospace';

    // Simulated code lines text
    const lines = [
        { text: 'import { WebGL, Three } from "universe";', indent: 0 },
        { text: 'const portfolio = new DeveloperPortfolio({', indent: 0 },
        { text: 'name: "Sebastián Vargas",', indent: 1 },
        { text: 'skills: ["WebGL", "Blender", "Dev"],', indent: 1 },
        { text: 'creativeMode: true', indent: 1 },
        { text: '});', indent: 0 },
        { text: '', indent: 0 },
        { text: 'function renderSetup() {', indent: 0 },
        { text: 'const scene = WebGL.initScene();', indent: 1 },
        { text: 'scene.loadModel("blender_setup.glb");', indent: 1 },
        { text: 'scene.enableRGBGlow({ theme: "Cyberpunk" });', indent: 1 },
        { text: 'while (creativeMode) {', indent: 1 },
        { text: 'compileCode();', indent: 2 },
        { text: 'spawnParticles();', indent: 2 },
        { text: 'wreakHavoc();', indent: 2 },
        { text: '}', indent: 1 },
        { text: '}', indent: 0 },
        { text: 'renderSetup();', indent: 0 }
    ];

    let posY = 24;
    lines.forEach(line => {
        let posX = 16 + line.indent * tabSize;
        
        // Tokenize line to paint with different colors
        const words = line.text.split(/(\s+|=|\{|\}|\(|\)|\[|\]|;|"|'|,)/);
        
        words.forEach(word => {
            if (!word) return;
            
            // Syntax coloring rules (simple)
            if (['import', 'const', 'new', 'function', 'while', 'return'].includes(word)) {
                ctx.fillStyle = codeColors[0]; // pink
            } else if (['portfolio', 'renderSetup', 'compileCode', 'spawnParticles', 'wreakHavoc'].includes(word)) {
                ctx.fillStyle = codeColors[1]; // cyan
            } else if (['WebGL', 'Three', 'DeveloperPortfolio'].includes(word)) {
                ctx.fillStyle = codeColors[4]; // yellow
            } else if (word.startsWith('"') || word.startsWith("'")) {
                ctx.fillStyle = codeColors[2]; // green
            } else if (['{', '}', '(', ')', '[', ']', ';', ',', '='].includes(word)) {
                ctx.fillStyle = codeColors[5]; // gray
            } else {
                ctx.fillStyle = codeColors[3]; // white
            }
            
            ctx.fillText(word, posX, posY);
            posX += ctx.measureText(word).width;
        });
        
        posY += 13;
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// --------------------------------------------------------------------------
// 5. GLTF Model Loader (Fulfilling main imports requirement)
// --------------------------------------------------------------------------
function loadCustomModel(loaderOverlay) {
    const loader = new THREE.GLTFLoader();
    
    // Attempting to load the user's custom exported model
    // Path matches standard assets folder layout in repository
    loader.load(
        'assets/3d/setup.glb',
        (gltf) => {
            console.log('🎉 Custom Blender model successfully loaded!');
            
            // Hide the default procedural geometry group
            proceduralGroup.visible = false;
            
            // Add the custom loaded model
            const model = gltf.scene;
            customModelGroup.add(model);
            
            // Center & Scale custom model to fit the container bounds
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            // Normalize scale to match the view size (about 8-10 units wide)
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 9.0 / maxDim;
            model.scale.set(scale, scale, scale);
            
            // Position base of model on our virtual floor (y = 0 or centering it)
            model.position.x = -center.x * scale;
            model.position.y = (3.0 - (center.y - size.y / 2) * scale); // Align bottom to tabletop height
            model.position.z = -center.z * scale;
            
            // Set shadows configuration on loaded components
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Hook custom metallic/roughness overrides if model lacks texture settings
                    if (child.material) {
                        child.material.roughness = Math.max(child.material.roughness, 0.25);
                    }
                }
            });
            
            // Hide loading UI
            if (loaderOverlay) {
                loaderOverlay.style.opacity = '0';
                setTimeout(() => loaderOverlay.style.display = 'none', 500);
            }
        },
        // Progress callback
        (xhr) => {
            if (xhr.total > 0 && loaderOverlay) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                const progressText = loaderOverlay.querySelector('p');
                if (progressText) progressText.innerText = `Cargando Modelo Custom: ${percent}%`;
            }
        },
        // Error callback (gracefully fallback to procedural model)
        (error) => {
            console.warn('ℹ️ No custom model found at assets/3d/setup.glb. Using default procedural scene.');
            console.log('Para renderizar tu modelo de Blender: exporta tu archivo como GLB/GLTF y guárdalo en assets/3d/setup.glb');
            
            // Hide loading screen since procedural scene is already populated
            if (loaderOverlay) {
                loaderOverlay.style.opacity = '0';
                setTimeout(() => loaderOverlay.style.display = 'none', 500);
            }
        }
    );
}

// --------------------------------------------------------------------------
// 6. Interactive Setup Themes & Config Panels
// --------------------------------------------------------------------------
function setup3DControls() {
    // 1. Color Themes Button Triggers
    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeTheme = btn.getAttribute('data-theme');
            applyActiveTheme();
        });
    });

    // 2. Light Intensity Slider Input
    const lightSlider = document.getElementById('light-intensity');
    if (lightSlider) {
        lightSlider.addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            if (ambientLight) {
                ambientLight.intensity = intensity * 0.8;
            }
            if (directionalLight) {
                directionalLight.intensity = intensity * 1.0;
            }
        });
    }

    // 3. Code Particle Emitter Toggle Button
    const particlesToggle = document.getElementById('particles-toggle');
    if (particlesToggle) {
        particlesToggle.addEventListener('click', () => {
            particlesEnabled = !particlesEnabled;
            particlesToggle.classList.toggle('active');
            
            // Clean active code particles if disabled
            if (!particlesEnabled) {
                codeParticles.forEach(p => scene.remove(p.mesh));
                codeParticles = [];
            }
        });
    }

    // 4. Reset Camera Angle Position
    const cameraResetBtn = document.getElementById('camera-reset');
    if (cameraResetBtn) {
        cameraResetBtn.addEventListener('click', () => {
            resetCameraPosition();
            autoRotate = true; // reactivate auto-rotation on camera reset
        });
    }
}

function applyActiveTheme() {
    let ledColorLeft, ledColorRight;
    let keybacklightColor;
    
    // Set colors depending on theme key
    switch (activeTheme) {
        case 'rgb':
            ledColorLeft = 0xff0000;
            ledColorRight = 0x0000ff;
            keybacklightColor = 0x00ff00;
            if (deskMaterial) deskMaterial.color.setHex(0x111116);
            break;
            
        case 'forest':
            ledColorLeft = 0x11998e;
            ledColorRight = 0x38ef7d;
            keybacklightColor = 0x38ef7d;
            if (deskMaterial) deskMaterial.color.setHex(0x274029); // Wood Forest tint
            break;
            
        case 'mono':
            ledColorLeft = 0x3a3d40;
            ledColorRight = 0x888888;
            keybacklightColor = 0xffffff;
            if (deskMaterial) deskMaterial.color.setHex(0x16161a); // Carbon fiber dark
            break;
            
        case 'cyberpunk':
        default:
            ledColorLeft = 0x00f0ff; // Cyan
            ledColorRight = 0xff007f; // Pink
            keybacklightColor = 0x00f0ff;
            if (deskMaterial) deskMaterial.color.setHex(0x1c0f24); // Purple/Violet tint
            break;
    }

    // Apply colors to WebGL lights
    if (ledLights.length >= 2) {
        ledLights[0].color.setHex(ledColorLeft);
        ledLights[1].color.setHex(ledColorRight);
        ledLights[2].color.setHex(ledColorLeft); // Screen bounce gets Left theme color
    }

    // Apply colors to keyboard emissive backlight
    if (keyboardBacklight) {
        keyboardBacklight.color.setHex(keybacklightColor);
        keyboardBacklight.emissive.setHex(keybacklightColor);
    }
}

// --------------------------------------------------------------------------
// 7. Dynamic Code Particles Engine (Emitter)
// --------------------------------------------------------------------------
function spawnCodeParticle() {
    if (!particlesEnabled) return;
    
    // Max particles cap
    if (codeParticles.length > 50) {
        const oldP = codeParticles.shift();
        scene.remove(oldP.mesh);
    }

    // Code particles representation: small glowing low-poly meshes
    // We make them look like floating digital bits (cube, sphere, cylinder, tetrahedron)
    const particleGeometries = [
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.TetrahedronGeometry(0.1, 0),
        new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8)
    ];
    
    // Pick random geometry
    const geo = particleGeometries[Math.floor(Math.random() * particleGeometries.length)];
    
    // Set emissive glow material matching the theme
    let color = 0x00f0ff;
    if (activeTheme === 'cyberpunk') color = Math.random() > 0.5 ? 0xff007f : 0x00f0ff;
    else if (activeTheme === 'forest') color = 0x38ef7d;
    else if (activeTheme === 'rgb') {
        const rgbColors = [0xff0055, 0x00ff66, 0x00ffff, 0xff00ff, 0xffd000];
        color = rgbColors[Math.floor(Math.random() * rgbColors.length)];
    } else color = 0xffffff;

    const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
    });

    const mesh = new THREE.Mesh(geo, mat);
    
    // Position floating out of the monitors
    const posX = (Math.random() - 0.5) * 6; // width span
    const posY = 3.6 + Math.random() * 0.4;
    const posZ = -1.0 + (Math.random() - 0.5) * 0.4;
    mesh.position.set(posX, posY, posZ);
    
    scene.add(mesh);

    // Save particle kinematics
    codeParticles.push({
        mesh: mesh,
        speedY: 0.015 + Math.random() * 0.02,
        speedX: (Math.random() - 0.5) * 0.01,
        speedZ: 0.01 + Math.random() * 0.015,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        life: 1.0 // opacity remaining
    });
}

function updateCodeParticles() {
    // Emitter spawn rate control
    if (particlesEnabled && Math.random() < 0.08) {
        spawnCodeParticle();
    }

    for (let i = codeParticles.length - 1; i >= 0; i--) {
        const p = codeParticles[i];
        
        // Move particle upward and forward (away from monitor screen)
        p.mesh.position.y += p.speedY;
        p.mesh.position.x += p.speedX;
        p.mesh.position.z += p.speedZ;
        
        // Rotate
        p.mesh.rotation.x += p.rotSpeed;
        p.mesh.rotation.y += p.rotSpeed;
        
        // Dissolve life
        p.life -= 0.008;
        p.mesh.material.opacity = p.life;
        
        // Scale down as it dies
        const s = p.life;
        p.mesh.scale.set(s, s, s);

        // Delete dead particles
        if (p.life <= 0) {
            scene.remove(p.mesh);
            codeParticles.splice(i, 1);
        }
    }
}

// --------------------------------------------------------------------------
// 8. Event Handlers & Animation Rendering Loop
// --------------------------------------------------------------------------
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(time) {
    requestAnimationFrame(animate);

    // Damping controls update
    if (controls) controls.update();

    // Slow ambient group camera rotation (only if autoRotate is true)
    if (autoRotate && proceduralGroup && customModelGroup) {
        proceduralGroup.rotation.y += rotationSpeed;
        customModelGroup.rotation.y += rotationSpeed;
    }

    // Dynamic wave animation for RGB mode
    if (activeTheme === 'rgb') {
        const wave = Math.sin(time * 0.001) * 0.5 + 0.5;
        const colorLeft = new THREE.Color().setHSL(wave, 1, 0.5);
        const colorRight = new THREE.Color().setHSL((wave + 0.5) % 1.0, 1, 0.5);
        
        if (ledLights.length >= 2) {
            ledLights[0].color.copy(colorLeft);
            ledLights[1].color.copy(colorRight);
            ledLights[2].color.copy(colorLeft);
        }
        if (keyboardBacklight) {
            keyboardBacklight.color.copy(colorRight);
            keyboardBacklight.emissive.copy(colorRight);
        }
    }

    // Particles system update
    updateCodeParticles();

    // Render Frame
    renderer.render(scene, camera);
}
