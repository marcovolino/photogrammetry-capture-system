import * as THREE from "../vendor/three.module.min.js";

const MODEL_URL = new URL("../model/model.obj", import.meta.url);
const DEFAULT_TEXTURE_RESOLUTION = "4k";
const TEXTURE_URLS = {
  "4k": new URL("../model/model_4k.jpg", import.meta.url),
  "8k": new URL("../model/model_8k.jpg", import.meta.url),
};
const DEFAULT_TARGET = new THREE.Vector3(0, 1.4, 0);
const DEFAULT_CAMERA_DISTANCE = 5.7;
const MIN_CAMERA_DISTANCE = 0.85;
const MAX_CAMERA_DISTANCE = 9;
const ZOOM_SPEED = 0.0012;
const TAP_MOVE_LIMIT = 12;

const container = document.querySelector("[data-result-viewer]");

if (container) {
  const canvas = container.querySelector("canvas");
  const resetButton = container.querySelector("[data-reset-view]");
  const fullscreenButton = container.querySelector("[data-fullscreen-view]");
  const modeButtons = Array.from(container.querySelectorAll("[data-view-mode]"));
  const textureButtons = Array.from(container.querySelectorAll("[data-texture-resolution]"));
  const fallback = container.querySelector("[data-viewer-fallback]");
  const frame = container.querySelector(".result-viewer__frame");

  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x101214, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x101214, 8, 18);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const target = DEFAULT_TARGET.clone();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const state = {
      azimuth: -0.45,
      elevation: 0.28,
      distance: DEFAULT_CAMERA_DISTANCE,
      lastX: 0,
      lastY: 0,
      autoRotate: true,
      viewMode: "texture",
      textureResolution: DEFAULT_TEXTURE_RESOLUTION,
    };

    let loadedMesh = null;
    let loadedMaterials = null;
    let lastPinchDistance = 0;
    let multiTouchActive = false;
    const activePointers = new Map();
    const textureCache = new Map();

    const model = new THREE.Group();
    scene.add(model);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 96),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.055,
        transparent: true,
        depthWrite: false,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.9);
    keyLight.position.set(-3.5, 5.2, 4.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9fc7ff, 1.05);
    fillLight.position.set(4, 2.8, -4);
    scene.add(fillLight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));

    loadTexturedObj(MODEL_URL, loadCachedTexture(DEFAULT_TEXTURE_RESOLUTION, textureCache)).then((loadedModel) => {
      model.clear();
      model.add(loadedModel.group);
      loadedMesh = loadedModel.mesh;
      loadedMaterials = loadedModel.materials;
      applyViewMode(state.viewMode, loadedMesh, loadedMaterials);
      if (state.textureResolution !== DEFAULT_TEXTURE_RESOLUTION) {
        applyTextureResolution(state.textureResolution);
      }
      frame?.classList.add("result-viewer__frame--loaded");
    }).catch((error) => {
      container.classList.add("result-viewer--error");
      if (fallback) {
        fallback.textContent = "The 3D model could not be loaded.";
      }
      console.error(error);
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.autoRotate = false;
      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
      });
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      safelySetPointerCapture(canvas, event.pointerId);
      if (activePointers.size === 2) {
        multiTouchActive = true;
        lastPinchDistance = getPointerDistance(activePointers);
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      const activePointer = activePointers.get(event.pointerId);
      if (!activePointer) {
        return;
      }

      event.preventDefault();
      const previousX = activePointer.x;
      const previousY = activePointer.y;
      activePointer.x = event.clientX;
      activePointer.y = event.clientY;

      if (activePointers.size >= 2) {
        const pinchDistance = getPointerDistance(activePointers);
        if (lastPinchDistance > 0 && pinchDistance > 0) {
          state.distance = clamp(
            state.distance * (lastPinchDistance / pinchDistance),
            MIN_CAMERA_DISTANCE,
            MAX_CAMERA_DISTANCE,
          );
        }
        lastPinchDistance = pinchDistance;
        return;
      }

      const dx = event.clientX - previousX;
      const dy = event.clientY - previousY;
      state.azimuth -= dx * 0.008;
      state.elevation = clamp(state.elevation + dy * 0.006, -0.65, 0.95);
      state.lastX = event.clientX;
      state.lastY = event.clientY;
    });

    canvas.addEventListener("pointerup", (event) => {
      const activePointer = activePointers.get(event.pointerId);
      const wasSingleTouchTap = event.pointerType !== "mouse"
        && activePointers.size === 1
        && activePointer
        && !multiTouchActive
        && getMoveDistance(activePointer, event.clientX, event.clientY) <= TAP_MOVE_LIMIT;

      activePointers.delete(event.pointerId);
      safelyReleasePointerCapture(canvas, event.pointerId);
      if (activePointers.size < 2) {
        lastPinchDistance = 0;
      }
      if (activePointers.size === 0) {
        multiTouchActive = false;
      }
      if (activePointers.size === 1) {
        const [remainingPointer] = activePointers.values();
        state.lastX = remainingPointer.x;
        state.lastY = remainingPointer.y;
      }
      if (wasSingleTouchTap) {
        focusAtClientPoint(event.clientX, event.clientY);
      }
    });

    canvas.addEventListener("pointercancel", (event) => {
      activePointers.delete(event.pointerId);
      safelyReleasePointerCapture(canvas, event.pointerId);
      if (activePointers.size < 2) {
        lastPinchDistance = 0;
      }
      if (activePointers.size === 0) {
        multiTouchActive = false;
      }
    });

    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      state.autoRotate = false;
      const zoomFactor = Math.exp(event.deltaY * ZOOM_SPEED);
      state.distance = clamp(
        state.distance * zoomFactor,
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      );
    }, { passive: false });

    canvas.addEventListener("dblclick", (event) => {
      focusAtClientPoint(event.clientX, event.clientY);
    });

    resetButton?.addEventListener("click", () => {
      state.azimuth = -0.45;
      state.elevation = 0.28;
      state.distance = DEFAULT_CAMERA_DISTANCE;
      state.autoRotate = true;
      target.copy(DEFAULT_TARGET);
      frame?.classList.remove("result-viewer__frame--focused");
    });

    fullscreenButton?.addEventListener("click", () => {
      toggleFullscreen(container, fullscreenButton, resize);
    });

    document.addEventListener("fullscreenchange", () => {
      updateFullscreenState(container, fullscreenButton, resize);
    });

    document.addEventListener("webkitfullscreenchange", () => {
      updateFullscreenState(container, fullscreenButton, resize);
    });

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.viewMode;
        state.viewMode = mode;
        setActiveButtons(modeButtons, mode, "viewMode");
        if (loadedMesh && loadedMaterials) {
          applyViewMode(mode, loadedMesh, loadedMaterials);
        }
      });
    });

    textureButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyTextureResolution(button.dataset.textureResolution);
      });
    });

    setActiveButtons(modeButtons, state.viewMode, "viewMode");
    setActiveButtons(textureButtons, state.textureResolution, "textureResolution");

    resize();
    renderer.setAnimationLoop(render);

    function render() {
      if (state.autoRotate) {
        state.azimuth -= 0.002;
      }

      updateCamera(camera, target, state);
      renderer.render(scene, camera);
    }

    function resize() {
      const frameRect = frame?.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(frameRect?.width || canvasRect.width));
      const height = Math.max(1, Math.floor(canvasRect.height || frameRect?.height || 420));

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function focusAtClientPoint(clientX, clientY) {
      if (!loadedMesh) {
        return false;
      }

      const focusedPoint = pickModelPoint(clientX, clientY, canvas, camera, loadedMesh, raycaster, pointer)
        ?? pickTargetPlanePoint(camera, target, raycaster);
      if (focusedPoint) {
        target.copy(focusedPoint);
        state.autoRotate = false;
        frame?.classList.add("result-viewer__frame--focused");
        return true;
      }
      return false;
    }

    async function applyTextureResolution(resolution) {
      if (!TEXTURE_URLS[resolution]) {
        return;
      }

      setButtonsDisabled(textureButtons, true);
      try {
        const texture = await loadCachedTexture(resolution, textureCache);
        state.textureResolution = resolution;
        if (loadedMaterials) {
          loadedMaterials.texture.map = texture;
          loadedMaterials.texture.needsUpdate = true;
        }
        if (loadedMesh && loadedMaterials) {
          applyViewMode(state.viewMode, loadedMesh, loadedMaterials);
        }
        setActiveButtons(textureButtons, state.textureResolution, "textureResolution");
      } catch (error) {
        console.error(error);
      } finally {
        setButtonsDisabled(textureButtons, false);
      }
    }
  } catch (error) {
    container.classList.add("result-viewer--error");
    if (fallback) {
      fallback.textContent = "The 3D viewer could not be started in this browser.";
    }
    console.error(error);
  }
}

