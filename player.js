import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída pro vytvoření a správu herního hráče (postava na hoverboardu).
 */
export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
        // ZMĚNA: Uchováváme si referenci na rotaci pro animaci triku
        this.trickRotation = 0; 
    }

    /**
     * Vytvoří mesh pro hráče.
     * @returns {THREE.Group}
     */
    createPlayerMesh() {
        const playerGroup = new THREE.Group();

        // Materiály
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc, metalness: 0.8, roughness: 0.3,
        });
        const boardMat = new THREE.MeshStandardMaterial({
            color: 0x333333, metalness: 0.9, roughness: 0.4,
        });
        const engineMat = new THREE.MeshPhongMaterial({
            color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 3,
        });

        // --- Hoverboard ---
        const boardGeo = new THREE.BoxGeometry(1.5, 0.2, 3.5);
        const board = new THREE.Mesh(boardGeo, boardMat);
        playerGroup.add(board);

        // --- Tryska / Motor ---
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.2, 0.6, 12);
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.z = 1.8; // Posunout na konec desky
        engine.rotation.x = Math.PI / 2;
        board.add(engine);
        // ZMĚNA: Uložíme si referenci na motor pro animaci boostu
        this.engine = engine; 

        // --- Postava ---
        const riderGroup = new THREE.Group();
        board.add(riderGroup);
        riderGroup.position.y = 0.8; // Postava stojí na desce

        const torsoGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        riderGroup.add(torso);

        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 0.9;
        riderGroup.add(head);

        // --- Finální úpravy ---
        playerGroup.scale.set(0.5, 0.5, 0.5);
        playerGroup.position.y = -0.6; // Startovní pozice

        return playerGroup;
    }

    /**
     * Aktualizace animací hráče (pohupování).
     */
    update() {
        const t = Date.now() * 0.002;
        // ZMĚNA: Přizpůsobená animace vznášení se
        this.mesh.position.y = -0.6 + Math.sin(t * 1.5) * 0.08;
        this.mesh.rotation.z = Math.cos(t) * 0.03;
    }
}
