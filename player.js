import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
        this.trickRotation = 0;
        this.frontFlipRotation = 0;
        this.animationTime = 0;
    }

    createPlayerMesh() {
        const playerGroup = new THREE.Group();
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.95, roughness: 0.15 });
        // ZMĚNA: Mírně zvýšena intenzita
        const neonMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x003366, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
        const visorMat = new THREE.MeshPhongMaterial({ color: 0x001122, transparent: true, opacity: 0.3, reflectivity: 0.9, emissive: 0x0066ff, emissiveIntensity: 0.5 });
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2, emissive: 0x002244, emissiveIntensity: 0.2 });

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

        const thrusterGroup = new THREE.Group();
        board.add(thrusterGroup);
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const thrusterGeo = new THREE.ConeGeometry(0.12, 0.4, 8);
            const thruster = new THREE.Mesh(thrusterGeo, neonMat.clone());
            const radius = 0.6;
            thruster.position.set(Math.cos(angle) * radius, -0.2, Math.sin(angle) * radius);
            thruster.rotation.x = Math.PI;
            thrusterGroup.add(thruster);
        }
        this.thrusters = thrusterGroup;

        const riderGroup = new THREE.Group();
        board.add(riderGroup);
        riderGroup.position.y = 1.2;
        const torsoGeo = new THREE.BoxGeometry(0.7, 1.4, 0.4);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 0.2;
        riderGroup.add(torso);
        const chestLightGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
        const chestLight = new THREE.Mesh(chestLightGeo, neonMat);
        chestLight.position.set(0, 0.4, 0.21);
        torso.add(chestLight);

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

        playerGroup.scale.set(0.6, 0.6, 0.6);
        playerGroup.position.y = -0.4;
        playerGroup.rotation.x = 0.1;

        this.riderGroup = riderGroup;
        this.neonElements = [neonStrip.material, chestLight.material, ...thrusterGroup.children.map(t => t.material)];

        return playerGroup;
    }

    update() {
        this.animationTime += 0.016;
        const t = this.animationTime;

        this.mesh.position.y = -0.4 + Math.sin(t * 2.2) * 0.12;
        this.mesh.rotation.z = Math.cos(t * 1.8) * 0.04;
        this.riderGroup.scale.y = 1 + Math.sin(t * 3.0) * 0.05;
        this.visor.material.emissiveIntensity = 0.5 + Math.sin(t * 5) * 0.4;

        const neonPulse = 1.0 + Math.sin(t * 4.0) * 0.5;
        this.neonElements.forEach(mat => mat.emissiveIntensity = neonPulse);

        if (this.thrusters) {
            this.thrusters.rotation.y += 0.05;
            this.thrusters.children.forEach((thruster, index) => {
                thruster.position.y = -0.2 + Math.sin(t * 3.0 + (index * Math.PI / 2)) * 0.03;
            });
        }
    }

    activateBoost() {
        // ZMĚNA: Zvýšena intenzita
        this.neonElements.forEach(mat => mat.emissiveIntensity = 3.0);
        if (this.thrusters) {
            this.thrusters.children.forEach(thruster => thruster.scale.y = 1.5);
        }
    }

    deactivateBoost() {
        if (this.thrusters) {
            this.thrusters.children.forEach(thruster => thruster.scale.y = 1.0);
        }
    }
}
