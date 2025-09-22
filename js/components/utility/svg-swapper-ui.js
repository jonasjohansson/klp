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
      this.detectAvailableSvgs();

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

      // Create header with title and toggle button
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
      `;

      const title = document.createElement("div");
      title.textContent = "SVG Swapper";
      title.style.cssText = `font-weight: bold;`;

      // Create toggle button
      this.toggleButton = document.createElement("button");
      this.toggleButton.textContent = "−";
      this.toggleButton.style.cssText = `
        background: #333;
        color: white;
        border: 1px solid #555;
        border-radius: 3px;
        padding: 2px 6px;
        cursor: pointer;
        font-size: 12px;
      `;
      this.toggleButton.addEventListener("click", () => this.toggleUI());

      header.appendChild(title);
      header.appendChild(this.toggleButton);
      this.uiContainer.appendChild(header);

      // Create content container (will be hidden/shown)
      this.contentContainer = document.createElement("div");
      this.contentContainer.style.cssText = `transition: opacity 0.3s ease;`;
      this.uiContainer.appendChild(this.contentContainer);

      // Create panel controls (will be populated dynamically)
      this.panelControlsContainer = document.createElement("div");
      this.contentContainer.appendChild(this.panelControlsContainer);

      // Add to document
      document.body.appendChild(this.uiContainer);
    },

    toggleUI() {
      const isVisible = this.contentContainer.style.opacity !== "0";
      if (isVisible) {
        this.contentContainer.style.opacity = "0";
        this.contentContainer.style.pointerEvents = "none";
        this.toggleButton.textContent = "+";
      } else {
        this.contentContainer.style.opacity = "1";
        this.contentContainer.style.pointerEvents = "auto";
        this.toggleButton.textContent = "−";
      }
    },

    detectAvailableSvgs() {
      console.log("svg-swapper: Detecting available SVG assets");

      // Clear existing panel controls
      this.panelControlsContainer.innerHTML = "";

      // Check which SVG assets are actually defined in the scene
      const availableSvgs = [];
      for (let i = 1; i <= 4; i++) {
        const svgAsset = document.querySelector(`#svg${i}`);
        if (svgAsset) {
          const src = svgAsset.getAttribute("src");
          if (src) {
            availableSvgs.push({
              id: `svg${i}`,
              src: src,
              panelNumber: i,
            });
            console.log(`svg-swapper: Found SVG ${i}: ${src}`);
          }
        }
      }

      // Create panel controls only for available SVGs
      availableSvgs.forEach((svg) => {
        const panelControl = this.createPanelControl(svg.panelNumber, svg.src);
        this.panelControlsContainer.appendChild(panelControl);
      });

      console.log(`svg-swapper: Created controls for ${availableSvgs.length} SVG panels`);
    },

    createPanelControl(panelNumber, svgSrc = null) {
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
      const svgOptions = [];
      for (let i = 1; i <= 4; i++) {
        const svgAsset = document.querySelector(`#svg${i}`);
        if (svgAsset) {
          const src = svgAsset.getAttribute("src");
          if (src) {
            const filename = src.split("/").pop(); // Extract filename from path
            svgOptions.push({
              value: i.toString(),
              text: filename,
              src: src,
            });
          }
        }
      }

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
        console.log(`svg-swapper: Primary color changed for Panel ${panelNumber}: ${primaryColorPicker.value}`);
        this.updatePanelColors(panelNumber, primaryColorPicker.value, secondaryColorPicker.value);
      });

      secondaryColorPicker.addEventListener("change", () => {
        console.log(`svg-swapper: Secondary color changed for Panel ${panelNumber}: ${secondaryColorPicker.value}`);
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
        // Press 'H' to toggle UI visibility
        if (event.key.toLowerCase() === "h" && !event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          this.toggleUI();
        }

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
          // Store the original component data before removing
          const originalData = { ...svgFileLoaderComponent.data };
          console.log("svg-swapper: Preserving component data:", originalData);

          // Remove the component and re-add it to force a complete reload
          loader.removeAttribute("svg-file-loader");

          // Wait a bit then re-add the component with all original attributes
          setTimeout(() => {
            // Recreate the component with all original attributes plus new svgFile
            const newAttributes = {
              svgFile: `#svg${svgNumber}`,
              lineThickness: originalData.lineThickness,
              color: originalData.color,
              emissive: originalData.emissive,
              emissiveIntensity: originalData.emissiveIntensity,
              useSvgColor: originalData.useSvgColor,
            };

            console.log("svg-swapper: Recreating component with attributes:", newAttributes);
            loader.setAttribute("svg-file-loader", newAttributes);

            // After geometry is loaded, update colors if useSvgColor is enabled
            setTimeout(() => {
              const newComponent = loader.components["svg-file-loader"];
              if (newComponent && newComponent.data.useSvgColor) {
                newComponent.updateColors();
              }
            }, 500);
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
      console.log(`svg-swapper: Updating Panel ${panelNumber} colors: Primary=${primaryColor}, Secondary=${secondaryColor}`);

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
      console.log(
        `svg-swapper: Updating SVG geometry colors for Panel ${panelNumber}: Primary=${primaryColor}, Secondary=${secondaryColor}`
      );

      // Find the panel entity
      const panelEntity = document.querySelector(`#svg-files-group > a-entity:nth-child(${panelNumber})`);
      if (!panelEntity) {
        console.error(`Panel ${panelNumber} not found`);
        return;
      }

      // Find the SVG file loader entities in this panel
      const svgLoaders = panelEntity.querySelectorAll("a-entity[svg-file-loader]");
      console.log(`svg-swapper: Found ${svgLoaders.length} SVG loaders in Panel ${panelNumber}`);

      if (svgLoaders.length === 0) {
        console.warn(`svg-swapper: No SVG loaders found in Panel ${panelNumber}`);
        return;
      }

      svgLoaders.forEach((loader, index) => {
        const svgFileLoaderComponent = loader.components["svg-file-loader"];
        if (svgFileLoaderComponent) {
          console.log(
            `svg-swapper: Updating SVG loader ${
              index + 1
            } in Panel ${panelNumber} with colors: Primary=${primaryColor}, Secondary=${secondaryColor}`
          );
          // Update the colors in the SVG file loader
          svgFileLoaderComponent.updateCustomColors(primaryColor, secondaryColor);
        } else {
          console.warn(`svg-swapper: No svg-file-loader component found on loader ${index + 1}`);
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
