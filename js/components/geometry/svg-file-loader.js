// =============================================================================
// SVG FILE LOADER COMPONENT
// =============================================================================

// Import A-Frame and Three.js as ES6 modules
import AFRAME from "aframe";
import * as THREE from "three";

export function registerSvgFileLoader() {
  AFRAME.registerComponent("svg-file-loader", {
    schema: {
      svgFile: { type: "selector" },
      lineThickness: { type: "number", default: 0.01 },
      color: { type: "color", default: "#ffffff" },
      emissive: { type: "color", default: "#000000" },
      emissiveIntensity: { type: "number", default: 0.5 },
      useSvgColor: { type: "boolean", default: false },
    },

    init: function () {
      this.paths = [];
      if (this.data.svgFile) {
        this.loadSVG();
      } else {
        console.warn("svg-file-loader: No SVG file specified, creating fallback");
        this.createFallbackLine();
      }
    },

    loadSVG: function () {
      const svgAsset = this.data.svgFile;
      if (!svgAsset) {
        console.error("svg-file-loader: SVG asset not found");
        this.createFallbackLine();
        return;
      }

      fetch(svgAsset.getAttribute("src"))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then((svgText) => {
          const paths = this.extractPathsFromSVG(svgText);

          if (paths.length === 0) {
            console.warn("svg-file-loader: No paths found in SVG, creating test line");
            const testPoints = [new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)];
            const testCurve = new THREE.CatmullRomCurve3(testPoints);
            paths.push({ curve: testCurve, color: this.data.color });
          }

          this.createSVGLineGeometry(paths);

          // Update acrylic sheet lights with SVG colors
          this.updateAcrylicSheetLight(paths);

          console.log("svg-file-loader: Created LED group with", paths.length, "individual LED strips and lights");
        })
        .catch((error) => {
          console.error("svg-file-loader: Error loading SVG file", error);
          console.log("svg-file-loader: Creating fallback due to error");
          this.createFallbackLine();
        });
    },

    extractPathsFromSVG: function (svgText) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const paths = [];

      // Get SVG dimensions from viewBox
      const svgElement = svgDoc.querySelector("svg");
      const viewBox = svgElement.getAttribute("viewBox");
      let svgWidth = 1000,
        svgHeight = 1000; // defaults

      if (viewBox) {
        const viewBoxValues = viewBox.split(" ").map(Number);
        svgWidth = viewBoxValues[2] || 1000;
        svgHeight = viewBoxValues[3] || 1000;
      }

      // Check for path elements first
      const pathElements = svgDoc.querySelectorAll("path");

      pathElements.forEach((pathEl, index) => {
        const pathData = pathEl.getAttribute("d");

        if (pathData) {
          const curve = this.parseSVGPath(pathData, svgWidth, svgHeight);
          if (curve) {
            // Extract color from SVG element if useSvgColor is enabled
            let svgColor = null;
            if (this.data.useSvgColor) {
              svgColor = this.extractColorFromElement(pathEl);
            }

            paths.push({ curve, color: svgColor });
          } else {
            console.warn("svg-file-loader: Failed to parse path", index);
          }
        }
      });

      // Check for line elements
      const lineElements = svgDoc.querySelectorAll("line");

      lineElements.forEach((lineEl, index) => {
        const x1 = parseFloat(lineEl.getAttribute("x1"));
        const y1 = parseFloat(lineEl.getAttribute("y1"));
        const x2 = parseFloat(lineEl.getAttribute("x2"));
        const y2 = parseFloat(lineEl.getAttribute("y2"));

        if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
          // Create a simple line curve with proper scaling and centering
          const centerX = svgWidth / 2;
          const centerY = svgHeight / 2;

          const points = [
            new THREE.Vector3(-(x1 - centerX) * 0.001, (y1 - centerY) * 0.001, 0),
            new THREE.Vector3(-(x2 - centerX) * 0.001, (y2 - centerY) * 0.001, 0),
          ];

          // Validate that the points are different (not a zero-length line)
          if (points[0].distanceTo(points[1]) > 0.001) {
            const curve = new THREE.CatmullRomCurve3(points);

            // Extract color from SVG element if useSvgColor is enabled
            let svgColor = null;
            if (this.data.useSvgColor) {
              svgColor = this.extractColorFromElement(lineEl);
            }

            paths.push({ curve, color: svgColor });
          }
        }
      });

      return paths;
    },

    parseSVGPath: function (pathString, svgWidth = 1000, svgHeight = 1000) {
      const points = [];
      const commands = pathString.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

      // Center the coordinates
      const centerX = svgWidth / 2;
      const centerY = svgHeight / 2;

      let currentX = 0,
        currentY = 0;

      if (commands) {
        commands.forEach((cmd, index) => {
          const type = cmd[0];
          const coords = cmd
            .slice(1)
            .trim()
            .split(/[\s,]+/)
            .map(Number)
            .filter((n) => !isNaN(n));

          switch (type) {
            case "M": // Move to
              currentX = coords[0] || 0;
              currentY = coords[1] || 0;
              break;
            case "L": // Line to
              currentX = coords[0] || currentX;
              currentY = coords[1] || currentY;
              const point = new THREE.Vector3(-(currentX - centerX) * 0.001, (currentY - centerY) * 0.001, 0);
              points.push(point);
              break;
            case "C": // Cubic bezier
              const startX = currentX;
              const startY = currentY;
              currentX = coords[4] || currentX;
              currentY = coords[5] || currentY;

              // Create curve points for smooth bezier
              for (let t = 0; t <= 1; t += 0.1) {
                const x = this.cubicBezier(t, startX, coords[0], coords[2], coords[4]);
                const y = this.cubicBezier(t, startY, coords[1], coords[3], coords[5]);

                if (isNaN(x) || isNaN(y)) {
                  console.warn("svg-file-loader: Invalid bezier coordinates:", { x, y, t, startX, startY, coords });
                  continue;
                }

                const curvePoint = new THREE.Vector3(-(x - centerX) * 0.001, (y - centerY) * 0.001, 0);
                points.push(curvePoint);
              }
              break;
          }
        });

        // Always close the path to create closed shapes
        if (points.length > 1) {
          const firstPoint = points[0];
          const lastPoint = points[points.length - 1];
          const distance = firstPoint.distanceTo(lastPoint);
          if (distance > 0.001) {
            points.push(firstPoint.clone());
          }
        }
      }

      if (points.length < 2) {
        console.warn("svg-file-loader: Not enough points for curve:", points.length);
        return null;
      }

      return new THREE.CatmullRomCurve3(points);
    },

    extractColorFromElement: function (element) {
      let color = null;

      // Try stroke attribute first
      color = element.getAttribute("stroke");
      if (color && color !== "none" && color !== "transparent") {
        return this.parseColor(color);
      }

      // Try style attribute
      const style = element.getAttribute("style");
      if (style) {
        const strokeMatch = style.match(/stroke:\s*([^;]+)/);
        if (strokeMatch) {
          color = strokeMatch[1].trim();
          if (color !== "none" && color !== "transparent") {
            return this.parseColor(color);
          }
        }
      }

      // If still no color, try class attribute and look for color in CSS
      if (!color) {
        const className = element.getAttribute("class");
        if (className) {
          const svgDoc = element.ownerDocument;
          const styleElement = svgDoc.querySelector("style");
          if (styleElement) {
            const cssText = styleElement.textContent;
            const classMatch = cssText.match(new RegExp(`\\.${className}\\s*\\{[^}]*stroke:([^;]+)`));
            if (classMatch) {
              color = classMatch[1].trim();
            }
          }
        }
      }

      // Convert to Three.js compatible color
      if (color && color !== "none" && color !== "transparent") {
        return this.parseColor(color);
      }

      return null;
    },

    parseColor: function (colorString) {
      // Handle common color formats
      if (colorString.startsWith("#")) {
        return colorString;
      }
      if (colorString.startsWith("rgb")) {
        // Convert rgb(r,g,b) to hex
        const matches = colorString.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]).toString(16).padStart(2, "0");
          const g = parseInt(matches[1]).toString(16).padStart(2, "0");
          const b = parseInt(matches[2]).toString(16).padStart(2, "0");
          return `#${r}${g}${b}`;
        }
      }
      return colorString;
    },

    createSVGLineGeometry: function (paths) {
      const ledGroup = document.createElement("a-entity");
      ledGroup.setAttribute("id", "led-strips-group");

      paths.forEach((pathData, index) => {
        const { curve, color } = pathData;

        if (!curve || !curve.points || curve.points.length < 2) {
          console.warn("svg-file-loader: Invalid curve data for path", index);
          return;
        }

        // Create half-tube geometry along the curve
        const geometry = this.createHalfTubeGeometry(curve, this.data.lineThickness);

        // Determine material color
        let materialColor = this.data.color;
        let emissiveColor = this.data.emissive;
        let emissiveIntensity = this.data.emissiveIntensity;

        if (this.data.useSvgColor && color) {
          materialColor = color;
          emissiveColor = color;
          emissiveIntensity = this.data.emissiveIntensity;
        }

        // Create enhanced material with glow properties
        const material = new THREE.MeshStandardMaterial({
          color: materialColor,
          emissive: emissiveColor,
          emissiveIntensity: emissiveIntensity,
          transparent: true,
          opacity: 1,
          metalness: 0.1,
          roughness: 0.2,
          // side: THREE.DoubleSide, // Disabled for performance testing
        });

        const mesh = new THREE.Mesh(geometry, material);
        ledGroup.object3D.add(mesh);
      });

      this.el.appendChild(ledGroup);
    },

    cubicBezier: function (t, p0, p1, p2, p3) {
      if (isNaN(p0) || isNaN(p1) || isNaN(p2) || isNaN(p3)) {
        console.warn("svg-file-loader: Invalid bezier parameters:", { p0, p1, p2, p3 });
        return 0;
      }
      const u = 1 - t;
      const result = u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
      return isNaN(result) ? 0 : result;
    },

    createHalfTubeGeometry: function (curve, radius) {
      // Create a simple half-cylinder by using a regular tube but with material side set to front only
      const segments = 32;
      const radialSegments = 8;

      // Create a regular tube geometry
      const geometry = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);

      // Return the geometry - we'll handle the half-cylinder effect with material properties
      return geometry;
    },

    createFallbackLine: function () {
      const componentData = this.data;
      console.log("svg-file-loader: Creating fallback line with data:", componentData);

      // Create a simple test line
      const testPoints = [new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)];
      const testCurve = new THREE.CatmullRomCurve3(testPoints);
      const geometry = this.createHalfTubeGeometry(testCurve, componentData.lineThickness);

      const material = new THREE.MeshStandardMaterial({
        color: componentData.color,
        emissive: componentData.emissive,
        emissiveIntensity: componentData.emissiveIntensity,
        transparent: true,
        opacity: 1,
        // side: THREE.DoubleSide, // Disabled for performance testing
      });

      const mesh = new THREE.Mesh(geometry, material);
      this.el.setObject3D("mesh", mesh);
      console.log("svg-file-loader: Fallback line created and attached");
    },

    updateAcrylicSheetLight: function (paths) {
      // Find two different colors from the SVG paths
      const colors = this.findTwoRandomColors(paths);
      if (!colors || colors.length < 2) {
        console.log("svg-file-loader: Not enough colors found in SVG for dual lights");
        return;
      }

      const [colorA, colorB] = colors;

      // Determine which sheet this SVG belongs to based on the parent panel's position
      let sheetNumber = 1; // default

      // Walk up the parent chain to find the panel entity
      let parent = this.el.parentEl;
      while (parent && parent.tagName !== "A-SCENE") {
        const position = parent.getAttribute("position");
        if (position && position.z !== undefined) {
          console.log("svg-file-loader: Found parent panel at position:", position);
          const z = position.z;
          if (z <= -2.5) sheetNumber = 4;
          else if (z <= -1.5) sheetNumber = 3;
          else if (z <= -0.5) sheetNumber = 2;
          else sheetNumber = 1;
          break;
        }
        parent = parent.parentEl;
      }

      // Update both acrylic sheet lights
      const lightIdA = `sheet-light-${sheetNumber}a`;
      const lightIdB = `sheet-light-${sheetNumber}b`;
      const lightElA = document.querySelector(`#${lightIdA}`);
      const lightElB = document.querySelector(`#${lightIdB}`);

      if (lightElA) {
        lightElA.setAttribute("rect-area-light", "color", colorA);
      } else {
        console.log(`svg-file-loader: Light ${lightIdA} not found`);
      }

      if (lightElB) {
        lightElB.setAttribute("rect-area-light", "color", colorB);
      } else {
        console.log(`svg-file-loader: Light ${lightIdB} not found`);
      }
    },

    findTwoRandomColors: function (paths) {
      const validColors = [];

      for (let i = 0; i < paths.length; i++) {
        const color = paths[i].color;
        if (!color) continue;

        const rgb = this.hexToRgb(color);
        if (!rgb) continue;

        // Be more permissive with color selection - only skip pure white
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const isPureWhite = max > 250 && min > 250;

        if (!isPureWhite) {
          validColors.push(color);
        }
      }

      // If no colors found, use some default colorful options
      if (validColors.length === 0) {
        console.log("svg-file-loader: No valid colors found, using default colors");
        return ["#ff6b6b", "#4ecdc4"]; // Red and teal defaults
      }

      if (validColors.length === 1) {
        // If only one color, use it for both lights
        return [validColors[0], validColors[0]];
      }

      // Randomly pick two different colors
      const randomIndex1 = Math.floor(Math.random() * validColors.length);
      let randomIndex2 = Math.floor(Math.random() * validColors.length);

      // Ensure we get two different colors
      while (randomIndex2 === randomIndex1 && validColors.length > 1) {
        randomIndex2 = Math.floor(Math.random() * validColors.length);
      }

      const selectedColors = [validColors[randomIndex1], validColors[randomIndex2]];
      console.log("svg-file-loader: Selected colors for dual lights:", selectedColors);
      return selectedColors;
    },

    hexToRgb: function (hex) {
      // Remove # if present
      hex = hex.replace("#", "");

      // Handle 3-digit hex
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((h) => h + h)
          .join("");
      }

      const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    },

    updateColors: function () {
      // Re-extract colors from the SVG and update existing materials
      if (!this.data.svgFile || !this.data.useSvgColor) {
        console.log("svg-file-loader: No SVG file or useSvgColor disabled for color update");
        return;
      }

      const svgDoc = this.data.svgFile.contentDocument;
      if (svgDoc) {
        const paths = this.extractPathsFromSVG(svgDoc.documentElement.outerHTML);
        console.log("svg-file-loader: Re-extracted", paths.length, "paths for color update");

        // Update acrylic sheet lights with new colors
        this.updateAcrylicSheetLight(paths);

        // Update existing mesh materials if they exist
        const ledGroup = this.el.querySelector("#led-strips-group");
        if (ledGroup && ledGroup.object3D) {
          let meshIndex = 0;
          ledGroup.object3D.traverse((child) => {
            if (child.isMesh && meshIndex < paths.length) {
              const pathData = paths[meshIndex];
              if (pathData && pathData.color) {
                child.material.color.setHex(pathData.color.replace("#", "0x"));
                child.material.emissive.setHex(pathData.color.replace("#", "0x"));
                child.material.needsUpdate = true;
              }
              meshIndex++;
            }
          });
        }
      } else {
        console.log("svg-file-loader: No SVG document found for color update");
      }
    },

    regenerateGeometry: function () {
      // Clear existing geometry and recreate from SVG
      console.log("svg-file-loader: Regenerating geometry from SVG");

      // Remove existing LED group
      const existingGroup = this.el.querySelector("#led-strips-group");
      if (existingGroup) {
        // Dispose of geometries and materials to free memory
        existingGroup.object3D.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          }
        });
        this.el.removeChild(existingGroup);
      }

      // Re-extract paths and create new geometry
      const svgDoc = this.data.svgFile.contentDocument;
      if (svgDoc) {
        this.paths = this.extractPathsFromSVGDocument(svgDoc);
        this.createSVGLineGeometryFromDocument(svgDoc);
      } else {
        console.log("svg-file-loader: No SVG document found for geometry regeneration");
        return;
      }
    },

    extractPathsFromSVGDocument: function (svgDoc) {
      const paths = [];

      // Get SVG dimensions from viewBox
      const svgElement = svgDoc.querySelector("svg");
      const viewBox = svgElement.getAttribute("viewBox");
      let svgWidth = 1000,
        svgHeight = 1000; // defaults

      if (viewBox) {
        const viewBoxValues = viewBox.split(" ").map(Number);
        svgWidth = viewBoxValues[2] || 1000;
        svgHeight = viewBoxValues[3] || 1000;
      }

      // Find all path elements
      const pathElements = svgDoc.querySelectorAll("path");
      pathElements.forEach((pathElement, index) => {
        const pathData = pathElement.getAttribute("d");
        if (pathData) {
          // Parse the path and create a curve
          const curve = this.parseSVGPath(pathData, svgWidth, svgHeight);

          if (curve && curve.points && curve.points.length > 0) {
            // Extract color from the path element
            const color = this.extractColorFromElement(pathElement);

            paths.push({
              curve: curve,
              color: color,
              originalPath: pathData,
            });
          }
        }
      });

      // Find all line elements
      const lineElements = svgDoc.querySelectorAll("line");
      lineElements.forEach((lineElement, index) => {
        const x1 = parseFloat(lineElement.getAttribute("x1")) || 0;
        const y1 = parseFloat(lineElement.getAttribute("y1")) || 0;
        const x2 = parseFloat(lineElement.getAttribute("x2")) || 0;
        const y2 = parseFloat(lineElement.getAttribute("y2")) || 0;

        // Create a simple line curve
        const points = [
          new THREE.Vector3(-(x1 - svgWidth / 2) * 0.001, (y1 - svgHeight / 2) * 0.001, 0),
          new THREE.Vector3(-(x2 - svgWidth / 2) * 0.001, (y2 - svgHeight / 2) * 0.001, 0),
        ];

        const curve = new THREE.CatmullRomCurve3(points);

        // Extract color from the line element
        const color = this.extractColorFromElement(lineElement);

        paths.push({
          curve: curve,
          color: color,
          originalPath: `line(${x1},${y1},${x2},${y2})`,
        });
      });

      return paths;
    },

    createSVGLineGeometryFromDocument: function (svgDoc) {
      if (!this.paths || this.paths.length === 0) {
        console.log("svg-file-loader: No paths available for geometry creation");
        return;
      }

      const ledGroup = document.createElement("a-entity");
      ledGroup.setAttribute("id", "led-strips-group");

      this.paths.forEach((pathData, index) => {
        const { curve, color } = pathData;

        if (!curve || !curve.points || curve.points.length < 2) {
          console.warn("svg-file-loader: Invalid curve data for path", index);
          return;
        }

        // Create half-tube geometry along the curve
        const geometry = this.createHalfTubeGeometry(curve, this.data.lineThickness);

        // Determine material color
        let materialColor = this.data.color;
        let emissiveColor = this.data.emissive;
        let emissiveIntensity = this.data.emissiveIntensity;

        if (this.data.useSvgColor && color) {
          materialColor = color;
          emissiveColor = color;
          emissiveIntensity = this.data.emissiveIntensity;
        }

        // Create enhanced material with glow properties
        const material = new THREE.MeshStandardMaterial({
          color: materialColor,
          emissive: emissiveColor,
          emissiveIntensity: emissiveIntensity,
          transparent: true,
          opacity: 1,
          metalness: 0.1,
          roughness: 0.2,
          // side: THREE.DoubleSide, // Disabled for performance testing
        });

        const mesh = new THREE.Mesh(geometry, material);
        ledGroup.object3D.add(mesh);
      });

      this.el.appendChild(ledGroup);
    },

    update: function () {
      // Re-extract colors and regenerate geometry when SVG file changes
      if (this.data.svgFile) {
        console.log("svg-file-loader: SVG file changed, re-extracting colors and geometry");
        if (this.data.useSvgColor) {
          this.updateColors();
        }
        this.regenerateGeometry();
      }
    },

    // Public method to force reload of SVG
    reloadSvg: function () {
      console.log("svg-file-loader: Forcing SVG reload");
      this.loadSVG();
    },

    // Public method to update colors manually
    updateCustomColors: function (primaryColor, secondaryColor) {
      console.log(`svg-file-loader: Updating custom colors - Primary: ${primaryColor}, Secondary: ${secondaryColor}`);

      // Store the custom colors
      this.customColors = {
        primary: primaryColor,
        secondary: secondaryColor,
      };

      // Update the LED group colors if it exists
      const ledGroup = this.el.querySelector("#led-strips-group");
      if (ledGroup) {
        this.updateLedGroupColors(ledGroup, primaryColor, secondaryColor);
      }
    },

    updateLedGroupColors: function (ledGroup, primaryColor, secondaryColor) {
      const meshes = ledGroup.object3D.children;
      const expandedPrimary = this.expandHexColor(primaryColor);
      const expandedSecondary = this.expandHexColor(secondaryColor);
      const colors = [expandedPrimary, expandedSecondary];

      meshes.forEach((mesh, index) => {
        if (mesh.isMesh && mesh.material) {
          const colorIndex = index % colors.length;
          mesh.material.color.setHex(colors[colorIndex].replace("#", "0x"));
          mesh.material.emissive.setHex(colors[colorIndex].replace("#", "0x"));
        }
      });
    },

    expandHexColor: function (hexColor) {
      // Convert short hex format (#f90) to full format (#ff9900)
      if (hexColor && hexColor.startsWith("#") && hexColor.length === 4) {
        const short = hexColor.slice(1);
        return "#" + short[0] + short[0] + short[1] + short[1] + short[2] + short[2];
      }
      return hexColor;
    },
  });
}
