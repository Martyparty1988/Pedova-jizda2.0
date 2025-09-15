import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class Player {
    constructor() {
        this.mesh = this.createPlayerMesh();
        this.state = 'running'; // 'running', 'jumping', 'falling'
        this.verticalVelocity = 0;
        this.jumpStartY = 0;
    }

    createPlayerMesh() {
        const group = new THREE.Group();

        // VYLEPŠENÍ: Mírně větší a komplexnější krystal
        const geo = new THREE.IcosahedronGeometry(0.35, 0); // 0.3 -> 0.35
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00FFFF,
            emissive: 0x00FFFF,
            emissiveIntensity: 2,
            roughness: 0.2,
            metalness: 0.8,
        });

        const core = new THREE.Mesh(geo, mat);
        group.add(core);

        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            wireframe: true,
            opacity: 0.3,
            transparent: true
        });
        const wireframe = new THREE.Mesh(geo, wireMat);
        wireframe.scale.set(1.01, 1.01, 1.01);
        group.add(wireframe);

        const light = new THREE.PointLight(0x00FFFF, 5, 5);
        group.add(light);
        
        group.position.y = 0.5;
        
        return group;
    }

    update(delta, gameLogic) {
        // Rotace krystalu
        this.mesh.rotation.x += 0.5 * delta;
        this.mesh.rotation.y += 0.5 * delta;

        // Logika skákání a pádu
        if (this.state === 'jumping' || this.state === 'falling') {
            this.verticalVelocity -= gameLogic.gravity * delta;
            this.mesh.position.y += this.verticalVelocity * delta;

            if (this.mesh.position.y <= gameLogic.groundHeight) {
                this.mesh.position.y = gameLogic.groundHeight;
                this.state = 'running';
                this.verticalVelocity = 0;
            }
        }
    }

    jump(jumpHeight) {
        if (this.state === 'running') {
            this.state = 'jumping';
            this.verticalVelocity = Math.sqrt(2 * jumpHeight * gameLogic.gravity);
        }
    }

    superJumpEffect() {
        // Efekt pro super skok - například změna barvy nebo měřítka
        // Tento efekt je vizuální a neovlivňuje fyziku
        const core = this.mesh.children[0];
        const light = this.mesh.children[2];
        
        // Změna barvy na fialovou
        core.material.color.set(0x8A2BE2);
        core.material.emissive.set(0x8A2BE2);
        light.color.set(0x8A2BE2);
        
        // Návrat k původní barvě po krátké době
        setTimeout(() => {
            core.material.color.set(0x00FFFF);
            core.material.emissive.set(0x00FFFF);
            light.color.set(0x00FFFF);
        }, 500);
    }
}

