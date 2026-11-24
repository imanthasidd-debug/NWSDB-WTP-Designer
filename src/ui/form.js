// Schema-driven input forms with live criteria hints, auto-values and editable tables
import { CRITERIA, evaluate, rangeText } from '../core/criteria.js';
import { fmtAuto } from '../core/util.js';
import { clear, h, icon } from './dom.js';
import { getInput, setInput, store } from './store.js';
import { defaultHint, issuesByField } from './locate.js';

/**
 * Render a form for module `mod` from a field schema. Returns {el, update()}
 */
export function renderForm(mod, fields) {
  const el = h('div', { class: 'form' });
  const refs = [];
  let sec = null;
  const newSec = (title, show) => {
    const s = h('div', { class: 'fsec' }, title ? h('div', { class: 'fsec-h' }, title) : null);
    sec = s;
    el.append(s);
    if (show)
      refs.push({
        update: () => {
          s.style.display = show(store.project.inputs, store.results) ? '' : 'none';
        },
      });
  };
  newSec(null);
  for (const f of fields) {
    if (f.sec !== undefined) {
      newSec(f.sec, f.show);
      continue;
    }
    const node = fieldNode(mod, f, refs);
    if (node) sec.append(node);
  }
  const update = () => {
    for (const r of refs) r.update?.();
    // field-level messages for failing / to-review checks controlled by each input
    const iss = issuesByField(mod);
    for (const r of refs) {
      if (!r.key || !r.el) continue;
      const list = iss.get(r.key) || [];
      const st = list.some((c) => c.status === 'fail') ? 'fail' : list.length ? 'warn' : '';
      r.el.classList.toggle('has-fail', st === 'fail');
      r.el.classList.toggle('has-warn', st === 'warn');
      if (!r.msg) {
        r.msg = h('div', { class: 'fmsg' });
        r.el.append(r.msg);
      }
      clear(r.msg);
      r.msg.style.display = list.length ? '' : 'none';
      for (const c of list.slice(0, 3)) {
        const v = typeof c.value === 'number' ? fmtAuto(c.value) : c.value;
        r.msg.append(
          h(
            'div',
            { class: 'fm ' + c.status },
            icon(c.status === 'fail' ? 'fail' : 'warn'),
            h(
              'span',
              null,
              h('b', null, c.label),
              ` = ${v ?? ''} ${c.unit && c.unit !== '–' ? c.unit : ''} · criterion ${c.range || ''}`,
              c.hint || defaultHint(c) ? h('span', { class: 'fm-hint' }, ' – ' + (c.hint || defaultHint(c))) : null,
            ),
          ),
        );
      }
    }
  };
  update();
  return { el, update };
}

function critOf(key) {
  return key && CRITERIA[key] ? { ...CRITERIA[key], ...(store.project?.criteria?.[key] || {}) } : null;
}

