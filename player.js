import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída reprezentující hráče a jeho vizuální podobu.
 */
export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
    }

    /**
     * Vytvoří mesh pro hráče (vznášedlo).
     * @returns {THREE.Group} Skupina obsahující všechny části vznášedla.
     */
    createPlayerMesh() {
        const playerGroup = new THREE.Group();
        
        // Materiály
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFF3FA4, metalness: 0.5, roughness: 0.6 });
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x10B981 });
        this.headlightMat = new THREE.MeshPhongMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 5 });

        // Tvar boardu
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

        // Textura s nálepkami
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
        
        playerGroup.add(mainBody, decalPlane, this.headlightLeft, this.headlightRight, frontVent);
        playerGroup.scale.set(0.7, 0.7, 0.7);
        return playerGroup;
    }

    /**
     * Vytvoří procedurální texturu pro vznášedlo.
     * @returns {THREE.CanvasTexture}
     */
    createBoardTexture() {
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 140px Teko, sans-serif'; ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#000000';
        ctx.lineWidth = 12; ctx.textAlign = 'center';
        ctx.strokeText('PEDRO', 256, 700); ctx.fillText('PEDRO', 256, 700);
        ctx.save(); ctx.translate(256, 350); ctx.rotate(-0.1); ctx.scale(2, 2);
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#333333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(-40, -10, 80, 20); ctx.stroke(); ctx.fill();
        ctx.fillStyle = '#FF0000'; ctx.fillRect(-35, -5, 50, 10);
        ctx.fillStyle = '#AAAAAA'; ctx.fillRect(40, -12, 10, 24); ctx.fillRect(50, -5, 15, 10); 
        ctx.strokeStyle = '#333333'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-60, 0); ctx.stroke();
        ctx.restore();
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Aktualizuje vizuální efekty hráče (např. pulzující světla).
     */
    update() {
        const pulse = 2 + Math.sin(Date.now() * 0.01) * 1.5;
        if (this.headlightLeft && this.headlightRight) {
            this.headlightLeft.material.emissiveIntensity = pulse;
            this.headlightRight.material.emissiveIntensity = pulse;
        }
    }
}
