import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Reflector } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js';

/**
 * Třída pro správu a generování herního prostředí.
 */
export class Environment {
    constructor() {
        // ZMĚNA: Používáme novou funkci pro vytvoření futuristického tunelu
        const { mesh: tunnel, texture: tunnelTexture } = this.createFuturisticTunnel();
        this.tunnel = tunnel;
        this.tunnelTexture = tunnelTexture;

        // ZMĚNA: Používáme novou funkci pro vytvoření futuristické podlahy
        this.floor = this.createFuturisticFloor();
        
        // ZMĚNA: Používáme novou funkci pro vytvoření digitálních částic
        this.dustParticles = this.createDigitalParticles();

        this.lightRings = this.createLightRings();

        // ZMĚNA: Témata zón upravena pro high-tech vzhled. Zóny se nyní liší jen barevným schématem.
        this.zoneThemes = {
            cyber_cyan: {
                fogColor: 0x050810,
                ambientColor: 0x080820,
                ringColor: 0x00BFFF,
                particleColor: 0x00BFFF,
            },
            cyber_magenta: {
                fogColor: 0x100508,
                ambientColor: 0x200808,
                ringColor: 0xFF007F,
                particleColor: 0xFF007F,
            },
            cyber_lime: {
                fogColor: 0x081005,
                ambientColor: 0x082008,
                ringColor: 0x39FF14,
                particleColor: 0x39FF14,
            }
        };
    }

    /**
     * ZMĚNA: Vytvoří high-tech osmiúhelníkový tunel s novou texturou.
     * @returns {{mesh: THREE.Mesh, texture: THREE.CanvasTexture}}
     */
    createFuturisticTunnel() {
        const tunnelGeo = new THREE.CylinderGeometry(10, 10, 200, 8, 1, true);
        const tunnelTex = this.createFuturisticHexTexture(); // Nová textura
        tunnelTex.wrapS = THREE.RepeatWrapping;
        tunnelTex.wrapT = THREE.RepeatWrapping;
        tunnelTex.repeat.set(8, 4); // Více opakování pro detailnější vzor

        const tunnelMat = new THREE.MeshStandardMaterial({
            map: tunnelTex,
            side: THREE.BackSide,
            roughness: 0.4,
            metalness: 0.8, // Lesklejší povrch
            emissive: 0x111111, // Jemné vlastní svícení
        });

        const mesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        return { mesh, texture: tunnelTex };
    }

    /**
     * ZMĚNA: Vytvoří reflexní podlahu s novou digitální mřížkou.
     * @returns {Reflector}
     */
    createFuturisticFloor() {
        const floorGeo = new THREE.PlaneGeometry(12, 200);
        const floor = new Reflector(floorGeo, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x080810, // Tmavě modrý odstín
            recursion: 1,
        });

        const gridTexture = this.createFuturisticGridTexture(); // Nová textura
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(6, 100);

        const floorMaterial = floor.material;
        floorMaterial.uniforms.tDiffuse.value = gridTexture;
        floorMaterial.uniforms.color.value.set(0x080810);
        
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        
        return floor;
    }

    /**
     * ZMĚNA: Vytvoří částice připomínající digitální data.
     * @returns {THREE.Points}
     */
    createDigitalParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 500; i++) { // Více částic
            vertices.push(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                (Math.random() - 0.5) * 200
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Použití malé čtvercové textury pro částice
        const particleTexture = new THREE.CanvasTexture(this.createParticleCanvas());
        const material = new THREE.PointsMaterial({
            size: 0.15,
            color: 0x00BFFF,
            transparent: true,
            opacity: 0.5,
            map: particleTexture,
            blending: THREE.AdditiveBlending, // Efekt záře při překrytí
        });
        return new THREE.Points(geometry, material);
    }
    
    createLightRings() {
        const group = new THREE.Group();
        const ringGeo = new THREE.RingGeometry(9.5, 9.8, 8, 1);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00BFFF, side: THREE.DoubleSide, opacity: 0.7, transparent: true });

        for (let i = 0; i < 5; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat.clone());
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -i * 40;
            group.add(ring);
        }
        return group;
    }

    /**
     * ZMĚNA: Vytvoří procedurální texturu s hexagonálním vzorem pro stěny tunelu.
     * @returns {THREE.CanvasTexture}
     */
    createFuturisticHexTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#050810'; // Tmavě modrý podklad
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0, 191, 255, 0.2)'; // Azurová barva s nízkou viditelností
        ctx.lineWidth = 2;

        const hexSize = 32;
        const hexHeight = hexSize * Math.sqrt(3);
        
        for (let row = -1; row < canvas.height / hexHeight + 1; row++) {
            for (let col = -1; col < canvas.width / (hexSize * 1.5) + 1; col++) {
                let x = col * hexSize * 1.5;
                let y = row * hexHeight;
                if (col % 2 === 1) {
                    y += hexHeight / 2;
                }
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    ctx.lineTo(x + hexSize * Math.cos(angle), y + hexSize * Math.sin(angle));
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * ZMĚNA: Vytvoří texturu digitální mřížky pro podlahu.
     * @returns {THREE.CanvasTexture}
     */
    createFuturisticGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 128, 128);

        // Hlavní čáry
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 128);
        ctx.moveTo(0, 0); ctx.lineTo(128, 0);
        ctx.stroke();

        // Tečka v rohu pro high-tech pocit
        ctx.fillStyle = 'rgba(0, 191, 255, 0.8)';
        ctx.fillRect(0,0,5,5);

        return new THREE.CanvasTexture(canvas);
    }

    // Pomocná funkce pro vytvoření textury pro částice
    createParticleCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 32, 32);
        return canvas;
    }

    setZone(zone, scene, ambientLight) {
        const theme = this.zoneThemes[zone];
        if (!theme) return;

        scene.fog.color.setHex(theme.fogColor);
        ambientLight.color.setHex(theme.ambientColor);
        this.lightRings.children.forEach(ring => {
            ring.material.color.setHex(theme.ringColor);
        });
        // ZMĚNA: Měníme i barvu částic
        this.dustParticles.material.color.setHex(theme.particleColor);
    }

    update(moveZ, playerPosition) {
        this.tunnelTexture.offset.y -= moveZ * 0.01;

        this.dustParticles.position.z += moveZ * 0.5;
        if (this.dustParticles.position.z > playerPosition.z) {
            this.dustParticles.position.z -= 100;
        }

        this.lightRings.children.forEach(ring => {
            ring.position.z += moveZ * 1.2 + 0.1; 
            if (ring.position.z > playerPosition.z + 20) {
                ring.position.z -= 200;
            }
        });
    }
}
