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
let fanMeshes = []; // Spinning computer cabinet fans
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
    proceduralGroup.visible = false; // Hide procedural group until model load attempt is done

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

    // --- E. Premium Gamer PC Cabinet (Gabinete) ---
    const cabinetGroup = new THREE.Group();
    cabinetGroup.position.set(-4.0, 3.2, 0.4);
    cabinetGroup.rotation.y = 0.5; // Rotate to show off the glass side panel

    // Casing C-Frame Materials
    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.5, metalness: 0.8 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 });
    const moboMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.7 });
    const gpuMaterial = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.3, metalness: 0.6 });
    const fanRingMaterial = keyboardBacklight; // Glows with active theme

    // 1. Casing Structure
    // Cabinet Bottom Base
    const cabBaseGeo = new THREE.BoxGeometry(1.2, 0.1, 1.8);
    const cabBase = new THREE.Mesh(cabBaseGeo, caseMaterial);
    cabBase.position.y = 0.05;
    cabBase.castShadow = true;
    cabBase.receiveShadow = true;
    cabinetGroup.add(cabBase);

    // Cabinet Top Plate
    const cabTopGeo = new THREE.BoxGeometry(1.2, 0.1, 1.8);
    const cabTop = new THREE.Mesh(cabTopGeo, caseMaterial);
    cabTop.position.y = 2.05;
    cabTop.castShadow = true;
    cabTop.receiveShadow = true;
    cabinetGroup.add(cabTop);

    // Cabinet Back Wall
    const cabBackGeo = new THREE.BoxGeometry(1.2, 1.9, 0.1);
    const cabBack = new THREE.Mesh(cabBackGeo, caseMaterial);
    cabBack.position.set(0, 1.05, -0.85);
    cabBack.castShadow = true;
    cabBack.receiveShadow = true;
    cabinetGroup.add(cabBack);

    // Cabinet Left Side Solid Metal Wall
    const cabLeftGeo = new THREE.BoxGeometry(0.1, 1.9, 1.8);
    const cabLeft = new THREE.Mesh(cabLeftGeo, caseMaterial);
    cabLeft.position.set(-0.55, 1.05, 0);
    cabLeft.castShadow = true;
    cabinetGroup.add(cabLeft);

    // Cabinet Right Side TEMPERED GLASS Panel (translucent)
    const cabGlassGeo = new THREE.BoxGeometry(0.02, 1.9, 1.76);
    const cabGlass = new THREE.Mesh(cabGlassGeo, glassMaterial);
    cabGlass.position.set(0.55, 1.05, 0);
    cabinetGroup.add(cabGlass);

    // 2. Motherboard (Mobo) mounted on Left interior wall
    const moboGeo = new THREE.BoxGeometry(0.04, 1.5, 1.3);
    const mobo = new THREE.Mesh(moboGeo, moboMaterial);
    mobo.position.set(-0.48, 1.1, 0);
    mobo.castShadow = true;
    cabinetGroup.add(mobo);

    // RAM memory sticks (details)
    const ramGeo = new THREE.BoxGeometry(0.02, 0.3, 0.04);
    const ramMat = keyboardBacklight; // Glows!
    for (let i = 0; i < 4; i++) {
        const ram = new THREE.Mesh(ramGeo, ramMat);
        ram.position.set(-0.44, 1.3, -0.1 + i * 0.08);
        cabinetGroup.add(ram);
    }

    // AIO Liquid CPU Block cooler
    const cpuBlockGeo = new THREE.BoxGeometry(0.08, 0.35, 0.35);
    const cpuBlockMat = gpuMaterial;
    const cpuBlock = new THREE.Mesh(cpuBlockGeo, cpuBlockMat);
    cpuBlock.position.set(-0.44, 1.1, -0.3);
    cabinetGroup.add(cpuBlock);

    // Glowing logo on CPU block
    const cpuLogoGeo = new THREE.BoxGeometry(0.01, 0.15, 0.15);
    const cpuLogo = new THREE.Mesh(cpuLogoGeo, fanRingMaterial);
    cpuLogo.position.set(-0.395, 1.1, -0.3);
    cabinetGroup.add(cpuLogo);

    // 3. High-End GPU (Graphics Card) mounted horizontally
    const gpuGroup = new THREE.Group();
    gpuGroup.position.set(-0.25, 0.9, 0.15);

    const gpuMainGeo = new THREE.BoxGeometry(0.38, 0.28, 0.95);
    const gpuMain = new THREE.Mesh(gpuMainGeo, gpuMaterial);
    gpuMain.castShadow = true;
    gpuGroup.add(gpuMain);

    // GPU Glowing RGB lightbar accent
    const gpuBarGeo = new THREE.BoxGeometry(0.02, 0.04, 0.85);
    const gpuBar = new THREE.Mesh(gpuBarGeo, fanRingMaterial);
    gpuBar.position.set(0.191, 0, 0);
    gpuGroup.add(gpuBar);

    // GPU fan intakes (2 cylinders)
    const gpuFanGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12);
    gpuFanGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 2; i++) {
        const gpuFan = new THREE.Mesh(gpuFanGeo, caseMaterial);
        gpuFan.position.set(0.18, 0.04, -0.22 + i * 0.44);
        gpuGroup.add(gpuFan);
    }
    cabinetGroup.add(gpuGroup);

    // 4. Cooling Fans (Intakes/Exhausts with spinning blades)
    function createPCFan(x, y, z, rotationAxis) {
        const fanGroup = new THREE.Group();
        fanGroup.position.set(x, y, z);
        
        // Fan outer housing
        const frameGeo = new THREE.BoxGeometry(0.1, 0.55, 0.55);
        if (rotationAxis === 'Z') frameGeo.rotateY(Math.PI/2); // Align for top exhaust
        const frame = new THREE.Mesh(frameGeo, caseMaterial);
        fanGroup.add(frame);

        // Fan central motor cylinder
        const rotorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12);
        if (rotationAxis === 'Y') rotorGeo.rotateX(Math.PI/2);
        else if (rotationAxis === 'Z') rotorGeo.rotateZ(Math.PI/2);
        const rotor = new THREE.Mesh(rotorGeo, caseMaterial);
        fanGroup.add(rotor);

        // Fan glowing RGB ring
        const ringGeo = new THREE.TorusGeometry(0.2, 0.02, 8, 24);
        if (rotationAxis === 'Y') ringGeo.rotateY(Math.PI/2);
        const ring = new THREE.Mesh(ringGeo, fanRingMaterial);
        ring.position.set(rotationAxis === 'Y' ? 0.041 : 0, 0, 0);
        fanGroup.add(ring);

        // Fan blades assembly (spins!)
        const bladeAssembly = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(rotationAxis === 'Y' ? 0.02 : 0.36, 0.36, 0.05);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1d1d24, transparent: true, opacity: 0.8 });
        
        for (let i = 0; i < 5; i++) {
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            if (rotationAxis === 'Y') {
                blade.rotation.x = (i * Math.PI / 2.5);
                blade.rotation.y = 0.25; // pitch angle
            } else {
                blade.rotation.z = (i * Math.PI / 2.5);
                blade.rotation.x = 0.25;
            }
            bladeAssembly.add(blade);
        }
        fanGroup.add(bladeAssembly);
        
        // Save blade reference to animate rotation
        fanMeshes.push({
            group: bladeAssembly,
            axis: rotationAxis === 'Y' ? 'x' : 'z',
            speed: 0.15
        });

        return fanGroup;
    }

    // Rear Fan (Exhaust on back wall)
    const rearFan = createPCFan(-0.25, 1.45, -0.7, 'Y');
    cabinetGroup.add(rearFan);

    // Front Fan (Intake fan at bottom)
    const frontFan1 = createPCFan(0.1, 0.7, 0.8, 'Y');
    cabinetGroup.add(frontFan1);

    // Front Fan (Intake fan at top)
    const frontFan2 = createPCFan(0.1, 1.45, 0.8, 'Y');
    cabinetGroup.add(frontFan2);

    proceduralGroup.add(cabinetGroup);

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
// Helper to draw a synthwave landscape wallpaper dynamically onto a 2D Canvas
function createCodeScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 1. Sky background (deep dark violet to navy gradient)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#0a001a');
    skyGrad.addColorStop(0.5, '#1e003a');
    skyGrad.addColorStop(0.7, '#3d0043');
    skyGrad.addColorStop(1, '#120024');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Neon Sun (centered, right above the horizon)
    const sunX = canvas.width / 2;
    const sunY = 120;
    const sunRadius = 65;
    
    const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
    sunGrad.addColorStop(0, '#ffe600');
    sunGrad.addColorStop(0.5, '#ff007f');
    sunGrad.addColorStop(1, '#ff0033');
    
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // Scanlines to cut through the sun (Synthwave style)
    ctx.fillStyle = '#1e003a'; // match background color at that height
    for (let y = sunY - 20; y < sunY + sunRadius; y += 8) {
        const thickness = Math.max(1, (y - (sunY - 20)) / 10); // scanlines get thicker near the bottom
        ctx.fillRect(sunX - sunRadius - 10, y, sunRadius * 2 + 20, thickness);
    }

    // 3. Grid Floor (bottom half)
    const horizon = 140;
    const floorHeight = canvas.height - horizon;
    
    // Draw wireframe grid lines
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    
    // Vertical perspective lines
    const numVertLines = 16;
    for (let i = 0; i <= numVertLines; i++) {
        const xOffset = (i / numVertLines) * canvas.width;
        ctx.beginPath();
        // Lines start from the center point of the horizon
        ctx.moveTo(canvas.width / 2, horizon);
        // And expand outwards to the bottom edge
        const bottomX = ((i - numVertLines / 2) * 2.5) * (canvas.width / numVertLines) + canvas.width / 2;
        ctx.lineTo(bottomX, canvas.height);
        ctx.stroke();
    }

    // Horizontal perspective lines (spaced exponentially)
    const numHorizLines = 8;
    for (let i = 0; i < numHorizLines; i++) {
        // Exponential spacing: closer near the horizon, further at the bottom
        const ratio = Math.pow(i / (numHorizLines - 1), 2);
        const y = horizon + ratio * floorHeight;
        
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 1 + (ratio * 1.5); // get thicker as they approach bottom
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // 4. Distant Mountain Silhouette
    ctx.fillStyle = '#050010';
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(40, horizon - 20);
    ctx.lineTo(90, horizon - 8);
    ctx.lineTo(150, horizon - 35);
    ctx.lineTo(210, horizon - 15);
    ctx.lineTo(256, horizon - 5);
    // Right side mountains
    ctx.lineTo(300, horizon - 25);
    ctx.lineTo(370, horizon - 10);
    ctx.lineTo(420, horizon - 40);
    ctx.lineTo(480, horizon - 15);
    ctx.lineTo(512, horizon);
    ctx.closePath();
    ctx.fill();
    
    // Draw glow mountain outline
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1;
    ctx.stroke();

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
        '/assets/3d/setup.glb',
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
            const scale = 200.0 / maxDim;
            model.scale.set(scale, scale, scale);
            
            // Position base of model on our virtual floor (y = 0 or centering it)
            model.position.x = -center.x * scale;
            model.position.y = (0 - (center.y - size.y / 4) * scale); // Align bottom to tabletop height
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

    // 3. Download GLB Setup Exporter Button
    const downloadBtn = document.getElementById('download-glb');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const prevRotate = autoRotate;
            autoRotate = false;
            
            const exporter = new THREE.GLTFExporter();
            exporter.parse(customModelGroup,   // ← ASÍ DEBE QUEDAR
                function (gltf) {
                    const blob = new Blob([gltf], { type: 'application/octet-stream' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'setup.glb';
                    link.click();
                    autoRotate = prevRotate;
                },
                function (error) {
                    console.error('Error exporting GLTF:', error);
                    autoRotate = prevRotate;
                },
                { binary: true } // Export as GLB
            );
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
// 7. Computer Cabinet Fans Animation Update
// --------------------------------------------------------------------------
function updateCabinetFans() {
    fanMeshes.forEach(fan => {
        fan.group.rotation[fan.axis] += fan.speed;
    });
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

    // PC Cabinet fan blades spinning
    updateCabinetFans();

    // Render Frame
    renderer.render(scene, camera);
}
