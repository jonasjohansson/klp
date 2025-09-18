// =============================================================================
// KLP Solnavägen 4 - A-Frame 3D Scene
// =============================================================================
// This file contains all A-Frame components and functionality for the 3D scene
// with SVG file loading, acrylic planes, GLB model enhancement, and camera controls.

// Global counter for LED light IDs
let ledLightCounter = 0;

// =============================================================================
// ATMOSPHERIC COMPONENTS
// =============================================================================

// Atmospheric particles component for ambiance
AFRAME.registerComponent("atmospheric-particles", {
  init: function () {
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.random() * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      const color = new THREE.Color();
      color.setHSL(0.6, 0.3, Math.random() * 0.3 + 0.1);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(particles, material);
    this.el.setObject3D("mesh", points);
  },

  tick: function () {
    const mesh = this.el.getObject3D("mesh");
    if (mesh) {
      mesh.rotation.y += 0.0005;
    }
  },
});

// =============================================================================
// GLB MODEL COMPONENTS
// =============================================================================

// GLB Material Enhancement Component
AFRAME.registerComponent("glb-material-enhancer", {
  schema: {
    envMapIntensity: { type: "number", default: 1.0 },
    transparencyThreshold: { type: "number", default: 0.1 },
    forceTransparency: { type: "boolean", default: false },
    transparencyOpacity: { type: "number", default: 0.5 },
    transparencyPattern: { type: "string", default: "" }, // e.g., "glass", "window", "transparent"
  },

  init: function () {
    this.el.addEventListener("model-loaded", this.enhanceMaterials.bind(this));
  },

  enhanceMaterials: function () {
    // console.log("glb-material-enhancer: Enhancing GLB materials");

    // Try to get the HDRI sky texture for realistic reflections
    let envMap = null;
    const hdriSky = document.querySelector("#hdri-sky");

    if (hdriSky && hdriSky.object3D && hdriSky.object3D.children[0]) {
      const skyMesh = hdriSky.object3D.children[0];
      if (skyMesh.material && skyMesh.material.map) {
        envMap = skyMesh.material.map.clone();
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        // console.log("glb-material-enhancer: Using HDRI for environment mapping");
      }
    }

    // Fallback: disable environment mapping to avoid shader errors
    if (!envMap) {
      // console.log("glb-material-enhancer: HDRI not found, disabling environment mapping");
      envMap = null;
    }

    // Traverse the GLB model and enhance all materials
    let materialCount = 0;
    let transparentCount = 0;
    this.el.object3D.traverse((child) => {
      if (child.isMesh && child.material) {
        materialCount++;
        // console.log(`glb-material-enhancer: Processing material ${materialCount} for mesh:`, child.name || "unnamed");
        // console.log("  Original material type:", child.material.type);
        // console.log("  Original opacity:", child.material.opacity);
        // console.log("  Original transparent:", child.material.transparent);

        this.enhanceMaterial(child.material, envMap);

        if (child.material.transparent) {
          transparentCount++;
        }
      }
    });

    // console.log(`glb-material-enhancer: Enhanced ${materialCount} materials, ${transparentCount} transparent`);

    // Force glass transparency at the end
    // console.log("glb-material-enhancer: Applying glass transparency...");
    this.forceGlassTransparency();

    // Make right wall non-reflective
    // console.log("glb-material-enhancer: Making right wall non-reflective...");
    this.makeNonReflective("right");

    // Make ground non-reflective
    // console.log("glb-material-enhancer: Making ground non-reflective...");
    this.makeNonReflective("ground");
  },

  enhanceMaterial: function (material, envMap) {
    // Clone the material to avoid modifying the original
    const enhancedMaterial = material.clone();

    // Apply environment mapping for reflections
    if (envMap) {
      enhancedMaterial.envMap = envMap;
      enhancedMaterial.envMapIntensity = this.data.envMapIntensity;
    }

    // Enhanced transparency detection and application
    const originalOpacity = enhancedMaterial.opacity;
    const originalTransparent = enhancedMaterial.transparent;
    const meshName = material.parent ? material.parent.name : "unknown";

    // console.log(`glb-material-enhancer: Processing mesh "${meshName}" with pattern "${this.data.transparencyPattern}"`);

    // Check for transparency in multiple ways
    let isTransparent =
      originalOpacity < 1.0 || originalTransparent === true || enhancedMaterial.alphaTest > 0 || enhancedMaterial.alphaMap !== null;

    // Pattern-based transparency detection (for Blender exports that don't preserve transparency)
    if (this.data.transparencyPattern && meshName.toLowerCase().includes(this.data.transparencyPattern.toLowerCase())) {
      isTransparent = true;
      // console.log("glb-material-enhancer: Pattern-based transparency detected for:", meshName);
    }

    // Also check for exact match (case insensitive)
    if (this.data.transparencyPattern && meshName.toLowerCase() === this.data.transparencyPattern.toLowerCase()) {
      isTransparent = true;
      // console.log("glb-material-enhancer: Exact pattern match for:", meshName);
    }

    // Force transparency if enabled
    if (this.data.forceTransparency) {
      isTransparent = true;
      // console.log("glb-material-enhancer: Force transparency enabled");
    }

    if (isTransparent) {
      enhancedMaterial.transparent = true;
      enhancedMaterial.opacity = this.data.forceTransparency ? this.data.transparencyOpacity : originalOpacity;
      enhancedMaterial.alphaTest = 0.1; // Prevent z-fighting
      enhancedMaterial.depthWrite = false; // Better transparency rendering
      enhancedMaterial.blending = THREE.NormalBlending;
      console.log(
        "glb-material-enhancer: Enhanced transparent material with opacity",
        enhancedMaterial.opacity,
        "transparent:",
        originalTransparent,
        "mesh:",
        meshName
      );
    }

    // Handle emissive materials (materials that glow)
    if (enhancedMaterial.emissive && enhancedMaterial.emissive.getHex() !== 0x000000) {
      enhancedMaterial.emissiveIntensity = enhancedMaterial.emissiveIntensity || 1.0;
      // console.log("glb-material-enhancer: Enhanced emissive material with intensity", enhancedMaterial.emissiveIntensity);
    }

    // Improve material properties for better reflections and realism
    enhancedMaterial.metalness = Math.max(enhancedMaterial.metalness || 0, 0.1);
    enhancedMaterial.roughness = Math.min(enhancedMaterial.roughness || 0.5, 0.8);

    // Ensure proper material type for best results
    if (enhancedMaterial.isMeshBasicMaterial) {
      // Convert basic materials to standard for better lighting
      const newMaterial = new THREE.MeshStandardMaterial({
        color: enhancedMaterial.color,
        map: enhancedMaterial.map,
        transparent: enhancedMaterial.transparent,
        opacity: enhancedMaterial.opacity,
        alphaTest: enhancedMaterial.alphaTest,
        side: enhancedMaterial.side,
        envMap: envMap,
        envMapIntensity: this.data.envMapIntensity,
        metalness: 0.1,
        roughness: 0.5,
      });
      console.log("glb-material-enhancer: Converted MeshBasicMaterial to MeshStandardMaterial");
      enhancedMaterial = newMaterial;
    }

    // Update the material
    enhancedMaterial.needsUpdate = true;

    // Apply to the mesh
    if (material.parent) {
      material.parent.material = enhancedMaterial;
    }
  },

  forceGlassTransparency: function () {
    console.log("glb-material-enhancer: Forcing glass transparency...");
    const glbEntity = this.el;
    let transparentCount = 0;

    glbEntity.object3D.traverse((child) => {
      if (child.isMesh && (child.name === "Glass" || child.name === "GLASS")) {
        console.log(`glb-material-enhancer: Making transparent: ${child.name}`);
        child.material.transparent = true;
        child.material.opacity = this.data.transparencyOpacity || 0.3;
        child.material.alphaTest = 0.1;
        child.material.depthWrite = false;
        child.material.blending = THREE.NormalBlending;
        child.material.needsUpdate = true;
        transparentCount++;
      }
    });

    console.log(`glb-material-enhancer: Made ${transparentCount} glass objects transparent`);
    return transparentCount;
  },

  makeNonReflective: function (objectName) {
    console.log(`glb-material-enhancer: Making non-reflective: ${objectName}`);
    const glbEntity = this.el;
    let count = 0;

    glbEntity.object3D.traverse((child) => {
      if (child.isMesh) {
        // console.log(`Checking object: "${child.name}" against "${objectName}"`);
        if (child.name === objectName || child.name.toLowerCase().includes(objectName.toLowerCase())) {
          console.log(`glb-material-enhancer: Making non-reflective: ${child.name}`);

          // Ensure we have a material
          if (child.material) {
            child.material.envMap = null;
            child.material.envMapIntensity = 0;
            child.material.metalness = 0;
            child.material.roughness = 1.0;
            child.material.needsUpdate = true;
            count++;
            console.log(`Successfully made ${child.name} non-reflective`);
          } else {
            console.log(`No material found on ${child.name}`);
          }
        }
      }
    });

    console.log(`glb-material-enhancer: Made ${count} objects non-reflective`);
    return count;
  },
});

// =============================================================================
// CAMERA COMPONENTS
// =============================================================================

AFRAME.registerComponent("always-look-at", {
  schema: { type: "selector" },
  tick: function () {
    var targetEl = this.data;
    if (!targetEl) return;
    var targetPos = new THREE.Vector3();
    targetEl.object3D.getWorldPosition(targetPos);
    // Make the entity's -Z axis point at the target.
    this.el.object3D.lookAt(targetPos);
    // If your object appears inverted, you may need the following:
    this.el.object3D.rotateY(Math.PI);
  },
});

// SVG File Loader - Loads SVG files and creates 3D lines
// =============================================================================
// RECT AREA LIGHT COMPONENT
// =============================================================================

