import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * Třída pro správu a generování herního prostředí.
 * VYLEPŠENÍ:
 * - Kompletně nový design tunelu pro profesionální vzhled.
 * - Optimalizovaná podlaha bez náročných odrazů, ideální pro mobilní zařízení.
 * - Přidány dynamické textury a vylepšené částicové efekty.
 */
export class Environment {
    constructor() {
        this.zoneThemes = {
            aurora: {
                fogColor: 0x051010,
                ambientColor: 0x081520,
                baseColor: 0x00BFFF,
                accentColor: 0x8A2BE2,
                particleColor: 0x00BFFF,
            },
            sunset: {
                fogColor: 0x100505,
                ambientColor: 0x200808,
                baseColor: 0xFF007F,
                accentColor: 0xFFD700,
                particleColor: 0xFF007F,
            },
            matrix: {
                fogColor: 0x051005,
                ambientColor: 0x082008,
                baseColor: 0x39FF14,
                accentColor: 0x008080,
                particleColor: 0x39FF14,
            }
        };

        const { mesh: tunnel, texture: tunnelTexture } = this.createDataTunnel();
        this.tunnel = tunnel;
        this.tunnelTexture = tunnelTexture;
        this.floor = this.createReflectiveFloor();
        this.dustParticles = this.createDigitalMotes();
        this.lightRings = this.createLightRings(this.zoneThemes.aurora);
    }

    createDataTunnel() {
        const tunnelGeo = new THREE.CylinderGeometry(10, 10, 200, 6, 1, true); // Šestihranný tunel
        const tunnelTex = this.createCircuitTexture();
        tunnelTex.wrapS = THREE.RepeatWrapping;
        tunnelTex.wrapT = THREE.RepeatWrapping;
        tunnelTex.repeat.set(6, 4);

        const tunnelMat = new THREE.MeshStandardMaterial({
            map: tunnelTex,
            side: THREE.BackSide,
            roughness: 0.6,
            metalness: 0.4,
            emissive: 0x111111,
            emissiveMap: tunnelTex
        });

        const mesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        return { mesh, texture: tunnelTex };
    }

    createReflectiveFloor() {
        const floorGeo = new THREE.PlaneGeometry(12, 200);
        const floorTexture = this.createFloorTexture();
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(6, 100);

        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.2,
            metalness: 0.8,
            color: 0x333333,
            emissive: 0x050505,
            emissiveMap: floorTexture
        });

        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        return floor;
    }

    createDigitalMotes() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 800; i++) { // Více částic
            vertices.push(
                (Math.random() - 0.5) * 20,
                Math.random() * 10 - 1,
                (Math.random() - 0.5) * 200
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.08, // Menší částice
            color: 0x00BFFF,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Points(geometry, material);
    }

    createLightRings(theme) {
        const group = new THREE.Group();
        const ringGeo = new THREE.TorusGeometry(9.5, 0.05, 8, 32); // Tenčí prstence
        
        const mat1 = new THREE.MeshBasicMaterial({ color: theme.baseColor, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });
        const mat2 = new THREE.MeshBasicMaterial({ color: theme.accentColor, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });

        for (let i = 0; i < 15; i++) { // Více prstenců
            const ring = new THREE.Mesh(ringGeo, (i % 2 === 0) ? mat1 : mat2);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -i * 15;
            group.add(ring);
        }
        return group;
    }

    createCircuitTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
        ctx.lineWidth = 1;

        for(let i=0; i<30; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 256, Math.random() * 256);
            ctx.lineTo(Math.random() * 256, Math.random() * 256);
            ctx.stroke();
            
            if(Math.random() > 0.8) {
                 ctx.fillStyle = 'rgba(0, 191, 255, 0.5)';
                 ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
            }
        }
        return new THREE.CanvasTexture(canvas);
    }

    createFloorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, 128, 128);

        const gradient = ctx.createLinearGradient(0,0,0,128);
        gradient.addColorStop(0, "rgba(0, 191, 255, 0.3)");
        gradient.addColorStop(0.5, "rgba(0, 191, 255, 0.05)");
        gradient.addColorStop(1, "rgba(0, 191, 255, 0.3)");
        ctx.strokeStyle = gradient;

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for(let i = 0; i < 128; i += 16) {
            ctx.moveTo(i, 0); ctx.lineTo(i, 128);
            ctx.moveTo(0, i); ctx.lineTo(128, i);
        }
        ctx.stroke();
        return new THREE.CanvasTexture(canvas);
    }
    
    setZone(zone, scene, ambientLight) {
        const theme = this.zoneThemes[zone];
        if (!theme) return;

        scene.fog.color.setHex(theme.fogColor);
        ambientLight.color.setHex(theme.ambientColor);
        
        this.lightRings.children.forEach((ring, i) => {
            ring.material.color.setHex(i % 2 === 0 ? theme.baseColor : theme.accentColor);
        });
        
        this.dustParticles.material.color.setHex(theme.particleColor);
        this.tunnel.material.map = this.createCircuitTexture(theme.baseColor);
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
                ring.position.z -= 15 * 15;
            }
        });

        // Jemné pulzování stěn tunelu
        const pulse = Math.sin(Date.now() * 0.001) * 0.1 + 0.9;
        this.tunnel.material.emissiveIntensity = pulse;
    }
}
