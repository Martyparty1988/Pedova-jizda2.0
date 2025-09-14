import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Hráč jako zářící energetické jádro.
 * OPRAVA: Přidán chybějící 'export' před definici třídy.
 */
export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
        this.time = 0;
    }

    createPlayerMesh() {
        const group = new THREE.Group();

        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0x00BFFF,
            emissive: 0x00FFFF,
            emissiveIntensity: 2,
            metalness: 0.5,
            roughness: 0.2,
        });

        const geo = new THREE.IcosahedronGeometry(0.4, 1);
        const core = new THREE.Mesh(geo, coreMaterial);
        
        // Přidáme světlo, které bude vycházet z jádra
        const pointLight = new THREE.PointLight(0x00FFFF, 1, 10);
        core.add(pointLight);
        
        group.add(core);
        group.position.y = 0.5; // Startovní výška
        return group;
    }

    update(delta) {
        this.time += delta;
        // Pomalá rotace pro dynamický vzhled
        this.mesh.rotation.x += delta * 0.2;
        this.mesh.rotation.y += delta * 0.3;
        // Jemné pulzování
        const scale = 1 + Math.sin(this.time * 5) * 0.05;
        this.mesh.scale.set(scale, scale, scale);
    }
}
