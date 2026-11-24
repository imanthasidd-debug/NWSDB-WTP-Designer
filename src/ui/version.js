// Program version – injected from package.json by build/build.mjs (esbuild `define`); 'dev' when run from source.
/* global __APP_VERSION__ */
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const APP = VERSION === 'dev' ? 'NWSDB WTP Designer' : `NWSDB WTP Designer v${VERSION}`;
