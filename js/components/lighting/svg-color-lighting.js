// =============================================================================
// SVG COLOR LIGHTING COMPONENT
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

export function registerSvgColorLighting() {
  AFRAME.registerComponent("svg-color-lighting", {
    schema: {
      svgFiles: { type: "array", default: [] }, // Array of SVG selectors
      atmosphericLightId: { type: "string", default: "atmospheric-light" },
    },

    init: function () {
      this.svgColors = new Map(); // Store colors for each SVG
      this.lightEntities = new Map(); // Store light entities for each panel

      // Extract colors immediately without waiting for other components
      setTimeout(() => {
        this.extractAllSvgColors();
        this.updateAllLights();
      }, 1000); // Give other components time to load first
    },

    waitForSvgAssets: function () {
      return new Promise((resolve) => {
        const checkAssets = () => {
          let svgSelectors = this.data.svgFiles;
          if (typeof svgSelectors === "string") {
            svgSelectors = svgSelectors.split(",").map((s) => s.trim());
          }

          let allLoaded = true;
          svgSelectors.forEach((selector) => {
            const svgElement = document.querySelector(selector);
            if (!svgElement || !svgElement.contentDocument) {
              allLoaded = false;
            }
          });

          if (allLoaded) {
            console.log("svg-color-lighting: All SVG assets loaded");
            resolve();
          } else {
            console.log("svg-color-lighting: Waiting for SVG assets to load...");
            setTimeout(checkAssets, 200);
          }
        };

        // Start checking after a short delay
        setTimeout(checkAssets, 100);
      });
    },

    extractAllSvgColors: function () {
      console.log("svg-color-lighting: Extracting colors from all SVG files");
      console.log("svg-color-lighting: SVG selectors:", this.data.svgFiles);

      // Parse the SVG selectors - handle both array and comma-separated string
      let svgSelectors = this.data.svgFiles;
      if (typeof svgSelectors === "string") {
        svgSelectors = svgSelectors.split(",").map((s) => s.trim());
      }

      // Extract colors from each SVG file by fetching them directly
      svgSelectors.forEach((svgSelector, index) => {
        console.log(`svg-color-lighting: Processing SVG ${index + 1} with selector:`, svgSelector);
        const svgElement = document.querySelector(svgSelector);
        console.log(`svg-color-lighting: Found SVG element:`, svgElement);

        if (svgElement) {
          const src = svgElement.getAttribute("src");
          if (src) {
            console.log(`svg-color-lighting: Fetching SVG from: ${src}`);
            this.fetchSvgAndExtractColors(src, index);
          } else {
            console.warn(`svg-color-lighting: No src attribute found for: ${svgSelector}`);
          }
        } else {
          console.warn(`svg-color-lighting: Could not find SVG element with selector: ${svgSelector}`);
        }
      });
    },

    extractColorsFromSvg: function (svgDoc) {
      const colors = [];
      const styleElements = svgDoc.querySelectorAll("style");

      styleElements.forEach((style) => {
        const cssText = style.textContent;
        console.log("svg-color-lighting: CSS text:", cssText);

        // Extract color definitions from CSS
        const colorMatches = cssText.match(/\.cls-\d+\s*\{[^}]*stroke:\s*([^;]+);/g);

        if (colorMatches) {
          console.log("svg-color-lighting: Found color matches:", colorMatches);
          colorMatches.forEach((match) => {
            const colorMatch = match.match(/stroke:\s*([^;]+);/);
            if (colorMatch) {
              const color = colorMatch[1].trim();
              console.log("svg-color-lighting: Extracted color:", color);
              if (color.startsWith("#")) {
                colors.push(color);
              }
            }
          });
        }
      });

      // Remove duplicates and return
      const uniqueColors = [...new Set(colors)];
      console.log("svg-color-lighting: Final unique colors:", uniqueColors);
      return uniqueColors;
    },

    fetchSvgAndExtractColors: function (src, index) {
      console.log(`svg-color-lighting: Fetching SVG from: ${src}`);

      fetch(src)
        .then((response) => response.text())
        .then((svgText) => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
          const colors = this.extractColorsFromSvg(svgDoc);
          this.svgColors.set(index, colors);
          console.log(`svg-color-lighting: Panel ${index + 1} colors (fetched):`, colors);

          // Update lights after fetching this SVG
          this.updateAllLights();
        })
        .catch((error) => {
          console.error(`svg-color-lighting: Error fetching SVG ${src}:`, error);
        });
    },

    updateAllLights: function () {
      // Update atmospheric light with dominant color
      this.updateAtmosphericLight();

      // Update sheet lights for each panel
      let svgSelectors = this.data.svgFiles;
      if (typeof svgSelectors === "string") {
        svgSelectors = svgSelectors.split(",").map((s) => s.trim());
      }

      for (let i = 0; i < svgSelectors.length; i++) {
        this.updatePanelLights(i);
      }
    },

    updateAtmosphericLight: function () {
      const atmosphericLight = document.querySelector(`#${this.data.atmosphericLightId}`);
      if (!atmosphericLight) return;

      // Get dominant color from all SVGs (use first color from first SVG as fallback)
      let dominantColor = "#4488ff"; // Default blue

      if (this.svgColors.size > 0) {
        // Use the first color from the first SVG as dominant
        const firstSvgColors = this.svgColors.get(0);
        if (firstSvgColors && firstSvgColors.length > 0) {
          dominantColor = firstSvgColors[0];
        }
      }

      // Update atmospheric light color
      atmosphericLight.setAttribute("color", dominantColor);
      console.log("svg-color-lighting: Updated atmospheric light color to", dominantColor);
    },

    updatePanelLights: function (panelIndex) {
      const colors = this.svgColors.get(panelIndex);
      console.log(`svg-color-lighting: Panel ${panelIndex + 1} colors from map:`, colors);

      if (!colors || colors.length === 0) {
        console.log(`svg-color-lighting: No colors found for panel ${panelIndex + 1}`);
        return;
      }

      // Get the first two colors (or use the same color twice if only one)
      const primaryColor = colors[0];
      const secondaryColor = colors[1] || colors[0];

      console.log(`svg-color-lighting: Updating panel ${panelIndex + 1} with colors:`, primaryColor, secondaryColor);
      console.log(`svg-color-lighting: All stored colors:`, Array.from(this.svgColors.entries()));

      // Update sheet lights for this panel
      const lightA = document.querySelector(`#sheet-light-${panelIndex + 1}a`);
      const lightB = document.querySelector(`#sheet-light-${panelIndex + 1}b`);

      if (lightA) {
        // Update the rect-area-light component data and force update
        const rectAreaLight = lightA.components["rect-area-light"];
        if (rectAreaLight) {
          rectAreaLight.data.color = primaryColor;
          rectAreaLight.update();

          // Force the light to update by removing and re-adding it
          const oldLight = lightA.getObject3D("light");
          if (oldLight) {
            lightA.removeObject3D("light");
          }

          // Recreate the light with new color
          const newLight = new THREE.RectAreaLight(
            primaryColor,
            rectAreaLight.data.intensity,
            rectAreaLight.data.width,
            rectAreaLight.data.height
          );
          const position = lightA.getAttribute("position");
          if (position) {
            newLight.position.set(position.x, position.y, position.z);
          }
          newLight.lookAt(0, 0, 0);
          lightA.setObject3D("light", newLight);

          console.log(`svg-color-lighting: Updated panel ${panelIndex + 1} light A to`, primaryColor);
        } else {
          console.warn(`svg-color-lighting: rect-area-light component not found on light A for panel ${panelIndex + 1}`);
        }
      } else {
        console.warn(`svg-color-lighting: Light A not found for panel ${panelIndex + 1}`);
      }

      if (lightB) {
        // Update the rect-area-light component data and force update
        const rectAreaLight = lightB.components["rect-area-light"];
        if (rectAreaLight) {
          rectAreaLight.data.color = secondaryColor;
          rectAreaLight.update();

          // Force the light to update by removing and re-adding it
          const oldLight = lightB.getObject3D("light");
          if (oldLight) {
            lightB.removeObject3D("light");
          }

          // Recreate the light with new color
          const newLight = new THREE.RectAreaLight(
            secondaryColor,
            rectAreaLight.data.intensity,
            rectAreaLight.data.width,
            rectAreaLight.data.height
          );
          const position = lightB.getAttribute("position");
          if (position) {
            newLight.position.set(position.x, position.y, position.z);
          }
          newLight.lookAt(0, 0, 0);
          lightB.setObject3D("light", newLight);

          console.log(`svg-color-lighting: Updated panel ${panelIndex + 1} light B to`, secondaryColor);
        } else {
          console.warn(`svg-color-lighting: rect-area-light component not found on light B for panel ${panelIndex + 1}`);
        }
      } else {
        console.warn(`svg-color-lighting: Light B not found for panel ${panelIndex + 1}`);
      }
    },

    // Method to manually refresh colors (useful for debugging)
    refreshColors: function () {
      console.log("svg-color-lighting: Manual refresh triggered");
      this.extractAllSvgColors();
      this.updateAllLights();
    },

    // Method to test with hardcoded colors
    testWithHardcodedColors: function () {
      console.log("svg-color-lighting: Testing with hardcoded colors");
      this.svgColors.set(0, ["#ff9900", "#cccccc"]); // Panel 1: Orange, Gray
      this.svgColors.set(1, ["#ff9900", "#cccccc"]); // Panel 2: Orange, Gray
      this.svgColors.set(2, ["#ff9900", "#cccccc"]); // Panel 3: Orange, Gray
      this.svgColors.set(3, ["#5700ff", "#00bdfc"]); // Panel 4: Purple, Cyan
      this.updateAllLights();
    },

    // Method to test a single panel
    testSinglePanel: function (panelIndex, color1, color2) {
      console.log(`svg-color-lighting: Testing panel ${panelIndex + 1} with colors:`, color1, color2);
      this.svgColors.set(panelIndex, [color1, color2]);
      this.updatePanelLights(panelIndex);
    },
  });
}
