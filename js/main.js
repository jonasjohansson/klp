// =============================================================================
// MAIN APPLICATION ENTRY POINT
// =============================================================================

// Import A-Frame as ES6 module
import AFRAME from "aframe";

console.log("Loading KLP A-Frame Application");

// Import component modules
import { registerRectAreaLight } from "./components/lighting/rect-area-light.js";
import { registerAcrylicPlane } from "./components/geometry/acrylic-plane.js";
import { registerGlbMaterialEnhancer } from "./components/materials/glb-material-enhancer.js";
import { registerSvgFileLoader } from "./components/geometry/svg-file-loader.js";
import { registerBloomComponent } from "./components/lighting/bloom.js";
import "./components/utility/utility-components.js";

// Load components after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadComponents();
});

function loadComponents() {
  // Register all components
  registerBloomComponent();
  registerRectAreaLight();
  registerAcrylicPlane();
  registerGlbMaterialEnhancer();
  registerSvgFileLoader();

  console.log("All components registered successfully!");
}
