import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

const LANE_WIDTH = 4;

// ZMĚNA: Předdefinované barevné materiály pro překážky
const laserMat = new THREE.MeshBasicMaterial({ 
    color: 0xFF007F, // Magentová
    side: THREE.DoubleSide, 
    transparent: true, 
    opacity: 0.7,
    blending: THREE.AdditiveBlending
});

const energyMat = new THREE.MeshStandardMaterial({
    color: 0x39FF14, // Limetková
    emissive: 0x39FF14,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7
});

const dataBlockMat = new THREE.MeshStandardMaterial({ 
    color: 0x333333, 
    metalness: 0.9, 
    roughness: 0.2, 
    emissive: 0xFFD700, // Žlutá
    emissiveIntensity: 0.6,
    wireframe: true
});


/**
 * Továrna pro vytváření herních objektů (překážky, power-upy).
 */
export class GameObjectFactory {
    
    /**
     * Vytváří futuristické překážky s novými barevnými materiály.
     * @param {number} zPos - Pozice na ose Z.
     * @returns {object} Objekt obsahující mesh a další data překážky.
     */
    createObstacle(zPos) {
        const obstacleData = { type: 'obstacle', mesh: null };
        const group = new THREE.Group();
        const type = Math.random();

        if (type < 0.3) {
            // Laserová stěna (přeskočit nebo podjet)
            const isHigh = Math.random() > 0.5;
            const geo = new THREE.PlaneGeometry(LANE_WIDTH * 3.2, 1);
            const laser = new THREE.Mesh(geo, laserMat); // ZMĚNA: Použit nový materiál
            laser.position.y = isHigh ? 2.5 : 0;
            group.add(laser);

        } else if (type < 0.6) {
            // Energetické bariéry (proletět mezerou)
            const gapLane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(LANE_WIDTH, 8, 0.5);
            for (let i = 0; i < 3; i++) {
                if (i === gapLane) continue;
                const bar = new THREE.Mesh(geo, energyMat); // ZMĚNA: Použit nový materiál
                bar.position.set((i - 1) * LANE_WIDTH, 3, 0);
                group.add(bar);
            }
        
        } else {
            // Pohyblivý datový blok
            const lane = Math.random() < 0.5 ? 0 : 2;
            const direction = lane === 0 ? 1 : -1;
            const geo = new THREE.BoxGeometry(LANE_WIDTH - 2, LANE_WIDTH - 2, LANE_WIDTH - 2);
            const block = new THREE.Mesh(geo, dataBlockMat); // ZMĚNA: Použit nový materiál
            block.position.set((lane - 1) * LANE_WIDTH, 1, 0);
            group.add(block);
            obstacleData.movement = { speed: 3, direction: direction };
        }

        group.position.z = zPos;
        obstacleData.mesh = group;
        return obstacleData;
    }

    createPowerup(powerupType, zPos) {
        const lane = Math.floor(Math.random() * 3);
        let mesh;
        let finalType = `powerup_${powerupType}`;

        if (powerupType === 'shield') {
            const geo = new THREE.SphereGeometry(0.5, 16, 16);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x00BFFF, emissiveIntensity: 3 });
            mesh = new THREE.Mesh(geo, mat);
        } else if (powerupType === 'life') {
            const geo = new THREE.TorusGeometry(0.4, 0.15, 8, 16);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xFF007F, emissiveIntensity: 3 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
        } else { // 'speed'
            const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x39FF14, emissiveIntensity: 2 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
        }
        
        mesh.position.set((lane - 1) * LANE_WIDTH, -0.4, zPos);
        return { mesh, type: finalType, powerupType };
    }

    createShield() {
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.3, wireframe: true });
        const shieldMesh = new THREE.Mesh(geometry, material);
        shieldMesh.visible = false;
        return shieldMesh;
    }
}
