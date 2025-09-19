/**
 * SVG Swapper UI Component
 * Provides a minimal UI to swap SVGs and reload geometry/lighting
 */

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

export function registerSvgSwapperUI() {
  AFRAME.registerComponent("svg-swapper-ui", {
    schema: {
      enabled: { type: "boolean", default: true },
    },

    init() {
      if (!this.data.enabled) return;

      this.createUI();
      this.setupEventListeners();

      // Initialize color pickers after a delay to allow SVG colors to load
      setTimeout(() => {
        this.initializeColorPickers();
      }, 2000);
    },

    createUI() {
      // Create UI container
      this.uiContainer = document.createElement("div");
      this.uiContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 1000;
        min-width: 200px;
      `;

      // Create title
      const title = document.createElement("div");
      title.textContent = "SVG Swapper";
      title.style.cssText = `
        font-weight: bold;
        margin-bottom: 10px;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      `;
      this.uiContainer.appendChild(title);

      // Create panel controls
      for (let i = 1; i <= 4; i++) {
        const panelControl = this.createPanelControl(i);
        this.uiContainer.appendChild(panelControl);
      }

      // Add to document
      document.body.appendChild(this.uiContainer);
    },

    createPanelControl(panelNumber) {
      const panelDiv = document.createElement("div");
      panelDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        border: 1px solid #333;
      `;

      // Panel header
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      `;

      // Panel label
      const label = document.createElement("span");
      label.textContent = `Panel ${panelNumber}:`;
      label.style.minWidth = "60px";
      label.style.fontWeight = "bold";

      // SVG selector
      const select = document.createElement("select");
      select.id = `svg-select-${panelNumber}`;
      select.style.cssText = `
        flex: 1;
        padding: 5px;
        background: #333;
        color: white;
        border: 1px solid #555;
        border-radius: 4px;
      `;

      // Add options for all available SVGs
      const svgOptions = [
        { value: "1", text: "klp_1.svg" },
        { value: "2", text: "klp_2.svg" },
        { value: "3", text: "klp_3.svg" },
        { value: "4", text: "klp_4.svg" },
      ];

      svgOptions.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        if (option.value === panelNumber.toString()) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });

      // Apply button
      const applyBtn = document.createElement("button");
      applyBtn.textContent = "Apply";
      applyBtn.style.cssText = `
        padding: 5px 10px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;

      // Apply button click handler
      applyBtn.addEventListener("click", () => {
        this.swapSvg(panelNumber, select.value);
      });

      headerDiv.appendChild(label);
      headerDiv.appendChild(select);
      headerDiv.appendChild(applyBtn);

      // Color pickers section
      const colorSection = document.createElement("div");
      colorSection.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      `;

      // Primary color picker
      const primaryColorDiv = document.createElement("div");
      primaryColorDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
      `;

      const primaryLabel = document.createElement("span");
      primaryLabel.textContent = "Primary:";
      primaryLabel.style.fontSize = "12px";
      primaryLabel.style.minWidth = "50px";

      const primaryColorPicker = document.createElement("input");
      primaryColorPicker.type = "color";
      primaryColorPicker.id = `primary-color-${panelNumber}`;
      primaryColorPicker.value = "#ff9900"; // Default orange
      primaryColorPicker.style.cssText = `
        width: 30px;
        height: 25px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;

      // Secondary color picker
      const secondaryColorDiv = document.createElement("div");
      secondaryColorDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
      `;

      const secondaryLabel = document.createElement("span");
      secondaryLabel.textContent = "Secondary:";
      secondaryLabel.style.fontSize = "12px";
      secondaryLabel.style.minWidth = "60px";

      const secondaryColorPicker = document.createElement("input");
      secondaryColorPicker.type = "color";
      secondaryColorPicker.id = `secondary-color-${panelNumber}`;
      secondaryColorPicker.value = "#00bdfc"; // Default blue
      secondaryColorPicker.style.cssText = `
        width: 30px;
        height: 25px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;

      // Color picker change handlers
      primaryColorPicker.addEventListener("change", () => {
        this.updatePanelColors(panelNumber, primaryColorPicker.value, secondaryColorPicker.value);
      });

      secondaryColorPicker.addEventListener("change", () => {
        this.updatePanelColors(panelNumber, primaryColorPicker.value, secondaryColorPicker.value);
      });

      primaryColorDiv.appendChild(primaryLabel);
      primaryColorDiv.appendChild(primaryColorPicker);
      secondaryColorDiv.appendChild(secondaryLabel);
      secondaryColorDiv.appendChild(secondaryColorPicker);

      colorSection.appendChild(primaryColorDiv);
      colorSection.appendChild(secondaryColorDiv);

      panelDiv.appendChild(headerDiv);
      panelDiv.appendChild(colorSection);

      return panelDiv;
    },

    setupEventListeners() {
      // Add keyboard shortcuts
      document.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case "1":
              event.preventDefault();
              this.swapSvg(1, "1");
              break;
            case "2":
              event.preventDefault();
              this.swapSvg(2, "2");
              break;
            case "3":
              event.preventDefault();
              this.swapSvg(3, "3");
              break;
            case "4":
              event.preventDefault();
              this.swapSvg(4, "4");
              break;
          }
        }
      });
    },

    swapSvg(panelNumber, svgNumber) {
      console.log(`Swapping Panel ${panelNumber} to klp_${svgNumber}.svg`);

      // Find the panel entity
      const panelEntity = document.querySelector(`#svg-files-group > a-entity:nth-child(${panelNumber})`);
      if (!panelEntity) {
        console.error(`Panel ${panelNumber} not found`);
        return;
      }

      // Show loading state
      this.showLoadingState(panelNumber);

      // Find the SVG file loader entities in this panel
      const svgLoaders = panelEntity.querySelectorAll("a-entity[svg-file-loader]");

      if (svgLoaders.length === 0) {
        console.error(`No SVG loaders found in Panel ${panelNumber}`);
        this.hideLoadingState(panelNumber);
        return;
      }

      // Update each SVG loader
      svgLoaders.forEach((loader, index) => {
        console.log(`Updating SVG loader ${index + 1} for Panel ${panelNumber}`);

        // Update the svgFile attribute
        loader.setAttribute("svg-file-loader", "svgFile", `#svg${svgNumber}`);

        // Force a complete reload by removing and recreating the component
        const svgFileLoaderComponent = loader.components["svg-file-loader"];
        if (svgFileLoaderComponent) {
          // Remove the component and re-add it to force a complete reload
          loader.removeAttribute("svg-file-loader");

          // Wait a bit then re-add the component
          setTimeout(() => {
            loader.setAttribute("svg-file-loader", "svgFile", `#svg${svgNumber}`);
          }, 100);
        }
      });

      // Trigger color lighting update
      this.updateLightingForPanel(panelNumber, svgNumber);

      // Hide loading state after a longer delay to ensure everything loads
      setTimeout(() => {
        this.hideLoadingState(panelNumber);
      }, 1500);
    },

    showLoadingState(panelNumber) {
      const select = document.querySelector(`#svg-select-${panelNumber}`);
      if (select) {
        select.style.opacity = "0.5";
        select.disabled = true;
      }
    },

    hideLoadingState(panelNumber) {
      const select = document.querySelector(`#svg-select-${panelNumber}`);
      if (select) {
        select.style.opacity = "1";
        select.disabled = false;
      }
    },

    updateLightingForPanel(panelNumber, svgNumber) {
      // Get the SVG color lighting component
      const scene = document.querySelector("a-scene");
      const svgColorLighting = scene.components["svg-color-lighting"];

      if (svgColorLighting) {
        // Refresh colors for the specific SVG (svgNumber - 1 because it's 0-indexed)
        svgColorLighting.refreshSvgColors(svgNumber - 1);

        // Wait a bit for colors to load, then update the panel lights and color pickers
        setTimeout(() => {
          svgColorLighting.updatePanelLights(panelNumber - 1);
          this.updateColorPickersFromSvg(panelNumber, svgNumber - 1);
        }, 500);
      }
    },

    initializeColorPickers() {
      // Initialize all color pickers with their corresponding SVG colors
      for (let panelNumber = 1; panelNumber <= 4; panelNumber++) {
        this.updateColorPickersFromSvg(panelNumber, panelNumber - 1);
      }
    },

    updateColorPickersFromSvg(panelNumber, svgIndex) {
      // Get the SVG color lighting component
      const scene = document.querySelector("a-scene");
      const svgColorLighting = scene.components["svg-color-lighting"];

      if (svgColorLighting && svgColorLighting.svgColors) {
        const colors = svgColorLighting.svgColors.get(svgIndex);

        if (colors && colors.length > 0) {
          const primaryColor = this.expandHexColor(colors[0]);
          const secondaryColor = this.expandHexColor(colors[1] || colors[0]);

          // Update the color picker values
          const primaryPicker = document.querySelector(`#primary-color-${panelNumber}`);
          const secondaryPicker = document.querySelector(`#secondary-color-${panelNumber}`);

          if (primaryPicker) {
            primaryPicker.value = primaryColor;
          }
          if (secondaryPicker) {
            secondaryPicker.value = secondaryColor;
          }

          console.log(`Updated color pickers for Panel ${panelNumber}: Primary=${primaryColor}, Secondary=${secondaryColor}`);
        }
      }
    },

    expandHexColor(hexColor) {
      // Convert short hex format (#f90) to full format (#ff9900)
      if (hexColor && hexColor.startsWith("#") && hexColor.length === 4) {
        const short = hexColor.slice(1);
        return "#" + short[0] + short[0] + short[1] + short[1] + short[2] + short[2];
      }
      return hexColor;
    },

    updatePanelColors(panelNumber, primaryColor, secondaryColor) {
      console.log(`Updating Panel ${panelNumber} colors: Primary=${primaryColor}, Secondary=${secondaryColor}`);

      // Update lighting colors
      this.updateLightingColors(panelNumber, primaryColor, secondaryColor);

      // Update SVG geometry colors
      this.updateSvgGeometryColors(panelNumber, primaryColor, secondaryColor);
    },

    updateLightingColors(panelNumber, primaryColor, secondaryColor) {
      // Update the 2 sheet lights for this panel
      const lightA = document.querySelector(`#sheet-light-${panelNumber}a`);
      const lightB = document.querySelector(`#sheet-light-${panelNumber}b`);

      if (lightA) {
        this.updateLight(lightA, primaryColor);
      }
      if (lightB) {
        this.updateLight(lightB, secondaryColor);
      }
    },

    updateSvgGeometryColors(panelNumber, primaryColor, secondaryColor) {
      // Find the panel entity
      const panelEntity = document.querySelector(`#svg-files-group > a-entity:nth-child(${panelNumber})`);
      if (!panelEntity) {
        console.error(`Panel ${panelNumber} not found`);
        return;
      }

      // Find the SVG file loader entities in this panel
      const svgLoaders = panelEntity.querySelectorAll("a-entity[svg-file-loader]");

      svgLoaders.forEach((loader) => {
        const svgFileLoaderComponent = loader.components["svg-file-loader"];
        if (svgFileLoaderComponent) {
          // Update the colors in the SVG file loader
          svgFileLoaderComponent.updateCustomColors(primaryColor, secondaryColor);
        }
      });
    },

    updateLight(lightElement, color) {
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

    remove() {
      if (this.uiContainer && this.uiContainer.parentNode) {
        this.uiContainer.parentNode.removeChild(this.uiContainer);
      }
    },
  });
}
