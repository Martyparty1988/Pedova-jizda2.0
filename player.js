import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Player – teenager na skateboardu s realistickými proporcemi.
 */
export class Player {
  constructor() {
    this.mesh = this.createPlayerMesh();
    this.animationTime = 0;
  }

  createPlayerMesh() {
    const group = new THREE.Group();

    // Materiály – oblečení a skateboard
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      metalness: 0.1,
      roughness: 0.8
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x3366ff,
      metalness: 0.2,
      roughness: 0.7
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.1,
      roughness: 0.9
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.8
    });
    const boardDeckMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      metalness: 0.3,
      roughness: 0.7
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.3,
      roughness: 0.8
    });

    // Skateboard
    const deckGeo = new THREE.BoxGeometry(1.2, 0.05, 0.3);
    const deck = new THREE.Mesh(deckGeo, boardDeckMat);
    deck.position.y = -0.6;
    group.add(deck);

    const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16);
    for (let x of [-0.5, 0.5]) {
      for (let z of [-0.15, 0.15]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, -0.65, z);
        group.add(wheel);
      }
    }

    // Tělo teenagera
    const torsoGeo = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = -0.1;
    group.add(torso);

    // Hlava
    const headGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.35, 0);
    group.add(head);

    // Nohy
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(-0.12, -0.45, 0);
    rightLeg.position.set(0.12, -0.45, 0);
    group.add(leftLeg, rightLeg);

    // Boty
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.08, 0.12);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    const shoeR = shoeL.clone();
    shoeL.position.set(-0.12, -0.8, 0);
    shoeR.position.set(0.12, -0.8, 0);
    group.add(shoeL, shoeR);

    // Ruce
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    const rightArm = leftArm.clone();
    leftArm.position.set(-0.28, 0.05, 0);
    rightArm.position.set(0.28, 0.05, 0);
    leftArm.rotation.z = Math.PI / 8;
    rightArm.rotation.z = -Math.PI / 8;
    group.add(leftArm, rightArm);

    // Úpravy pozice a měřítka
    group.scale.set(1, 1, 1);
    group.rotation.x = -0.1;
    return group;
  }

  update(delta) {
    this.animationTime += delta;
    const t = this.animationTime;

    // Jemné pohupování pro dynamiku
    this.mesh.position.y = Math.sin(t * 2) * 0.02;
    this.mesh.rotation.z = Math.sin(t * 1.5) * 0.03;

    // Otáčení kol
    this.mesh.children.forEach(child => {
      if (child.geometry.type === 'CylinderGeometry') {
        child.rotation.x += delta * 10;
      }
    });
  }
}