console.log("Registering rect-area-light component");
AFRAME.registerComponent("rect-area-light", {
  schema: {
    color: { type: "color", default: "#ffffff" },
    intensity: { type: "number", default: 2 },
    width: { type: "number", default: 2 },
    height: { type: "number", default: 2 },
  },

  init: function () {
    // Create RectAreaLight
    this.rectLight = new THREE.RectAreaLight(this.data.color, this.data.intensity, this.data.width, this.data.height);

    // Position the light
    const position = this.el.getAttribute("position");
    if (position) {
      this.rectLight.position.set(position.x, position.y, position.z);
    }

    // Make it look at the center (0, 0, 0)
    this.rectLight.lookAt(0, 0, 0);

    // Add to the scene
    this.el.setObject3D("light", this.rectLight);

    // Add helper (optional, for debugging)
    if (THREE.RectAreaLightHelper) {
      const helper = new THREE.RectAreaLightHelper(this.rectLight);
      this.rectLight.add(helper);
    }

    // console.log("rect-area-light: Created RectAreaLight with color", this.data.color);
  },

  update: function () {
    if (this.rectLight) {
      this.rectLight.color.setHex(this.data.color.replace("#", "0x"));
      this.rectLight.intensity = this.data.intensity;
      this.rectLight.width = this.data.width;
      this.rectLight.height = this.data.height;
    }
  },
});

// =============================================================================
// SVG FILE LOADER COMPONENT
// =============================================================================

