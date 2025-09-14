import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Player – Nový, abstraktní model zářícího energetického jádra.
 * Nahrazuje všechny předchozí modely.
 */
export class Player {
  constructor() {
    this.mesh = this.createPlayerMesh();
    this.animationTime = Math.random() * Math.PI * 2;
  }

  createPlayerMesh() {
    const group = new THREE.Group();

    // Hlavní zářící jádro
    const coreGeo = new THREE.IcosahedronGeometry(0.4, 1); // Mnohostěn pro "krystalový" vzhled
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00BFFF,
        emissiveIntensity: 2.5,
        metalness: 0.4,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.name = "core";
    group.add(core);

    // Vnější "silové pole" - drátěný model, který se otáčí opačně
    const shellGeo = new THREE.IcosahedronGeometry(0.45, 1);
    const shellMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.name = "shell";
    group.add(shell);

    // Nastavíme počáteční pozici tak, aby se vznášel nad podlahou
    group.position.y = 0.5;

    return group;
  }

  /**
   * Animace jádra - pomalá rotace a vznášení.
   */
  update(delta) {
    this.animationTime += delta;

    const core = this.mesh.getObjectByName('core');
    const shell = this.mesh.getObjectByName('shell');

    // Rotace každé části jinou rychlostí pro dynamický efekt
    if (core) {
        core.rotation.y += 0.8 * delta;
        core.rotation.x += 0.5 * delta;
    }
    if (shell) {
        shell.rotation.y -= 1.0 * delta;
    }

    // Plynulé vznášení nahoru a dolů
    this.mesh.position.y = 0.5 + Math.sin(this.animationTime * 1.5) * 0.1;
  }

  activateBoost() {
    // Zde můžeme v budoucnu přidat efekt pro zrychlení
  }

  deactivateBoost() {
    // Zde můžeme v budoucnu přidat efekt pro zrychlení
  }
}

