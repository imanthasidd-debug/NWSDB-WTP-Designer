// Renderer entry point
import { boot } from './ui/app.js';
boot(document.getElementById('app')).catch((e) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#c53030;white-space:pre-wrap">Startup error:\n${e && e.stack ? e.stack : e}</pre>`;
});