console.log("Registering svg-file-loader component");
AFRAME.registerComponent("svg-file-loader", {
  schema: {
    svgFile: { type: "selector" },
    lineThickness: { type: "number", default: 0.01 },
    color: { type: "color", default: "#ffffff" },
    emissive: { type: "color", default: "#000000" },
    emissiveIntensity: { type: "number", default: 0.8 },
    subdivisions: { type: "number", default: 32 },
    useSvgColor: { type: "boolean", default: false },
  },
  init: function () {
    // console.log("svg-file-loader: Component initialized");

    // Try to load the SVG
    this.createSVGLineGeometry();

    // Fallback: create a test line after 3 seconds if nothing appears
    setTimeout(() => {
      if (!this.el.getObject3D("mesh")) {
        console.log("svg-file-loader: Creating fallback test line");
        this.createFallbackLine();
      }
    }, 3000);
  },
  createSVGLineGeometry: function () {
    const componentData = this.data;
    const svgFileEl = componentData.svgFile;

    // console.log("svg-file-loader: Starting with file:", svgFileEl);
    // console.log("svg-file-loader: File src:", svgFileEl ? svgFileEl.src : "NO SRC");
    // console.log("svg-file-loader: Component data:", componentData);

    if (!svgFileEl) {
      console.warn("svg-file-loader: No SVG file provided, creating fallback");
      this.createFallbackLine();
      return;
    }

    // Get the SVG URL directly
    const svgUrl = svgFileEl.src || svgFileEl.getAttribute("src");
    // console.log("svg-file-loader: SVG URL:", svgUrl);

    if (!svgUrl) {
      console.warn("svg-file-loader: No SVG URL found, creating fallback");
      this.createFallbackLine();
      return;
    }

    // Load SVG directly using fetch
    fetch(svgUrl)
      .then((response) => {
        // console.log("svg-file-loader: Response status:", response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((svgText) => {
        // console.log("svg-file-loader: SVG text length:", svgText.length);
        // console.log("svg-file-loader: SVG content preview:", svgText.substring(0, 200));

        const paths = this.extractPathsFromSVG(svgText);
        // console.log("svg-file-loader: Found paths:", paths.length);

        if (paths.length === 0) {
          console.warn("svg-file-loader: No paths found in SVG, creating test line");
          // Create a simple test line
          const testPoints = [new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)];
          const testCurve = new THREE.CatmullRomCurve3(testPoints);
          paths.push(testCurve);
        }

        // Validate that we have paths to work with
        if (paths.length === 0) {
          console.error("svg-file-loader: No valid paths found");
          this.createFallbackLine();
          return;
        }

        // Create a group to hold all the individual LED strips with their lights
        const ledGroup = new THREE.Group();
        ledGroup.name = "ledGroup";

        // Create individual meshes for each path with their own lights
        paths.forEach((pathData, index) => {
          const path = pathData.curve || pathData;
          const pathColor = pathData.color || null;

          // Create geometry for this specific path - closed for solid shapes
          const pathGeometry = new THREE.TubeGeometry(path, componentData.subdivisions, componentData.lineThickness, 8, true);

          // Determine colors for this path
          let materialColor = componentData.color;
          let emissiveColor = componentData.emissive;

          // If useSvgColor is enabled and this path has a color, use it
          if (componentData.useSvgColor && pathColor) {
            materialColor = pathColor;
            emissiveColor = pathColor;

            // For white colors, make them more emissive to avoid ambient lighting tinting
            const isWhite =
              pathColor === "#ffffff" ||
              pathColor === "white" ||
              pathColor === "#fff" ||
              pathColor === "#FFFFFF" ||
              pathColor === "White" ||
              pathColor === "WHITE" ||
              (pathColor && pathColor.toLowerCase().includes("white"));

            // Also check if color is close to white (RGB values all high)
            let isNearWhite = false;
            if (pathColor && pathColor.startsWith("#") && pathColor.length === 7) {
              const r = parseInt(pathColor.substr(1, 2), 16);
              const g = parseInt(pathColor.substr(3, 2), 16);
              const b = parseInt(pathColor.substr(5, 2), 16);
              // If all RGB values are above 240, consider it white
              isNearWhite = r > 240 && g > 240 && b > 240;
            }

            if (isWhite || isNearWhite) {
              emissiveColor = "#ffffff";
              // Increase emissive intensity for white to prevent color tinting
              componentData.emissiveIntensity = Math.max(componentData.emissiveIntensity || 0.5, 0.9);
            }
            // console.log("svg-file-loader: Using SVG color for path", index, ":", pathColor);
          }

          const material = new THREE.MeshStandardMaterial({
            color: materialColor,
            emissive: emissiveColor,
            emissiveIntensity: (componentData.emissiveIntensity || 0.8) * 1.5, // Boost for bloom effect
            transparent: true,
            opacity: 0.95, // Slight transparency for glow
            metalness: 0.0,
            roughness: 0.05, // Very smooth for better reflections
            side: THREE.DoubleSide,
          });

          const pathMesh = new THREE.Mesh(pathGeometry, material);

          // Position colored SVGs slightly in front for better visibility
          if (componentData.useSvgColor && pathColor) {
            pathMesh.position.z = 0.01; // Move colored pieces forward
          }

          ledGroup.add(pathMesh);

          // Lights will be added per SVG file, not per path
        });

        this.el.setObject3D("mesh", ledGroup);
        console.log("svg-file-loader: Created LED group with", paths.length, "individual LED strips and lights");

        // Update acrylic sheet light color if useSvgColor is enabled
        if (componentData.useSvgColor) {
          this.updateAcrylicSheetLight(paths);
        }

        // Lights are now defined statically in HTML for better performance
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

    // console.log("svg-file-loader: SVG dimensions:", svgWidth, "x", svgHeight);

    // Check for path elements first
    const pathElements = svgDoc.querySelectorAll("path");
    // console.log("svg-file-loader: Found", pathElements.length, "path elements");

    pathElements.forEach((pathEl, index) => {
      const pathData = pathEl.getAttribute("d");
      // console.log("svg-file-loader: Path", index, "data:", pathData ? pathData.substring(0, 100) + "..." : "NO DATA");

      if (pathData) {
        const curve = this.parseSVGPath(pathData, svgWidth, svgHeight);
        if (curve) {
          // Extract color from SVG element if useSvgColor is enabled
          let svgColor = null;
          if (this.data.useSvgColor) {
            svgColor = this.extractColorFromElement(pathEl);
          }

          paths.push({ curve, color: svgColor });
          console.log(
            "svg-file-loader: Successfully parsed path",
            index,
            "with",
            curve.points.length,
            "points",
            svgColor ? "and color " + svgColor : "no color"
          );
        } else {
          console.warn("svg-file-loader: Failed to parse path", index);
        }
      }
    });

    // Check for line elements
    const lineElements = svgDoc.querySelectorAll("line");
    // console.log("svg-file-loader: Found", lineElements.length, "line elements");

    lineElements.forEach((lineEl, index) => {
      const x1 = parseFloat(lineEl.getAttribute("x1"));
      const y1 = parseFloat(lineEl.getAttribute("y1"));
      const x2 = parseFloat(lineEl.getAttribute("x2"));
      const y2 = parseFloat(lineEl.getAttribute("y2"));

      if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
        // console.log("svg-file-loader: Processing line", index, ":", x1, y1, x2, y2);
        // console.log("svg-file-loader: SVG dimensions:", svgWidth, svgHeight);
        // console.log("svg-file-loader: Center:", svgWidth / 2, svgHeight / 2);

        // Create a simple line curve with proper scaling and centering
        // SVG coordinates are typically top-left anchored, so we need to center them
        const centerX = svgWidth / 2;
        const centerY = svgHeight / 2;

        const points = [
          new THREE.Vector3(-(x1 - centerX) * 0.001, (y1 - centerY) * 0.001, 0),
          new THREE.Vector3(-(x2 - centerX) * 0.001, (y2 - centerY) * 0.001, 0),
        ];

        // console.log("svg-file-loader: 3D points:", points[0], points[1]);

        // Validate that the points are different (not a zero-length line)
        if (points[0].distanceTo(points[1]) > 0.001) {
          const curve = new THREE.CatmullRomCurve3(points);

          // Extract color from SVG element if useSvgColor is enabled
          let svgColor = null;
          if (this.data.useSvgColor) {
            svgColor = this.extractColorFromElement(lineEl);
          }

          paths.push({ curve, color: svgColor });
          // console.log("svg-file-loader: Successfully created line curve", index, svgColor ? "with color " + svgColor : "no color");
        } else {
          console.warn("svg-file-loader: Skipping zero-length line", index);
        }
      }
    });

    return paths;
  },
  extractColorFromElement: function (element) {
    // Try to get color from stroke attribute first
    let color = element.getAttribute("stroke");

    // If no stroke, try fill
    if (!color) {
      color = element.getAttribute("fill");
    }

    // If still no color, try class attribute and look for color in CSS
    if (!color) {
      const className = element.getAttribute("class");
      if (className) {
        // Parse the SVG document to find CSS rules
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
  getFirstSvgColor: function (paths) {
    // Find the first path with a color
    for (let i = 0; i < paths.length; i++) {
      const pathData = paths[i];
      if (pathData.color) {
        return pathData.color;
      }
    }
    return null;
  },
  parseSVGPath: function (pathString, svgWidth = 1000, svgHeight = 1000) {
    // console.log("svg-file-loader: Parsing path:", pathString.substring(0, 100) + "...");
    const points = [];
    const commands = pathString.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

    // console.log("svg-file-loader: Found commands:", commands ? commands.length : 0);

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

        // console.log("svg-file-loader: Command", index, ":", type, "coords:", coords);

        switch (type) {
          case "M": // Move to
            currentX = coords[0] || 0;
            currentY = coords[1] || 0;
            // console.log("svg-file-loader: Move to", currentX, currentY);
            break;
          case "L": // Line to
            currentX = coords[0] || currentX;
            currentY = coords[1] || currentY;
            const point = new THREE.Vector3(-(currentX - centerX) * 0.001, (currentY - centerY) * 0.001, 0);
            points.push(point);
            // console.log("svg-file-loader: Line to", currentX, currentY, "-> point", point);
            break;
          case "C": // Cubic bezier
            const startX = currentX;
            const startY = currentY;
            currentX = coords[4] || currentX;
            currentY = coords[5] || currentY;

            // console.log("svg-file-loader: Cubic bezier from", startX, startY, "to", currentX, currentY);

            // Add intermediate points for smooth curve
            for (let t = 0; t <= 1; t += 0.1) {
              const x = this.cubicBezier(t, startX, coords[0], coords[2], currentX);
              const y = this.cubicBezier(t, startY, coords[1], coords[3], currentY);

              // Validate the calculated coordinates
              if (isNaN(x) || isNaN(y)) {
                console.warn("svg-file-loader: Invalid bezier coordinates:", { x, y, t, startX, startY, coords });
                continue; // Skip this point
              }

              const curvePoint = new THREE.Vector3(-(x - centerX) * 0.001, (y - centerY) * 0.001, 0);
              points.push(curvePoint);
            }
            break;
        }
      });
    }

    // console.log("svg-file-loader: Total points created:", points.length);

    // Ensure the path is closed by adding the first point at the end if it's not already there
    if (points.length > 2) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const distance = firstPoint.distanceTo(lastPoint);

      // If the path isn't already closed (first and last points are different), close it
      if (distance > 0.001) {
        points.push(firstPoint.clone());
      }
    }

    return points.length > 1 ? new THREE.CatmullRomCurve3(points, true) : null;
  },
  cubicBezier: function (t, p0, p1, p2, p3) {
    // Validate inputs
    if (isNaN(p0) || isNaN(p1) || isNaN(p2) || isNaN(p3)) {
      console.warn("svg-file-loader: Invalid bezier parameters:", { p0, p1, p2, p3 });
      return 0;
    }
    const u = 1 - t;
    const result = u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    return isNaN(result) ? 0 : result;
  },
  createFallbackLine: function () {
    const componentData = this.data;
    console.log("svg-file-loader: Creating fallback line with data:", componentData);

    // Create a simple test line
    const testPoints = [new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)];
    const testCurve = new THREE.CatmullRomCurve3(testPoints);
    const geometry = new THREE.TubeGeometry(testCurve, 8, componentData.lineThickness, 8, false);

    const material = new THREE.MeshStandardMaterial({
      color: componentData.color,
      emissive: componentData.emissive,
      emissiveIntensity: componentData.emissiveIntensity,
      transparent: true,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D("mesh", mesh);
    console.log("svg-file-loader: Fallback line created and attached");
  },
  updateAcrylicSheetLight: function (paths) {
    // console.log("svg-file-loader: updateAcrylicSheetLight called with", paths.length, "paths");

    // Find two different colors from the SVG paths
    const colors = this.findTwoRandomColors(paths);
    if (!colors || colors.length < 2) {
      console.log("svg-file-loader: Not enough colors found in SVG for dual lights");
      return;
    }

    const [colorA, colorB] = colors;
    // console.log("svg-file-loader: Selected colors", colorA, "and", colorB);

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

    // console.log("svg-file-loader: Determined sheet number:", sheetNumber);

    // Update both acrylic sheet lights
    const lightIdA = `sheet-light-${sheetNumber}a`;
    const lightIdB = `sheet-light-${sheetNumber}b`;
    const lightElA = document.querySelector(`#${lightIdA}`);
    const lightElB = document.querySelector(`#${lightIdB}`);

    if (lightElA) {
      // console.log(`svg-file-loader: Updating ${lightIdA} color to ${colorA}`);
      lightElA.setAttribute("rect-area-light", "color", colorA);
    } else {
      console.log(`svg-file-loader: Light ${lightIdA} not found`);
    }

    if (lightElB) {
      // console.log(`svg-file-loader: Updating ${lightIdB} color to ${colorB}`);
      lightElB.setAttribute("rect-area-light", "color", colorB);
    } else {
      console.log(`svg-file-loader: Light ${lightIdB} not found`);
    }
  },
  update: function () {
    // Re-extract colors and regenerate geometry when SVG file changes
    if (this.data.svgFile && this.data.useSvgColor) {
      console.log("svg-file-loader: SVG file changed, re-extracting colors and geometry");
      this.updateColors();
      this.regenerateGeometry();
    }
  },
  tick: function () {
    // Check for SVG content changes on every frame (only if useSvgColor is enabled)
    if (this.data.useSvgColor && this.data.svgFile) {
      const svgDoc = this.data.svgFile.contentDocument;
      if (svgDoc) {
        // Force color and geometry update every few seconds for testing
        if (!this.lastUpdateTime || Date.now() - this.lastUpdateTime > 3000) {
          console.log("svg-file-loader: Periodic color and geometry update check");
          this.lastUpdateTime = Date.now();
          this.updateColors();
          this.regenerateGeometry();
        }
      }
    }
  },
  updateColors: function () {
    // Re-extract colors from the current SVG and update existing materials
    const svgDoc = this.data.svgFile.contentDocument;
    if (!svgDoc) {
      console.log("svg-file-loader: No SVG document found for color update");
      return;
    }

    // Get the LED group that contains all the path meshes
    const ledGroup = this.el.object3D.getObjectByName("ledGroup");
    if (!ledGroup) {
      console.log("svg-file-loader: No LED group found for color update");
      return;
    }

    console.log("svg-file-loader: Found LED group with", ledGroup.children.length, "children");

    // Re-extract paths with colors
    const paths = this.extractPathsFromSVG(svgDoc);
    console.log("svg-file-loader: Re-extracted", paths.length, "paths with colors");

    // Debug: Show all extracted colors
    paths.forEach((path, index) => {
      console.log("svg-file-loader: Path", index, "color:", path.color);
    });

    // Update each existing mesh material with new colors
    ledGroup.children.forEach((pathMesh, index) => {
      if (pathMesh.material && paths[index]) {
        const newColor = paths[index].color;
        if (newColor) {
          console.log("svg-file-loader: Updating path", index, "from", pathMesh.material.color.getHexString(), "to", newColor);
          pathMesh.material.color.set(newColor);
          pathMesh.material.emissive.set(newColor);
          pathMesh.material.needsUpdate = true;
        } else {
          console.log("svg-file-loader: No color found for path", index);
        }
      } else {
        console.log("svg-file-loader: No material or path data for index", index);
      }
    });

    // Update the corresponding acrylic sheet light color
    this.updateAcrylicSheetLight(paths);
  },

  regenerateGeometry: function () {
    // console.log("svg-file-loader: regenerateGeometry called");

    // Clear existing geometry
    const mesh = this.el.object3D;
    if (mesh && mesh.children) {
      mesh.children.forEach((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      mesh.clear();
    }

    // Re-extract paths and colors from SVG
    const svgDoc = this.data.svgFile.contentDocument;
    if (svgDoc) {
      this.paths = this.extractPathsFromSVGDocument(svgDoc);
      // console.log("svg-file-loader: Re-extracted", this.paths.length, "paths for geometry regeneration");
    } else {
      console.log("svg-file-loader: No SVG document found for geometry regeneration");
      return;
    }

    // Regenerate all SVG line geometries using the already-loaded SVG
    this.createSVGLineGeometryFromDocument(svgDoc);

    // console.log("svg-file-loader: Geometry regenerated with new SVG shapes");
  },

  extractPathsFromSVGDocument: function (svgDoc) {
    // console.log("svg-file-loader: Extracting paths from loaded SVG document");
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

    // console.log("svg-file-loader: SVG dimensions:", svgWidth, "x", svgHeight);

    // Find all path elements
    const pathElements = svgDoc.querySelectorAll("path");
    // console.log("svg-file-loader: Found", pathElements.length, "path elements");

    pathElements.forEach((pathElement, index) => {
      const pathData = pathElement.getAttribute("d");
      if (pathData) {
        // console.log("svg-file-loader: Processing path", index, ":", pathData.substring(0, 50) + "...");

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

          // console.log("svg-file-loader: Added path", index, "with color", color);
        } else {
          // console.log("svg-file-loader: Skipped path", index, "- no valid curve generated");
        }
      }
    });

    // Find all line elements
    const lineElements = svgDoc.querySelectorAll("line");
    // console.log("svg-file-loader: Found", lineElements.length, "line elements");

    lineElements.forEach((lineElement, index) => {
      const x1 = parseFloat(lineElement.getAttribute("x1")) || 0;
      const y1 = parseFloat(lineElement.getAttribute("y1")) || 0;
      const x2 = parseFloat(lineElement.getAttribute("x2")) || 0;
      const y2 = parseFloat(lineElement.getAttribute("y2")) || 0;

      // console.log("svg-file-loader: Processing line", index, ":", x1, y1, x2, y2);
      // console.log("svg-file-loader: SVG dimensions:", svgWidth, svgHeight);
      // console.log("svg-file-loader: Center:", svgWidth / 2, svgHeight / 2);

      // Create a simple line curve
      const points = [
        new THREE.Vector3(-(x1 - svgWidth / 2) * 0.001, (y1 - svgHeight / 2) * 0.001, 0),
        new THREE.Vector3(-(x2 - svgWidth / 2) * 0.001, (y2 - svgHeight / 2) * 0.001, 0),
      ];

      // console.log("svg-file-loader: 3D points:", points[0], points[1]);

      const curve = new THREE.CatmullRomCurve3(points);

      // Extract color from the line element
      const color = this.extractColorFromElement(lineElement);

      paths.push({
        curve: curve,
        color: color,
        originalPath: `line(${x1},${y1},${x2},${y2})`,
      });

      // console.log("svg-file-loader: Added line", index, "with color", color);
    });

    // console.log("svg-file-loader: Total paths extracted:", paths.length);
    return paths;
  },

  createSVGLineGeometryFromDocument: function (svgDoc) {
    // console.log("svg-file-loader: Creating geometry from loaded SVG document");

    if (!this.paths || this.paths.length === 0) {
      // console.log("svg-file-loader: No paths available for geometry creation");
      return;
    }

    // Create a group to hold all the LED strips
    const ledGroup = new THREE.Group();
    ledGroup.name = "ledGroup";

    // Process each path
    this.paths.forEach((path, index) => {
      if (!path.curve || !path.curve.points || path.curve.points.length === 0) {
        console.log(`svg-file-loader: Skipping path ${index} - no valid curve data`);
        return;
      }

      const componentData = this.data;

      // Create tube geometry from the curve
      const tubeGeometry = new THREE.TubeGeometry(
        path.curve,
        8, // segments
        componentData.lineThickness || 0.02,
        8, // radial segments
        false // closed
      );

      // Determine material color
      let materialColor = componentData.color || "#ffffff";
      let emissiveColor = componentData.emissive || "#ffffff";
      let emissiveIntensity = componentData.emissiveIntensity || 0.8;

      // Use SVG color if enabled and available
      if (componentData.useSvgColor && path.color) {
        materialColor = path.color;
        emissiveColor = path.color;
        // Boost emissive intensity for colored SVGs
        if (componentData.emissiveIntensity) {
          emissiveIntensity = Math.max(componentData.emissiveIntensity || 0.5, 0.9);
        }
      }

      // Create material with enhanced glow properties
      const material = new THREE.MeshStandardMaterial({
        color: materialColor,
        emissive: emissiveColor,
        emissiveIntensity: emissiveIntensity * 1.5, // Boost for bloom effect
        transparent: true,
        opacity: 0.95, // Slight transparency for glow
        metalness: 0.0,
        roughness: 0.05, // Very smooth for better reflections
        side: THREE.DoubleSide,
      });

      const pathMesh = new THREE.Mesh(tubeGeometry, material);

      // Position colored SVGs slightly in front for better visibility
      if (componentData.useSvgColor && path.color) {
        pathMesh.position.z = 0.01; // Move colored pieces forward
      }

      // Add to LED group
      ledGroup.add(pathMesh);

      // console.log(`svg-file-loader: Created path ${index} with color ${materialColor}`);
    });

    // Attach the LED group to the entity
    this.el.setObject3D("mesh", ledGroup);

    // console.log("svg-file-loader: Created", ledGroup.children.length, "path geometries from SVG document");
  },

  // Manual trigger for debugging - call this from browser console
  forceColorUpdate: function () {
    console.log("svg-file-loader: Manual color update triggered");
    this.updateColors();
  },

  // Manual trigger for geometry regeneration - call this from browser console
  forceGeometryUpdate: function () {
    console.log("svg-file-loader: Manual geometry update triggered");
    this.regenerateGeometry();
  },
  parseColor: function (colorString) {
    if (!colorString) return "#ffffff";

    // Handle CSS class names (like "cls-1", "cls-2")
    if (colorString.startsWith("cls-")) {
      // Map common class names to colors
      const classColors = {
        "cls-1": "#ea33cb", // Pink from your SVG
        "cls-2": "#e5333f", // Red from your SVG
      };
      return classColors[colorString] || "#ffffff";
    }

    // Handle hex colors
    if (colorString.startsWith("#")) {
      return colorString;
    }

    // Handle rgb/rgba colors
    if (colorString.startsWith("rgb")) {
      return colorString;
    }

    // Handle named colors
    const namedColors = {
      red: "#ff0000",
      green: "#00ff00",
      blue: "#0000ff",
      white: "#ffffff",
      black: "#000000",
      yellow: "#ffff00",
      cyan: "#00ffff",
      magenta: "#ff00ff",
    };

    return namedColors[colorString.toLowerCase()] || "#ffffff";
  },
  addLEDStripLight: function (pathMesh, color, curve) {
    // Validate curve
    if (!curve || !curve.points || curve.points.length < 2) {
      console.error("svg-file-loader: Invalid curve for LED lights", curve);
      return;
    }

    // Get or create a light group entity
    let lightGroup = document.querySelector("#led-lights-group");
    if (!lightGroup) {
      lightGroup = document.createElement("a-entity");
      lightGroup.setAttribute("id", "led-lights-group");
      lightGroup.setAttribute("position", "0 0 0");
      this.el.sceneEl.appendChild(lightGroup);
      console.log("svg-file-loader: Created LED lights group entity");
    }

    // Get the SVG group position to offset the lights correctly
    const svgGroup = document.querySelector("#svg-files-group");
    const svgGroupPos = svgGroup ? svgGroup.getAttribute("position") : { x: 0, y: 1.6, z: -2.5 };
    const groupX = svgGroupPos.x || 0;
    const groupY = svgGroupPos.y || 1.6;
    const groupZ = svgGroupPos.z || -2.5;

    // Add exactly 1 light per SVG entity for subtle lighting
    const lightCount = 1;

    // Use the middle point of the curve for the light position
    const middleIndex = Math.floor(curve.points.length / 2);
    const point = curve.points[middleIndex];

    // Add some randomness to make it look more natural
    const x = point.x + (Math.random() - 0.5) * 0.05;
    const y = point.y + (Math.random() - 0.5) * 0.05;
    const z = point.z + (Math.random() - 0.5) * 0.05;

    // Create A-Frame light entity with unique ID
    const lightEl = document.createElement("a-light");
    lightEl.setAttribute("id", `led-light-${++ledLightCounter}`);
    lightEl.setAttribute("type", "point");
    lightEl.setAttribute("color", color);
    lightEl.setAttribute("intensity", "1.2"); // Higher intensity for single light
    lightEl.setAttribute("distance", "3.0"); // Larger distance for better coverage
    lightEl.setAttribute("position", `${x} ${y} ${z}`);

    // Add the light to the light group
    lightGroup.appendChild(lightEl);

    // Log total lights in scene for debugging
    const allLights = this.el.sceneEl.querySelectorAll("a-light");
    const groupLights = lightGroup.querySelectorAll("a-light");
    console.log("svg-file-loader: Added", lightCount, "LED light for subtle lighting");
    console.log("svg-file-loader: Total lights in scene:", allLights.length);
    console.log("svg-file-loader: Lights in LED group:", groupLights.length);
  },
  addAcrylicSheetLight: function (color, sheetIndex) {
    console.log("svg-file-loader: Adding acrylic sheet light", sheetIndex, "with color:", color);

    // Get or create a light group entity
    let lightGroup = document.querySelector("#acrylic-lights-group");
    if (!lightGroup) {
      lightGroup = document.createElement("a-entity");
      lightGroup.setAttribute("id", "acrylic-lights-group");
      lightGroup.setAttribute("position", "0 0 0");
      this.el.sceneEl.appendChild(lightGroup);
      console.log("svg-file-loader: Created acrylic lights group entity");
    }

    // Position lights at the center of each acrylic sheet
    // Sheet positions: 0, -0.5, -1.0, -1.5 (Z coordinates)
    const sheetPositions = [0, -0.5, -1.0, -1.5];
    const zPosition = sheetPositions[sheetIndex] || 0;

    // Position the light at the center of the acrylic sheet
    const x = 0;
    const y = 1.6; // Same height as the sheets
    const z = zPosition - 0.5; // Slightly in front of the sheet

    // Create A-Frame light entity with unique ID
    const lightEl = document.createElement("a-light");
    lightEl.setAttribute("id", `acrylic-light-${sheetIndex}`);
    lightEl.setAttribute("type", "point");
    lightEl.setAttribute("color", color);
    lightEl.setAttribute("intensity", "0.8"); // Moderate intensity
    lightEl.setAttribute("distance", "2.5"); // Good coverage for the sheet
    lightEl.setAttribute("position", `${x} ${y} ${z}`);

    // Add the light to the light group
    lightGroup.appendChild(lightEl);

    // Log total lights in scene for debugging
    const allLights = this.el.sceneEl.querySelectorAll("a-light");
    const groupLights = lightGroup.querySelectorAll("a-light");
    console.log("svg-file-loader: Added acrylic sheet light", sheetIndex, "at position", `${x} ${y} ${z}`);
    console.log("svg-file-loader: Total lights in scene:", allLights.length);
    console.log("svg-file-loader: Acrylic lights:", groupLights.length);
  },

  findLeastWhiteColor: function (paths) {
    if (!paths || paths.length === 0) return null;

    let bestColor = null;
    let bestSaturation = -1;

    for (let i = 0; i < paths.length; i++) {
      const color = paths[i].color;
      if (!color) continue;

      // Convert color to RGB values
      const rgb = this.hexToRgb(color);
      if (!rgb) continue;

      // Calculate saturation (how colorful vs white/gray)
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // Skip very white colors (high values with low saturation)
      const isWhiteish = max > 200 && saturation < 0.3;

      if (!isWhiteish && saturation > bestSaturation) {
        bestSaturation = saturation;
        bestColor = color;
        console.log(`svg-file-loader: Found better color: ${color} (saturation: ${saturation.toFixed(2)})`);
      }
    }

    // If no good color found, return the first non-white color
    if (!bestColor) {
      for (let i = 0; i < paths.length; i++) {
        const color = paths[i].color;
        if (color) {
          const rgb = this.hexToRgb(color);
          if (rgb && !(rgb.r > 200 && rgb.g > 200 && rgb.b > 200)) {
            bestColor = color;
            break;
          }
        }
      }
    }

    return bestColor;
  },
  findRandomColor: function (paths) {
    const validColors = [];

    for (let i = 0; i < paths.length; i++) {
      const color = paths[i].color;
      if (!color) continue;

      const rgb = this.hexToRgb(color);
      if (!rgb) continue;

      // Skip very white colors
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const isWhiteish = max > 200 && saturation < 0.3;

      if (!isWhiteish) {
        validColors.push(color);
        // console.log(`svg-file-loader: Found valid color: ${color} (RGB: ${rgb.r}, ${rgb.g}, ${rgb.b})`);
      }
    }

    if (validColors.length === 0) {
      console.log("svg-file-loader: No valid colors found for random selection");
      return null;
    }

    // Randomly pick one of the valid colors
    const randomIndex = Math.floor(Math.random() * validColors.length);
    const selectedColor = validColors[randomIndex];
    // console.log(`svg-file-loader: Randomly selected color: ${selectedColor} from ${validColors.length} options`);

    return selectedColor;
  },
  findTwoRandomColors: function (paths) {
    const validColors = [];

    for (let i = 0; i < paths.length; i++) {
      const color = paths[i].color;
      if (!color) continue;

      const rgb = this.hexToRgb(color);
      if (!rgb) continue;

      // Skip very white colors
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const isWhiteish = max > 200 && saturation < 0.3;

      if (!isWhiteish) {
        validColors.push(color);
        // console.log(`svg-file-loader: Found valid color: ${color} (RGB: ${rgb.r}, ${rgb.g}, ${rgb.b})`);
      }
    }

    if (validColors.length === 0) {
      console.log("svg-file-loader: No valid colors found for dual selection");
      return null;
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
    // console.log(`svg-file-loader: Randomly selected colors: ${selectedColors[0]} and ${selectedColors[1]} from ${validColors.length} options`);

    return selectedColors;
  },

  hexToRgb: function (hex) {
    // Remove # if present
    hex = hex.replace("#", "");

    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    // Handle 6-digit hex
    if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return { r, g, b };
    }

    return null;
  },
});

// Acrylic plane component with proper mirror reflection
// =============================================================================
// BLOOM POST-PROCESSING COMPONENT
// =============================================================================

AFRAME.registerComponent("bloom-effect", {
  schema: {
    intensity: { type: "number", default: 1.5 },
    threshold: { type: "number", default: 0.8 },
    radius: { type: "number", default: 0.4 },
  },

  init: function () {
    this.setupBloom();
  },

  setupBloom: function () {
    const scene = this.el.sceneEl;
    const renderer = scene.renderer;

    // Create bloom effect using Three.js post-processing
    if (typeof THREE.EffectComposer !== "undefined") {
      this.setupEffectComposer(renderer);
    } else {
      // Fallback: enhance materials for glow effect
      this.enhanceMaterialsForGlow();
    }
  },

  setupEffectComposer: function (renderer) {
    const scene = this.el.sceneEl.object3D;
    const camera = this.el.sceneEl.camera;

    // Create render targets
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

    // Create bloom pass
    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.data.intensity,
      this.data.radius,
      this.data.threshold
    );

    // Create effect composer
    this.composer = new THREE.EffectComposer(renderer);
    this.composer.addPass(new THREE.RenderPass(scene, camera));
    this.composer.addPass(bloomPass);

    // Override render function
    const originalRender = this.el.sceneEl.render;
    this.el.sceneEl.render = () => {
      this.composer.render();
    };

    console.log("bloom-effect: Bloom post-processing enabled");
  },

  enhanceMaterialsForGlow: function () {
    // Fallback: enhance emissive properties for glow effect
    const svgLoaders = this.el.sceneEl.querySelectorAll("[svg-file-loader]");

    svgLoaders.forEach((loader) => {
      const mesh = loader.object3D;
      if (mesh && mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat.emissive) {
              mat.emissiveIntensity = (mat.emissiveIntensity || 0.8) * 2.0;
              mat.needsUpdate = true;
            }
          });
        } else if (mesh.material.emissive) {
          mesh.material.emissiveIntensity = (mesh.material.emissiveIntensity || 0.8) * 2.0;
          mesh.material.needsUpdate = true;
        }
      }
    });

    console.log("bloom-effect: Enhanced materials for glow effect");
  },
});

