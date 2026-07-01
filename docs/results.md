---
layout: page
title: Results
---

<link rel="stylesheet" href="{{ '/assets/css/model-viewer.css' | relative_url }}">
<script type="module" src="{{ '/assets/js/result-viewer.js' | relative_url }}"></script>

This page highlights example outputs and validation images from the capture system. The results shown here focus on the captured images and the reconstruction quality.

## Reconstruction 

The captured images have been processed using RealityCapture 2.2 and are shown below.

The viewer below shows a textured OBJ result generated from the capture system. Drag to orbit the model, scroll to zoom, and double-click the scan to focus the camera on that point.

<div class="result-viewer" data-result-viewer>
  <div class="result-viewer__toolbar">
    <div class="result-viewer__groups">
      <div class="result-viewer__button-group" role="group" aria-label="Viewing mode">
        <button class="result-viewer__button result-viewer__button--active" type="button" data-view-mode="texture" aria-pressed="true">Unlit texture</button>
        <button class="result-viewer__button" type="button" data-view-mode="shaded" aria-pressed="false">Shaded geometry</button>
        <button class="result-viewer__button" type="button" data-view-mode="wireframe" aria-pressed="false">Wireframe</button>
      </div>
    </div>
    <button class="result-viewer__button" type="button" data-reset-view>Reset view</button>
  </div>
  <div class="result-viewer__frame">
    <canvas class="result-viewer__canvas" aria-label="Interactive 3D preview of a photogrammetry reconstruction"></canvas>
    <p class="result-viewer__fallback" data-viewer-fallback></p>
  </div>
</div>