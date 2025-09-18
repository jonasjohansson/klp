// =============================================================================
// MAIN APPLICATION ENTRY POINT
// =============================================================================

// Import A-Frame and Three.js as ES6 modules (A-Frame team's pattern)
import AFRAME from "aframe";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

console.log("Loading KLP A-Frame Application with ES6 modules");

// Make Three.js available globally for A-Frame components (without mutation)
window.THREE = THREE;

// Import component modules
import { registerRectAreaLight } from "./components/rect-area-light.js";
import { registerAcrylicPlane } from "./components/acrylic-plane.js";
import { registerGlbMaterialEnhancer } from "./components/glb-material-enhancer.js";
import { registerSvgFileLoader } from "./components/svg-file-loader.js";
import { registerBloomComponent } from "./components/bloom.js";
import "./components/utility-components.js";

// Load components after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadComponents();
});

function loadComponents() {
  console.log("A-Frame ready, registering components...");

  // Register all components
  registerBloomComponent();
  registerRectAreaLight();
  registerAcrylicPlane();
  registerGlbMaterialEnhancer();
  registerSvgFileLoader();

  console.log("All components registered successfully!");

  // Initialize any global functions or debug utilities
  initializeGlobalFunctions();
}

function initializeGlobalFunctions() {
  // Global debug functions for development
  window.debugSVGColors = function () {
    console.log("=== SVG Color Debug ===");
    const svgLoaders = document.querySelectorAll("[svg-file-loader]");
    console.log("Found", svgLoaders.length, "SVG loaders");

    svgLoaders.forEach((loader, index) => {
      console.log("--- SVG Loader", index, "---");
      const component = loader.components["svg-file-loader"];
      if (component) {
        console.log("useSvgColor:", component.data.useSvgColor);
        console.log("SVG file:", component.data.svgFile);
        if (component.data.svgFile) {
          const svgDoc = component.data.svgFile.contentDocument;
          if (svgDoc) {
            const paths = component.extractPathsFromSVG(svgDoc);
            console.log("Extracted paths:", paths.length);
            paths.forEach((path, i) => {
              console.log("  Path", i, "color:", path.color);
            });
          }
        }
      }
    });
  };

  window.testAcrylicSheetLights = function () {
    console.log("=== Testing Acrylic Sheet Lights ===");
    const svgLoaders = document.querySelectorAll("[svg-file-loader]");

    svgLoaders.forEach((loader, index) => {
      const component = loader.components["svg-file-loader"];
      if (component && component.updateAcrylicSheetLight) {
        console.log("Testing loader", index);
        const svgDoc = component.data.svgFile?.contentDocument;
        if (svgDoc) {
          const paths = component.extractPathsFromSVG(svgDoc);
          component.updateAcrylicSheetLight(paths);
        }
      }
    });
  };

  console.log("Global debug functions initialized:");
  console.log("- window.debugSVGColors()");
  console.log("- window.testAcrylicSheetLights()");
}
