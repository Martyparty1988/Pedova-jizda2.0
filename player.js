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
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a1c2e, metalness: 0.9, roughness: 0.18 });
        const armorMat2 = new THREE.MeshStandardMaterial({ color: 0x252840, metalness: 0.8, roughness: 0.24 });
        const neonCyan = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x00aaff, emissiveIntensity: 2.0, transparent: true, opacity: 0.95 });
        const neonPurple = new THREE.MeshPhongMaterial({ color: 0xaa44ff, emissive: 0x6600cc, emissiveIntensity: 1.8, transparent: true, opacity: 0.9 });
        const visorMat = new THREE.MeshPhongMaterial({ color: 0x002244, transparent: true, opacity: 0.45, emissive: 0x0033aa, emissiveIntensity: 1.2, shininess: 200 });
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.95, roughness: 0.12, emissive: 0x000811, emissiveIntensity: 0.5 });

        const boardGroup = new THREE.Group();
        playerGroup.add(boardGroup);
        this.boardGroup = boardGroup;

        const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 2.2), boardMat);
        boardGroup.add(board);

        const nose = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.42, 0.45, 4), boardMat);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.y = Math.PI / 4;
        nose.position.set(0, 0, -1.2);
        boardGroup.add(nose);

        const sideGeo = new THREE.BoxGeometry(0.04, 0.04, 2.0);
        const sideL = new THREE.Mesh(sideGeo, neonCyan);
        sideL.position.set(-0.43, 0.07, 0);
        boardGroup.add(sideL);
        const sideR = new THREE.Mesh(sideGeo, neonCyan.clone());
        sideR.position.set(0.43, 0.07, 0);
        boardGroup.add(sideR);

        const frontLine = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), neonPurple);
        frontLine.position.set(0, 0.07, -1.08);
        boardGroup.add(frontLine);

        const engineGeo = new THREE.BoxGeometry(0.18, 0.06, 0.9);
        const engineL = new THREE.Mesh(engineGeo, neonCyan.clone());
        engineL.position.set(-0.28, -0.1, 0.1);
        boardGroup.add(engineL);
        const engineR = new THREE.Mesh(engineGeo, neonCyan.clone());
        engineR.position.set(0.28, -0.1, 0.1);
        boardGroup.add(engineR);

        const engineLight = new THREE.PointLight(0x00ccff, 1.8, 3.5);
        engineLight.position.set(0, -0.35, 0);
        boardGroup.add(engineLight);
        this.engineLight = engineLight;

        const riderGroup = new THREE.Group();
        board.add(riderGroup);
        riderGroup.position.y = 1.1;
        riderGroup.rotation.x = -0.18;
        this.riderGroup = riderGroup;

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.38), armorMat);
        torso.position.y = 0.1;
        riderGroup.add(torso);

        const chestArc = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 0.06), neonCyan.clone());
        chestArc.position.set(0, 0.2, 0.2);
        torso.add(chestArc);

        const legGeo = new THREE.BoxGeometry(0.22, 0.48, 0.2);
        const leftLeg = new THREE.Mesh(legGeo, armorMat2);
        leftLeg.position.set(-0.22, -0.25, -0.34);
        leftLeg.rotation.x = -0.25;
        riderGroup.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, armorMat2);
        rightLeg.position.set(0.2, -0.25, 0.34);
        rightLeg.rotation.x = 0.22;
        riderGroup.add(rightLeg);

        const armGeo = new THREE.BoxGeometry(0.16, 0.68, 0.16);
        const leftArm = new THREE.Mesh(armGeo, armorMat2);
        leftArm.position.set(-0.52, 0.15, 0);
        leftArm.rotation.x = -0.55;
        leftArm.rotation.z = 0.15;
        riderGroup.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, armorMat2);
        rightArm.position.set(0.52, 0.15, 0);
        rightArm.rotation.x = -0.35;
        rightArm.rotation.z = -0.15;
        riderGroup.add(rightArm);
        this.leftUpperArm = leftArm;
        this.rightUpperArm = rightArm;

        const headGroup = new THREE.Group();
        headGroup.position.y = 0.62;
        riderGroup.add(headGroup);
        this.headGroup = headGroup;

        const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.54, 0.56), armorMat);
        headGroup.add(helmet);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.06), visorMat);
        visor.position.set(0, 0.04, 0.29);
        headGroup.add(visor);
        this.visor = visor;
        const visorGlow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.05), neonCyan.clone());
        visorGlow.position.set(0, 0.1, 0.3);
        headGroup.add(visorGlow);

        const rimLight = new THREE.PointLight(0x8844ff, 2.2, 4.5);
        rimLight.position.set(0, 1.5, 2.5);
        playerGroup.add(rimLight);
        this.rimLight = rimLight;

        playerGroup.scale.set(0.62, 0.62, 0.62);
        playerGroup.position.y = -0.6;
        playerGroup.rotation.x = 0.1;

        this.neonElements = [sideL.material, sideR.material, frontLine.material, engineL.material, engineR.material, chestArc.material, visorGlow.material];
        return playerGroup;
    }

    update(delta = 1 / 60) {
        const safeDelta = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 1 / 60;
        this.animationTime += safeDelta;
        const t = this.animationTime;

        // Výšku hráče řídí GameLogic kvůli skoku a kolizím – tady Y nepřepisujeme.
        if (this.boardGroup) {
            this.boardGroup.position.y = Math.sin(t * 2.2) * 0.1;
            this.boardGroup.rotation.z = Math.cos(t * 1.8) * 0.03;
        }
        if (this.riderGroup) this.riderGroup.scale.y = 1 + Math.sin(t * 2.5) * 0.025;
        if (this.headGroup) this.headGroup.rotation.z = Math.sin(t * 1.6) * 0.04;
        if (this.leftUpperArm) this.leftUpperArm.rotation.x = -0.55 + Math.sin(t * 2.2) * 0.07;
        if (this.rightUpperArm) this.rightUpperArm.rotation.x = -0.35 + Math.sin(t * 2.2 + 0.8) * 0.07;
        if (this.visor?.material) this.visor.material.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.5;

        const neonPulse = 1.8 + Math.sin(t * 4.0) * 0.7;
        this.neonElements.forEach(mat => {
            if (mat) mat.emissiveIntensity = neonPulse;
        });
        if (this.engineLight) this.engineLight.intensity = 1.8 + Math.sin(t * 8.0) * 0.3;
    }

    activateBoost() {
        this.neonElements.forEach(mat => {
            if (mat) mat.emissiveIntensity = 5.0;
        });
        if (this.engineLight) this.engineLight.intensity = 4.5;
        if (this.rimLight) this.rimLight.intensity = 4.5;
    }

    deactivateBoost() {
        if (this.engineLight) this.engineLight.intensity = 1.8;
        if (this.rimLight) this.rimLight.intensity = 2.2;
    }
}
