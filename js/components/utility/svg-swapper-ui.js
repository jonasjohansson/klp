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
      this.setupDragAndDrop();
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
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 10px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 1000;
        min-width: 180px;
        max-width: 220px;
      `;

      // Create header with title and toggle button
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      `;

      const title = document.createElement("div");
      title.textContent = "SVG Swapper";
      title.style.cssText = `font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;`;

      // Create toggle button
      this.toggleButton = document.createElement("button");
      this.toggleButton.textContent = "−";
      this.toggleButton.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        padding: 1px 5px;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      this.toggleButton.addEventListener("click", () => this.toggleUI());
      this.toggleButton.addEventListener("mouseenter", () => {
        this.toggleButton.style.background = "rgba(255, 255, 255, 0.15)";
      });
      this.toggleButton.addEventListener("mouseleave", () => {
        this.toggleButton.style.background = "rgba(255, 255, 255, 0.1)";
      });

      header.appendChild(title);
      header.appendChild(this.toggleButton);
      this.uiContainer.appendChild(header);

      // Create content container (will be hidden/shown)
      this.contentContainer = document.createElement("div");
      this.contentContainer.style.cssText = `transition: all 0.2s ease;`;
      this.uiContainer.appendChild(this.contentContainer);

      // Create panel controls (will be populated dynamically)
      this.panelControlsContainer = document.createElement("div");
      this.contentContainer.appendChild(this.panelControlsContainer);

      // Add to document
      document.body.appendChild(this.uiContainer);
    },

    toggleUI() {
      const isVisible = this.contentContainer.style.display !== "none";
      if (isVisible) {
        // Hide the content
        this.contentContainer.style.display = "none";
        // Also hide the header border when collapsed
        const header = this.uiContainer.querySelector("div");
        if (header) {
          header.style.borderBottom = "none";
          header.style.marginBottom = "0";
          header.style.paddingBottom = "0";
        }
        // Reduce padding on container
        this.uiContainer.style.padding = "6px 10px";
        this.toggleButton.textContent = "+";
      } else {
        // Show the content
        this.contentContainer.style.display = "block";
        // Restore header border
        const header = this.uiContainer.querySelector("div");
        if (header) {
          header.style.borderBottom = "1px solid rgba(255, 255, 255, 0.2)";
          header.style.marginBottom = "8px";
          header.style.paddingBottom = "4px";
        }
        // Restore padding on container
        this.uiContainer.style.padding = "10px";
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
        margin-bottom: 10px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;

      // Panel header - more compact layout
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      `;

      // Panel label - smaller
      const label = document.createElement("span");
      label.textContent = `P${panelNumber}`;
      label.style.cssText = `
        min-width: 20px;
        font-weight: 600;
        font-size: 10px;
        opacity: 0.7;
      `;

      // SVG selector - more compact
      const select = document.createElement("select");
      select.id = `svg-select-${panelNumber}`;
      select.style.cssText = `
        flex: 1;
        padding: 3px 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        font-size: 11px;
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
        // Default to svg1 (klp_1.svg) for all panels
        if (option.value === "1") {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });

      // Apply button - smaller
      const applyBtn = document.createElement("button");
      applyBtn.textContent = "✓";
      applyBtn.style.cssText = `
        padding: 3px 8px;
        background: rgba(0, 122, 204, 0.8);
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
      `;

      // Apply button hover effect
      applyBtn.addEventListener("mouseenter", () => {
        applyBtn.style.background = "rgba(0, 122, 204, 1)";
      });
      applyBtn.addEventListener("mouseleave", () => {
        applyBtn.style.background = "rgba(0, 122, 204, 0.8)";
      });

      // Apply button click handler
      applyBtn.addEventListener("click", () => {
        this.swapSvg(panelNumber, select.value);
      });

      headerDiv.appendChild(label);
      headerDiv.appendChild(select);
      headerDiv.appendChild(applyBtn);

      // Color pickers section - more compact
      const colorSection = document.createElement("div");
      colorSection.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
      `;

      // Primary color picker
      const primaryColorDiv = document.createElement("div");
      primaryColorDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
      `;

      const primaryLabel = document.createElement("span");
      primaryLabel.textContent = "1";
      primaryLabel.style.cssText = `
        font-size: 10px;
        opacity: 0.6;
        min-width: 8px;
      `;

      const primaryColorPicker = document.createElement("input");
      primaryColorPicker.type = "color";
      primaryColorPicker.id = `primary-color-${panelNumber}`;
      primaryColorPicker.value = "#ff8e24"; // Default orange
      primaryColorPicker.style.cssText = `
        width: 100%;
        height: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        cursor: pointer;
        padding: 0;
      `;

      // Secondary color picker
      const secondaryColorDiv = document.createElement("div");
      secondaryColorDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
      `;

      const secondaryLabel = document.createElement("span");
      secondaryLabel.textContent = "2";
      secondaryLabel.style.cssText = `
        font-size: 10px;
        opacity: 0.6;
        min-width: 8px;
      `;

      const secondaryColorPicker = document.createElement("input");
      secondaryColorPicker.type = "color";
      secondaryColorPicker.id = `secondary-color-${panelNumber}`;
      secondaryColorPicker.value = "#b3b3b3"; // Default grey
      secondaryColorPicker.style.cssText = `
        width: 100%;
        height: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        cursor: pointer;
        padding: 0;
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

    setupDragAndDrop() {
      // Create drag-and-drop overlay
      this.dropOverlay = document.createElement("div");
      this.dropOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 100, 200, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        pointer-events: none;
      `;

      const dropText = document.createElement("div");
      dropText.textContent = "Drop SVG file to apply to all panels";
      dropText.style.cssText = `
        font-size: 32px;
        color: white;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      `;
      this.dropOverlay.appendChild(dropText);
      document.body.appendChild(this.dropOverlay);

      // Add drag-and-drop info to UI
      const dragInfo = document.createElement("div");
      dragInfo.style.cssText = `
        margin-top: 8px;
        padding: 6px 8px;
        background: rgba(0, 100, 200, 0.15);
        border-radius: 4px;
        border: 1px solid rgba(0, 150, 255, 0.3);
        font-size: 10px;
        text-align: center;
        opacity: 0.8;
      `;
      dragInfo.textContent = "💡 Drag & drop SVG to apply to all";
      this.contentContainer.appendChild(dragInfo);

      // Prevent default drag behaviors
      document.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropOverlay.style.display = "flex";
      });

      document.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === document.body || e.target === this.dropOverlay) {
          this.dropOverlay.style.display = "none";
        }
      });

      document.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropOverlay.style.display = "none";

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const file = files[0];
          if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
            this.handleSvgUpload(file);
          } else {
            alert("Please drop an SVG file");
          }
        }
      });
    },

    handleSvgUpload(file) {
      console.log("svg-swapper: Handling SVG upload:", file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const svgContent = e.target.result;

        // Create a temporary URL for the uploaded SVG
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        // Update svg1 asset to point to the uploaded file
        const svg1Asset = document.querySelector("#svg1");
        if (svg1Asset) {
          // Revoke previous blob URL if it exists
          const oldSrc = svg1Asset.getAttribute("src");
          if (oldSrc && oldSrc.startsWith("blob:")) {
            URL.revokeObjectURL(oldSrc);
          }
          
          console.log("svg-swapper: Setting new src on svg1 asset:", url);
          svg1Asset.setAttribute("src", url);

          // Clear the cached colors for svg1 (index 0) to force re-extraction
          const scene = document.querySelector("a-scene");
          const svgColorLighting = scene.components["svg-color-lighting"];
          if (svgColorLighting && svgColorLighting.svgColors) {
            svgColorLighting.svgColors.delete(0);
            console.log("svg-swapper: Cleared cached colors for svg1");
          }

          // Clear existing geometry from all panels before applying new SVG
          for (let panelNumber = 1; panelNumber <= 4; panelNumber++) {
            this.clearPanelGeometry(panelNumber);
          }

          // Function to apply the SVG to all panels
          const applyToAllPanels = () => {
            console.log("svg-swapper: Applying uploaded SVG to all panels");
            
            // Force color extraction for the new SVG
            if (svgColorLighting) {
              svgColorLighting.refreshSvgColors(0);
            }
            
            // Apply to all 4 panels after color extraction
            setTimeout(() => {
              for (let panelNumber = 1; panelNumber <= 4; panelNumber++) {
                setTimeout(() => {
                  this.swapSvg(panelNumber, "1");
                }, panelNumber * 200);
              }
            }, 500);
          };

          // Check if asset is already loaded or wait for it to load
          if (svg1Asset.hasLoaded) {
            console.log("svg-swapper: svg1 asset already loaded");
            applyToAllPanels();
          } else {
            console.log("svg-swapper: Waiting for svg1 asset to load");
            // Use both 'loaded' event and a timeout as fallback
            const loadHandler = () => {
              console.log("svg-swapper: svg1 asset loaded event fired");
              applyToAllPanels();
            };
            svg1Asset.addEventListener('loaded', loadHandler, { once: true });
            
            // Fallback timeout in case loaded event doesn't fire
            setTimeout(() => {
              svg1Asset.removeEventListener('loaded', loadHandler);
              console.log("svg-swapper: Timeout fallback - applying to panels anyway");
              applyToAllPanels();
            }, 2000);
          }

          // Update all dropdowns to show svg1
          for (let i = 1; i <= 4; i++) {
            const select = document.querySelector(`#svg-select-${i}`);
            if (select) {
              select.value = "1";
            }
          }
        }
      };
      reader.readAsText(file);
    },

    clearPanelGeometry(panelNumber) {
      console.log(`svg-swapper: Clearing geometry for Panel ${panelNumber}`);

      // Find the panel entity
      const panelEntity = document.querySelector(`#svg-files-group > a-entity:nth-child(${panelNumber})`);
      if (!panelEntity) {
        console.error(`Panel ${panelNumber} not found`);
        return;
      }

      // Find all SVG file loader entities in this panel
      const svgLoaders = panelEntity.querySelectorAll("a-entity[svg-file-loader]");
      
      svgLoaders.forEach((loader) => {
        const svgFileLoaderComponent = loader.components["svg-file-loader"];
        if (svgFileLoaderComponent) {
          // Remove all mesh objects from the loader entity
          const meshes = loader.object3D.children.filter(child => child.type === 'Mesh' || child.type === 'Group');
          meshes.forEach(mesh => {
            // Dispose of geometries and materials
            if (mesh.geometry) {
              mesh.geometry.dispose();
            }
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.dispose());
              } else {
                mesh.material.dispose();
              }
            }
            loader.object3D.remove(mesh);
          });
          
          console.log(`svg-swapper: Cleared ${meshes.length} meshes from loader`);
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
      // Initialize all color pickers based on the SVG each panel actually uses
      for (let panelNumber = 1; panelNumber <= 4; panelNumber++) {
        let svgIndex = 0;
        const panelEntity = document.querySelector(`#svg-files-group > a-entity:nth-child(${panelNumber})`);
        if (panelEntity) {
          const loader = panelEntity.querySelector("a-entity[svg-file-loader]");
          if (loader) {
            const comp = loader.components["svg-file-loader"];
            if (comp && comp.data.svgFile) {
              const match = comp.data.svgFile.id && comp.data.svgFile.id.match(/(\d+)/);
              if (match) {
                svgIndex = parseInt(match[1]) - 1;
              }
            }
          }
        }
        this.updateColorPickersFromSvg(panelNumber, svgIndex);
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
