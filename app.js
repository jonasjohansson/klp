// app.js

// ---------- Components ----------
AFRAME.registerComponent("always-look-at", {
  schema: { type: "selector" },
  tick: function () {
    var targetEl = this.data;
    if (!targetEl) return;
    var targetPos = new THREE.Vector3();
    targetEl.object3D.getWorldPosition(targetPos);
    // Make the entity’s -Z axis point at the target.
    this.el.object3D.lookAt(targetPos);
    // If your object appears inverted, you may need the following:
    this.el.object3D.rotateY(Math.PI);
  },
});

// Average visible tex color -> light color
AFRAME.registerComponent("texture-light", {
  schema: { texture: { type: "selector" } },
  init: function () {
    var imgEl = this.data.texture;
    if (!imgEl) {
      console.warn("texture-light: No texture selector provided.");
      return;
    }
    var onLoad = () => this.sampleTexture(imgEl);
    this._onLoad = onLoad;
    if (!imgEl.complete || !imgEl.naturalWidth) {
      imgEl.addEventListener("load", onLoad);
    } else {
      onLoad();
    }
  },
  remove: function () {
    if (this.data.texture && this._onLoad) {
      this.data.texture.removeEventListener("load", this._onLoad);
    }
  },
  sampleTexture: function (imgEl) {
    var canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    try {
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("texture-light: Unable to access image data. Possibly CORS.", e);
      return;
    }
    var data = imageData.data;
    var r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (var i = 0; i < data.length; i += 4) {
      var alpha = data[i + 3] / 255;
      if (alpha > 0.1) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    if (!count) count = 1;
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    var color = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    this.el.setAttribute("light", "color", color);
    // Slightly scale intensity by perceived luminance
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    this.el.setAttribute("light", "intensity", 1.0 + lum * 0.5);
  },
});

// Optional focal tweak
AFRAME.registerComponent("focal-changer", {
  init: function () {
    this.el.addEventListener("loaded", () => {
      const camera = this.el.camera;
      if (camera && camera.setFocalLength) camera.setFocalLength(50);
    });
  },
});

// ---------- Helpers ----------
function applyBloomDefaults() {
  // Set punchier bloom on whichever camera is active (free or fixed)
  const cams = [document.querySelector("#freeCam"), document.querySelector("#fixedCamera")].filter(Boolean);

  cams.forEach((camEl) => {
    camEl.setAttribute("bloom", "threshold: 0.02; strength: 2.8; radius: 0.7");
  });
}

function applyMaterialTweaks() {
  // Only touch the thin front panels (depth ~ 0.01)
  const fronts = Array.from(document.querySelectorAll("#boxes-group a-box[material]")).filter(
    (el) => Number(el.getAttribute("depth")) <= 0.011
  );

  fronts.forEach((box) => {
    const mat = box.getAttribute("material");
    box.setAttribute("material", {
      ...mat,
      emissive: "#ffffff",
      emissiveIntensity: 1.9,
      alphaTest: 0.5,
      transparent: true,
      opacity: 1,
    });
  });
}

function installCameraToggle() {
  // Safer toggle: flip camera.active; let A-Frame handle the active camera
  document.addEventListener("keydown", function (evt) {
    if ((evt.key || "").toLowerCase() !== "c") return;

    const freeCamEl = document.querySelector("#freeCam");
    const fixedCamEl = document.querySelector("#fixedCamera");
    if (!freeCamEl || !fixedCamEl) return;

    const freeActive = !!freeCamEl.getAttribute("camera").active;
    const fixedActive = !!fixedCamEl.getAttribute("camera").active;

    if (freeActive && !fixedActive) {
      freeCamEl.setAttribute("camera", "active", false);
      fixedCamEl.setAttribute("camera", "active", true);
      console.log("Switched to fixed camera");
    } else {
      fixedCamEl.setAttribute("camera", "active", false);
      freeCamEl.setAttribute("camera", "active", true);
      console.log("Switched to free camera");
    }
  });
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  // Ensure the scene can and does receive keyboard focus (for WASD)

  applyBloomDefaults();
  applyMaterialTweaks();
  installCameraToggle();
});
