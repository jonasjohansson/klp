// controls.mjs
import { Pane } from "https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js";

function bootPaneV4() {
  const pane = new Pane({ title: "KLP Textures" });

  // --- WASD bridge: re-emit WASD that occur inside the pane so A-Frame sees them
  const forward = (type, e) => {
    const k = (e.key || "").toLowerCase();
    if (!["w", "a", "s", "d"].includes(k)) return;
    const evt = new KeyboardEvent(type, {
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      which: e.which,
      repeat: e.repeat,
      bubbles: true,
    });
    window.dispatchEvent(evt);
  };
  pane.element.addEventListener("keydown", (e) => forward("keydown", e), { capture: true });
  pane.element.addEventListener("keyup", (e) => forward("keyup", e), { capture: true });

  // ---- Set picker (klp2..klp6)
  const optionsObj = Object.fromEntries(window.textureSets.map((s) => [s, s]));
  const setBinding = pane.addBinding(window.state, "setName", { label: "set", options: optionsObj });
  setBinding.on("change", (ev) => {
    window.applyTextureSet(ev.value);
    // Optional: blur UI & refocus scene so you can move immediately
    requestAnimationFrame(() => {
      document.activeElement?.blur?.();
      document.querySelector("a-scene")?.focus();
    });
  });

  // ---- Look tweaks
  const fLook = pane.addFolder({ title: "Look", expanded: true });
  fLook.addBinding(window.state, "bloom", { label: "bloom", min: 0, max: 3, step: 0.1 }).on("change", window.applyBloom);
  fLook.addBinding(window.state, "bloomThreshold", { label: "threshold", min: 0, max: 1, step: 0.01 }).on("change", window.applyBloom);
  fLook
    .addBinding(window.state, "emissiveIntensity", { label: "emissive", min: 0, max: 3, step: 0.1 })
    .on("change", window.applyMaterialTweaks);
  fLook.addBinding(window.state, "alphaTest", { label: "alphaTest", min: 0, max: 1, step: 0.01 }).on("change", window.applyMaterialTweaks);
}

// Wait for BOTH the DOM and the app to be ready (order-agnostic)
let domReady = document.readyState !== "loading";
let appReady = !!(window.state && window.textureSets);

function tryStart() {
  if (domReady && appReady) {
    if (!window.__klpPaneStarted) {
      window.__klpPaneStarted = true;
      bootPaneV4();
    }
  }
}

if (!domReady) {
  window.addEventListener("DOMContentLoaded", () => {
    domReady = true;
    tryStart();
  });
} else {
  tryStart();
}

if (!appReady) {
  window.addEventListener("klp-app-ready", () => {
    appReady = true;
    tryStart();
  });
} else {
  tryStart();
}