async function loadTexturedObj(objUrl, texturePromise) {
  const [objText, texture] = await Promise.all([
    fetchText(objUrl),
    texturePromise,
  ]);
  const geometry = parseObjGeometry(objText);

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }

  const materials = {
    texture: new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    }),
    shaded: new THREE.MeshStandardMaterial({
      color: 0xc9c9c9,
      metalness: 0,
      roughness: 0.78,
      side: THREE.DoubleSide,
    }),
    wireframe: new THREE.MeshBasicMaterial({
      color: 0xe8f4ff,
      wireframe: true,
      wireframeLinewidth: 1,
      side: THREE.DoubleSide,
    }),
  };
  const mesh = new THREE.Mesh(geometry, materials.texture);

  const group = new THREE.Group();
  group.add(mesh);
  fitObjectToViewer(group);
  return { group, mesh, materials };
}

function applyViewMode(mode, mesh, materials) {
  mesh.material = materials[mode] ?? materials.texture;
  mesh.material.needsUpdate = true;
}

function setActiveButtons(buttons, value, dataKey) {
  buttons.forEach((button) => {
    const isActive = button.dataset[dataKey] === value;
    button.classList.toggle("result-viewer__button--active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setButtonsDisabled(buttons, disabled) {
  buttons.forEach((button) => {
    button.disabled = disabled;
    button.setAttribute("aria-busy", String(disabled));
  });
}

function pickModelPoint(clientX, clientY, canvas, camera, mesh, raycaster, pointer) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const [hit] = raycaster.intersectObject(mesh, false);
  return hit?.point ?? null;
}

function pickTargetPlanePoint(camera, target, raycaster) {
  const normal = camera.getWorldDirection(new THREE.Vector3());
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, target);
  return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

async function toggleFullscreen(element, button, resize) {
  if (getFullscreenElement() === element || element.classList.contains("result-viewer--fullscreen")) {
    await exitFullscreen(element);
  } else {
    try {
      await enterFullscreen(element);
    } catch {
      element.classList.add("result-viewer--fullscreen");
    }
  }
  updateFullscreenState(element, button, resize);
}

async function enterFullscreen(element) {
  if (element.requestFullscreen) {
    await element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else {
    element.classList.add("result-viewer--fullscreen");
  }
}

async function exitFullscreen(element) {
  if (document.exitFullscreen && document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
    document.webkitExitFullscreen();
  } else {
    element.classList.remove("result-viewer--fullscreen");
  }
}

function updateFullscreenState(element, button, resize) {
  const isFullscreen = getFullscreenElement() === element || element.classList.contains("result-viewer--fullscreen");
  document.body.classList.toggle("result-viewer-fullscreen-open", isFullscreen);
  if (button) {
    button.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
    button.setAttribute("aria-pressed", String(isFullscreen));
  }
  requestAnimationFrame(resize);
}

function getPointerDistance(pointers) {
  const [first, second] = Array.from(pointers.values());
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getMoveDistance(pointer, clientX, clientY) {
  return Math.hypot(clientX - pointer.startX, clientY - pointer.startY);
}

function safelySetPointerCapture(element, pointerId) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Synthetic pointer events used in tests do not always create capturable pointers.
  }
}

function safelyReleasePointerCapture(element, pointerId) {
  try {
    element.releasePointerCapture(pointerId);
  } catch {
    // Ignore pointers that were never captured or were already released.
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.text();
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url.href,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function loadCachedTexture(resolution, cache) {
  const textureUrl = TEXTURE_URLS[resolution];
  if (!textureUrl) {
    return Promise.reject(new Error(`Unknown texture resolution: ${resolution}`));
  }
  if (!cache.has(resolution)) {
    const texturePromise = loadTexture(textureUrl).catch((error) => {
      cache.delete(resolution);
      throw error;
    });
    cache.set(resolution, texturePromise);
  }
  return cache.get(resolution);
}

function parseObjGeometry(objText) {
  const sourcePositions = [];
  const sourceUvs = [];
  const sourceNormals = [];
  const positions = [];
  const uvs = [];
  const normals = [];

  for (const line of objText.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      sourcePositions.push(parts.slice(1, 4).map(Number));
    } else if (parts[0] === "vt") {
      sourceUvs.push(parts.slice(1, 3).map(Number));
    } else if (parts[0] === "vn") {
      sourceNormals.push(parts.slice(1, 4).map(Number));
    } else if (parts[0] === "f" && parts.length >= 4) {
      const refs = parts.slice(1).map(parseFaceRef);
      for (let i = 1; i < refs.length - 1; i += 1) {
        appendFaceVertex(refs[0], sourcePositions, sourceUvs, sourceNormals, positions, uvs, normals);
        appendFaceVertex(refs[i], sourcePositions, sourceUvs, sourceNormals, positions, uvs, normals);
        appendFaceVertex(refs[i + 1], sourcePositions, sourceUvs, sourceNormals, positions, uvs, normals);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (uvs.length > 0) {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  }
  if (normals.length === positions.length) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  }
  return geometry;
}

function parseFaceRef(value) {
  const [position, uv, normal] = value.split("/");
  return {
    position: parseObjIndex(position),
    uv: parseObjIndex(uv),
    normal: parseObjIndex(normal),
  };
}

function parseObjIndex(value) {
  if (!value) {
    return null;
  }
  return Number.parseInt(value, 10);
}

function appendFaceVertex(ref, sourcePositions, sourceUvs, sourceNormals, positions, uvs, normals) {
  const position = sourcePositions[toArrayIndex(ref.position, sourcePositions.length)];
  if (!position) {
    return;
  }
  positions.push(position[0], position[1], position[2]);

  const uv = ref.uv ? sourceUvs[toArrayIndex(ref.uv, sourceUvs.length)] : null;
  if (uv) {
    uvs.push(uv[0], uv[1]);
  }

  const normal = ref.normal ? sourceNormals[toArrayIndex(ref.normal, sourceNormals.length)] : null;
  if (normal) {
    normals.push(normal[0], normal[1], normal[2]);
  }
}

function toArrayIndex(objIndex, length) {
  return objIndex > 0 ? objIndex - 1 : length + objIndex;
}

function fitObjectToViewer(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? 2.8 / maxDimension : 1;

  object.scale.setScalar(scale);
  object.position.addScaledVector(center, -scale);

  const fittedBox = new THREE.Box3().setFromObject(object);
  object.position.y -= fittedBox.min.y;
}

function updateCamera(camera, target, state) {
  const radius = Math.cos(state.elevation) * state.distance;
  camera.position.set(
    Math.sin(state.azimuth) * radius,
    target.y + Math.sin(state.elevation) * state.distance,
    Math.cos(state.azimuth) * radius,
  );
  camera.lookAt(target);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
