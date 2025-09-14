import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Reflector } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js';

/**
 * Třída pro správu a generování herního prostředí.
 */
export class Environment {
    constructor() {
        // ZMĚNA: Témata zón nyní obsahují celou paletu barev
        this.zoneThemes = {
            aurora: { // Dříve cyber_cyan
                fogColor: 0x051010,
                ambientColor: 0x081520,
                baseColor: 0x00BFFF, // Hlavní barva (azurová)
                accentColor: 0x8A2BE2, // Doplňková barva (fialová)
                particleColor: 0x00BFFF,
            },
            sunset: { // Dříve cyber_magenta
                fogColor: 0x100505,
                ambientColor: 0x200808,
                baseColor: 0xFF007F, // Hlavní barva (magentová)
                accentColor: 0xFFD700, // Doplňková barva (zlatá/žlutá)
                particleColor: 0xFF007F,
            },
            matrix: { // Dříve cyber_lime
                fogColor: 0x051005,
                ambientColor: 0x082008,
                baseColor: 0x39FF14, // Hlavní barva (limetková)
                accentColor: 0x008080, // Doplňková barva (teal/modrozelená)
                particleColor: 0x39FF14,
            }
        };

        const { mesh: tunnel, texture: tunnelTexture } = this.createFuturisticTunnel();
        this.tunnel = tunnel;
        this.tunnelTexture = tunnelTexture;

        this.floor = this.createFuturisticFloor();
        
        this.dustParticles = this.createDigitalParticles();

        // ZMĚNA: Vytváření prstenců nyní potřebuje informaci o tématu pro střídání barev
        this.lightRings = this.createLightRings(this.zoneThemes.aurora);
    }

    createFuturisticTunnel() {
        const tunnelGeo = new THREE.CylinderGeometry(10, 10, 200, 8, 1, true);
        const tunnelTex = this.createFuturisticHexTexture();
        tunnelTex.wrapS = THREE.RepeatWrapping;
        tunnelTex.wrapT = THREE.RepeatWrapping;
        tunnelTex.repeat.set(8, 4);

        const tunnelMat = new THREE.MeshStandardMaterial({
            map: tunnelTex,
            side: THREE.BackSide,
            roughness: 0.4,
            metalness: 0.8,
            emissive: 0x111111,
        });

        const mesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        return { mesh, texture: tunnelTex };
    }

    createFuturisticFloor() {
        const floorGeo = new THREE.PlaneGeometry(12, 200);
        const floor = new Reflector(floorGeo, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x080810,
            recursion: 1,
        });

        const gridTexture = this.createFuturisticGridTexture();
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

    createDigitalParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 500; i++) {
            vertices.push(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                (Math.random() - 0.5) * 200
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const particleTexture = new THREE.CanvasTexture(this.createParticleCanvas());
        const material = new THREE.PointsMaterial({
            size: 0.15,
            color: 0x00BFFF,
            transparent: true,
            opacity: 0.5,
            map: particleTexture,
            blending: THREE.AdditiveBlending,
        });
        return new THREE.Points(geometry, material);
    }
    
    // ZMĚNA: Funkce nyní přijímá téma pro nastavení dvou barev prstenců
    createLightRings(theme) {
        const group = new THREE.Group();
        const ringGeo = new THREE.RingGeometry(9.5, 9.8, 8, 1);
        
        const mat1 = new THREE.MeshBasicMaterial({ color: theme.baseColor, side: THREE.DoubleSide, opacity: 0.7, transparent: true });
        const mat2 = new THREE.MeshBasicMaterial({ color: theme.accentColor, side: THREE.DoubleSide, opacity: 0.7, transparent: true });

        for (let i = 0; i < 10; i++) { // Více prstenců pro hustší efekt
            // Střídání materiálů (barev) pro sudé a liché prstence
            const ring = new THREE.Mesh(ringGeo, (i % 2 === 0) ? mat1 : mat2);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -i * 20; // Menší rozestup
            group.add(ring);
        }
        return group;
    }

    createFuturisticHexTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0, 191, 255, 0.2)';
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

    createFuturisticGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 128, 128);

        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 128);
        ctx.moveTo(0, 0); ctx.lineTo(128, 0);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 191, 255, 0.8)';
        ctx.fillRect(0,0,5,5);

        return new THREE.CanvasTexture(canvas);
    }

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
        
        // ZMĚNA: Při změně zóny se musí aktualizovat barvy obou typů prstenců
        this.lightRings.children.forEach((ring, i) => {
            ring.material.color.setHex(i % 2 === 0 ? theme.baseColor : theme.accentColor);
        });
        
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
                // Přesuneme o celkovou délku všech prstenců
                ring.position.z -= 20 * 10; // 10 prstenců * 20 rozestup
            }
        });
    }
}
