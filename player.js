import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída reprezentující hráče jako moderní kybernetickou stíhačku.
 */
export class Player {
    constructor() {
        // Vytvoříme reference na části, které budeme animovat
        this.engineGlowMat = null;
        this.cockpitLight = null;
        
        this.mesh = this.createPlayerMesh();
    }

    /**
     * Sestaví 3D model stíhačky z jednotlivých geometrických tvarů.
     * @returns {THREE.Group} Skupina obsahující všechny části modelu.
     */
    createPlayerMesh() {
        const playerGroup = new THREE.Group();

        // Materiály pro profesionální vzhled
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xbbbbdd, 
            metalness: 0.8, 
            roughness: 0.25,
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: 0xFF007F, // Původní "junkie-magenta"
            metalness: 0.7,
            roughness: 0.4,
            emissive: 0x550022, // Jemná vlastní záře
        });
        this.engineGlowMat = new THREE.MeshPhongMaterial({
            color: 0x00BFFF, // Původní "junkie-cyan"
            emissive: 0x00BFFF,
            emissiveIntensity: 4,
        });

        // 1. Hlavní trup
        const fuselageGeo = new THREE.CapsuleGeometry(0.4, 1.8, 4, 20);
        const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
        fuselage.rotation.z = Math.PI / 2;
        playerGroup.add(fuselage);

        // 2. Křídla
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0.1);
        wingShape.lineTo(2.2, 0.4);
        wingShape.lineTo(2.5, 0);
        wingShape.lineTo(2.2, -0.4);
        wingShape.lineTo(0, -0.1);
        wingShape.closePath();

        const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.02, bevelSegments: 2 };
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

        const leftWing = new THREE.Mesh(wingGeo, accentMat);
        leftWing.position.set(0.3, 0, -0.5);
        leftWing.rotation.y = -0.2; // Lehké natočení
        playerGroup.add(leftWing);

        const rightWing = leftWing.clone();
        rightWing.rotation.y = Math.PI + 0.2; // Zrcadlení
        rightWing.position.x = -0.3;
        playerGroup.add(rightWing);

        // 3. Motor a jeho záře
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.45, 0.8, 16);
        const engine = new THREE.Mesh(engineGeo, bodyMat);
        engine.position.z = 1.2;
        engine.rotation.x = Math.PI / 2;
        playerGroup.add(engine);

        const engineGlow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16),
            this.engineGlowMat
        );
        engineGlow.position.z = 1.55;
        engineGlow.rotation.x = Math.PI / 2;
        playerGroup.add(engineGlow);

        // 4. Přední světlo / "Kokpit"
        this.cockpitLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 8),
            this.engineGlowMat
        );
        this.cockpitLight.position.z = -1.2;
        playerGroup.add(this.cockpitLight);

        // Finální úpravy celého modelu
        playerGroup.scale.set(0.65, 0.65, 0.65);
        playerGroup.position.y = 0.5; // Lehce nadzvednout nad zem
        
        return playerGroup;
    }

    /**
     * Aktualizuje jednoduché animace modelu v každém snímku.
     */
    update() {
        // Pulzování motoru
        if (this.engineGlowMat) {
            const pulse = 4 + Math.sin(Date.now() * 0.01) * 2.5;
            this.engineGlowMat.emissiveIntensity = pulse;
        }

        // Jemné pohupování pro efekt vznášení
        this.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.005) * 0.08;
    }
}

