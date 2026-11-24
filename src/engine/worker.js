// Calculation worker: runs computeAll() off the screen thread so typing stays smooth on slower PCs.
// Built to dist/engine.worker.js by build/build.mjs; used by src/ui/store.js (falls back to the screen thread when a
// worker cannot be started, e.g. a browser opening the page from disk).
import { computeAll } from './index.js';

self.onmessage = (e) => {
  const { id, project } = e.data || {};
  const t0 = performance.now();
  try {
    const results = computeAll(project);
    self.postMessage({ id, results, ms: performance.now() - t0 });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.stack ? err.stack : err) });
  }
};
self.postMessage({ ready: true });
