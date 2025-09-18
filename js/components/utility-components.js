// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

// Slow rotation component
AFRAME.registerComponent("slow-rotation", {
  tick: function () {
    const mesh = this.el.getObject3D("mesh");
    if (mesh) {
      mesh.rotation.y += 0.0005;
    }
  },
});

// Always look at component for camera
AFRAME.registerComponent("always-look-at", {
  schema: { type: "selector" },
  tick: function () {
    var targetEl = this.data;
    if (!targetEl) return;
    var targetPos = new THREE.Vector3();
    targetEl.object3D.getWorldPosition(targetPos);
    // Make the entity's -Z axis point at the target.
    this.el.object3D.lookAt(targetPos);
    // If your object appears inverted, you may need the following:
    this.el.object3D.rotateY(Math.PI);
  },
});

// Keyboard camera component
AFRAME.registerComponent("keyboard-camera", {
  schema: {
    movementSpeed: { type: "number", default: 0.05 },
    lookSpeed: { type: "number", default: 0.002 },
    enableMouseLook: { type: "boolean", default: false },
  },

  init: function () {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.pitch = 0;
    this.yaw = 0;
    this.isPointerLocked = false;

    // Bind event handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    // Add event listeners
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);

    if (this.data.enableMouseLook) {
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("pointerlockchange", this.onPointerLockChange);

      // Request pointer lock on click
      document.addEventListener("click", () => {
        if (!this.isPointerLocked) {
          document.body.requestPointerLock();
        }
      });
    }

    // Set initial camera position
    setTimeout(() => {
      this.el.setAttribute("position", "0 2 5");
    }, 100);
  },

  onKeyDown: function (event) {
    this.keys[event.code] = true;
  },

  onKeyUp: function (event) {
    this.keys[event.code] = false;
  },

  onMouseMove: function (event) {
    if (!this.data.enableMouseLook || !this.isPointerLocked) return;

    this.yaw -= event.movementX * this.data.lookSpeed;
    this.pitch -= event.movementY * this.data.lookSpeed;

    // Clamp pitch to prevent over-rotation
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
  },

  onPointerLockChange: function () {
    this.isPointerLocked = document.pointerLockElement === document.body;
  },

  tick: function () {
    const position = this.el.getAttribute("position");
    const rotation = this.el.getAttribute("rotation");
    let moved = false;

    // Movement
    const moveVector = new THREE.Vector3();

    if (this.keys["KeyW"]) {
      moveVector.z -= this.data.movementSpeed;
      moved = true;
    }
    if (this.keys["KeyS"]) {
      moveVector.z += this.data.movementSpeed;
      moved = true;
    }
    if (this.keys["KeyA"]) {
      moveVector.x -= this.data.movementSpeed;
      moved = true;
    }
    if (this.keys["KeyD"]) {
      moveVector.x += this.data.movementSpeed;
      moved = true;
    }
    if (this.keys["KeyQ"]) {
      moveVector.y -= this.data.movementSpeed;
      moved = true;
    }
    if (this.keys["KeyE"]) {
      moveVector.y += this.data.movementSpeed;
      moved = true;
    }

    if (moved) {
      // Apply rotation to movement vector
      const yawMatrix = new THREE.Matrix4().makeRotationY(this.yaw);
      moveVector.applyMatrix4(yawMatrix);

      // Update position
      this.el.setAttribute("position", {
        x: position.x + moveVector.x,
        y: position.y + moveVector.y,
        z: position.z + moveVector.z,
      });
    }

    // Mouse look
    if (this.data.enableMouseLook) {
      this.el.setAttribute("rotation", {
        x: THREE.MathUtils.radToDeg(this.pitch),
        y: THREE.MathUtils.radToDeg(this.yaw),
        z: 0,
      });
    }
  },

  remove: function () {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    if (this.data.enableMouseLook) {
      document.removeEventListener("mousemove", this.onMouseMove);
      document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    }
  },
});