// =============================================================================
// SIMPLE GLOW EFFECT COMPONENT (Fallback)
// =============================================================================

AFRAME.registerComponent("simple-glow", {
  schema: {
    intensity: { type: "number", default: 1.5 },
    color: { type: "color", default: "#ffffff" },
  },

  init: function () {
    this.addGlowEffect();
  },

  addGlowEffect: function () {
    const mesh = this.el.object3D;
    if (!mesh || !mesh.material) return;

    // Enhance emissive properties for glow
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        if (mat.emissive) {
          mat.emissiveIntensity = (mat.emissiveIntensity || 0.8) * this.data.intensity;
          mat.needsUpdate = true;
        }
      });
    } else if (mesh.material.emissive) {
      mesh.material.emissiveIntensity = (mesh.material.emissiveIntensity || 0.8) * this.data.intensity;
      mesh.material.needsUpdate = true;
    }

    console.log("simple-glow: Applied glow effect to", this.el.tagName);
  },
});

// =============================================================================
// ACRYLIC PLANE COMPONENT
// =============================================================================

AFRAME.registerComponent("acrylic-plane", {
  schema: {
    color: { type: "color", default: "#ffffff" },
    opacity: { type: "number", default: 0.08 },
    metalness: { type: "number", default: 0.0 },
    roughness: { type: "number", default: 0.05 },
    envMapIntensity: { type: "number", default: 1.2 },
  },
  init: function () {
    const data = this.data;

    // Create a box geometry that matches SVG size and is twice as thick
    this.createGeometry();

    // Create a mirror material using MeshPhysicalMaterial for better reflections
    const material = new THREE.MeshPhysicalMaterial({
      color: data.color, // Use schema color (defaults to white)
      opacity: data.opacity, // Use schema opacity (defaults to 0.15)
      transparent: true,
      side: THREE.DoubleSide,
      metalness: data.metalness, // Use schema metalness (defaults to 0.0)
      roughness: data.roughness, // Use schema roughness (defaults to 0.02)
      alphaTest: 0.15,
      depthWrite: false,
      envMapIntensity: data.envMapIntensity * 1.5, // Boost environment mapping
      reflectivity: 1.0, // Maximum reflectivity
      clearcoat: 0.0, // Remove clearcoat to avoid color tinting
      clearcoatRoughness: 0.0,
      transmission: 0.05, // Reduced transmission to prevent milky appearance
      thickness: 0.3,
      ior: 1.5, // Index of refraction for glass
      // Add very subtle emissive glow
      emissive: new THREE.Color(0x050505),
      emissiveIntensity: 0.02,
    });

    // Set up environment mapping for reflections
    this.setupEnvironmentMap(material);

    // Create the mesh with the geometry from createGeometry
    const geometry = this.el.object3DMap.mesh ? this.el.object3DMap.mesh.geometry : new THREE.BoxGeometry(6.0, 6.0, 0.08);
    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D("mesh", mesh);

    console.log("acrylic-plane: Created mirror plane with color", data.color);
  },

  createGeometry: function () {
    // Get scale from parent entities to match SVG size
    let scaleX = 5.0; // Double width again (3.0 * 2)
    let scaleY = 5.0; // Double height again (3.0 * 2)

    let currentParent = this.el.parentElement;
    while (currentParent) {
      const scale = currentParent.getAttribute("scale");
      if (scale) {
        // Handle both string and Vector3 scale attributes
        if (typeof scale === "string") {
          const scaleValues = scale.split(" ").map(parseFloat);
          if (scaleValues.length >= 2) {
            scaleX *= scaleValues[0];
            scaleY *= scaleValues[1];
          }
        } else if (scale && scale.x !== undefined && scale.y !== undefined) {
          // Handle THREE.Vector3 object
          scaleX *= scale.x;
          scaleY *= scale.y;
        }
      }
      currentParent = currentParent.parentElement;
    }

    // Make thickness double again (0.04 * 2 = 0.08)
    const thickness = 0.08;
    const geometry = new THREE.BoxGeometry(scaleX, scaleY, thickness);

    // Update the mesh if it exists
    if (this.el.object3DMap.mesh) {
      this.el.object3DMap.mesh.geometry = geometry;
    } else {
      this.el.setObject3D("mesh", new THREE.Mesh(geometry));
    }
  },

  setupEnvironmentMap: function (material) {
    // Try to use the HDRI sky for realistic reflections
    const hdriSky = document.querySelector("#hdri-sky");

    if (hdriSky && hdriSky.object3D && hdriSky.object3D.children[0]) {
      const skyMesh = hdriSky.object3D.children[0];
      if (skyMesh.material && skyMesh.material.map) {
        // Use the HDRI texture as environment map
        material.envMap = skyMesh.material.map;
        material.envMap.mapping = THREE.EquirectangularReflectionMapping;
        material.needsUpdate = true;
        console.log("acrylic-plane: Using HDRI sky as environment map");
        return;
      }
    }

    // Fallback: disable environment mapping to avoid shader errors
    console.log("acrylic-plane: HDRI not found, disabling environment mapping");
    material.envMap = null;
    material.needsUpdate = true;
  },
});

