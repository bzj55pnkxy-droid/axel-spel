import * as THREE from 'three';

/**
 * InteractionSystem — raycasting, crosshair targeting, E-key interaction.
 *
 * Interactive objects are registered with a raycast mesh (can be invisible hitbox),
 * an optional visible mesh to highlight, a callback, and prompt text (static string
 * or function for dynamic text).  When the player looks at one and presses E the
 * callback fires.
 *
 * Wall occlusion: the system collects all intersected objects within range and
 * rejects any that are farther than the first wall hit along the ray.
 */
export class InteractionSystem {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3; // interaction range

    // World-raycaster for wall occlusion — cast against everything
    this.worldRaycaster = new THREE.Raycaster();
    this.worldRaycaster.far = 3;

    this.objects = [];      // { hitbox, highlightMesh, callback, prompt, onHighlight, onUnhighlight }
    this.currentTarget = null;

    this.promptEl = null;
    this.enabled = true;
  }

  setPromptElement(el) {
    this.promptEl = el;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.currentTarget = null;
      if (this.promptEl) this.promptEl.style.display = 'none';
    }
  }

  /**
   * Register an interactive object.
   * @param {THREE.Mesh|THREE.Object3D} hitbox — Mesh used for raycasting (can be invisible)
   * @param {string|Function} prompt — Static text or function returning text for the prompt
   * @param {Function} callback — Called on E press
   * @param {THREE.Object3D} [highlightMesh] — Visible mesh to highlight (if different from hitbox)
   * @param {Function} [onHighlight] — Custom highlight handler(receives highlightMesh)
   * @param {Function} [onUnhighlight] — Custom unhighlight handler(receives highlightMesh)
   */
  register(hitbox, prompt, callback, highlightMesh, onHighlight, onUnhighlight) {
    this.objects.push({
      hitbox,
      highlightMesh: highlightMesh || null,
      prompt: prompt || '',
      callback,
      onHighlight,
      onUnhighlight,
    });
  }

  /**
   * Set meshes that count as walls for occlusion.
   * Any mesh in this array will block interaction with objects behind it.
   * @param {THREE.Object3D[]} wallMeshes
   */
  setWalls(wallMeshes) {
    this.wallMeshes = wallMeshes || [];
  }

  _bind() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.currentTarget && this.enabled) {
        e.preventDefault();
        this.currentTarget.callback();
      }
    });
  }

  update() {
    if (!this.enabled) return;

    const ray = this.raycaster.ray;

    // --- Wall occlusion: find distance to first wall hit ---
    let wallDist = Infinity;
    if (this.wallMeshes && this.wallMeshes.length > 0) {
      this.worldRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      for (const wall of this.wallMeshes) {
        const wallHits = this.worldRaycaster.intersectObject(wall, true);
        for (const hit of wallHits) {
          if (hit.distance < wallDist) {
            wallDist = hit.distance;
          }
        }
        // Early out if wall is very close
        if (wallDist < 0.5) break;
      }
    }

    // --- Find closest interactive object in range and in front of walls ---
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    let closest = null;
    let closestDist = Infinity;

    for (const obj of this.objects) {
      const intersects = this.raycaster.intersectObject(obj.hitbox, true);
      if (intersects.length > 0 && intersects[0].distance < closestDist && intersects[0].distance < wallDist) {
        closest = obj;
        closestDist = intersects[0].distance;
      }
    }

    // --- Highlight management ---
    if (closest !== this.currentTarget) {
      if (this.currentTarget) {
        this._unhighlight(this.currentTarget);
      }
      if (closest) {
        this._highlight(closest);
      }
      this.currentTarget = closest;
    }

    // --- Update prompt UI ---
    if (this.promptEl) {
      if (closest && closest.prompt) {
        const text = typeof closest.prompt === 'function' ? closest.prompt() : closest.prompt;
        this.promptEl.textContent = text;
        this.promptEl.style.display = 'block';
      } else {
        this.promptEl.style.display = 'none';
      }
    }
  }

  _highlight(obj) {
    const mesh = obj.highlightMesh;
    if (!mesh) return;
    if (obj.onHighlight) {
      obj.onHighlight(mesh);
    } else {
      // Default: toggle emissive on the highlight mesh
      mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
          child.material._origEmissive = child.material.emissive.getHex();
          child.material.emissive.setHex(0x222222);
        }
      });
    }
  }

  _unhighlight(obj) {
    const mesh = obj.highlightMesh;
    if (!mesh) return;
    if (obj.onUnhighlight) {
      obj.onUnhighlight(mesh);
    } else {
      mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material._origEmissive !== undefined) {
          child.material.emissive.setHex(child.material._origEmissive);
          delete child.material._origEmissive;
        }
      });
    }
  }
}
