import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Player – teenager na skateboardu s realistickými proporcemi.
 * OPRAVA: Vnitřní pozice modelu byly upraveny tak, aby se správně vykresloval na podlaze.
 */
export class Player {
  constructor() {
    this.mesh = this.createPlayerMesh();
    this.trickRotation = 0;
    this.frontFlipRotation = 0;
  }

  createPlayerMesh() {
    const group = new THREE.Group();

    // Materiály – oblečení a skateboard
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, metalness: 0.1, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3366ff, metalness: 0.2, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.1, roughness: 0.9 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.8 });
    const boardDeckMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.3, roughness: 0.7 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3, roughness: 0.8 });

    // Střed (origin) skupiny je nyní na úrovni, kde se kola dotýkají země.
    // Herní logika umístí tento bod na úroveň podlahy.
    
    const wheelRadius = 0.07;
    const deckHeight = 0.05;

    // Skateboard Deck
    const deckY = wheelRadius + (deckHeight / 2);
    const deckGeo = new THREE.BoxGeometry(1.2, deckHeight, 0.3);
    const deck = new THREE.Mesh(deckGeo, boardDeckMat);
    deck.position.y = deckY;
    group.add(deck);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.04, 16);
    for (let x of [-0.5, 0.5]) {
      for (let z of [-0.15, 0.15]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, wheelRadius, z);
        group.add(wheel);
      }
    }

    // Tělo teenagera - vše posunuto nahoru
    const bodyBaseY = deckY + (deckHeight / 2);
    
    // Nohy
    const legHeight = 0.6;
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, legHeight, 12);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(-0.12, bodyBaseY + legHeight / 2, 0);
    rightLeg.position.set(0.12, bodyBaseY + legHeight / 2, 0);
    group.add(leftLeg, rightLeg);
    
    // Boty
    const shoeHeight = 0.08;
    const shoeGeo = new THREE.BoxGeometry(0.2, shoeHeight, 0.12);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    const shoeR = shoeL.clone();
    shoeL.position.set(-0.12, bodyBaseY + shoeHeight / 2, 0);
    shoeR.position.set(0.12, bodyBaseY + shoeHeight / 2, 0);
    group.add(shoeL, shoeR);
    
    // Torso
    const torsoHeight = 0.6;
    const torsoGeo = new THREE.BoxGeometry(0.4, torsoHeight, 0.25);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = bodyBaseY + legHeight + (torsoHeight / 2);
    group.add(torso);

    // Hlava
    const headRadius = 0.18;
    const headGeo = new THREE.SphereGeometry(headRadius, 16, 12);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, bodyBaseY + legHeight + torsoHeight + headRadius, 0);
    group.add(head);

    // Ruce
    const armHeight = 0.5;
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, armHeight, 12);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    const rightArm = leftArm.clone();
    leftArm.position.set(-0.28, bodyBaseY + legHeight + torsoHeight - 0.1, 0);
    rightArm.position.set(0.28, bodyBaseY + legHeight + torsoHeight - 0.1, 0);
    leftArm.rotation.z = Math.PI / 8;
    rightArm.rotation.z = -Math.PI / 8;
    group.add(leftArm, rightArm);
    
    group.rotation.x = -0.1;
    return group;
  }

  /**
   * OPRAVA: Aktualizace se stará pouze o otáčení kol.
   * Veškerý pohyb a rotaci celé postavy nyní řídí game-3d.js.
   */
  update() {
    this.mesh.children.forEach(child => {
      // Otáčení kol
      if (child.geometry.type === 'CylinderGeometry' && child.position.y < 0.2) {
        child.rotation.x += 0.25;
      }
    });
  }

  // Funkce pro aktivaci boost efektu (přidána pro budoucí použití)
  activateBoost() {
      // Zde může být kód pro vizuální efekt
  }

  // Funkce pro deaktivaci boost efektu (přidána pro budoucí použití)
  deactivateBoost() {
      // Zde může být kód pro vizuální efekt
  }
}
