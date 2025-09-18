// =============================================================================
// RECT AREA LIGHT COMPONENT
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

console.log("Registering rect-area-light component");

export function registerRectAreaLight() {
  AFRAME.registerComponent("rect-area-light", {
    schema: {
      color: { type: "color", default: "#ffffff" },
      intensity: { type: "number", default: 2 },
      width: { type: "number", default: 2 },
      height: { type: "number", default: 2 },
    },

    init: function () {
      // Create RectAreaLight
      this.rectLight = new THREE.RectAreaLight(this.data.color, this.data.intensity, this.data.width, this.data.height);

      // Position the light
      const position = this.el.getAttribute("position");
      if (position) {
        this.rectLight.position.set(position.x, position.y, position.z);
      }

      // Make it look at the center (0, 0, 0)
      this.rectLight.lookAt(0, 0, 0);

      // Add to the scene
      this.el.setObject3D("light", this.rectLight);

      // Add helper (optional, for debugging)
      if (THREE.RectAreaLightHelper) {
        const helper = new THREE.RectAreaLightHelper(this.rectLight);
        this.rectLight.add(helper);
      }

      // console.log("rect-area-light: Created RectAreaLight with color", this.data.color);
    },

    update: function () {
      if (this.rectLight) {
        this.rectLight.color.setHex(this.data.color.replace("#", "0x"));
        this.rectLight.intensity = this.data.intensity;
        this.rectLight.width = this.data.width;
        this.rectLight.height = this.data.height;
      }
    },
  });
}
