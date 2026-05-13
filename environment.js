import * as THREE from ‘https://cdn.skypack.dev/three@0.132.2’;
import { Reflector } from ‘https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js’;

export class Environment {
constructor(options = {}) {
this.isMobile = options.mobile || false;

```
    this.zoneThemes = {
        aurora: {
            fogColor: 0x0D0E1B, ambientColor: 0x10122B,
            baseColor: 0x00ddff, accentColor: 0x8A2BE2, particleColor: 0x00ddff,
            tunnelEmissive: 0x001a2e,
        },
        sunset: {
            fogColor: 0x1B0D0E, ambientColor: 0x2B1012,
            baseColor: 0xff00c8, accentColor: 0xffa500, particleColor: 0xff00c8,
            tunnelEmissive: 0x2e0010,
        },
        matrix: {
            fogColor: 0x0D1B0E, ambientColor: 0x102B12,
            baseColor: 0x39FF14, accentColor: 0x00f0a0, particleColor: 0x39FF14,
            tunnelEmissive: 0x001a00,
        }
    };

    const { mesh: tunnel, texture: tunnelTexture, material: tunnelMaterial } = this.createFuturisticTunnel();
    this.tunnel = tunnel;
    this.tunnelTexture = tunnelTexture;
    this.tunnelMaterial = tunnelMaterial;
    this.floor = this.createFuturisticFloor();
    this.dustParticles = this.createDigitalParticles();
    this.lightRings = this.createLightRings(this.zoneThemes.aurora);
    this.speedLines = this.createSpeedLines(this.zoneThemes.aurora);
    this.innerGlow = this.createInnerGlow(this.zoneThemes.aurora);
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
        roughness: 0.3,
        metalness: 0.9,
        emissive: new THREE.Color(0x001a2e),
        emissiveIntensity: 1.8,
    });
    const mesh = new THREE.Mesh(tunnelGeo, tunnelMat);
    return { mesh, texture: tunnelTex, material: tunnelMat };
}

createFuturisticFloor() {
    const floorGeo = new THREE.PlaneGeometry(12, 200);
    const floor = new Reflector(floorGeo, {
        clipBias: 0.003, textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio, color: 0x080810, recursion: 1,
    });
    const gridTexture = this.createFuturisticGridTexture();
    gridTexture.wrapS = THREE.RepeatWrapping; gridTexture.wrapT = THREE.RepeatWrapping;
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
    const count = this.isMobile ? 500 : 750;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 7 + Math.random() * 2.5;
        vertices.push(
            Math.cos(angle) * r,
            Math.sin(angle) * r,
            (Math.random() - 0.5) * 200
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const particleTexture = new THREE.CanvasTexture(this.createParticleCanvas());
    const material = new THREE.PointsMaterial({
        size: this.isMobile ? 0.12 : 0.18,
        color: 0x00BFFF,
        transparent: true,
        opacity: 0.7,
        map: particleTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    return new THREE.Points(geometry, material);
}

createLightRings(theme) {
    const group = new THREE.Group();
    const count = 20;
    const spacing = 10;
    for (let i = 0; i < count; i++) {
        const isThick = i % 4 === 0;
        const inner = isThick ? 9.2 : 9.55;
        const outer = isThick ? 9.8 : 9.75;
        const ringGeo = new THREE.RingGeometry(inner, outer, 8, 1);
        const color = i % 2 === 0 ? theme.baseColor : theme.accentColor;
        const mat = new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide,
            opacity: isThick ? 0.95 : 0.65,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, mat);
        ring.rotation.x = Math.PI / 2;
        ring.position.z = -i * spacing;
        group.add(ring);
    }
    return group;
}

createSpeedLines(theme) {
    const group = new THREE.Group();
    const lineCount = 8;
    for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2;
        const geo = new THREE.PlaneGeometry(0.06, 200);
        const mat = new THREE.MeshBasicMaterial({
            color: theme.baseColor,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const line = new THREE.Mesh(geo, mat);
        line.position.set(Math.cos(angle) * 9.6, Math.sin(angle) * 9.6, 0);
        line.rotation.z = angle;
        group.add(line);
    }
    return group;
}

createInnerGlow(theme) {
    const geo = new THREE.CylinderGeometry(5, 5, 200, 8, 1, true);
    const mat = new THREE.MeshBasicMaterial({
        color: theme.baseColor,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
}

createFuturisticHexTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    const hexSize = 64;
    const hexHeight = hexSize * Math.sqrt(3);
    for (let row = -1; row < canvas.height / hexHeight + 1; row++) {
        for (let col = -1; col < canvas.width / (hexSize * 1.5) + 1; col++) {
            let x = col * hexSize * 1.5;
            let y = row * hexHeight;
            if (col % 2 === 1) { y += hexHeight / 2; }
            const isBright = (row + col) % 5 === 0;
            ctx.strokeStyle = isBright ? 'rgba(0, 220, 255, 0.9)' : 'rgba(0, 191, 255, 0.45)';
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
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, canvas.height);
    ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 191, 255, 0.8)';
    ctx.fillRect(0, 0, 20, 20);
    return new THREE.CanvasTexture(canvas);
}

createParticleCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
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
    this.lightRings.children.forEach((ring, i) => {
        ring.material.color.setHex(i % 2 === 0 ? theme.baseColor : theme.accentColor);
    });
    if (this.tunnelMaterial) {
        this.tunnelMaterial.emissive.setHex(theme.tunnelEmissive);
    }
    this.speedLines.children.forEach(line => {
        line.material.color.setHex(theme.baseColor);
    });
    if (this.innerGlow?.material) {
        this.innerGlow.material.color.setHex(theme.baseColor);
    }
    this.dustParticles.material.color.setHex(theme.particleColor);
}

update(moveZ, playerPosition) {
    this.tunnelTexture.offset.y -= moveZ * 0.01;
    this.dustParticles.position.z += moveZ * 0.5;
    if (this.dustParticles.position.z > playerPosition.z) {
        this.dustParticles.position.z -= 100;
    }
    const now = Date.now();
    this.lightRings.children.forEach((ring, i) => {
        ring.position.z += moveZ * 1.2 + 0.1;
        if (ring.position.z > playerPosition.z + 20) {
            ring.position.z -= 20 * 10;
        }
        const isThick = i % 4 === 0;
        const base = isThick ? 0.95 : 0.65;
        ring.material.opacity = base * (0.7 + 0.3 * Math.sin(now * 0.002 + i * 0.8));
    });
    if (this.speedLines) {
        this.speedLines.position.z = playerPosition.z;
    }
    if (this.innerGlow) {
        this.innerGlow.position.z = playerPosition.z;
    }
}
```

}