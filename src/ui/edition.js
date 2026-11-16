// Edition of this copy: full, or a time-limited trial (set by the Electron main process; see electron/trial.js).
// In a browser, "?trial=N" simulates a trial with N days left (N = 0: ended) for testing – it can only restrict.
const sim = (() => { try { const v = new URLSearchParams(location.search).get('trial'); return v === null ? null : { trial: true, days: 30, daysLeft: Math.max(0, +v || 0), expired: !(+v > 0), ends: '', started: '' }; } catch { return null; } })();
export const edition = (typeof window !== 'undefined' && window.wtp?.trial) || sim || { trial: false };
export const isTrial = () => !!edition.trial;
export const trialLabel = () => (edition.trial ? 'TRIAL VERSION – NOT FOR ISSUE' : '');
export const fmtDate = (iso) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ''); return m ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}` : ''; };
