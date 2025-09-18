// =============================================================================
// BLOOM EFFECT COMPONENT - A-Frame Post-Processing
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

console.log("Loading bloom component with Three.js modules");

export function registerBloomComponent() {
  // Register the bloom component
  AFRAME.registerComponent("bloom", {
    schema: {
      threshold: { type: "number", default: 0.5 },
      strength: { type: "number", default: 1.0 },
      radius: { type: "number", default: 0.5 },
    },

    init: function () {
      console.log("Bloom component initialized with data:", this.data);
      this.scene = this.el.sceneEl;
      this.renderer = this.scene.renderer;
      this.camera = this.scene.camera;

      // Bloom layer for selective bloom
      this.BLOOM_SCENE = 1;
      this.bloomLayer = new THREE.Layers();
      this.bloomLayer.set(this.BLOOM_SCENE);

      // Material storage for swapping
      this.materials = {};
      this.darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });

      // Wait for scene to be ready
      this.scene.addEventListener("loaded", () => {
        setTimeout(() => {
          this.setupBloom();
        }, 1000);
      });
    },

    setupBloom: function () {
      console.log("Setting up bloom effect with Three.js modules...");
      console.log("EffectComposer available:", typeof EffectComposer !== "undefined");
      console.log("UnrealBloomPass available:", typeof UnrealBloomPass !== "undefined");

      // Check if Three.js post-processing modules are available
      if (typeof EffectComposer === "undefined") {
        console.warn("Three.js EffectComposer not available, using fallback approach");
        this.setupFallbackBloom();
        return;
      }

      try {
        // Set up tone mapping for better bloom
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Create bloom composer (first pass)
        this.bloomComposer = new EffectComposer(this.renderer);
        this.bloomComposer.renderToScreen = false;

        // Create render pass for bloom
        const renderPass = new RenderPass(this.scene.object3D, this.camera);
        this.bloomComposer.addPass(renderPass);

        // Create bloom pass
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          this.data.strength,
          this.data.radius,
          this.data.threshold
        );
        this.bloomComposer.addPass(this.bloomPass);

        // Create final composer (second pass)
        this.finalComposer = new EffectComposer(this.renderer);

        // Add render pass to final composer
        this.finalComposer.addPass(renderPass);

        // Create custom shader for mixing base and bloom
        this.createMixShader();

        // Add output pass
        if (typeof OutputPass !== "undefined") {
          const outputPass = new OutputPass();
          this.finalComposer.addPass(outputPass);
        }

        // Override scene render with our custom render function
        this.scene.render = () => {
          this.renderWithBloom();
        };

        // Set up SVG objects for selective bloom
        this.setupSelectiveBloom();

        console.log("Bloom effect enabled successfully!");
      } catch (error) {
        console.error("Failed to setup bloom effect:", error);
        this.setupFallbackBloom();
      }
    },

    createMixShader: function () {
      // Custom shader material for mixing base and bloom textures
      const mixMaterial = new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
          }
        `,
        defines: {},
      });

      // Create shader pass
      this.mixPass = new ShaderPass(mixMaterial, "baseTexture");
      this.mixPass.needsSwap = true;

      // Add mix pass to final composer
      this.finalComposer.addPass(this.mixPass);
    },

    setupSelectiveBloom: function () {
      console.log("Setting up selective bloom for objects...");
      let bloomCount = 0;

      // Set up SVG objects to use bloom layer
      const svgGroup = document.querySelector("#svg-files-group");
      if (svgGroup && svgGroup.object3D) {
        svgGroup.object3D.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive) {
            // Enable bloom layer for emissive materials
            child.layers.enable(this.BLOOM_SCENE);
            bloomCount++;
            console.log("Enabled bloom for SVG mesh:", child.name || "unnamed", "emissive:", child.material.emissive);
          }
        });
      }

      // Set up acrylic planes for bloom
      const acrylicPlanes = document.querySelectorAll("[acrylic-plane]");
      acrylicPlanes.forEach((plane) => {
        if (plane.object3D) {
          plane.object3D.traverse((child) => {
            if (child.isMesh) {
              child.layers.enable(this.BLOOM_SCENE);
              bloomCount++;
              console.log("Enabled bloom for acrylic plane");
            }
          });
        }
      });

      console.log(`Total objects enabled for bloom: ${bloomCount}`);
    },

    renderWithBloom: function () {
      // Darken non-bloomed objects
      this.scene.object3D.traverse(this.darkenNonBloomed.bind(this));

      // Render bloom pass
      this.bloomComposer.render();

      // Restore materials
      this.scene.object3D.traverse(this.restoreMaterial.bind(this));

      // Render final composite
      this.finalComposer.render();
    },

    darkenNonBloomed: function (obj) {
      if (obj.isMesh && this.bloomLayer.test(obj.layers) === false) {
        this.materials[obj.uuid] = obj.material;
        obj.material = this.darkMaterial;
      }
    },

    restoreMaterial: function (obj) {
      if (this.materials[obj.uuid]) {
        obj.material = this.materials[obj.uuid];
        delete this.materials[obj.uuid];
      }
    },

    setupFallbackBloom: function () {
      console.log("Setting up fallback bloom effect...");

      // Set renderer tone mapping
      this.renderer.toneMapping = THREE.ReinhardToneMapping;
      this.renderer.toneMappingExposure = this.data.strength;

      // Enhance emissive materials
      this.scene.object3D.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
          const currentIntensity = child.material.emissiveIntensity || 1;
          child.material.emissiveIntensity = Math.min(currentIntensity * 1.5, 3.0);
          child.material.needsUpdate = true;
        }
      });

      console.log("Fallback bloom effect enabled!");
    },

    update: function () {
      if (this.bloomPass) {
        this.bloomPass.strength = this.data.strength;
        this.bloomPass.radius = this.data.radius;
        this.bloomPass.threshold = this.data.threshold;
        console.log("Updated bloom parameters:", this.data);
      } else if (this.renderer) {
        // Update fallback bloom
        this.renderer.toneMappingExposure = this.data.strength;
      }
    },
  });
}
