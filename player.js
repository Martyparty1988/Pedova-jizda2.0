import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Player – Nový, zaoblený a stylizovaný model energetického jezdce.
 * OPRAVA: Nahrazena nekompatibilní CapsuleGeometry za CylinderGeometry.
 */
export class Player {
  constructor() {
    this.mesh = this.createPlayerMesh();
    this.trickRotation = 0;
    this.frontFlipRotation = 0;
    this.hoverTime = Math.random() * Math.PI * 2; // Náhodný start animace

    // Uložíme si části těla pro plynulejší animace
    this.bodyParts = {
        torso: this.mesh.getObjectByName('torso'),
        head: this.mesh.getObjectByName('head'),
        leftHand: this.mesh.getObjectByName('leftHand'),
        rightHand: this.mesh.getObjectByName('rightHand'),
    };
  }

  createPlayerMesh() {
    const group = new THREE.Group();

    // Materiály pro energetickou bytost
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x00BFFF,
        emissive: 0x00BFFF,
        emissiveIntensity: 1.2,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
    });

    const boardDeckMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2, emissive: 0x222222 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 2 });

    const wheelRadius = 0.08;
    const deckHeight = 0.04;
    const deckY = wheelRadius + (deckHeight / 2);

    // Skateboard - teď spíš hoverboard
    // OPRAVA: Použita CylinderGeometry místo CapsuleGeometry
    const deckGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 16); 
    const deck = new THREE.Mesh(deckGeo, boardDeckMat);
    deck.rotation.z = Math.PI / 2; // Otočíme válec, aby ležel naplocho
    deck.position.y = deckY;
    group.add(deck);

    // Energetická kola
    const wheelGeo = new THREE.TorusGeometry(wheelRadius, 0.03, 8, 24);
    for (let z of [-0.5, 0.5]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(0, wheelRadius, z);
        wheel.name = 'wheel';
        group.add(wheel);
    }
    
    // Tělo postavy z koulí
    const bodyBaseY = deckY + 0.3;

    // Torso (Trup) - Větší koule
    const torsoGeo = new THREE.SphereGeometry(0.35, 20, 16);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.name = "torso";
    torso.position.y = bodyBaseY + 0.35;
    group.add(torso);

    // Hlava - Menší koule
    const headGeo = new THREE.SphereGeometry(0.2, 20, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.name = "head";
    head.position.y = torso.position.y + 0.45;
    group.add(head);

    // Ruce - Malé koule
    const handGeo = new THREE.SphereGeometry(0.1, 16, 12);
    const leftHand = new THREE.Mesh(handGeo, bodyMat);
    leftHand.name = "leftHand";
    const rightHand = leftHand.clone();
    rightHand.name = "rightHand";
    leftHand.position.set(0.4, torso.position.y + 0.1, -0.1);
    rightHand.position.set(-0.4, torso.position.y + 0.1, 0.1);
    group.add(leftHand, rightHand);
    
    return group;
  }
  
  update(delta, isDashing) {
    this.hoverTime += delta;

    // Otáčení kol
    this.mesh.children.forEach(child => {
      if (child.name === 'wheel') {
        child.rotation.x += 0.4;
      }
    });
    
    // Plynulá animace vznášení pro každou část těla
    const hoverSpeed = 3;
    const hoverAmount = 0.03;
    this.bodyParts.torso.position.y += Math.sin(this.hoverTime * hoverSpeed) * hoverAmount * delta * 10;
    this.bodyParts.head.position.y += Math.sin(this.hoverTime * hoverSpeed + 1) * hoverAmount * delta * 10;
    this.bodyParts.leftHand.position.x += Math.sin(this.hoverTime * hoverSpeed + 2) * hoverAmount * delta * 5;
    this.bodyParts.rightHand.position.x += Math.sin(this.hoverTime * hoverSpeed + 3) * hoverAmount * delta * 5;

    // Přikrčení při skluzu
    const crouchSpeed = 10 * delta;
    if (isDashing) {
        this.bodyParts.torso.scale.y += (0.8 - this.bodyParts.torso.scale.y) * crouchSpeed;
        this.bodyParts.head.scale.y += (0.8 - this.bodyParts.head.scale.y) * crouchSpeed;
    } else {
        this.bodyParts.torso.scale.y += (1 - this.bodyParts.torso.scale.y) * crouchSpeed;
        this.bodyParts.head.scale.y += (1 - this.bodyParts.head.scale.y) * crouchSpeed;
    }
  }

  activateBoost() {}
  deactivateBoost() {}
}