// =============================================================================
// DEBUG FUNCTIONS
// =============================================================================

// Global debug functions
window.debugSVGColors = function () {
  console.log("=== SVG Color Debug ===");
  const svgLoaders = document.querySelectorAll("[svg-file-loader]");
  console.log("Found", svgLoaders.length, "SVG loaders");

  svgLoaders.forEach((loader, index) => {
    console.log("--- SVG Loader", index, "---");
    console.log("Loader element:", loader);
    console.log("Loader components:", loader.components);

    const component = loader.components["svg-file-loader"];
    if (component) {
      console.log("useSvgColor:", component.data.useSvgColor);
      console.log("SVG file:", component.data.svgFile);
      if (component.data.svgFile) {
        const svgDoc = component.data.svgFile.contentDocument;
        console.log("SVG document:", svgDoc);
        if (svgDoc) {
          const paths = component.extractPathsFromSVG(svgDoc);
          console.log("Extracted paths:", paths.length);
          paths.forEach((path, i) => {
            console.log("  Path", i, "color:", path.color);
          });
        }
      }
      if (component.forceColorUpdate) {
        component.forceColorUpdate();
      } else {
        console.log("forceColorUpdate method not found");
      }
    } else {
      console.log("svg-file-loader component not found");
    }
  });
};

