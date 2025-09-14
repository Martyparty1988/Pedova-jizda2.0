import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída pro vytvoření a správu herního hráče (postava na hoverboardu).
 * Vylepšená verze s moderním sci-fi designem.
 */
export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
        this.trickRotation = 0;
        this.animationTime = 0;
        // Nové animační systémy
        this.breathingIntensity = 0;
        this.visorGlow = { intensity: 0.8, phase: 0 };
        this.thrusterParticles = [];
    }

    /**
     * Vytvoří moderní sci-fi mesh pro hráče.
     * @returns {THREE.Group}
     */
    createPlayerMesh() {
        const playerGroup = new THREE.Group();

        // === VYLEPŠENÉ MATERIÁLY ===
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.95,
            roughness: 0.15,
            envMapIntensity: 1.2
        });

        const neonMat = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x003366,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });

        const visorMat = new THREE.MeshPhongMaterial({
            color: 0x001122,
            transparent: true,
            opacity: 0.3,
            reflectivity: 0.9,
            emissive: 0x0066ff,
            emissiveIntensity: 0.3
        });

        const boardMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0x002244,
            emissiveIntensity: 0.2
        });

        // === FUTURISTICKÝ HOVERBOARD ===
        const boardGroup = new THREE.Group();
        playerGroup.add(boardGroup);

        // Hlavní deska - aerodynamický tvar
        const boardGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 16);
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.rotation.y = Math.PI / 8; // Mírné pootočení pro dynamiku
        boardGroup.add(board);

        // Neonové pásy po obvodu desky
        const stripGeo = new THREE.TorusGeometry(0.85, 0.03, 6, 16);
        const neonStrip = new THREE.Mesh(stripGeo, neonMat);
        neonStrip.rotation.x = Math.PI / 2;
        neonStrip.position.y = 0.08;
        board.add(neonStrip);

        // === POKROČILÉ TRYSKY ===
        const thrusterGroup = new THREE.Group();
        board.add(thrusterGroup);
        
        // Čtyři trysky rozmístěné symetricky
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const thrusterGeo = new THREE.ConeGeometry(0.12, 0.4, 8);
            const thruster = new THREE.Mesh(thrusterGeo, neonMat);
            
            const radius = 0.6;
            thruster.position.x = Math.cos(angle) * radius;
            thruster.position.z = Math.sin(angle) * radius;
            thruster.position.y = -0.2;
            thruster.rotation.x = Math.PI;
            
            thrusterGroup.add(thruster);
        }
        this.thrusters = thrusterGroup;

        // === MODERNÍ POSTAVA ===
        const riderGroup = new THREE.Group();
        board.add(riderGroup);
        riderGroup.position.y = 1.2;

        // Futuristické tělo - streamlined design
        const torsoGeo = new THREE.BoxGeometry(0.7, 1.4, 0.4);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 0.2;
        riderGroup.add(torso);

        // Neonové detaily na torzu
        const chestLightGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const chestLight = new THREE.Mesh(chestLightGeo, neonMat);
        chestLight.position.set(0, 0.4, 0.21);
        torso.add(chestLight);

        // === CYBERPUNK HELMA ===
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.0;
        riderGroup.add(headGroup);

        // Hlavní část helmy - aerodynamický tvar
        const helmetGeo = new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const helmet = new THREE.Mesh(helmetGeo, armorMat);
        helmet.position.y = 0.1;
        headGroup.add(helmet);

        // Vizír - transparentní s neonovým světlem
        const visorGeo = new THREE.SphereGeometry(0.41, 16, 12, -Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.2, Math.PI * 0.4);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.y = 0.1;
        headGroup.add(visor);
        this.visor = visor; // Reference pro animaci

        // Neonové detaily na helmě
        const helmetLightGeo = new THREE.BoxGeometry(0.6, 0.02, 0.02);
        const helmetLight = new THREE.Mesh(helmetLightGeo, neonMat);
        helmetLight.position.set(0, 0.3, 0.35);
        helmet.add(helmetLight);

        // === FUTURISTICKÉ KONČETINY ===
        // Ramena s armor detaily
        const shoulderGeo = new THREE.BoxGeometry(0.25, 0.4, 0.3);
        
        const leftShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        leftShoulder.position.set(-0.5, 0.4, 0);
        riderGroup.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        rightShoulder.position.set(0.5, 0.4, 0);
        riderGroup.add(rightShoulder);

        // Neonové detaily na ramenou
        const shoulderLightGeo = new THREE.BoxGeometry(0.15, 0.05, 0.02);
        [leftShoulder, rightShoulder].forEach(shoulder => {
            const light = new THREE.Mesh(shoulderLightGeo, neonMat);
            light.position.set(0, 0, 0.16);
            shoulder.add(light);
        });

        // Nohy - více detailní
        const legGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8);
        const leftLeg = new THREE.Mesh(legGeo, armorMat);
        const rightLeg = new THREE.Mesh(legGeo, armorMat);
        
        leftLeg.position.set(-0.15, -0.8, 0);
        rightLeg.position.set(0.15, -0.8, 0);
        
        riderGroup.add(leftLeg);
        riderGroup.add(rightLeg);

        // === CELKOVÉ ÚPRAVY ===
        playerGroup.scale.set(0.6, 0.6, 0.6);
        playerGroup.position.y = -0.4;
        
        // Mírný sklon vpřed pro dynamiku
        playerGroup.rotation.x = 0.1;

        // Uložíme reference pro animace
        this.helmet = helmet;
        this.riderGroup = riderGroup;
        this.neonElements = [neonStrip, chestLight, helmetLight, ...thrusterGroup.children];

        return playerGroup;
    }

    /**
     * Vylepšené animace s moderními efekty.
     */
    update() {
        this.animationTime += 0.016; // ~60 FPS
        const t = this.animationTime;

        // === ZÁKLADNÍ HOVER ANIMACE ===
        this.mesh.position.y = -0.4 + Math.sin(t * 2.2) * 0.12;
        this.mesh.rotation.z = Math.cos(t * 1.8) * 0.04;

        // === BREATHING EFEKT POSTAVY ===
        this.breathingIntensity = 1 + Math.sin(t * 3.0) * 0.05;
        this.riderGroup.scale.y = this.breathingIntensity;

        // === ANIMACE VIZÍRU ===
        this.visorGlow.phase += 0.02;
        const glowIntensity = 0.3 + Math.sin(this.visorGlow.phase) * 0.2;
        this.visor.material.emissiveIntensity = glowIntensity;

        // === PULZOVÁNÍ NEONOVÝCH PRVKŮ ===
        const neonPulse = 0.6 + Math.sin(t * 4.0) * 0.3;
        this.neonElements.forEach(element => {
            if (element.material && element.material.emissiveIntensity !== undefined) {
                element.material.emissiveIntensity = neonPulse;
            }
        });

        // === ROTACE TRYSEK ===
        if (this.thrusters) {
            this.thrusters.rotation.y += 0.05;
            
            // Individuální bobbing trysek
            this.thrusters.children.forEach((thruster, index) => {
                const offset = index * (Math.PI / 2);
                thruster.position.y = -0.2 + Math.sin(t * 3.0 + offset) * 0.03;
            });
        }

        // === HELMA SWAY ===
        if (this.helmet) {
            this.helmet.rotation.y = Math.sin(t * 1.5) * 0.02;
            this.helmet.rotation.x = Math.cos(t * 2.0) * 0.01;
        }
    }

    /**
     * Aktivuje boost efekt s vizuálními změnami.
     */
    activateBoost() {
        // Zvýšená intenzita neonů
        this.neonElements.forEach(element => {
            if (element.material && element.material.emissiveIntensity !== undefined) {
                element.material.emissiveIntensity = 1.2;
            }
        });

        // Více intenzivní trysky
        if (this.thrusters) {
            this.thrusters.children.forEach(thruster => {
                thruster.material.emissiveIntensity = 1.5;
                thruster.scale.y = 1.3;
            });
        }
    }

    /**
     * Deaktivuje boost efekt.
     */
    deactivateBoost() {
        // Návrat k normální intenzitě
        this.neonElements.forEach(element => {
            if (element.material && element.material.emissiveIntensity !== undefined) {
                element.material.emissiveIntensity = 0.8;
            }
        });

        if (this.thrusters) {
            this.thrusters.children.forEach(thruster => {
                thruster.material.emissiveIntensity = 0.8;
                thruster.scale.y = 1.0;
            });
        }
    }
}
