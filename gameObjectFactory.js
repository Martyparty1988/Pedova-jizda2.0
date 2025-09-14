import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

const LANE_WIDTH = 4;

/**
 * Továrna pro vytváření herních objektů (překážky, power-upy).
 */
export class GameObjectFactory {
    
    /**
     * Vytvoří náhodnou překážku podle typu zóny.
     * @param {number} zPos - Pozice na ose Z.
     * @param {string} zoneType - Typ aktuální zóny ('sewer', 'subway', 'datastream').
     * @returns {object} Objekt obsahující mesh a další data překážky.
     */
    createObstacle(zPos, zoneType) {
        let obstacleData = { type: 'obstacle', mesh: null };

        // Výběr překážek podle zóny
        switch (zoneType) {
            case 'subway':
                this.createSubwayObstacle(zPos, obstacleData);
                break;
            case 'datastream':
                this.createDatastreamObstacle(zPos, obstacleData);
                break;
            case 'sewer':
            default:
                this.createSewerObstacle(zPos, obstacleData);
                break;
        }
        
        return obstacleData;
    }

    /**
     * Vytváří překážky pro zónu "Kanalizace".
     */
    createSewerObstacle(zPos, obstacleData) {
        const type = Math.random();
        const group = new THREE.Group(); // Použijeme grupu pro komplexní překážky

        if (type < 0.4) { // Nízká zeď (přeskočit)
            const lane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(LANE_WIDTH - 0.5, 1.5, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x6B8E23, roughness: 0.8 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((lane - 1) * LANE_WIDTH, -0.2, zPos);
            group.add(mesh);
        } else if (type < 0.7) { // Roura přes všechny dráhy
            const geo = new THREE.CylinderGeometry(0.5, 0.5, LANE_WIDTH * 3.2, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.8, roughness: 0.6 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.z = Math.PI / 2;
            mesh.position.set(0, 0, zPos);
            group.add(mesh);
        } else { // Vertikální mříž (proletět mezerou)
            const gapLane = Math.floor(Math.random() * 3);
            for (let i = 0; i < 3; i++) {
                if (i === gapLane) continue;
                const geo = new THREE.BoxGeometry(LANE_WIDTH, 8, 0.5);
                const mat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 });
                const bar = new THREE.Mesh(geo, mat);
                bar.position.set((i - 1) * LANE_WIDTH, 3, 0); // Pozice relativní ke grupě
                group.add(bar);
            }
            group.position.z = zPos;
        }
        obstacleData.mesh = group;
    }

    /**
     * Vytváří překážky pro zónu "Metro".
     */
    createSubwayObstacle(zPos, obstacleData) {
        const type = Math.random();
        const mesh = new THREE.Group();
        if (type < 0.5) { // Pilíře mezi kolejemi
            const geo = new THREE.CylinderGeometry(0.8, 0.8, 8, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
            const pillar = new THREE.Mesh(geo, mat);
            const xPos = Math.random() < 0.5 ? -LANE_WIDTH * 0.75 : LANE_WIDTH * 0.75;
            pillar.position.set(xPos, 3, 0);
            mesh.add(pillar)
        } else { // Jiskřící kabely (zůstat nízko)
            const geo = new THREE.CylinderGeometry(0.2, 0.2, LANE_WIDTH * 3.5, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xFFD700, emissiveIntensity: 1.5 });
            const cable = new THREE.Mesh(geo, mat);
            cable.rotation.z = Math.PI / 2;
            cable.position.set(0, 2.5, 0); // Visí shora
            mesh.add(cable);
        }
        mesh.position.z = zPos;
        obstacleData.mesh = mesh;
    }

    /**
     * Vytváří překážky pro zónu "Datastream".
     */
    createDatastreamObstacle(zPos, obstacleData) {
        const type = Math.random();
        const mesh = new THREE.Group();
        if (type < 0.5) { // Laserová síť (časovaná)
            const geo = new THREE.PlaneGeometry(LANE_WIDTH * 3, 8);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
            const laser = new THREE.Mesh(geo, mat);
            laser.position.set(0, 3, 0);
            mesh.add(laser);
            // TODO: Přidat logiku pro blikání v game-3d.js (vypínání kolize)
        } else { // Firewall (nechá jen jednu uličku)
            const safeLane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(LANE_WIDTH, 8, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
            
            for(let i=0; i<3; i++){
                if(i === safeLane) continue;
                const wall = new THREE.Mesh(geo, mat);
                wall.position.x = (i - 1) * LANE_WIDTH;
                wall.position.y = 3;
                mesh.add(wall);
            }
        }
        mesh.position.z = zPos;
        obstacleData.mesh = mesh;
    }

    /**
     * Vytvoří specifický power-up.
     * @param {string} powerupType - Typ power-upu ('speed', 'shield', 'life').
     * @param {number} zPos - Pozice na ose Z.
     * @returns {object} Objekt obsahující mesh a typ power-upu.
     */
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