// Simple test function
window.testSVG = function () {
  console.log("Test function called");
  const svgLoaders = document.querySelectorAll("[svg-file-loader]");
  console.log("Found SVG loaders:", svgLoaders.length);
  return svgLoaders.length;
};

// Test acrylic sheet light updates
window.testAcrylicLights = function () {
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

// Debug GLB materials function
window.debugGLBMaterials = function () {
  console.log("=== GLB Material Debug ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let materialCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.material) {
      materialCount++;
      console.log(`--- Material ${materialCount} ---`);
      console.log("Mesh name:", child.name || "unnamed");
      console.log("Material type:", child.material.type);
      console.log("Opacity:", child.material.opacity);
      console.log("Transparent:", child.material.transparent);
      console.log("Alpha test:", child.material.alphaTest);
      console.log("Alpha map:", child.material.alphaMap ? "Yes" : "No");
      console.log("Color:", child.material.color.getHexString());
      console.log("Metalness:", child.material.metalness);
      console.log("Roughness:", child.material.roughness);
      console.log("Emissive:", child.material.emissive.getHexString());
      console.log("Emissive intensity:", child.material.emissiveIntensity);
      console.log("Side:", child.material.side);
      console.log("Depth write:", child.material.depthWrite);
      console.log("Blending:", child.material.blending);
      console.log("---");
    }
  });

  console.log(`Total materials found: ${materialCount}`);
};

// Force GLB material enhancement
window.enhanceGLBMaterials = function () {
  console.log("=== Forcing GLB Material Enhancement ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const enhancer = glbEntity.components["glb-material-enhancer"];
  if (enhancer) {
    enhancer.enhanceMaterials();
    console.log("GLB materials enhanced!");
  } else {
    console.log("GLB material enhancer component not found");
  }
};

// Make specific materials transparent by name pattern
window.makeTransparentByPattern = function (pattern, opacity = 0.5) {
  console.log(`=== Making materials transparent by pattern: "${pattern}" ===`);
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let count = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.material && child.name.toLowerCase().includes(pattern.toLowerCase())) {
      child.material.transparent = true;
      child.material.opacity = opacity;
      child.material.alphaTest = 0.1;
      child.material.depthWrite = false;
      child.material.needsUpdate = true;
      count++;
      console.log(`Made transparent: ${child.name} (opacity: ${opacity})`);
    }
  });

  console.log(`Made ${count} materials transparent`);
};

// Make all materials transparent
window.makeAllTransparent = function (opacity = 0.5) {
  console.log(`=== Making all materials transparent (opacity: ${opacity}) ===`);
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let count = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.transparent = true;
      child.material.opacity = opacity;
      child.material.alphaTest = 0.1;
      child.material.depthWrite = false;
      child.material.needsUpdate = true;
      count++;
    }
  });

  console.log(`Made ${count} materials transparent`);
};

// Find materials by name pattern
window.findMaterialsByPattern = function (pattern) {
  console.log(`=== Finding materials by pattern: "${pattern}" ===`);
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const matches = [];
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.name.toLowerCase().includes(pattern.toLowerCase())) {
      matches.push({
        name: child.name,
        material: child.material,
        opacity: child.material.opacity,
        transparent: child.material.transparent,
      });
    }
  });

  console.log(`Found ${matches.length} matching materials:`);
  matches.forEach((match, index) => {
    console.log(`${index + 1}. ${match.name} - opacity: ${match.opacity}, transparent: ${match.transparent}`);
  });

  return matches;
};

// Quick function to make GLAS INNE materials transparent
window.makeGlassTransparent = function (opacity = 0.3) {
  console.log(`=== Making GLAS INNE materials transparent (opacity: ${opacity}) ===`);
  return makeTransparentByPattern("GLAS INNE", opacity);
};

// Find and make Cool glass materials transparent
window.findCoolGlass = function () {
  console.log("=== Finding Cool glass materials ===");
  const patterns = ["cool", "glass", "cool glass", "cool_glass"];

  patterns.forEach((pattern) => {
    console.log(`\nSearching for pattern: "${pattern}"`);
    findMaterialsByPattern(pattern);
  });
};

// Make Cool glass materials transparent
window.makeCoolGlassTransparent = function (opacity = 0.3) {
  console.log(`=== Making Cool glass materials transparent (opacity: ${opacity}) ===`);
  const patterns = ["cool", "glass", "cool glass", "cool_glass"];
  let totalCount = 0;

  patterns.forEach((pattern) => {
    const count = makeTransparentByPattern(pattern, opacity);
    totalCount += count;
  });

  console.log(`Total materials made transparent: ${totalCount}`);
  return totalCount;
};

// Fix texture scaling for GROUND object
window.fixGroundTexture = function () {
  console.log("=== Fixing GROUND texture scaling ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let fixedCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.name === "GROUND" && child.material) {
      console.log("Found GROUND object, fixing texture scaling...");

      // Fix texture scaling by adjusting UV scale
      if (child.material.map) {
        child.material.map.wrapS = THREE.RepeatWrapping;
        child.material.map.wrapT = THREE.RepeatWrapping;
        child.material.map.repeat.set(1, 1); // Reset to normal scale
        child.material.map.needsUpdate = true;
        console.log("Fixed texture scaling for GROUND material");
        fixedCount++;
      }

      // Also check for other texture maps
      if (child.material.normalMap) {
        child.material.normalMap.wrapS = THREE.RepeatWrapping;
        child.material.normalMap.wrapT = THREE.RepeatWrapping;
        child.material.normalMap.repeat.set(1, 1);
        child.material.normalMap.needsUpdate = true;
      }

      if (child.material.roughnessMap) {
        child.material.roughnessMap.wrapS = THREE.RepeatWrapping;
        child.material.roughnessMap.wrapT = THREE.RepeatWrapping;
        child.material.roughnessMap.repeat.set(1, 1);
        child.material.roughnessMap.needsUpdate = true;
      }

      if (child.material.metalnessMap) {
        child.material.metalnessMap.wrapS = THREE.RepeatWrapping;
        child.material.metalnessMap.wrapT = THREE.RepeatWrapping;
        child.material.metalnessMap.repeat.set(1, 1);
        child.material.metalnessMap.needsUpdate = true;
      }

      child.material.needsUpdate = true;
    }
  });

  console.log(`Fixed texture scaling for ${fixedCount} GROUND materials`);
  return fixedCount;
};

// Find GROUND object and its materials
window.findGround = function () {
  console.log("=== Finding GROUND object and materials ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let groundCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.name === "GROUND") {
      groundCount++;
      console.log(`--- GROUND Object ${groundCount} ---`);
      console.log("Mesh name:", child.name);
      console.log("Material type:", child.material.type);
      console.log("Has diffuse map:", child.material.map ? "Yes" : "No");
      if (child.material.map) {
        console.log("Texture repeat:", child.material.map.repeat);
        console.log("Texture wrap S:", child.material.map.wrapS);
        console.log("Texture wrap T:", child.material.map.wrapT);
      }
      console.log("Has normal map:", child.material.normalMap ? "Yes" : "No");
      console.log("Has roughness map:", child.material.roughnessMap ? "Yes" : "No");
      console.log("Has metalness map:", child.material.metalnessMap ? "Yes" : "No");
      console.log("---");
    }
  });

  console.log(`Found ${groundCount} GROUND objects`);
  return groundCount;
};

