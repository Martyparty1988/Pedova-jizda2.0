import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Reflector } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js';

/**
 * Třída pro správu a generování herního prostředí.
 */
export class Environment {
    constructor() {
        // Tunel
        const { mesh: tunnel, texture: tunnelTexture } = this.createTunnel();
        this.tunnel = tunnel;
        this.tunnelTexture = tunnelTexture;

        // Podlaha
        this.floor = this.createFloor();

        // Částice
        this.dustParticles = this.createDustParticles();

        // Světelné prstence pro efekt rychlosti
        this.lightRings = this.createLightRings();

        // ZMĚNA: Připravené textury a barvy pro zóny
        this.zoneThemes = {
            sewer: {
                fogColor: 0x101510,
                ambientColor: 0x104010,
                ringColor: 0x33FF33,
            },
            subway: {
                fogColor: 0x151510,
                ambientColor: 0x404010,
                ringColor: 0xFFD700,
            },
            datastream: {
                fogColor: 0x101015,
                ambientColor: 0x101040,
                ringColor: 0x00BFFF,
            }
        };
    }

    /**
     * Vytvoří moderní osmiúhelníkový tunel.
     * @returns {{mesh: THREE.Mesh, texture: THREE.CanvasTexture}}
     */
    createTunnel() {
        const tunnelGeo = new THREE.CylinderGeometry(10, 10, 200, 8, 1, true); // 8 stran pro osmiúhelník
        const tunnelTex = this.createProceduralTunnelTexture();
        tunnelTex.wrapS = THREE.RepeatWrapping;
        tunnelTex.wrapT = THREE.RepeatWrapping;
        tunnelTex.repeat.set(1, 4); // Opakování textury

        const tunnelMat = new THREE.MeshStandardMaterial({
            map: tunnelTex,
            side: THREE.BackSide,
            roughness: 0.6,
            metalness: 0.3
        });

        const mesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        return { mesh, texture: tunnelTex };
    }

    /**
     * Vytvoří podlahu s reflexním povrchem a mřížkou.
     * @returns {Reflector}
     */
    createFloor() {
        const floorGeo = new THREE.PlaneGeometry(12, 200);
        const floor = new Reflector(floorGeo, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x222222,
        });

        const gridTexture = this.createGridTexture();
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(6, 100);

        const floorMaterial = floor.material;
        floorMaterial.uniforms.tDiffuse.value = gridTexture;
        floorMaterial.uniforms.color.value.set(0x333333);
        
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        
        return floor;
    }

    /**
     * Vytvoří poletující částice pro atmosféru.
     * @returns {THREE.Points}
     */
    createDustParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 300; i++) {
            vertices.push(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                (Math.random() - 0.5) * 200
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            size: 0.08,
            color: 0x00BFFF,
            transparent: true,
            opacity: 0.3
        });
        return new THREE.Points(geometry, material);
    }
    
    /**
     * Vytvoří skupinu světelných prstenců.
     * @returns {THREE.Group}
     */
    createLightRings() {
        const group = new THREE.Group();
        const ringGeo = new THREE.RingGeometry(9.5, 9.8, 8, 1);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00BFFF, side: THREE.DoubleSide, opacity: 0.7, transparent: true });

        for (let i = 0; i < 5; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat.clone()); // Klonujeme materiál pro změnu barvy
            ring.rotation.x = Math.PI / 2;
            ring.position.z = -i * 40;
            group.add(ring);
        }
        return group;
    }

    /**
     * Vytvoří procedurální texturu pro stěny tunelu.
     * @returns {THREE.CanvasTexture}
     */
    createProceduralTunnelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#101015';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#202028';
        ctx.lineWidth = 1;
        for(let i = 0; i < canvas.width; i += 16) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for(let i = 0; i < canvas.height; i += 16) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }

        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.5;
        ctx.filter = 'blur(4px)';
        ctx.beginPath(); ctx.moveTo(canvas.width / 4, 0); ctx.lineTo(canvas.width / 4, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(canvas.width * 3 / 4, 0); ctx.lineTo(canvas.width * 3 / 4, canvas.height); ctx.stroke();
        
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
        
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Vytvoří texturu mřížky pro podlahu.
     * @returns {THREE.CanvasTexture}
     */
    createGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 128, 128);

        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 128);
        ctx.moveTo(0, 0); ctx.lineTo(128, 0);
        ctx.stroke();
        return new THREE.CanvasTexture(canvas);
    }

    // ZMĚNA: Nová funkce pro nastavení vizuální zóny
    setZone(zone, scene, ambientLight) {
        const theme = this.zoneThemes[zone];
        if (!theme) return;

        scene.fog.color.setHex(theme.fogColor);
        ambientLight.color.setHex(theme.ambientColor);
        this.lightRings.children.forEach(ring => {
            ring.material.color.setHex(theme.ringColor);
        });
        // Zde byste mohli měnit i texturu tunelu, pokud byste pro každou zónu vytvořili jinou
    }

    /**
     * Aktualizuje animovatelné části prostředí.
     * @param {number} moveZ O kolik se scéna posunula v Z ose.
     * @param {THREE.Vector3} playerPosition Aktuální pozice hráče.
     */
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
