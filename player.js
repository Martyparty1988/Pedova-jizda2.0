import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída reprezentující hráče a jeho vizuální podobu.
 */
export class Player {
    constructor() {
        this.character = null; // Reference na postavu pro animaci
        this.mesh = this.createPlayerMesh();
    }

    /**
     * Vytvoří mesh pro hráče (postava na hoverboardu).
     * @returns {THREE.Group} Skupina obsahující všechny části hráče.
     */
    createPlayerMesh() {
        const playerGroup = new THREE.Group();
        
        // --- Vytvoření hoverboardu ---
        const board = this.createBoardMesh();
        playerGroup.add(board);

        // --- Vytvoření postavy ---
        this.character = new THREE.Group();
        
        // Materiály pro postavu
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x00BFFF, metalness: 0.8, roughness: 0.3, emissive: 0x00BFFF, emissiveIntensity: 0.5 });

        // Tělo
        const torsoGeo = new THREE.CylinderGeometry(0.4, 0.3, 1.2, 16);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 0.9; // Posunout nahoru

        // Hlava
        const headGeo = new THREE.SphereGeometry(0.4, 32, 32);
        const head = new THREE.Mesh(headGeo, helmetMat);
        head.position.y = 1.8; // Posunout nad tělo

        this.character.add(torso);
        this.character.add(head);
        
        // Přidání postavy do hlavní skupiny a škálování
        playerGroup.add(this.character);
        playerGroup.scale.set(0.7, 0.7, 0.7);
        
        return playerGroup;
    }

    /**
     * Vytvoří mesh pro samotný hoverboard.
     * @returns {THREE.Group}
     */
    createBoardMesh() {
        const boardGroup = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFF3FA4, metalness: 0.5, roughness: 0.6 });
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x10B981 });
        this.headlightMat = new THREE.MeshPhongMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 5 });

        const boardShape = new THREE.Shape();
        const w = 0.8, l = 1.5, r = 0.3, indent = 0.15;
        boardShape.moveTo(-w + r, l); boardShape.lineTo(w - r, l); boardShape.bezierCurveTo(w, l, w, l, w, l - r);
        boardShape.lineTo(w, l * 0.3); boardShape.bezierCurveTo(w, l*0.1, w - indent, l*0.1, w - indent, l*0.1);
        boardShape.lineTo(w - indent, -l*0.1); boardShape.bezierCurveTo(w, -l*0.1, w, -l*0.1, w, -l*0.3);
        boardShape.lineTo(w, -l + r); boardShape.bezierCurveTo(w, -l, w, -l, w - r, -l);
        boardShape.lineTo(-w + r, -l); boardShape.bezierCurveTo(-w, -l, -w, -l, -w, -l + r);
        boardShape.lineTo(-w, -l*0.3); boardShape.bezierCurveTo(-w, -l*0.1, -w+indent, -l*0.1, -w+indent, -l*0.1);
        boardShape.lineTo(-w+indent, l*0.1); boardShape.bezierCurveTo(-w, l*0.1, -w, l*0.1, -w, l*0.3);
        boardShape.lineTo(-w, l - r); boardShape.bezierCurveTo(-w, l, -w, l, -w + r, l);

        const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 16 };
        const boardGeo = new THREE.ExtrudeGeometry(boardShape, extrudeSettings);
        
        const mainBody = new THREE.Mesh(boardGeo, bodyMat);
        mainBody.rotation.x = -Math.PI / 2;
        mainBody.position.y = 0.05;

        // Textura desky
        const decalTexture = this.createBoardTexture();
        const decalMat = new THREE.MeshStandardMaterial({ map: decalTexture, transparent: true, polygonOffset: true, polygonOffsetFactor: -0.1 });
        const decalPlane = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, l * 2), decalMat);
        decalPlane.rotation.x = -Math.PI / 2;
        decalPlane.position.y = 0.26;
        
        // Světla a detaily
        const headlightGeo = new THREE.BoxGeometry(0.25, 0.12, 0.1);
        this.headlightLeft = new THREE.Mesh(headlightGeo, this.headlightMat);
        this.headlightLeft.position.set(-0.45, 0.05, -l + 0.1);
        this.headlightRight = this.headlightLeft.clone();
        this.headlightRight.position.x = 0.45;
        
        const frontVent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), ventMat);
        frontVent.position.set(0, -0.1, -l);
        
        boardGroup.add(mainBody, decalPlane, this.headlightLeft, this.headlightRight, frontVent);
        return boardGroup;
    }

    /**
     * Vytvoří procedurální texturu pro vznášedlo.
     * @returns {THREE.CanvasTexture}
     */
    createBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Čistý, moderní design
        ctx.fillStyle = '#FF3FA4'; // Základní barva desky
        ctx.fillRect(0, 0, 256, 512);

        ctx.strokeStyle = '#00BFFF'; // Barva pruhů
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(0, 100);
        ctx.lineTo(256, 150);
        ctx.moveTo(0, 350);
        ctx.lineTo(256, 400);
        ctx.stroke();
        
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Aktualizuje vizuální efekty hráče.
     */
    update() {
        // Pulzující světla hoverboardu
        const pulse = 2 + Math.sin(Date.now() * 0.01) * 1.5;
        if (this.headlightLeft && this.headlightRight) {
            this.headlightLeft.material.emissiveIntensity = pulse;
            this.headlightRight.material.emissiveIntensity = pulse;
        }

        // Jemné pohupování postavy
        if (this.character) {
            this.character.position.y = Math.sin(Date.now() * 0.005) * 0.05;
        }
    }
}

