import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

const LANE_WIDTH = 4;

/**
 * Továrna pro vytváření herních objektů (překážky, power-upy).
 */
export class GameObjectFactory {
    
    /**
     * Vytvoří náhodnou překážku.
     * @param {number} zPos - Pozice na ose Z.
     * @returns {object} Objekt obsahující mesh a další data překážky.
     */
    createObstacle(zPos) {
        const type = Math.random();
        let mesh;
        let obstacleData = { type: 'obstacle' };

        if (type < 0.4) { // Vysoká zeď
            const lane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(LANE_WIDTH - 1, 8, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9, emissive: 0xFFD700, emissiveIntensity: 0.3 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((lane - 1) * LANE_WIDTH, 3, zPos);
        } else if (type < 0.65) { // Nízká zeď (nutno přeskočit)
            const lane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(LANE_WIDTH - 0.5, 1.5, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x996633, roughness: 0.8 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((lane - 1) * LANE_WIDTH, -0.2, zPos);
        } else if (type < 0.85) { // Pohyblivý sloup
            const lane = Math.random() < 0.5 ? 0 : 2; // Startuje na kraji
            const direction = lane === 0 ? 1 : -1; // Jde směrem ke středu
            const geo = new THREE.BoxGeometry(LANE_WIDTH - 2, 8, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2, emissive: 0xFF00FF, emissiveIntensity: 0.4 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((lane - 1) * LANE_WIDTH, 3, zPos);
            obstacleData.movement = { speed: 2, direction: direction };
        } else { // Roura přes všechny dráhy
            const geo = new THREE.CylinderGeometry(0.5, 0.5, LANE_WIDTH * 3.2, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.8, roughness: 0.6, emissive: 0xFF0000, emissiveIntensity: 0.5 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.z = Math.PI / 2;
            mesh.position.set(0, 0, zPos);
        }
        
        obstacleData.mesh = mesh;
        return obstacleData;
    }

    /**
     * Vytvoří specifický power-up.
     * @param {string} powerupType - Typ power-upu ('speed' nebo 'shield').
     * @param {number} zPos - Pozice na ose Z.
     * @returns {object} Objekt obsahující mesh a typ power-upu.
     */
    createPowerup(powerupType, zPos) {
        const lane = Math.floor(Math.random() * 3);
        let mesh;

        if (powerupType === 'shield') {
            const geo = new THREE.SphereGeometry(0.5, 16, 16);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x00BFFF, emissiveIntensity: 3 });
            mesh = new THREE.Mesh(geo, mat);
        } else { // 'speed'
            const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
            const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x39FF14, emissiveIntensity: 2 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
        }
        
        mesh.position.set((lane - 1) * LANE_WIDTH, -0.4, zPos);
        return { mesh, type: `powerup_${powerupType}`, powerupType };
    }

    /**
     * Vytvoří mesh pro štít.
     * @returns {THREE.Mesh}
     */
    createShield() {
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00BFFF, transparent: true, opacity: 0.3, wireframe: true });
        const shieldMesh = new THREE.Mesh(geometry, material);
        shieldMesh.visible = false;
        return shieldMesh;
    }
}
