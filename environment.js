import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class Environment {
    constructor() {
        this.zoneThemes = {
            aurora: { fogColor: 0x051010, ambientColor: 0x081520, baseColor: 0x00BFFF, accentColor: 0x8A2BE2, particleColor: 0x00BFFF },
            sunset: { fogColor: 0x100505, ambientColor: 0x200808, baseColor: 0xFF007F, accentColor: 0xFFD700, particleColor: 0xFF007F },
            matrix: { fogColor: 0x051005, ambientColor: 0x082008, baseColor: 0x39FF14, accentColor: 0x008080, particleColor: 0x39FF14 }
        };

        // Vytvoření tunelu a podlahy
        const { tunnel, wireframe } = this.createFuturisticTunnel();
        this.tunnel = tunnel;
        this.tunnelWireframe = wireframe;
        this.floor = this.createFuturisticFloor();

        // Vytvoření částic a světelných prstenců
        this.dustParticles = this.createDigitalParticles();
        this.lightRings = this.createLightRings(this.zoneThemes.aurora);
    }

    createFuturisticTunnel() {
        const tunnelGeo = new THREE.CylinderGeometry(10, 10, 200, 6, 1, true);
        
        const tunnelMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            side: THREE.BackSide,
            roughness: 0.8,
            metalness: 0.2
        });
        const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
        // OPRAVA: Otočení válce, aby z něj byl horizontální tunel
        tunnel.rotation.x = Math.PI / 2;

        const wireframeGeo = new THREE.EdgesGeometry(tunnelGeo);
        const wireframeMat = new THREE.LineBasicMaterial({ 
            color: this.zoneThemes.aurora.accentColor,
            linewidth: 1.5,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
        // OPRAVA: Otočení kostry, aby seděla na tunel
        wireframe.rotation.x = Math.PI / 2;
        
        return { tunnel, wireframe };
    }

    createFuturisticFloor() {
        const floorGeo = new THREE.PlaneGeometry(12, 200, 1, 100);
        
        const gridTexture = this.createFuturisticGridTexture();
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(6, 100);

        const floorMat = new THREE.MeshBasicMaterial({
            map: gridTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.4
        });
        
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        // Upravena pozice, aby seděla v šestiúhelníkovém tunelu
        floor.position.y = -8.5; 
        
        return floor;
    }

    createDigitalParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 500; i++) {
            vertices.push(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 200
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            color: this.zoneThemes.aurora.particleColor,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
        });
        return new THREE.Points(geometry, material);
    }
    
    createLightRings(theme) {
        const group = new THREE.Group();
        const ringGeo = new THREE.TorusGeometry(9.5, 0.05, 8, 48);
        const mat1 = new THREE.MeshBasicMaterial({ color: theme.baseColor, side: THREE.DoubleSide });
        const mat2 = new THREE.MeshBasicMaterial({ color: theme.accentColor, side: THREE.DoubleSide });

        for (let i = 0; i < 10; i++) {
            const ring = new THREE.Mesh(ringGeo, (i % 2 === 0) ? mat1 : mat2);
            // OPRAVA: Správná orientace prstenců
            // ring.rotation.x = Math.PI / 2; // Toto už není potřeba, Torus je orientován správně
            ring.position.z = -i * 20;
            group.add(ring);
        }
        return group;
    }

    createFuturisticGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 32); ctx.lineTo(64, 32);
        ctx.moveTo(32, 0); ctx.lineTo(32, 64);
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
        this.tunnelWireframe.material.color.setHex(theme.accentColor);
    }

    update(moveZ, playerPosition, time) {
        const rotationSpeed = 0.1;
        // OPRAVA: Rotace kolem osy Z (vlastní osa tunelu po otočení)
        const rotation = -time * rotationSpeed;
        this.tunnel.rotation.z = rotation;
        this.tunnelWireframe.rotation.z = rotation;
        // Prstence nyní existují ve svém vlastním prostoru, neotáčíme je s tunelem
        // this.lightRings.rotation.z = rotation; 

        this.tunnelWireframe.material.opacity = 0.4 + Math.sin(time * 5) * 0.2;

        this.lightRings.children.forEach(ring => {
            ring.position.z += moveZ; 
            if (ring.position.z > playerPosition.z + 20) {
                ring.position.z -= 200;
            }
        });

        this.dustParticles.position.z += moveZ * 0.8;
         if (this.dustParticles.position.z > playerPosition.z + 100) {
            this.dustParticles.position.z -= 200;
        }
    }
}

