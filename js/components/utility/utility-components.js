// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

// Focal changer component for camera focus
AFRAME.registerComponent("focal-changer", {
  schema: {
    target: { type: "selector", default: "#svg-files-group" },
    speed: { type: "number", default: 0.01 },
  },

  init: function () {
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(this.currentPosition);
  },

  tick: function () {
    const target = this.data.target;
    if (!target) return;

    target.object3D.getWorldPosition(this.targetPosition);

    // Smoothly move towards target
    this.currentPosition.lerp(this.targetPosition, this.data.speed);
    this.el.object3D.position.copy(this.currentPosition);
  },
});

// Always look at component for camera
AFRAME.registerComponent("always-look-at", {
  schema: { type: "selector" },
  init: function () {
    this.targetPos = new THREE.Vector3();
  },
  tick: function () {
    var targetEl = this.data;
    if (!targetEl) return;
    targetEl.object3D.getWorldPosition(this.targetPos);
    this.el.object3D.lookAt(this.targetPos);
    this.el.object3D.rotateY(Math.PI);
  },
});
