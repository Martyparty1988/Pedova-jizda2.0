import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída pro vytvoření a správu herního hráče (stíhačky).
 */
export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
    }

    /**
     * Vytvoří mesh pro hráče.
     * @returns {THREE.Group}
     */
    createPlayerMesh() {
        const playerGroup = new THREE.Group();

        // Materiály
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.8,
            roughness: 0.3,
        });
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.9,
            roughness: 0.4,
        });
        const engineMat = new THREE.MeshPhongMaterial({
            color: 0xff007f, // Zářivá magenta
            emissive: 0xff007f,
            emissiveIntensity: 3,
        });
        const headlightMat = new THREE.MeshPhongMaterial({
            color: 0x00BFFF,
            emissive: 0x00BFFF,
            emissiveIntensity: 5,
        });

        // Trup lodi - OPRAVA: Nahrazeno CapsuleGeometry za CylinderGeometry
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 2.5, 16);
        const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
        mainBody.rotation.x = Math.PI / 2;
        playerGroup.add(mainBody);

        // Křídla
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(1.5, -0.5);
        wingShape.lineTo(1.5, -1);
        wingShape.lineTo(0, -0.8);
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: false });

        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.rotation.y = Math.PI;
        leftWing.position.set(-0.2, 0.3, 0.5);
        playerGroup.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.position.set(0.2, 0.3, 0.5);
        playerGroup.add(rightWing);

        // Motor
        const engineGeo = new THREE.CylinderGeometry(0.25, 0.15, 0.5, 12);
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.z = 1.2;
        engine.rotation.x = Math.PI / 2;
        playerGroup.add(engine);

        // Přední světlo
        const headlightGeo = new THREE.SphereGeometry(0.1, 16, 8);
        const headlight = new THREE.Mesh(headlightGeo, headlightMat);
        headlight.position.z = -1.3;
        playerGroup.add(headlight);

        playerGroup.scale.set(0.6, 0.6, 0.6);
        playerGroup.position.y = -0.6; // Startovní pozice

        return playerGroup;
    }

    /**
     * Aktualizace animací hráče (pohupování).
     */
    update() {
        const t = Date.now() * 0.002;
        this.mesh.position.y = -0.6 + Math.sin(t) * 0.05;
        this.mesh.rotation.x = Math.cos(t) * 0.02;
    }
}
