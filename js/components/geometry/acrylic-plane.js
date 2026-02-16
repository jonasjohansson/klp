// =============================================================================
// ACRYLIC PLANE COMPONENT
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

export function registerAcrylicPlane() {
  AFRAME.registerComponent("acrylic-plane", {
    schema: {
      color: { type: "color", default: "#ffffff" },
      opacity: { type: "number", default: 0.08 },
      metalness: { type: "number", default: 0.0 },
      roughness: { type: "number", default: 0.05 },
      envMapIntensity: { type: "number", default: 1.2 },
    },

    init: function () {
      const data = this.data;

      // Create a box geometry that matches SVG size and is twice as thick
      this.createGeometry();

      // Create a mirror material using MeshPhysicalMaterial for better reflections
      const material = new THREE.MeshPhysicalMaterial({
        color: data.color, // Use schema color (defaults to white)
        opacity: data.opacity, // Use schema opacity (defaults to 0.15)
        transparent: true,
        side: THREE.DoubleSide,
        metalness: data.metalness, // Use schema metalness (defaults to 0.0)
        roughness: data.roughness, // Use schema roughness (defaults to 0.02)
        alphaTest: 0.15,
        depthWrite: false,
        envMapIntensity: data.envMapIntensity * 1.5, // Boost environment mapping
        reflectivity: 1.0, // Maximum reflectivity
        clearcoat: 0.0, // Remove clearcoat to avoid color tinting
        clearcoatRoughness: 0.0,
        transmission: 0.05, // Reduced transmission to prevent milky appearance
        thickness: 0.3,
        ior: 1.5, // Index of refraction for glass
        // Add very subtle emissive glow
        emissive: new THREE.Color(0x050505),
        emissiveIntensity: 0.02,
      });

      // Set up environment mapping for reflections
      this.setupEnvironmentMap(material);

      // Create the mesh with the geometry from createGeometry
      const geometry = this.el.object3DMap.mesh ? this.el.object3DMap.mesh.geometry : new THREE.BoxGeometry(3.40157, 3.40157, 0.06);
      const mesh = new THREE.Mesh(geometry, material);
      this.el.setObject3D("mesh", mesh);

      console.log("acrylic-plane: Created mirror plane with color", data.color);
    },

    createGeometry: function () {
      // Match the SVG outer bounds (3401.57 * 0.001 = 3.40157)
      let scaleX = 3.40157;
      let scaleY = 3.40157;

      let currentParent = this.el.parentElement;
      while (currentParent) {
        const scale = currentParent.getAttribute("scale");
        if (scale) {
          // Handle both string and Vector3 scale attributes
          if (typeof scale === "string") {
            const scaleValues = scale.split(" ").map(parseFloat);
            if (scaleValues.length >= 2) {
              scaleX *= scaleValues[0];
              scaleY *= scaleValues[1];
            }
          } else if (scale && scale.x !== undefined && scale.y !== undefined) {
            // Handle THREE.Vector3 object
            scaleX *= scale.x;
            scaleY *= scale.y;
          }
        }
        currentParent = currentParent.parentElement;
      }

      // Thickness reduced by 40% (0.1 * 0.6 = 0.06)
      const thickness = 0.06;
      const geometry = new THREE.BoxGeometry(scaleX, scaleY, thickness);

      // Update the mesh if it exists
      if (this.el.object3DMap.mesh) {
        this.el.object3DMap.mesh.geometry = geometry;
      } else {
        this.el.setObject3D("mesh", new THREE.Mesh(geometry));
      }
    },

    setupEnvironmentMap: function (material) {
      // Try to use the HDRI sky for realistic reflections
      const hdriSky = document.querySelector("#hdri-sky");

      if (hdriSky && hdriSky.object3D && hdriSky.object3D.children[0]) {
        const skyMesh = hdriSky.object3D.children[0];
        if (skyMesh.material && skyMesh.material.map) {
          // Use the HDRI texture as environment map
          material.envMap = skyMesh.material.map;
          material.envMap.mapping = THREE.EquirectangularReflectionMapping;
          material.needsUpdate = true;
          console.log("acrylic-plane: Using HDRI sky as environment map");
          return;
        }
      }

      // Fallback: disable environment mapping to avoid shader errors
      console.log("acrylic-plane: HDRI not found, disabling environment mapping");
      material.envMap = null;
      material.needsUpdate = true;
    },
  });
}
