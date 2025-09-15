import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class Environment {
    constructor() {
        this.zoneThemes = {
            aurora: { fogColor: 0x051010, ambientColor: 0x081520, baseColor: 0x00BFFF, accentColor: 0x8A2BE2, particleColor: 0x00BFFF },
            sunset: { fogColor: 0x100505, ambientColor: 0x200808, baseColor: 0xFF007F, accentColor: 0xFFD700, particleColor: 0xFF007F },
            matrix: { fogColor: 0x051005, ambientColor: 0x082008, baseColor: 0x39FF14, accentColor: 0x008080, particleColor: 0x39FF14 }
        };

        const { tunnel, wireframe } = this.createFuturisticTunnel();
        this.tunnel = tunnel;
        this.tunnelWireframe = wireframe;
        this.floor = this.createGridFloor();
        this.dustParticles = this.createDigitalParticles();
        this.lightRings = this.createLightRings(this.zoneThemes.aurora);
    }

    createFuturisticTunnel() {
        // VYLEPŠENÍ: Použití osmiúhelníkového tunelu pro lepší vzhled
        const tunnelGeo = new THREE.CylinderGeometry(10, 10, 200, 8, 1, true);
        
        const tunnelMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            side: THREE.BackSide,
            roughness: 0.8,
            metalness: 0.2
        });
        const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
        tunnel.rotation.x = Math.PI / 2;
        tunnel.position.y = 0;

        const wireframeGeo = new THREE.EdgesGeometry(tunnelGeo);
        const wireframeMat = new THREE.LineBasicMaterial({ 
            color: this.zoneThemes.aurora.accentColor,
            linewidth: 2.0,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
        wireframe.rotation.x = Math.PI / 2;
        wireframe.position.y = 0;
        
        return { tunnel, wireframe };
    }

    createGridFloor() {
        const size = 200;
        const divisions = 40;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x00aacc, 0x444444);
        
        // OPRAVA: Podlaha je správně umístěna na dno tunelu bez rotace
        gridHelper.position.y = -10;
        
        return gridHelper;
    }

    createDigitalParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        // VYLEPŠENÍ: Částice jsou generovány v kruhu, aby lépe pasovaly do tunelu
        for (let i = 0; i < 400; i++) {
            const radius = Math.random() * 9.5;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = (Math.random() - 0.5) * 200;
            vertices.push(x, y, z);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            size: 0.15,
            color: this.zoneThemes.aurora.particleColor,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
        return new THREE.Points(geometry, material);
    }
    
    createLightRings(theme) {
        const group = new THREE.Group();
        const ringGeo = new THREE.TorusGeometry(9.5, 0.08, 8, 48);
        const mat1 = new THREE.MeshBasicMaterial({ color: theme.baseColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const mat2 = new THREE.MeshBasicMaterial({ color: theme.accentColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

        for (let i = 0; i < 12; i++) {
            const ring = new THREE.Mesh(ringGeo, (i % 2 === 0) ? mat1 : mat2);
            ring.position.z = -i * 15;
            ring.position.y = 0;
            group.add(ring);
        }
        return group;
    }
    
    setZone(zone, scene, ambientLight) {
        const theme = this.zoneThemes[zone];
        if (!theme || !scene.fog) return;

        scene.fog.color.setHex(theme.fogColor);
        ambientLight.color.setHex(theme.ambientColor);
        this.lightRings.children.forEach((ring, i) => {
            ring.material.color.setHex(i % 2 === 0 ? theme.baseColor : theme.accentColor);
        });
        this.dustParticles.material.color.setHex(theme.particleColor);
        this.tunnelWireframe.material.color.setHex(theme.accentColor);
    }

    update(moveZ, playerPosition, time) {
        const rotationSpeed = 0.12;
        const rotation = -time * rotationSpeed;

        this.tunnel.rotation.z = rotation;
        this.tunnelWireframe.rotation.z = rotation;
        this.tunnelWireframe.material.opacity = 0.5 + Math.sin(time * 4) * 0.2;

        this.lightRings.children.forEach(ring => {
            ring.position.z += moveZ; 
            if (ring.position.z > playerPosition.z + 25) {
                ring.position.z -= 180;
            }
        });

        this.dustParticles.position.z += moveZ * 0.9;
        if (this.dustParticles.position.z > playerPosition.z + 100) {
            this.dustParticles.position.z -= 200;
        }
    }
}

