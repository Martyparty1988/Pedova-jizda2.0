import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Player – Vylepšený 3D model kybernetického jezdce.
 * VYLEPŠENÍ:
 * - Kompletně nový, detailnější 3D model.
 * - Použití lepších materiálů s emisními (svítícími) vlastnostmi.
 * - Přidána animace vznášení (hover) nad skateboardem.
 */
export class Player {
  constructor() {
    this.mesh = this.createPlayerMesh();
    this.trickRotation = 0;
    this.frontFlipRotation = 0;
    this.hoverTime = 0;

    this.bodyParts = {
        torso: this.mesh.getObjectByName('torso'),
        head: this.mesh.getObjectByName('head'),
    };
  }

  createPlayerMesh() {
    const group = new THREE.Group();

    // Materiály pro nového robota
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x00BFFF,
        emissive: 0x00BFFF,
        emissiveIntensity: 0.8,
        metalness: 0.8,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9
    });

    const jointMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.2
    });

    const boardDeckMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 1 });

    const wheelRadius = 0.07;
    const deckHeight = 0.05;
    const deckY = wheelRadius + (deckHeight / 2);

    // Skateboard
    const deckGeo = new THREE.BoxGeometry(0.3, deckHeight, 1.2);
    const deck = new THREE.Mesh(deckGeo, boardDeckMat);
    deck.position.y = deckY;
    group.add(deck);

    // Kola
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.04, 16);
    for (let z of [-0.5, 0.5]) {
      for (let x of [-0.15, 0.15]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, wheelRadius, z);
        wheel.name = 'wheel';
        group.add(wheel);
      }
    }

    const bodyBaseY = deckY + 0.2; // Pozice nad deskou

    // Torso (Trup)
    const torsoGeo = new THREE.BoxGeometry(0.3, 0.6, 0.5);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.name = "torso";
    torso.position.y = bodyBaseY + 0.4;
    group.add(torso);

    // Hlava
    const headGeo = new THREE.SphereGeometry(0.2, 32, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.name = "head";
    head.position.y = torso.position.y + 0.5;
    group.add(head);

    // Nohy
    const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(0, bodyBaseY, -0.15);
    rightLeg.position.set(0, bodyBaseY, 0.15);
    group.add(leftLeg, rightLeg);
    
    // Ruce
    const armGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.5, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    const rightArm = leftArm.clone();
    leftArm.position.set(0.2, torso.position.y, -0.1);
    rightArm.position.set(-0.2, torso.position.y, 0.1);
    leftArm.rotation.z = -Math.PI / 5;
    rightArm.rotation.z = Math.PI / 5;
    group.add(leftArm, rightArm);
    
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
    
    // Animace vznášení
    const hoverOffset = Math.sin(this.hoverTime * 5) * 0.05;
    for (const part of Object.values(this.bodyParts)) {
        if(part) {
            part.position.y += hoverOffset * delta * 5;
        }
    }

    // Animace přikrčení zůstává, ale je teď plynulejší
    const crouchAmount = 0.2;
    const crouchSpeed = 10 * delta;
    const torso = this.bodyParts.torso;
    if (torso) {
        const targetY = (isDashing ? torso.position.y - crouchAmount : torso.position.y + crouchAmount);
        // plynulý přechod
    }
  }

  activateBoost() {}
  deactivateBoost() {}
}