function fieldNode(mod, f, refs) {
  const path = f.path || [mod, f.k];
  const val = () => getInput(path);
  const set = (v, imm) => setInput(path, v, { immediate: imm });
  const wrap = h('div', {
    class: 'field' + (f.block || ['table', 'area', 'help', 'custom', 'array'].includes(f.t) ? ' block' : ''),
    'data-k': f.k,
    'data-crit': f.crit || '',
  });
  const ref = { el: wrap, update: null, key: f.k };
  refs.push(ref);
  const showUpd = () => {
    if (f.show) wrap.style.display = f.show(store.project.inputs, store.results) ? '' : 'none';
  };
  if (f.t === 'help') {
    const hp = h('div', { class: 'helptext', html: typeof f.html === 'function' ? '' : f.html });
    wrap.append(hp);
    ref.update = () => {
      showUpd();
      if (typeof f.html === 'function') hp.innerHTML = f.html(store.results, store.project.inputs);
    };
    return wrap;
  }
  if (f.t === 'custom') {
    const box = h('div');
    wrap.append(box);
    ref.update = () => {
      showUpd();
      clear(box).append(f.render(store.results, store.project.inputs));
    };
    return wrap;
  }
  const hint = h('span', { class: 'hint' });
  const lab = h(
    'label',
    { title: f.help || '' },
    h('span', null, f.l, f.auto ? h('span', { class: 'auto-tag', style: { display: 'none' } }, 'auto') : null),
    hint,
  );
  wrap.append(lab);
  if (f.t === 'num' || f.t === undefined) {
    const input = h('input', { type: 'number', step: f.step ?? 'any', placeholder: f.auto ? 'auto' : '' });
    const box = h('div', { class: 'inp' }, input, f.u ? h('span', { class: 'u' }, f.u) : null);
    wrap.append(box);
    input.value = val() ?? '';
    input.addEventListener('input', () => {
      const v = input.value === '' ? (f.auto ? 0 : null) : parseFloat(input.value);
      if (v !== null && Number.isFinite(v)) set(v);
    });
    input.addEventListener('focus', () => input.select());
    ref.update = () => {
      showUpd();
      const v = val();
      if (document.activeElement !== input) input.value = f.auto && (!v || v === 0) ? '' : (v ?? '');
      const parts = [];
      const c = f.crit ? critOf(f.crit) : null;
      let st = 'ok';
      let autoV = null;
      if (f.auto && (!v || v === 0) && f.autoVal) {
        try {
          autoV = f.autoVal(store.results);
        } catch {
          autoV = null;
        }
      }
      if (f.auto) {
        const tag = lab.querySelector('.auto-tag');
        tag.style.display = !v || v === 0 ? '' : 'none';
      }
      if (autoV !== null && autoV !== undefined) {
        input.placeholder = 'auto = ' + (typeof autoV === 'number' ? fmtAuto(autoV) : autoV);
      }
      if (c && c.label) {
        const checkV = v && v !== 0 ? v : autoV;
        st = typeof checkV === 'number' ? evaluate(c, checkV) : 'na';
        parts.push(`typ. ${rangeText(c)}${c.unit && c.unit !== '–' ? ' ' + c.unit : ''}`);
      }
      if (f.note) {
        try {
          parts.push(typeof f.note === 'function' ? f.note(store.results) : f.note);
        } catch {
          /* module disabled */
        }
      }
      hint.innerHTML =
        parts.join(' · ') +
        (st === 'warn'
          ? ' <span class="st" style="color:var(--warn)">● outside range</span>'
          : st === 'fail'
            ? ' <span class="st" style="color:var(--fail)">● outside limit</span>'
            : '');
      box.classList.toggle('st-warn', st === 'warn');
      box.classList.toggle('st-fail', st === 'fail');
    };
    return wrap;
  }
  if (f.t === 'sel') {
    wrap.classList.add('sel');
    const sel = h('select');
    const box = h('div', { class: 'inp' }, sel);
    wrap.append(box);
    const fill = () => {
      const opts = typeof f.o === 'function' ? f.o(store.results, store.project.inputs) : f.o;
      const cur = val();
      clear(sel);
      for (const [v, l] of opts) sel.append(h('option', { value: v }, l));
      sel.value = cur ?? opts[0]?.[0];
    };
    fill();
    sel.addEventListener('change', () => {
      const v = f.numeric ? parseFloat(sel.value) : sel.value;
      set(v, true);
      f.onChange?.(v);
    });
    ref.update = () => {
      showUpd();
      if (typeof f.o === 'function') {
        if (document.activeElement !== sel) fill();
      } else if (document.activeElement !== sel) sel.value = val();
      if (f.note) hint.textContent = typeof f.note === 'function' ? f.note(store.results) : f.note;
    };
    return wrap;
  }
  if (f.t === 'bool') {
    const sw = h('div', { class: 'switch' });
    const c = h(
      'div',
      {
        class: 'chk',
        onclick: () => {
          set(!val(), true);
          sw.classList.toggle('on', !!val());
        },
      },
      sw,
    );
    wrap.append(c);
    ref.update = () => {
      showUpd();
      sw.classList.toggle('on', !!val());
      if (f.note) hint.textContent = typeof f.note === 'function' ? f.note(store.results) : f.note;
    };
    return wrap;
  }
  if (f.t === 'text' || f.t === 'date') {
    const input = h('input', { type: f.t === 'date' ? 'date' : 'text', placeholder: f.ph || '' });
    const box = h('div', { class: 'inp' + (f.wide ? ' wide' : '') }, input);
    if (f.wide) {
      wrap.classList.add('block');
    }
    wrap.append(box);
    input.value = val() ?? '';
    input.addEventListener('input', () => set(input.value));
    ref.update = () => {
      showUpd();
      if (document.activeElement !== input) input.value = val() ?? '';
    };
    return wrap;
  }
  if (f.t === 'area') {
    const ta = h('textarea', { class: 'ta', placeholder: f.ph || '' });
    wrap.append(ta);
    ta.value = val() ?? '';
    ta.addEventListener('input', () => set(ta.value));
    ref.update = () => {
      showUpd();
      if (document.activeElement !== ta) ta.value = val() ?? '';
    };
    return wrap;
  }
  if (f.t === 'table') {
    const tbl = h('table', { class: 'ftable' });
    const addBtn = f.fixed
      ? null
      : h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => {
              const rows = [...(val() || [])];
              rows.push({ ...(f.add || {}) });
              set(rows, true);
              build();
            },
          },
          icon('plus'),
          'Add row',
        );
    const extra = f.extraButtons
      ? h(
          'span',
          { class: 'flex' },
          f.extraButtons(() => build()),
        )
      : null;
    wrap.append(tbl, h('div', { class: 'flex' }, addBtn, extra));
    const build = () => {
      const rows = val() || [];
      clear(tbl);
      tbl.append(
        h(
          'tr',
          null,
          f.cols.map((c) => h('th', { style: { width: c.w || 'auto' } }, c.l)),
          f.fixed ? null : h('th', { style: { width: '24px' } }),
        ),
      );
      rows.forEach((row, i) => {
        tbl.append(
          h(
            'tr',
            null,
            f.cols.map((c) => {
              if (c.ro)
                return h(
                  'td',
                  { class: 'num', style: { color: 'var(--text-2)', textAlign: c.left ? 'left' : 'right' } },
                  typeof c.ro === 'function' ? c.ro(row, i) : row[c.k],
                );
              if (c.o) {
                const sel = h(
                  'select',
                  {
                    style: {
                      width: '100%',
                      height: '26px',
                      border: '1px solid var(--border)',
                      borderRadius: '5px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    },
                  },
                  c.o.map(([v, l]) => h('option', { value: v }, l)),
                );
                sel.value = row[c.k] ?? c.o[0][0];
                sel.addEventListener('change', () => {
                  const rs = JSON.parse(JSON.stringify(val() || []));
                  rs[i][c.k] = sel.value;
                  set(rs, true);
                });
                return h('td', null, sel);
              }
              const inp = h('input', {
                type: c.text ? 'text' : 'number',
                step: 'any',
                value: row[c.k] ?? '',
                style: c.text ? { textAlign: 'left' } : null,
              });
              inp.addEventListener('input', () => {
                const rs = JSON.parse(JSON.stringify(val() || []));
                rs[i][c.k] = c.text ? inp.value : parseFloat(inp.value);
                if (c.text || Number.isFinite(rs[i][c.k])) set(rs);
              });
              return h('td', null, inp);
            }),
            f.fixed
              ? null
              : h(
                  'td',
                  null,
                  h(
                    'button',
                    {
                      class: 'rm',
                      title: 'Remove row',
                      onclick: () => {
                        const rs = [...(val() || [])];
                        if (rs.length <= (f.minRows ?? 1)) return;
                        rs.splice(i, 1);
                        set(rs, true);
                        build();
                      },
                    },
                    icon('x'),
                  ),
                ),
          ),
        );
      });
    };
    build();
    let lastLen = (val() || []).length;
    let lastJSON = JSON.stringify(val());
    ref.update = () => {
      showUpd();
      const v = val() || [];
      const j = JSON.stringify(v);
      if (v.length !== lastLen || (j !== lastJSON && !tbl.contains(document.activeElement))) {
        build();
      }
      lastLen = v.length;
      lastJSON = j;
    };
    if (f.title) lab.querySelector('span').textContent = f.title;
    return wrap;
  }
  if (f.t === 'array') {
    // horizontal array editor (e.g. 12 months / 24 hours)
    const grid = h('div', {
      style: { display: 'grid', gridTemplateColumns: `repeat(${f.cols || 6}, 1fr)`, gap: '4px' },
    });
    wrap.append(grid);
    const build = () => {
      clear(grid);
      const arr = val() || [];
      arr.forEach((v, i) => {
        const inp = h('input', {
          type: 'number',
          step: 'any',
          value: v,
          style: {
            width: '100%',
            height: '26px',
            border: '1px solid var(--border)',
            borderRadius: '5px',
            textAlign: 'right',
            padding: '0 4px',
            background: 'var(--surface)',
          },
        });
        inp.addEventListener('input', () => {
          const a = [...(val() || [])];
          a[i] = parseFloat(inp.value);
          if (Number.isFinite(a[i])) set(a);
        });
        grid.append(h('div', null, h('div', { class: 'small muted' }, f.labels ? f.labels[i] : i), inp));
      });
    };
    build();
    ref.update = () => {
      showUpd();
      if (!grid.contains(document.activeElement)) build();
      wrap.querySelectorAll('input').forEach((x) => {
        x.disabled = f.disabled ? f.disabled(store.project.inputs) : false;
        x.style.opacity = x.disabled ? 0.55 : 1;
      });
    };
    return wrap;
  }
  return null;
}
