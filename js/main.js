// =============================================================================
// MAIN APPLICATION ENTRY POINT
// =============================================================================

console.log("Loading KLP A-Frame Application");

// Wait for A-Frame to be ready before loading components
if (typeof AFRAME !== "undefined") {
  loadComponents();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof AFRAME !== "undefined") {
      loadComponents();
    } else {
      // Wait a bit more for A-Frame to load
      setTimeout(loadComponents, 100);
    }
  });
}

function loadComponents() {
  console.log("A-Frame ready, loading components...");

  // Load all component modules
  Promise.all([
    loadScript("./js/components/utility-components.js"),
    loadScript("./js/components/rect-area-light.js"),
    loadScript("./js/components/acrylic-plane.js"),
    loadScript("./js/components/glb-material-enhancer.js"),
    loadScript("./js/components/svg-file-loader.js"),
  ])
    .then(() => {
      console.log("All components loaded successfully!");

      // Initialize any global functions or debug utilities
      initializeGlobalFunctions();
    })
    .catch((error) => {
      console.error("Error loading components:", error);
    });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      console.log(`Loaded: ${src}`);
      resolve();
    };
    script.onerror = () => {
      console.error(`Failed to load: ${src}`);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
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