// Advanced floor texture fixing
window.fixFloorAdvanced = function () {
  console.log("=== Advanced floor texture fixing ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let fixedCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (
      child.isMesh &&
      (child.name === "GROUND" || child.name.includes("GROUND") || child.name.includes("floor") || child.name.includes("Floor"))
    ) {
      console.log(`Fixing floor texture for: ${child.name}`);

      // Reset all texture properties
      if (child.material.map) {
        child.material.map.wrapS = THREE.RepeatWrapping;
        child.material.map.wrapT = THREE.RepeatWrapping;
        child.material.map.repeat.set(1, 1);
        child.material.map.offset.set(0, 0);
        child.material.map.center.set(0, 0);
        child.material.map.rotation = 0;
        child.material.map.needsUpdate = true;
        console.log("Fixed diffuse map");
      }

      // Fix normal map
      if (child.material.normalMap) {
        child.material.normalMap.wrapS = THREE.RepeatWrapping;
        child.material.normalMap.wrapT = THREE.RepeatWrapping;
        child.material.normalMap.repeat.set(1, 1);
        child.material.normalMap.offset.set(0, 0);
        child.material.normalMap.needsUpdate = true;
        console.log("Fixed normal map");
      }

      // Fix roughness map
      if (child.material.roughnessMap) {
        child.material.roughnessMap.wrapS = THREE.RepeatWrapping;
        child.material.roughnessMap.wrapT = THREE.RepeatWrapping;
        child.material.roughnessMap.repeat.set(1, 1);
        child.material.roughnessMap.offset.set(0, 0);
        child.material.roughnessMap.needsUpdate = true;
        console.log("Fixed roughness map");
      }

      // Fix metalness map
      if (child.material.metalnessMap) {
        child.material.metalnessMap.wrapS = THREE.RepeatWrapping;
        child.material.metalnessMap.wrapT = THREE.RepeatWrapping;
        child.material.metalnessMap.repeat.set(1, 1);
        child.material.metalnessMap.offset.set(0, 0);
        child.material.metalnessMap.needsUpdate = true;
        console.log("Fixed metalness map");
      }

      // Reset material properties
      child.material.needsUpdate = true;
      fixedCount++;
    }
  });

  console.log(`Fixed ${fixedCount} floor objects`);
  return fixedCount;
};

// Try different texture scales
window.testFloorScales = function () {
  console.log("=== Testing different floor texture scales ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const scales = [0.1, 0.5, 1, 2, 5, 10];
  let currentScale = 0;

  const applyScale = (scale) => {
    glbEntity.object3D.traverse((child) => {
      if (child.isMesh && (child.name === "GROUND" || child.name.includes("GROUND"))) {
        if (child.material.map) {
          child.material.map.repeat.set(scale, scale);
          child.material.map.needsUpdate = true;
        }
        child.material.needsUpdate = true;
      }
    });
    console.log(`Applied scale: ${scale}x`);
  };

  // Cycle through scales every 2 seconds
  const interval = setInterval(() => {
    if (currentScale < scales.length) {
      applyScale(scales[currentScale]);
      currentScale++;
    } else {
      clearInterval(interval);
      console.log("Scale testing complete. Use fixFloorAdvanced() to reset to normal.");
    }
  }, 2000);

  console.log("Testing scales: 0.1x, 0.5x, 1x, 2x, 5x, 10x (2 seconds each)");
  return interval;
};

// Find all floor-related objects
window.findAllFloors = function () {
  console.log("=== Finding all floor-related objects ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const floorObjects = [];
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase();
      if (
        name.includes("ground") ||
        name.includes("floor") ||
        name.includes("pavement") ||
        name.includes("concrete") ||
        name.includes("asphalt")
      ) {
        floorObjects.push({
          name: child.name,
          material: child.material.type,
          hasDiffuse: !!child.material.map,
          hasNormal: !!child.material.normalMap,
          hasRoughness: !!child.material.roughnessMap,
          hasMetalness: !!child.material.metalnessMap,
        });
      }
    }
  });

  console.log(`Found ${floorObjects.length} floor-related objects:`);
  floorObjects.forEach((obj, index) => {
    console.log(
      `${index + 1}. ${obj.name} (${obj.material}) - Maps: Diffuse:${obj.hasDiffuse} Normal:${obj.hasNormal} Roughness:${
        obj.hasRoughness
      } Metalness:${obj.hasMetalness}`
    );
  });

  return floorObjects;
};

// Aggressive GROUND texture fix with UV manipulation
window.fixGroundUV = function () {
  console.log("=== Aggressive GROUND UV texture fix ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let fixedCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.name === "GROUND") {
      console.log(`Fixing GROUND UV for: ${child.name}`);

      // Get the geometry and fix UV coordinates
      if (child.geometry && child.geometry.attributes.uv) {
        const uvAttribute = child.geometry.attributes.uv;
        const uvArray = uvAttribute.array;

        // Scale down UV coordinates to make texture repeat more
        for (let i = 0; i < uvArray.length; i++) {
          uvArray[i] = uvArray[i] * 10; // Scale up UV to make texture smaller/repeat more
        }

        uvAttribute.needsUpdate = true;
        console.log("Fixed UV coordinates");
      }

      // Also fix texture repeat
      if (child.material.map) {
        child.material.map.wrapS = THREE.RepeatWrapping;
        child.material.map.wrapT = THREE.RepeatWrapping;
        child.material.map.repeat.set(10, 10); // Make texture repeat 10x10
        child.material.map.needsUpdate = true;
        console.log("Set texture repeat to 10x10");
      }

      child.material.needsUpdate = true;
      fixedCount++;
    }
  });

  console.log(`Fixed UV for ${fixedCount} GROUND objects`);
  return fixedCount;
};

// Test different UV scales for GROUND
window.testGroundUVScales = function () {
  console.log("=== Testing different GROUND UV scales ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const scales = [1, 5, 10, 20, 50, 100];
  let currentScale = 0;

  const applyUVScale = (scale) => {
    glbEntity.object3D.traverse((child) => {
      if (child.isMesh && child.name === "GROUND") {
        // Fix UV coordinates
        if (child.geometry && child.geometry.attributes.uv) {
          const uvAttribute = child.geometry.attributes.uv;
          const uvArray = uvAttribute.array;

          for (let i = 0; i < uvArray.length; i++) {
            uvArray[i] = uvArray[i] * scale;
          }

          uvAttribute.needsUpdate = true;
        }

        // Fix texture repeat
        if (child.material.map) {
          child.material.map.repeat.set(scale, scale);
          child.material.map.needsUpdate = true;
        }

        child.material.needsUpdate = true;
      }
    });
    console.log(`Applied UV scale: ${scale}x`);
  };

  // Cycle through scales every 3 seconds
  const interval = setInterval(() => {
    if (currentScale < scales.length) {
      applyUVScale(scales[currentScale]);
      currentScale++;
    } else {
      clearInterval(interval);
      console.log("UV scale testing complete. Use fixGroundUV() to apply final scale.");
    }
  }, 3000);

  console.log("Testing UV scales: 1x, 5x, 10x, 20x, 50x, 100x (3 seconds each)");
  return interval;
};

// Force GLAS INNE transparency
window.forceGlassTransparency = function () {
  console.log("=== Forcing GLAS INNE transparency ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let transparentCount = 0;
  let allMeshes = [];

  // First, let's see all mesh names
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh) {
      allMeshes.push(child.name);
    }
  });

  console.log("All mesh names:", allMeshes);

  // Look for glass-related names
  const glassPatterns = ["GLAS", "glass", "Glass", "GLAS INNE", "glas inne", "Glass Inne"];

  glbEntity.object3D.traverse((child) => {
    if (child.isMesh) {
      const name = child.name;
      const isGlass = glassPatterns.some((pattern) => name.includes(pattern));

      if (isGlass) {
        console.log(`Found glass object: ${name}`);
        console.log(`Original material:`, child.material);
        console.log(`Original opacity:`, child.material.opacity);
        console.log(`Original transparent:`, child.material.transparent);

        // Force transparency
        child.material.transparent = true;
        child.material.opacity = 0.3;
        child.material.alphaTest = 0.1;
        child.material.depthWrite = false;
        child.material.blending = THREE.NormalBlending;
        child.material.needsUpdate = true;

        console.log(`Made transparent: ${name} - opacity: ${child.material.opacity}, transparent: ${child.material.transparent}`);
        transparentCount++;
      }
    }
  });

  console.log(`Made ${transparentCount} glass objects transparent`);
  return transparentCount;
};

// Find all glass-related objects
window.findAllGlass = function () {
  console.log("=== Finding all glass-related objects ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const glassObjects = [];
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase();
      if (name.includes("glas") || name.includes("glass") || name.includes("window") || name.includes("transparent")) {
        glassObjects.push({
          name: child.name,
          material: child.material.type,
          opacity: child.material.opacity,
          transparent: child.material.transparent,
          hasDiffuse: !!child.material.map,
        });
      }
    }
  });

  console.log(`Found ${glassObjects.length} glass-related objects:`);
  glassObjects.forEach((obj, index) => {
    console.log(`${index + 1}. ${obj.name} (${obj.material}) - opacity: ${obj.opacity}, transparent: ${obj.transparent}`);
  });

  return glassObjects;
};

// Make ALL materials transparent for testing
window.makeAllTransparentTest = function (opacity = 0.5) {
  console.log(`=== Making ALL materials transparent for testing (opacity: ${opacity}) ===`);
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let transparentCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.material) {
      console.log(`Making transparent: ${child.name}`);
      child.material.transparent = true;
      child.material.opacity = opacity;
      child.material.alphaTest = 0.1;
      child.material.depthWrite = false;
      child.material.blending = THREE.NormalBlending;
      child.material.needsUpdate = true;
      transparentCount++;
    }
  });

  console.log(`Made ${transparentCount} materials transparent`);
  return transparentCount;
};

// Reset all materials to opaque
window.resetAllMaterials = function () {
  console.log("=== Resetting all materials to opaque ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let resetCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.transparent = false;
      child.material.opacity = 1.0;
      child.material.alphaTest = 0;
      child.material.depthWrite = true;
      child.material.needsUpdate = true;
      resetCount++;
    }
  });

  console.log(`Reset ${resetCount} materials to opaque`);
  return resetCount;
};

// Quick function for Glass objects specifically
window.makeGlassTransparent = function (opacity = 0.3) {
  console.log(`=== Making Glass objects transparent (opacity: ${opacity}) ===`);
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  let transparentCount = 0;
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh && (child.name === "Glass" || child.name === "GLASS")) {
      console.log(`Making transparent: ${child.name}`);
      child.material.transparent = true;
      child.material.opacity = opacity;
      child.material.alphaTest = 0.1;
      child.material.depthWrite = false;
      child.material.blending = THREE.NormalBlending;
      child.material.needsUpdate = true;
      transparentCount++;
    }
  });

  console.log(`Made ${transparentCount} Glass objects transparent`);
  return transparentCount;
};

