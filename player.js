import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída pro vytvoření a správu herního hráče (postava na hoverboardu).
 * Vylepšená verze s moderním sci-fi designem a lepší viditelností.
 */
export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
        this.trickRotation = 0;
        this.animationTime = 0;
        this.breathingIntensity = 0;
        this.visorGlow = { intensity: 0.8, phase: 0 };
        this.thrusterParticles = [];
    }

    createPlayerMesh() {
        const playerGroup = new THREE.Group();

        // === SVĚTLEJŠÍ MATERIÁLY PRO LEPŠÍ VIDITELNOST ===
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x666666, // Světlejší šedá místo 0x2a2a2a
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x222222, // Přidáno slabé emissive
            emissiveIntensity: 0.2
        });

        const neonMat = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x004466, // Silnější emissive
            emissiveIntensity: 1.0, // Zvýšená intenzita
            transparent: true,
            opacity: 0.9
        });

        const visorMat = new THREE.MeshPhongMaterial({
            color: 0x003344, // Světlejší
            transparent: true,
            opacity: 0.4,
            reflectivity: 0.9,
            emissive: 0x0088ff, // Silnější emissive
            emissiveIntensity: 0.4
        });

        const boardMat = new THREE.MeshStandardMaterial({
            color: 0x555555, // Světlejší než 0x1a1a1a
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x003366, // Silnější emissive
            emissiveIntensity: 0.3
        });

        // === FUTURISTICKÝ HOVERBOARD ===
        const boardGroup = new THREE.Group();
        playerGroup.add(boardGroup);

        const boardGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 16);
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.rotation.y = Math.PI / 8;
        boardGroup.add(board);

        const stripGeo = new THREE.TorusGeometry(0.85, 0.03, 6, 16);
        const neonStrip = new THREE.Mesh(stripGeo, neonMat);
        neonStrip.rotation.x = Math.PI / 2;
        neonStrip.position.y = 0.08;
        board.add(neonStrip);

        // === TRYSKY ===
        const thrusterGroup = new THREE.Group();
        board.add(thrusterGroup);
        
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

        // === POSTAVA ===
        const riderGroup = new THREE.Group();
        board.add(riderGroup);
        riderGroup.position.y = 1.2;

        // Tělo
        const torsoGeo = new THREE.BoxGeometry(0.7, 1.4, 0.4);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 0.2;
        riderGroup.add(torso);

        const chestLightGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const chestLight = new THREE.Mesh(chestLightGeo, neonMat);
        chestLight.position.set(0, 0.4, 0.21);
        torso.add(chestLight);

        // === HELMA ===
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.0;
        riderGroup.add(headGroup);

        const helmetGeo = new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const helmet = new THREE.Mesh(helmetGeo, armorMat);
        helmet.position.y = 0.1;
        headGroup.add(helmet);

        const visorGeo = new THREE.SphereGeometry(0.41, 16, 12, -Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.2, Math.PI * 0.4);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.y = 0.1;
        headGroup.add(visor);
        this.visor = visor;

        const helmetLightGeo = new THREE.BoxGeometry(0.6, 0.02, 0.02);
        const helmetLight = new THREE.Mesh(helmetLightGeo, neonMat);
        helmetLight.position.set(0, 0.3, 0.35);
        helmet.add(helmetLight);

        // === RAMENA ===
        const shoulderGeo = new THREE.BoxGeometry(0.25, 0.4, 0.3);
        
        const leftShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        leftShoulder.position.set(-0.5, 0.4, 0);
        riderGroup.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeo, armorMat);
        rightShoulder.position.set(0.5, 0.4, 0);
        riderGroup.add(rightShoulder);

        const shoulderLightGeo = new THREE.BoxGeometry(0.15, 0.05, 0.02);
        [leftShoulder, rightShoulder].forEach(shoulder => {
            const light = new THREE.Mesh(shoulderLightGeo, neonMat);
            light.position.set(0, 0, 0.16);
            shoulder.add(light);
        });

        // === NOHY ===
        const legGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8);
        const leftLeg = new THREE.Mesh(legGeo, armorMat);
        const rightLeg = new THREE.Mesh(legGeo, armorMat);
        
        leftLeg.position.set(-0.15, -0.8, 0);
        rightLeg.position.set(0.15, -0.8, 0);
        
        riderGroup.add(leftLeg);
        riderGroup.add(rightLeg);

        // === FINÁLNÍ NASTAVENÍ ===
        playerGroup.scale.set(0.6, 0.6, 0.6);
        playerGroup.position.y = -0.4;
        playerGroup.rotation.x = 0.1;

        // Reference pro animace - OPRAVA: filtrujeme pouze Mesh objekty
        this.helmet = helmet;
        this.riderGroup = riderGroup;
        this.neonElements = [neonStrip, chestLight, helmetLight].filter(el => el && el.material);
        
        // Přidáme trysky pouze pokud mají material
        if (thrusterGroup.children) {
            thrusterGroup.children.forEach(thruster => {
                if (thruster && thruster.material) {
                    this.neonElements.push(thruster);
                }
            });
        }

        return playerGroup;
    }

    update() {
        this.animationTime += 0.016;
        const t = this.animationTime;

        // Hover animace
        this.mesh.position.y = -0.4 + Math.sin(t * 2.2) * 0.12;
        this.mesh.rotation.z = Math.cos(t * 1.8) * 0.04;

        // Breathing efekt
        this.breathingIntensity = 1 + Math.sin(t * 3.0) * 0.05;
        if (this.riderGroup) {
            this.riderGroup.scale.y = this.breathingIntensity;
        }

        // Vizír animace
        this.visorGlow.phase += 0.02;
        const glowIntensity = 0.4 + Math.sin(this.visorGlow.phase) * 0.2;
        if (this.visor && this.visor.material) {
            this.visor.material.emissiveIntensity = glowIntensity;
        }

        // Neonové prvky - BEZPEČNÁ ITERACE
        const neonPulse = 0.8 + Math.sin(t * 4.0) * 0.3;
        this.neonElements.forEach(element => {
            if (element && element.material && typeof element.material.emissiveIntensity === 'number') {
                element.material.emissiveIntensity = neonPulse;
            }
        });

        // Trysky rotace
        if (this.thrusters) {
            this.thrusters.rotation.y += 0.05;
            
            this.thrusters.children.forEach((thruster, index) => {
                if (thruster && thruster.position) {
                    const offset = index * (Math.PI / 2);
                    thruster.position.y = -0.2 + Math.sin(t * 3.0 + offset) * 0.03;
                }
            });
        }

        // Helma sway
        if (this.helmet) {
            this.helmet.rotation.y = Math.sin(t * 1.5) * 0.02;
            this.helmet.rotation.x = Math.cos(t * 2.0) * 0.01;
        }
    }

    activateBoost() {
        this.neonElements.forEach(element => {
            if (element && element.material && typeof element.material.emissiveIntensity === 'number') {
                element.material.emissiveIntensity = 1.5;
            }
        });

        if (this.thrusters) {
            this.thrusters.children.forEach(thruster => {
                if (thruster && thruster.material && thruster.scale) {
                    thruster.material.emissiveIntensity = 2.0;
                    thruster.scale.y = 1.3;
                }
            });
        }
    }

    deactivateBoost() {
        this.neonElements.forEach(element => {
            if (element && element.material && typeof element.material.emissiveIntensity === 'number') {
                element.material.emissiveIntensity = 0.8;
            }
        });

        if (this.thrusters) {
            this.thrusters.children.forEach(thruster => {
                if (thruster && thruster.material && thruster.scale) {
                    thruster.material.emissiveIntensity = 1.0;
                    thruster.scale.y = 1.0;
                }
            });
        }
    }
}
