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

    extractAllSvgColors: function () {
      // Parse the SVG selectors - handle both array and comma-separated string
      let svgSelectors = this.data.svgFiles;
      if (typeof svgSelectors === "string") {
        svgSelectors = svgSelectors.split(",").map((s) => s.trim());
      }

      // Extract colors from each SVG file by fetching them directly
      svgSelectors.forEach((svgSelector, index) => {
        const svgElement = document.querySelector(svgSelector);

        if (svgElement) {
          const src = svgElement.getAttribute("src");
          if (src) {
            this.fetchSvgAndExtractColors(src, index);
          }
        }
      });
    },

    extractColorsFromSvg: function (svgDoc) {
      const colors = [];
      const styleElements = svgDoc.querySelectorAll("style");

      styleElements.forEach((style) => {
        const cssText = style.textContent;

        // Extract color definitions from CSS
        const colorMatches = cssText.match(/\.cls-\d+\s*\{[^}]*stroke:\s*([^;]+);/g);

        if (colorMatches) {
          colorMatches.forEach((match) => {
            const colorMatch = match.match(/stroke:\s*([^;]+);/);
            if (colorMatch) {
              const color = colorMatch[1].trim();
              if (color.startsWith("#")) {
                colors.push(color);
              }
            }
          });
        }
      });

      // Remove duplicates and return
      return [...new Set(colors)];
    },

    fetchSvgAndExtractColors: function (src, index) {
      fetch(src)
        .then((response) => response.text())
        .then((svgText) => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
          const colors = this.extractColorsFromSvg(svgDoc);
          this.svgColors.set(index, colors);

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
    },

    updatePanelLights: function (panelIndex) {
      const colors = this.svgColors.get(panelIndex);

      if (!colors || colors.length === 0) {
        return;
      }

      // Get the first two colors (or use the same color twice if only one)
      const primaryColor = colors[0];
      const secondaryColor = colors[1] || colors[0];

      // Update all 4 sheet lights for this panel
      const lightA = document.querySelector(`#sheet-light-${panelIndex + 1}a`);
      const lightB = document.querySelector(`#sheet-light-${panelIndex + 1}b`);
      const lightC = document.querySelector(`#sheet-light-${panelIndex + 1}c`);
      const lightD = document.querySelector(`#sheet-light-${panelIndex + 1}d`);

      // Update lights A and B with primary color (front and back)
      this.updateLight(lightA, primaryColor);
      this.updateLight(lightB, primaryColor);

      // Update lights C and D with secondary color (front and back)
      this.updateLight(lightC, secondaryColor);
      this.updateLight(lightD, secondaryColor);
    },

    updateLight: function (lightElement, color) {
      if (!lightElement) return;

      // Update the rect-area-light component data and force update
      const rectAreaLight = lightElement.components["rect-area-light"];
      if (rectAreaLight) {
        rectAreaLight.data.color = color;
        rectAreaLight.update();

        // Force the light to update by removing and re-adding it
        const oldLight = lightElement.getObject3D("light");
        if (oldLight) {
          lightElement.removeObject3D("light");
        }

        // Recreate the light with new color
        const newLight = new THREE.RectAreaLight(
          new THREE.Color(color),
          rectAreaLight.data.intensity,
          rectAreaLight.data.width,
          rectAreaLight.data.height
        );
        const position = lightElement.getAttribute("position");
        if (position) {
          newLight.position.set(position.x, position.y, position.z);
        }
        newLight.lookAt(0, 0, 0);
        lightElement.setObject3D("light", newLight);
      }
    },
  });
}
