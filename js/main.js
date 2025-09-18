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

  // Register bloom effect component first
  registerBloomEffect();

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

function registerBloomEffect() {
  console.log("Registering bloom effect component...");

  AFRAME.registerComponent("bloom-effect", {
    schema: {
      intensity: { type: "number", default: 1.0 },
      threshold: { type: "number", default: 0.5 },
      radius: { type: "number", default: 0.5 },
    },

    init: function () {
      console.log("Bloom effect component initialized with data:", this.data);
      this.scene = this.el.sceneEl;
      this.renderer = this.scene.renderer;
      this.camera = this.scene.camera;

      // Wait for scene to be ready
      this.scene.addEventListener("loaded", this.setupBloom.bind(this));
    },

    setupBloom: function () {
      console.log("Setting up bloom effect...");

      // Check if Three.js post-processing is available
      if (typeof THREE.EffectComposer === "undefined") {
        console.warn("Three.js EffectComposer not available, trying fallback approach");
        this.setupFallbackBloom();
        return;
      }

      try {
        // Create effect composer
        this.composer = new THREE.EffectComposer(this.renderer);

        // Create render pass
        const renderScene = new THREE.RenderPass(this.scene.object3D, this.camera);
        this.composer.addPass(renderScene);

        // Create bloom pass with proper parameters
        this.bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          this.data.intensity,
          this.data.radius,
          this.data.threshold
        );
        this.composer.addPass(this.bloomPass);

        // Add output pass for proper tone mapping
        if (typeof THREE.OutputPass !== "undefined") {
          const outputPass = new THREE.OutputPass();
          this.composer.addPass(outputPass);
        }

        // Override scene render
        const originalRender = this.scene.render.bind(this.scene);
        this.scene.render = () => {
          this.composer.render();
        };

        // Set up tone mapping for better bloom
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        console.log("Bloom effect enabled successfully!");
      } catch (error) {
        console.error("Failed to setup bloom effect:", error);
        this.setupFallbackBloom();
      }
    },

    setupFallbackBloom: function () {
      console.log("Setting up fallback bloom effect...");

      // Simple approach: enhance emissive materials
      this.scene.object3D.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.emissive) {
            child.material.emissiveIntensity = (child.material.emissiveIntensity || 1) * this.data.intensity;
            child.material.needsUpdate = true;
          }
        }
      });

      // Set renderer tone mapping
      this.renderer.toneMapping = THREE.ReinhardToneMapping;
      this.renderer.toneMappingExposure = this.data.intensity;

      console.log("Fallback bloom effect enabled!");
    },

    update: function () {
      if (this.bloomPass) {
        this.bloomPass.strength = this.data.intensity;
        this.bloomPass.radius = this.data.radius;
        this.bloomPass.threshold = this.data.threshold;
      } else if (this.renderer) {
        // Update fallback bloom
        this.renderer.toneMappingExposure = this.data.intensity;
      }
    },
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
