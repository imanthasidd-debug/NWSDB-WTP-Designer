// Edition of this copy: full, trial, restricted (trial ended) or licensed (trial copy unlocked with a key).
// The status comes from the Electron main process (electron/licence.js).  In a browser, "?trial=N" simulates a trial
// with N days left (N = 0: ended → restricted mode) for testing – it can only restrict.
//
// Restricted mode (after the trial):  projects and samples open and every result, drawing and chart can be viewed,
// but inputs cannot be changed, nothing can be exported (PDF, Excel, DXF, SVG, PNG, CSV, O&M manual) and the screen
// shows a banner with the licence dialog.  Saving the project file stays possible so no work is lost.
import { h, icon, modal, toast } from './dom.js';

const sim = (() => {
  try {
    const v = new URLSearchParams(location.search).get('trial');
    return v === null
      ? null
      : {
          trial: true,
          days: 30,
          daysLeft: Math.max(0, +v || 0),
          expired: !(+v > 0),
          mode: +v > 0 ? 'trial' : 'restricted',
          ends: '',
          started: '',
          machineId: 'TEST-TEST-TEST-TEST',
          sim: true,
        };
  } catch {
    return null;
  }
})();
export const edition = (typeof window !== 'undefined' && window.wtp?.trial) || sim || { trial: false };
export const isTrial = () => !!edition.trial;
export const isRestricted = () => !!(edition.trial && edition.expired);
export const trialLabel = () => (edition.trial ? 'TRIAL VERSION – NOT FOR ISSUE' : '');
export const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || '');
  return m
    ? `${+m[3]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]} ${m[1]}`
    : '';
};

let lastWarn = 0;
/** false (and a message) in restricted mode */
export function canEdit() {
  if (!isRestricted()) return true;
  if (Date.now() - lastWarn > 4000) {
    lastWarn = Date.now();
    toast('Restricted mode – the trial has ended. Inputs cannot be changed.', 'warn');
  }
  return false;
}
export function canExport() {
  if (!isRestricted()) return true;
  licenceDialog('Exports are switched off because the trial period has ended.');
  return false;
}

/** licence dialog: status, machine ID, key entry */
export function licenceDialog(reason = '') {
  const e = edition;
  const status = e.licensed
    ? `Licensed${e.licensee ? ' to <b>' + escH(e.licensee) + '</b>' : ''} – full version on this computer.`
    : !e.trial
      ? 'Full version.'
      : e.expired
        ? '<b>The trial period has ended</b> – restricted mode: projects can be opened and viewed, but inputs cannot be changed and nothing can be exported.'
        : `<b>Trial version</b> – ${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'} left${e.ends ? ` (until ${fmtDate(e.ends)})` : ''}${e.extended ? ' · extended by licence key' : ''}. Reports and drawings carry a “Trial version – not for issue” mark.`;
  const mid = e.machineId || '–';
  const msg = h('div', { class: 'lic-msg' });
  const ta = h('textarea', {
    class: 'lic-key',
    rows: 4,
    placeholder: 'Paste the licence key here (starts with WTP1-)',
    spellcheck: false,
  });
  const copyBtn = h(
    'button',
    {
      class: 'btn sm',
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(mid);
          toast('Machine ID copied');
        } catch {
          toast('Select the ID and copy it', 'warn');
        }
      },
    },
    icon('copy'),
    'Copy',
  );
  const act = h(
    'button',
    {
      class: 'btn primary',
      onclick: async () => {
        if (!window.wtp?.activateLicence) {
          msg.className = 'lic-msg fail';
          msg.textContent = 'Licence keys can be entered in the desktop program only.';
          return;
        }
        act.disabled = true;
        msg.className = 'lic-msg';
        msg.textContent = 'Checking…';
        const res = await window.wtp.activateLicence(ta.value);
        act.disabled = false;
        if (res?.ok) {
          msg.className = 'lic-msg ok';
          msg.textContent =
            res.lic.t === 'full'
              ? 'Licence accepted – the full version is now unlocked. Restarting…'
              : `Licence accepted – trial extended until ${fmtDate(res.lic.u)}. Restarting…`;
        } else {
          msg.className = 'lic-msg fail';
          msg.textContent = res?.error || 'The key was not accepted.';
        }
      },
    },
    icon('ok'),
    'Activate',
  );
  const body = h(
    'div',
    { class: 'lic' },
    reason ? h('p', { class: 'lic-reason' }, reason) : null,
    h('p', { html: status }),
    e.trial || e.licensed
      ? h(
          'div',
          { class: 'lic-mid' },
          h('span', { class: 'muted' }, 'Machine ID of this computer'),
          h('code', null, mid),
          copyBtn,
        )
      : null,
    e.trial
      ? h(
          'div',
          null,
          h(
            'p',
            { class: 'small muted' },
            'To unlock the full version or extend the trial, send the machine ID above to the person who gave you this copy. Paste the licence key you receive below. A key works on this computer only.',
          ),
          ta,
          h('div', { class: 'lic-row' }, act, msg),
        )
      : null,
  );
  return modal('Licence', body, [{ label: 'Close', primary: !e.trial }]);
}
const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** banner shown in restricted mode */
export function restrictedBanner() {
  return h(
    'div',
    { class: 'restricted-bar' },
    icon('warn'),
    h(
      'span',
      null,
      h('b', null, 'Trial ended – restricted mode. '),
      'You can open and view projects; inputs and exports are switched off.',
    ),
    h('button', { class: 'btn sm', onclick: () => licenceDialog() }, 'Enter licence key'),
  );
}
