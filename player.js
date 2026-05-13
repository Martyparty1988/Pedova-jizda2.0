import * as THREE from ‘https://cdn.skypack.dev/three@0.132.2’;

export class Player {
constructor() {
this.mesh = this.createPlayerMesh();
this.trickRotation = 0;
this.frontFlipRotation = 0;
this.animationTime = 0;
}

```
createPlayerMesh() {
    const playerGroup = new THREE.Group();

    // ── MATERIÁLY ──────────────────────────────────────────────────
    // Tmavý lesklý armor
    const armorMat = new THREE.MeshStandardMaterial({
        color: 0x1a1c2e, metalness: 0.95, roughness: 0.1,
    });
    // Světlejší šedý sekundární armor (rukávy, stehenní plátky)
    const armorMat2 = new THREE.MeshStandardMaterial({
        color: 0x252840, metalness: 0.85, roughness: 0.2,
    });
    // Neonové cyan prvky
    const neonCyan = new THREE.MeshPhongMaterial({
        color: 0x00ffff, emissive: 0x00aaff, emissiveIntensity: 2.5,
        transparent: true, opacity: 0.95,
    });
    // Neonové fialové prvky
    const neonPurple = new THREE.MeshPhongMaterial({
        color: 0xaa44ff, emissive: 0x6600cc, emissiveIntensity: 2.0,
        transparent: true, opacity: 0.9,
    });
    // Visor – průhledný modravý
    const visorMat = new THREE.MeshPhongMaterial({
        color: 0x002244, transparent: true, opacity: 0.45,
        reflectivity: 1.0, emissive: 0x0033aa, emissiveIntensity: 1.2,
        shininess: 200,
    });
    // Board – tmavý kovový
    const boardMat = new THREE.MeshStandardMaterial({
        color: 0x111318, metalness: 0.95, roughness: 0.12,
        emissive: 0x000811, emissiveIntensity: 0.5,
    });
    // Engine glow – pod boardem
    const engineMat = new THREE.MeshPhongMaterial({
        color: 0x00ffff, emissive: 0x00aaff, emissiveIntensity: 4.0,
        transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending,
    });

    // ── HOVERBOARD ─────────────────────────────────────────────────
    const boardGroup = new THREE.Group();
    playerGroup.add(boardGroup);
    this.boardGroup = boardGroup;

    // Hlavní tělo boardu – protáhlý šestiúhelník (sfázované rohy přes scale)
    const boardGeo = new THREE.BoxGeometry(0.85, 0.12, 2.2);
    const board = new THREE.Mesh(boardGeo, boardMat);
    boardGroup.add(board);

    // Přední nos boardu – kosodélníkový klín
    const noseGeo = new THREE.CylinderGeometry(0, 0.42, 0.45, 4);
    const nose = new THREE.Mesh(noseGeo, boardMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.set(0, 0, -1.2);
    boardGroup.add(nose);

    // Neonové boční linie na boardu
    const sideLGeo = new THREE.BoxGeometry(0.04, 0.04, 2.0);
    const sideL = new THREE.Mesh(sideLGeo, neonCyan);
    sideL.position.set(-0.43, 0.07, 0);
    boardGroup.add(sideL);

    const sideR = new THREE.Mesh(sideLGeo, neonCyan.clone());
    sideR.position.set(0.43, 0.07, 0);
    boardGroup.add(sideR);

    // Neonová linie na přídi
    const frontLineGeo = new THREE.BoxGeometry(0.7, 0.04, 0.04);
    const frontLine = new THREE.Mesh(frontLineGeo, neonPurple);
    frontLine.position.set(0, 0.07, -1.08);
    boardGroup.add(frontLine);

    // Motorové trysky pod boardem – 2 páry
    const engineGeo = new THREE.BoxGeometry(0.18, 0.06, 0.9);
    const engineL = new THREE.Mesh(engineGeo, engineMat);
    engineL.position.set(-0.28, -0.1, 0.1);
    boardGroup.add(engineL);

    const engineR = new THREE.Mesh(engineGeo, engineMat.clone());
    engineR.position.set(0.28, -0.1, 0.1);
    boardGroup.add(engineR);

    // Světlo pod boardem (pro odraz na podlaze)
    const engineLight = new THREE.PointLight(0x00ccff, 1.8, 3.5);
    engineLight.position.set(0, -0.35, 0);
    boardGroup.add(engineLight);
    this.engineLight = engineLight;

    // ── NOŽNÍ POSTOJ ───────────────────────────────────────────────
    const legGroup = new THREE.Group();
    legGroup.position.y = 0.55;
    board.add(legGroup);

    // Přední noga (mírně pokrčená, surferský postoj)
    const shinGeo = new THREE.BoxGeometry(0.22, 0.45, 0.2);
    const thighGeo = new THREE.BoxGeometry(0.24, 0.38, 0.22);

    // Levá noha (přední)
    const leftThigh = new THREE.Mesh(thighGeo, armorMat);
    leftThigh.position.set(-0.22, 0.2, -0.38);
    leftThigh.rotation.x = -0.25;
    legGroup.add(leftThigh);

    const leftShin = new THREE.Mesh(shinGeo, armorMat2);
    leftShin.position.set(0, -0.4, 0.05);
    leftShin.rotation.x = 0.3;
    leftThigh.add(leftShin);

    // Pravá noha (zadní)
    const rightThigh = new THREE.Mesh(thighGeo, armorMat);
    rightThigh.position.set(0.18, 0.18, 0.35);
    rightThigh.rotation.x = 0.2;
    legGroup.add(rightThigh);

    const rightShin = new THREE.Mesh(shinGeo, armorMat2);
    rightShin.position.set(0, -0.4, -0.05);
    rightShin.rotation.x = -0.25;
    rightThigh.add(rightShin);

    // Neonové kneepady
    const kneePadGeo = new THREE.BoxGeometry(0.26, 0.14, 0.08);
    const kpL = new THREE.Mesh(kneePadGeo, neonCyan);
    kpL.position.set(0, -0.18, 0.12);
    leftThigh.add(kpL);

    const kpR = new THREE.Mesh(kneePadGeo, neonPurple);
    kpR.position.set(0, -0.18, -0.12);
    rightThigh.add(kpR);

    // ── TRUP ───────────────────────────────────────────────────────
    const riderGroup = new THREE.Group();
    board.add(riderGroup);
    riderGroup.position.y = 1.1;
    riderGroup.rotation.x = -0.18; // mírný forward lean
    this.riderGroup = riderGroup;

    // Torzo – širší ramena, zúžení v pase
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.8, 0.38);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.y = 0.1;
    riderGroup.add(torso);

    // Ramenní plátky
    const shoulderGeo = new THREE.BoxGeometry(0.22, 0.18, 0.32);
    const shL = new THREE.Mesh(shoulderGeo, armorMat2);
    shL.position.set(-0.47, 0.32, 0);
    torso.add(shL);
    const shR = new THREE.Mesh(shoulderGeo, armorMat2);
    shR.position.set(0.47, 0.32, 0);
    torso.add(shR);

    // Chest arc – neonový pruh přes hruď
    const chestArcGeo = new THREE.BoxGeometry(0.56, 0.07, 0.06);
    const chestArc = new THREE.Mesh(chestArcGeo, neonCyan);
    chestArc.position.set(0, 0.2, 0.2);
    torso.add(chestArc);

    // Boční žebrování na torzu
    const ribGeo = new THREE.BoxGeometry(0.04, 0.55, 0.06);
    [-0.28, 0.28].forEach(x => {
        const rib = new THREE.Mesh(ribGeo, neonPurple.clone());
        rib.position.set(x, 0.05, 0.2);
        torso.add(rib);
    });

    // ── RUCE ───────────────────────────────────────────────────────
    const upperArmGeo = new THREE.BoxGeometry(0.18, 0.42, 0.18);
    const foreArmGeo  = new THREE.BoxGeometry(0.15, 0.38, 0.16);
    const gloveGeo    = new THREE.BoxGeometry(0.16, 0.18, 0.2);

    // Levá ruka – natažená dopředu (rider pose)
    const leftUpperArm = new THREE.Mesh(upperArmGeo, armorMat2);
    leftUpperArm.position.set(-0.47, 0.32, 0);
    leftUpperArm.rotation.x = -0.55;
    leftUpperArm.rotation.z = 0.15;
    riderGroup.add(leftUpperArm);

    const leftForeArm = new THREE.Mesh(foreArmGeo, armorMat);
    leftForeArm.position.set(0, -0.38, -0.1);
    leftForeArm.rotation.x = -0.4;
    leftUpperArm.add(leftForeArm);

    const leftGlove = new THREE.Mesh(gloveGeo, neonCyan.clone());
    leftGlove.position.set(0, -0.28, -0.05);
    leftForeArm.add(leftGlove);

    // Pravá ruka – mírně jiný úhel (asymetrie = dynamika)
    const rightUpperArm = new THREE.Mesh(upperArmGeo, armorMat2);
    rightUpperArm.position.set(0.47, 0.32, 0);
    rightUpperArm.rotation.x = -0.35;
    rightUpperArm.rotation.z = -0.15;
    riderGroup.add(rightUpperArm);

    const rightForeArm = new THREE.Mesh(foreArmGeo, armorMat);
    rightForeArm.position.set(0, -0.38, -0.05);
    rightForeArm.rotation.x = -0.3;
    rightUpperArm.add(rightForeArm);

    const rightGlove = new THREE.Mesh(gloveGeo, neonPurple.clone());
    rightGlove.position.set(0, -0.28, -0.04);
    rightForeArm.add(rightGlove);

    // Reference na ruce pro animaci
    this.leftUpperArm  = leftUpperArm;
    this.rightUpperArm = rightUpperArm;

    // ── HLAVA ──────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.62;
    riderGroup.add(headGroup);
    this.headGroup = headGroup;

    // Základní helmet – mírně hranatý (stylizovaný)
    const helmetGeo = new THREE.BoxGeometry(0.52, 0.54, 0.56);
    const helmet = new THREE.Mesh(helmetGeo, armorMat);
    headGroup.add(helmet);

    // Helmet top fin – charakteristický prvek
    const finGeo = new THREE.BoxGeometry(0.06, 0.22, 0.28);
    const fin = new THREE.Mesh(finGeo, armorMat2);
    fin.position.set(0, 0.36, -0.04);
    headGroup.add(fin);

    // Neonové boční proužky na helmetě
    const helmetLineGeo = new THREE.BoxGeometry(0.04, 0.04, 0.5);
    [-0.27, 0.27].forEach(x => {
        const hl = new THREE.Mesh(helmetLineGeo, neonCyan.clone());
        hl.position.set(x, 0.1, 0);
        headGroup.add(hl);
    });

    // T-visor – horizontální pruh (motocross styl)
    const visorHGeo = new THREE.BoxGeometry(0.44, 0.12, 0.06);
    const visorH = new THREE.Mesh(visorHGeo, visorMat);
    visorH.position.set(0, 0.04, 0.29);
    headGroup.add(visorH);
    this.visor = visorH;

    // Visor glow strip nad visorom
    const visorGlowGeo = new THREE.BoxGeometry(0.38, 0.04, 0.05);
    const visorGlow = new THREE.Mesh(visorGlowGeo, neonCyan.clone());
    visorGlow.position.set(0, 0.1, 0.29);
    headGroup.add(visorGlow);

    // Chin guard
    const chinGeo = new THREE.BoxGeometry(0.36, 0.14, 0.1);
    const chin = new THREE.Mesh(chinGeo, armorMat2);
    chin.position.set(0, -0.18, 0.25);
    headGroup.add(chin);

    // Rim light za hráčem – dává postavu oddělit od tunelu
    const rimLight = new THREE.PointLight(0x8844ff, 2.2, 4.5);
    rimLight.position.set(0, 1.5, 2.5);
    playerGroup.add(rimLight);
    this.rimLight = rimLight;

    // ── MĚŘÍTKO A POZICE ───────────────────────────────────────────
    playerGroup.scale.set(0.62, 0.62, 0.62);
    playerGroup.position.y = -0.6;
    playerGroup.rotation.x = 0.1;

    // Sbírám všechny neon materiály pro hromadný pulse
    this.neonElements = [
        sideL.material, sideR.material, frontLine.material,
        engineL.material, engineR.material,
        chestArc.material,
        visorGlow.material,
        kpL.material, kpR.material,
        leftGlove.material, rightGlove.material,
    ];

    return playerGroup;
}

update(delta = 1 / 60) {
    const safeDelta = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 1 / 60;
    this.animationTime += safeDelta;
    const t = this.animationTime;

    // Board hover – jemné vznášení
    if (this.boardGroup) {
        this.boardGroup.position.y = Math.sin(t * 2.2) * 0.1;
        this.boardGroup.rotation.z = Math.cos(t * 1.8) * 0.03;
        this.boardGroup.rotation.x = Math.sin(t * 1.4) * 0.015;
    }

    // Trup – dýchání
    if (this.riderGroup) {
        this.riderGroup.scale.y = 1 + Math.sin(t * 2.5) * 0.025;
    }

    // Hlava – jemný náklon
    if (this.headGroup) {
        this.headGroup.rotation.z = Math.sin(t * 1.6) * 0.04;
    }

    // Ruce – rhythmický pohyb (jako balancování)
    if (this.leftUpperArm) {
        this.leftUpperArm.rotation.x = -0.55 + Math.sin(t * 2.2) * 0.07;
    }
    if (this.rightUpperArm) {
        this.rightUpperArm.rotation.x = -0.35 + Math.sin(t * 2.2 + 0.8) * 0.07;
    }

    // Visor pulse
    if (this.visor?.material) {
        this.visor.material.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.5;
    }

    // Neon pulse – všechny prvky pulzují synchronně
    const neonPulse = 1.8 + Math.sin(t * 4.0) * 0.7;
    this.neonElements.forEach(mat => {
        if (mat) mat.emissiveIntensity = neonPulse;
    });

    // Engine light flicker
    if (this.engineLight) {
        this.engineLight.intensity = 1.8 + Math.sin(t * 8.0) * 0.3;
    }
}

activateBoost() {
    this.neonElements.forEach(mat => {
        if (mat) mat.emissiveIntensity = 5.0;
    });
    if (this.engineLight) this.engineLight.intensity = 4.5;
    if (this.rimLight)   this.rimLight.intensity = 4.5;
    // Ruce dopředu při boostu
    if (this.leftUpperArm)  this.leftUpperArm.rotation.x  = -0.9;
    if (this.rightUpperArm) this.rightUpperArm.rotation.x = -0.8;
}

deactivateBoost() {
    if (this.engineLight) this.engineLight.intensity = 1.8;
    if (this.rimLight)    this.rimLight.intensity = 2.2;
}
```

}