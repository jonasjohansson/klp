// =============================================================================
// GLB MATERIAL ENHANCEMENT COMPONENT
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

export function registerGlbMaterialEnhancer() {
  AFRAME.registerComponent("glb-material-enhancer", {
    schema: {
      envMapIntensity: { type: "number", default: 1.0 },
      transparencyThreshold: { type: "number", default: 0.1 },
      forceTransparency: { type: "boolean", default: false },
      transparencyOpacity: { type: "number", default: 0.5 },
      transparencyPattern: { type: "string", default: "" }, // e.g., "glass", "window", "transparent"
    },

    init: function () {
      this.el.addEventListener("model-loaded", this.enhanceMaterials.bind(this));
    },

    enhanceMaterials: function () {
      // Try to get the HDRI sky texture for realistic reflections
      let envMap = null;
      const hdriSky = document.querySelector("#hdri-sky");

      if (hdriSky && hdriSky.object3D && hdriSky.object3D.children[0]) {
        const skyMesh = hdriSky.object3D.children[0];
        if (skyMesh.material && skyMesh.material.map) {
          envMap = skyMesh.material.map.clone();
          envMap.mapping = THREE.EquirectangularReflectionMapping;
        }
      }

      // Fallback: disable environment mapping to avoid shader errors
      if (!envMap) {
        envMap = null;
      }

      // Traverse the GLB model and enhance all materials
      let materialCount = 0;
      let transparentCount = 0;
      this.el.object3D.traverse((child) => {
        if (child.isMesh && child.material) {
          materialCount++;
          this.enhanceMaterial(child.material, envMap);
          if (child.material.transparent) {
            transparentCount++;
          }
        }
      });

      // Force glass transparency at the end
      this.forceGlassTransparency();

      // Make right wall non-reflective
      this.makeNonReflective("right");

      // Make ground non-reflective
      this.makeNonReflective("ground");
    },

    enhanceMaterial: function (material, envMap) {
      // Clone the material to avoid modifying the original
      const enhancedMaterial = material.clone();

      // Apply environment mapping for reflections
      if (envMap) {
        enhancedMaterial.envMap = envMap;
        enhancedMaterial.envMapIntensity = this.data.envMapIntensity;
      }

      // Enhanced transparency detection and application
      const originalOpacity = enhancedMaterial.opacity;
      const originalTransparent = enhancedMaterial.transparent;
      const meshName = material.parent ? material.parent.name : "unknown";

      // Check for transparency in multiple ways
      let isTransparent =
        originalOpacity < 1.0 || originalTransparent === true || enhancedMaterial.alphaTest > 0 || enhancedMaterial.alphaMap !== null;

      // Pattern-based transparency detection
      if (this.data.transparencyPattern && meshName.toLowerCase().includes(this.data.transparencyPattern.toLowerCase())) {
        isTransparent = true;
      }

      // Also check for exact match (case insensitive)
      if (this.data.transparencyPattern && meshName.toLowerCase() === this.data.transparencyPattern.toLowerCase()) {
        isTransparent = true;
      }

      // Force transparency if enabled
      if (this.data.forceTransparency) {
        isTransparent = true;
      }

      if (isTransparent) {
        enhancedMaterial.transparent = true;
        enhancedMaterial.opacity = this.data.forceTransparency ? this.data.transparencyOpacity : originalOpacity;
        enhancedMaterial.alphaTest = 0.1; // Prevent z-fighting
        enhancedMaterial.depthWrite = false; // Better transparency rendering
        enhancedMaterial.blending = THREE.NormalBlending;
      }

      // Handle emissive materials (materials that glow)
      if (enhancedMaterial.emissive && enhancedMaterial.emissive.getHex() !== 0x000000) {
        enhancedMaterial.emissiveIntensity = enhancedMaterial.emissiveIntensity || 1.0;
      }

      // Improve material properties for better reflections and realism
      enhancedMaterial.metalness = Math.max(enhancedMaterial.metalness || 0, 0.1);
      enhancedMaterial.roughness = Math.min(enhancedMaterial.roughness || 0.5, 0.8);

      // Ensure proper material type for best results
      if (enhancedMaterial.isMeshBasicMaterial) {
        // Convert basic materials to standard for better lighting
        const newMaterial = new THREE.MeshStandardMaterial({
          color: enhancedMaterial.color,
          map: enhancedMaterial.map,
          transparent: enhancedMaterial.transparent,
          opacity: enhancedMaterial.opacity,
          alphaTest: enhancedMaterial.alphaTest,
          side: enhancedMaterial.side,
          envMap: envMap,
          envMapIntensity: this.data.envMapIntensity,
          metalness: 0.1,
          roughness: 0.5,
        });
        enhancedMaterial = newMaterial;
      }

      // Update the material
      enhancedMaterial.needsUpdate = true;

      // Apply to the mesh
      if (material.parent) {
        material.parent.material = enhancedMaterial;
      }
    },

    forceGlassTransparency: function () {
      console.log("glb-material-enhancer: Forcing glass transparency...");
      const glbEntity = this.el;
      let transparentCount = 0;

      glbEntity.object3D.traverse((child) => {
        if (child.isMesh && (child.name === "Glass" || child.name === "GLASS")) {
          console.log(`glb-material-enhancer: Making transparent: ${child.name}`);
          child.material.transparent = true;
          child.material.opacity = this.data.transparencyOpacity || 0.3;
          child.material.alphaTest = 0.1;
          child.material.depthWrite = false;
          child.material.blending = THREE.NormalBlending;
          child.material.needsUpdate = true;
          transparentCount++;
        }
      });

      console.log(`glb-material-enhancer: Made ${transparentCount} glass objects transparent`);
      return transparentCount;
    },

    makeNonReflective: function (objectName) {
      console.log(`glb-material-enhancer: Making non-reflective: ${objectName}`);
      const glbEntity = this.el;
      let count = 0;

      glbEntity.object3D.traverse((child) => {
        if (child.isMesh) {
          if (child.name === objectName || child.name.toLowerCase().includes(objectName.toLowerCase())) {
            console.log(`glb-material-enhancer: Making non-reflective: ${child.name}`);

            // Ensure we have a material
            if (child.material) {
              child.material.envMap = null;
              child.material.envMapIntensity = 0;
              child.material.metalness = 0;
              child.material.roughness = 1.0;
              child.material.needsUpdate = true;
              count++;
              console.log(`Successfully made ${child.name} non-reflective`);
            } else {
              console.log(`No material found on ${child.name}`);
            }
          }
        }
      });

      console.log(`glb-material-enhancer: Made ${count} objects non-reflective`);
      return count;
    },
  });
}
