import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class Environment {
    constructor(options = {}) {
        this.isMobile = Boolean(options.mobile);
        this.zoneThemes = {
            aurora: {
                fogColor: 0x0D0E1B,
                ambientColor: 0x10122B,
                baseColor: 0x00ddff,
                accentColor: 0x8A2BE2,
                particleColor: 0x00ddff,
                tunnelEmissive: 0x001a2e
            },
            sunset: {
                fogColor: 0x1B0D0E,
                ambientColor: 0x2B1012,
                baseColor: 0xff00c8,
                accentColor: 0xffa500,
                particleColor: 0xff00c8,
                tunnelEmissive: 0x2e0010
            },
            matrix: {
                fogColor: 0x0D1B0E,
                ambientColor: 0x102B12,
                baseColor: 0x39FF14,
                accentColor: 0x00f0a0,
                particleColor: 0x39FF14,
                tunnelEmissive: 0x001a00
            }
        };

        const tunnelParts = this.createTunnel();
        this.tunnel = tunnelParts.mesh;
        this.tunnelTexture = tunnelParts.texture;
        this.tunnelMaterial = tunnelParts.material;
        this.floor = this.createFloor();
        this.dustParticles = this.createParticles();
        this.lightRings = this.createLightRings(this.zoneThemes.aurora);
        this.speedLines = this.createSpeedLines(this.zoneThemes.aurora);
        this.innerGlow = this.createInnerGlow(this.zoneThemes.aurora);
    }

    createTunnel() {
        const geometry = new THREE.CylinderGeometry(10, 10, 200, 8, 1, true);
        const texture = this.createHexTexture();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 4);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.BackSide,
            roughness: 0.35,
            metalness: 0.8,
            emissive: new THREE.Color(0x001a2e),
            emissiveIntensity: 1.2
        });
        return { mesh: new THREE.Mesh(geometry, material), texture, material };
    }

    createFloor() {
        const geometry = new THREE.PlaneGeometry(12, 200);
        const texture = this.createGridTexture();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 100);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0x080810,
            roughness: 0.2,
            metalness: 0.6,
            emissive: 0x001122,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.95
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        return floor;
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const count = this.isMobile ? 350 : 550;
        for (let i = 0; i < count; i++) {
            vertices.push((Math.random() - 0.5) * 20, Math.random() * 10, (Math.random() - 0.5) * 200);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const texture = new THREE.CanvasTexture(this.createParticleCanvas());
        const material = new THREE.PointsMaterial({
            size: this.isMobile ? 0.11 : 0.15,
            color: 0x00BFFF,
            transparent: true,
            opacity: 0.55,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Points(geometry, material);
    }

    createLightRings(theme) {
        const group = new THREE.Group();
        const geometry = new THREE.RingGeometry(9.45, 9.75, 8, 1);
        for (let i = 0; i < 14; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? theme.baseColor : theme.accentColor,
                side: THREE.DoubleSide,
                opacity: 0.65,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -i * 14;
            group.add(ring);
        }
        return group;
    }

    createSpeedLines(theme) {
        const group = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const geometry = new THREE.PlaneGeometry(0.05, 200);
            const material = new THREE.MeshBasicMaterial({
                color: theme.baseColor,
                transparent: true,
                opacity: 0.18,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const line = new THREE.Mesh(geometry, material);
            line.position.set(Math.cos(angle) * 9.4, Math.sin(angle) * 9.4, 0);
            line.rotation.z = angle;
            group.add(line);
        }
        return group;
    }

    createInnerGlow(theme) {
        const geometry = new THREE.CylinderGeometry(5, 5, 200, 8, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: theme.baseColor,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.035,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Mesh(geometry, material);
    }

    createHexTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050810';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.45)';
        ctx.lineWidth = 2;
        const size = 48;
        const height = size * Math.sqrt(3);
        for (let row = -1; row < canvas.height / height + 1; row++) {
            for (let col = -1; col < canvas.width / (size * 1.5) + 1; col++) {
                let x = col * size * 1.5;
                let y = row * height;
                if (col % 2 === 1) y += height / 2;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
        return new THREE.CanvasTexture(canvas);
    }

    createGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.55)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, canvas.height);
        ctx.moveTo(0, 0);
        ctx.lineTo(canvas.width, 0);
        ctx.stroke();
        return new THREE.CanvasTexture(canvas);
    }

    createParticleCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();
        return canvas;
    }

    setZone(zone, scene, ambientLight) {
        const theme = this.zoneThemes[zone];
        if (!theme) return;
        scene.fog.color.setHex(theme.fogColor);
        ambientLight.color.setHex(theme.ambientColor);
        if (this.tunnelMaterial) this.tunnelMaterial.emissive.setHex(theme.tunnelEmissive);
        this.lightRings.children.forEach((ring, i) => {
            ring.material.color.setHex(i % 2 === 0 ? theme.baseColor : theme.accentColor);
        });
        this.speedLines.children.forEach(line => line.material.color.setHex(theme.baseColor));
        if (this.innerGlow?.material) this.innerGlow.material.color.setHex(theme.baseColor);
        this.dustParticles.material.color.setHex(theme.particleColor);
    }

    update(moveZ, playerPosition) {
        this.tunnelTexture.offset.y -= moveZ * 0.01;
        this.dustParticles.position.z += moveZ * 0.5;
        if (this.dustParticles.position.z > playerPosition.z) this.dustParticles.position.z -= 100;
        this.lightRings.children.forEach(ring => {
            ring.position.z += moveZ * 1.2 + 0.1;
            if (ring.position.z > playerPosition.z + 20) ring.position.z -= 196;
        });
        if (this.speedLines) this.speedLines.position.z = playerPosition.z;
        if (this.innerGlow) this.innerGlow.position.z = playerPosition.z;
    }
}