// Force GLB material enhancer to run again
window.forceGLBEnhancement = function () {
  console.log("=== Forcing GLB material enhancement ===");
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return;
  }

  const enhancer = glbEntity.components["glb-material-enhancer"];
  if (enhancer) {
    console.log("Running GLB material enhancer...");
    enhancer.enhanceMaterials();
    console.log("GLB material enhancement complete!");
  } else {
    console.log("GLB material enhancer component not found");
  }
};

// Global debug function to regenerate all SVG geometries
window.regenerateAllSVGs = function () {
  const svgLoaders = document.querySelectorAll("[svg-file-loader]");
  console.log("Regenerating geometry for", svgLoaders.length, "SVG loaders");

  svgLoaders.forEach((loader, index) => {
    if (loader.components["svg-file-loader"]) {
      console.log("Regenerating SVG", index + 1);
      loader.components["svg-file-loader"].forceGeometryUpdate();
    }
  });

  console.log("All SVG geometries regenerated");
};

// Make specific objects non-reflective
window.makeNonReflective = function (objectName) {
  console.log(`=== Making non-reflective: ${objectName} ===`);
  const glbEntity = document.querySelector("[gltf-model]");

  if (!glbEntity) {
    console.log("No GLB model found");
    return 0;
  }

  // First, let's see what objects exist
  console.log("Available objects in GLB:");
  glbEntity.object3D.traverse((child) => {
    if (child.isMesh) {
      console.log(`- ${child.name}`);
    }
  });

  const enhancer = glbEntity.components["glb-material-enhancer"];
  if (enhancer) {
    return enhancer.makeNonReflective(objectName);
  } else {
    console.log("GLB material enhancer component not found");
    return 0;
  }
};

// Simple keyboard camera controls
AFRAME.registerComponent("keyboard-camera", {
  schema: {
    moveSpeed: { type: "number", default: 0.1 },
    lookSpeed: { type: "number", default: 0.05 },
  },
  init: function () {
    this.keys = {};
    this.setupEventListeners();
    console.log("keyboard-camera: Initialized");
  },
  setupEventListeners: function () {
    // Keyboard events
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Mouse look - disabled to prevent white flash
    // let isMouseDown = false;
    // let lastMouseX = 0;
    // let lastMouseY = 0;

    // this.el.sceneEl.addEventListener("mousedown", (e) => {
    //   isMouseDown = true;
    //   lastMouseX = e.clientX;
    //   lastMouseY = e.clientY;
    // });

    // this.el.sceneEl.addEventListener("mouseup", () => {
    //   isMouseDown = false;
    // });

    // this.el.sceneEl.addEventListener("mousemove", (e) => {
    //   if (isMouseDown) {
    //     const deltaX = e.clientX - lastMouseX;
    //     const deltaY = e.clientY - lastMouseY;

    //     this.rotateCamera(deltaX * this.data.lookSpeed, deltaY * this.data.lookSpeed);

    //     lastMouseX = e.clientX;
    //     lastMouseY = e.clientY;
    //   }
    // });
  },
  tick: function () {
    this.handleMovement();
  },
  handleMovement: function () {
    const camera = this.el.object3D;
    const moveSpeed = this.data.moveSpeed;

    // Forward/Backward (W/S)
    if (this.keys["KeyW"]) {
      camera.translateZ(-moveSpeed);
    }
    if (this.keys["KeyS"]) {
      camera.translateZ(moveSpeed);
    }

    // Left/Right (A/D)
    if (this.keys["KeyA"]) {
      camera.translateX(-moveSpeed);
    }
    if (this.keys["KeyD"]) {
      camera.translateX(moveSpeed);
    }

    // Up/Down (Q/E)
    if (this.keys["KeyQ"]) {
      camera.translateY(moveSpeed);
    }
    if (this.keys["KeyE"]) {
      camera.translateY(-moveSpeed);
    }

    // Arrow keys for looking
    if (this.keys["ArrowLeft"]) {
      this.rotateCamera(-this.data.lookSpeed * 10, 0);
    }
    if (this.keys["ArrowRight"]) {
      this.rotateCamera(this.data.lookSpeed * 10, 0);
    }
    if (this.keys["ArrowUp"]) {
      this.rotateCamera(0, -this.data.lookSpeed * 10);
    }
    if (this.keys["ArrowDown"]) {
      this.rotateCamera(0, this.data.lookSpeed * 10);
    }
  },
  rotateCamera: function (deltaX, deltaY) {
    const camera = this.el.object3D;

    // Get the look-at target from the component data
    const lookAtTarget = this.el.getAttribute("look-at");
    if (lookAtTarget) {
      // Rotate around the target point instead of in place
      const target = new THREE.Vector3(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
      const cameraPos = camera.position.clone();

      // Calculate rotation around target
      const radius = cameraPos.distanceTo(target);
      const currentAngleY = Math.atan2(cameraPos.x - target.x, cameraPos.z - target.z);
      const currentAngleX = Math.asin((cameraPos.y - target.y) / radius);

      // Apply rotation
      const newAngleY = currentAngleY - deltaX;
      const newAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, currentAngleX - deltaY));

      // Calculate new position
      const newX = target.x + radius * Math.sin(newAngleY) * Math.cos(newAngleX);
      const newY = target.y + radius * Math.sin(newAngleX);
      const newZ = target.z + radius * Math.cos(newAngleY) * Math.cos(newAngleX);

      camera.position.set(newX, newY, newZ);
      camera.lookAt(target);
    } else {
      // Fallback to simple rotation
      camera.rotation.y -= deltaX;
      camera.rotation.x -= deltaY;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
  },
});

// Simple camera controls
AFRAME.registerComponent("camera-controls", {
  init: function () {
    this.camera = this.el.camera;
    this.rig = this.el.parentEl;

    // Add mouse look controls
    this.el.setAttribute("look-controls", "enabled: true");

    // Add keyboard controls
    this.keys = {};
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.tick = this.tick.bind(this);

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  },

  onKeyDown: function (event) {
    this.keys[event.code] = true;
  },

  onKeyUp: function (event) {
    this.keys[event.code] = false;
  },

  tick: function () {
    if (!this.rig) return;

    const moveSpeed = 0.03;
    const direction = new THREE.Vector3();

    if (this.keys["KeyW"]) direction.z -= moveSpeed;
    if (this.keys["KeyS"]) direction.z += moveSpeed;
    if (this.keys["KeyA"]) direction.x -= moveSpeed;
    if (this.keys["KeyD"]) direction.x += moveSpeed;
    if (this.keys["KeyQ"]) direction.y += moveSpeed;
    if (this.keys["KeyE"]) direction.y -= moveSpeed;

    if (direction.length() > 0) {
      this.rig.object3D.position.add(direction);
    }
  },

  remove: function () {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  },
});

// Average visible tex color -> light color
AFRAME.registerComponent("texture-light", {
  schema: { texture: { type: "selector" } },
  init: function () {
    var imgEl = this.data.texture;
    if (!imgEl) {
      console.warn("texture-light: No texture selector provided.");
      return;
    }
    var onLoad = () => this.sampleTexture(imgEl);
    this._onLoad = onLoad;
    if (!imgEl.complete || !imgEl.naturalWidth) {
      imgEl.addEventListener("load", onLoad);
    } else {
      onLoad();
    }
  },
  remove: function () {
    if (this.data.texture && this._onLoad) {
      this.data.texture.removeEventListener("load", this._onLoad);
    }
  },
  sampleTexture: function (imgEl) {
    var canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    try {
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("texture-light: Unable to access image data. Possibly CORS.", e);
      return;
    }
    var data = imageData.data;
    var r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (var i = 0; i < data.length; i += 4) {
      var alpha = data[i + 3] / 255;
      if (alpha > 0.1) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    if (!count) count = 1;
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    var color = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    this.el.setAttribute("light", "color", color);
    // Slightly scale intensity by perceived luminance
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    this.el.setAttribute("light", "intensity", 1.0 + lum * 0.5);
  },
});

// Optional focal tweak
AFRAME.registerComponent("focal-changer", {
  init: function () {
    this.el.addEventListener("loaded", () => {
      const camera = this.el.camera;
      if (camera && camera.setFocalLength) camera.setFocalLength(50);
    });
  },
});

// ---------- Helpers ----------
function applyBloomDefaults() {
  // Set punchier bloom on whichever camera is active (free or fixed)
  const cams = [document.querySelector("#freeCam"), document.querySelector("#fixedCamera")].filter(Boolean);

  cams.forEach((camEl) => {
    camEl.setAttribute("bloom", "threshold: 0.02; strength: 2.8; radius: 0.7");
  });
}

function installCameraToggle() {
  // Safer toggle: flip camera.active; let A-Frame handle the active camera
  document.addEventListener("keydown", function (evt) {
    if ((evt.key || "").toLowerCase() !== "c") return;

    const freeCamEl = document.querySelector("#freeCam");
    const fixedCamEl = document.querySelector("#fixedCamera");
    if (!freeCamEl || !fixedCamEl) return;

    const freeActive = !!freeCamEl.getAttribute("camera").active;
    const fixedActive = !!fixedCamEl.getAttribute("camera").active;

    if (freeActive && !fixedActive) {
      freeCamEl.setAttribute("camera", "active", false);
      fixedCamEl.setAttribute("camera", "active", true);
      console.log("Switched to fixed camera");
    } else {
      fixedCamEl.setAttribute("camera", "active", false);
      freeCamEl.setAttribute("camera", "active", true);
      console.log("Switched to free camera");
    }
  });
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  // Ensure the scene can and does receive keyboard focus (for WASD)
  applyBloomDefaults();
  installCameraToggle();

  // Debug lighting system removed to reduce console spam
});

// Always look-at component already defined at line 7
