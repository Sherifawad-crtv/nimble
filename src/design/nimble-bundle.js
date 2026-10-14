/* @ds-bundle: {"format":4,"namespace":"Nimble","components":[{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"PillNav"},{"name":"Sidebar"},{"name":"TopBar"},{"name":"TextField"},{"name":"SearchField"},{"name":"NumberField"},{"name":"DateField"},{"name":"Segmented"},{"name":"UnderlineTabs"},{"name":"Checkbox"},{"name":"Radio"},{"name":"Switch"},{"name":"Chip"},{"name":"TagInput"},{"name":"Select"},{"name":"Card"},{"name":"ListRow"},{"name":"DataTable"},{"name":"BottomSheet"},{"name":"Dialog"},{"name":"Toast"},{"name":"Banner"},{"name":"StatusChip"},{"name":"Avatar"},{"name":"EmptyState"},{"name":"Skeleton"},{"name":"ErrorState"},{"name":"VideoPreview"},{"name":"ExerciseRow"},{"name":"BlockHeader"},{"name":"BlockSettings"},{"name":"TargetEditor"},{"name":"LogInput"},{"name":"Calendar"},{"name":"TimerDisplay"},{"name":"RoundCounter"},{"name":"RestTimer"},{"name":"TimerControls"},{"name":"MetricTile"},{"name":"BrandChip"},{"name":"ReadinessIndicator"},{"name":"CapabilityList"},{"name":"CommentThread"},{"name":"PackageCard"},{"name":"PersonalRecord"},{"name":"ProgressChart"},{"name":"Stepper"},{"name":"OverflowMenu"},{"name":"Tooltip"},{"name":"ReorderList"},{"name":"Wordmark"},{"name":"Emblem"},{"name":"Lockup"},{"name":"AppIcon"},{"name":"Splash"},{"name":"Headline"},{"name":"MetricPill"},{"name":"StatCard"},{"name":"DotGrid"},{"name":"TabBar"},{"name":"GoalDial"},{"name":"RouteCard"}]} */
(function () {
  var React = window.React, h = React.createElement, useState = React.useState;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  var FLIP = { 'chev-l': 1, 'chev-r': 1, skip: 1, external: 0 };

  function Icon(p) {
    // Glyphs come from the Solar icon set the app registers on window.NimbleIconSet (src/design/solar-icons.ts).
    var body = (window.NimbleIconSet || {})[p.name] || '', size = p.size || 24;
    return h('svg', { className: cx('v-icon', FLIP[p.name] && 'v-flip'), width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', style: p.color ? { color: p.color } : undefined, dangerouslySetInnerHTML: { __html: body } });
  }

  /* ---------- Actions ---------- */
  function Button(p) {
    var size = p.size || 'lg', variant = p.variant || 'primary', full = p.fullWidth == null ? size === 'lg' : p.fullWidth;
    var cls = cx('v-btn', 'v-btn-' + size, 'v-btn-' + variant, size === 'lg' ? 't-button' : 't-button-md', full && 'full', p.state === 'pressed' && 'is-pressed', p.state === 'focus' && 'is-focus');
    var inner = p.iconOnly ? h(Icon, { name: p.icon, size: 24 }) : [p.loading ? h('span', { key: 's', className: 'v-spin', 'aria-hidden': 'true' }) : (p.icon ? h(Icon, { key: 'i', name: p.icon, size: 22 }) : null), h('span', { key: 't' }, p.children)];
    return h('button', { type: p.type || 'button', className: cls + (p.iconOnly ? ' icon-only' : ''), onClick: p.onClick, disabled: p.disabled || p.loading, 'aria-busy': p.loading ? 'true' : undefined, 'aria-label': p.iconOnly ? (p.label || p.children) : undefined }, inner);
  }

  function IconButton(p) {
    var v = p.variant || 'control';
    return h('button', { type: 'button', className: cx('v-iconbtn', 'v-iconbtn-' + v, p.state === 'pressed' && 'is-pressed', p.state === 'focus' && 'is-focus'), 'aria-label': p.label, onClick: p.onClick, disabled: p.disabled },
      h(Icon, { name: p.icon, size: p.size || (v === 'action' ? 28 : 22) }));
  }

  /* ---------- Navigation ---------- */
  function PillNav(p) {
    var nav = h('nav', { className: 'v-pillnav', 'aria-label': p.label || 'Main' },
      p.items.map(function (it) {
        return h('button', { key: it.id, type: 'button', className: 'v-pn', 'aria-current': it.id === p.active ? 'page' : undefined, onClick: function () { p.onChange && p.onChange(it.id); } },
          h(Icon, { name: it.icon, size: 24 }), h('span', { className: 't-chip' }, it.label),
          it.badge ? h('span', { className: 'v-pn-badge', role: 'status', 'aria-label': 'New activity' }) : null);
      }));
    return h('div', { className: 'v-pillnav-wrap' }, nav,
      p.action ? h(IconButton, { icon: p.action.icon, label: p.action.label, variant: 'action', onClick: p.action.onClick, state: p.action.state }) : null);
  }

  function Sidebar(p) {
    return h('aside', { className: 'v-side' },
      h('div', { className: 'v-side-ws' }, h('div', { className: 't-chip v-muted' }, 'Workspace'), h('div', { className: 't-heading' }, p.workspace)),
      h('nav', { className: 'v-side-nav', 'aria-label': 'Main' }, p.items.map(function (it) {
        return h('button', { key: it.id, type: 'button', className: cx('v-side-item', 't-body-strong', it.id === p.active && 'on', it.state === 'hover' && 'is-hover'), 'aria-current': it.id === p.active ? 'page' : undefined, onClick: function () { p.onChange && p.onChange(it.id); } }, h(Icon, { name: it.icon, size: 22 }), it.label);
      })),
      p.user ? h('button', { type: 'button', className: 'v-side-user', 'aria-haspopup': 'menu' }, h(Avatar, { name: p.user.name, size: 'md' }), h('span', { className: 'v-side-uname' }, h('span', { className: 't-body-strong' }, p.user.name), h('span', { className: 't-caption v-muted' }, p.user.role)), h(Icon, { name: 'chev-u', size: 18 })) : null);
  }

  function TopBar(p) {
    var v = p.variant || 'compact';
    if (v === 'desktop') return h('header', { className: 'v-top v-top-desktop' }, h(SearchField, { placeholder: p.placeholder || 'Search clients, exercises, workouts' }), p.trailing);
    if (v === 'large') return h('header', { className: 'v-top v-top-large' }, h('div', { className: 'v-top-row' }, h('span', { className: 't-chip v-muted' }, p.eyebrow || ''), p.trailing), h('h1', { className: 't-title v-top-title' }, p.title));
    return h('header', { className: 'v-top' },
      v === 'back' ? h(IconButton, { icon: 'chev-l', label: 'Back', onClick: p.onBack }) : null,
      h('h1', { className: cx('t-heading v-top-t', v === 'back' && 'center') }, p.title), h('span', { className: 'v-top-trail' }, p.trailing));
  }

  /* ---------- Inputs ---------- */
  function Msg(p) { return p.text ? h('div', { className: cx('v-msg t-label', p.kind), role: p.kind === 'err' ? 'alert' : undefined }, p.kind ? h(Icon, { name: p.kind === 'err' ? 'alert' : 'check', size: 18 }) : null, p.text) : null; }

  function TextField(p) {
    var cls = cx('v-input', p.error && 'err', p.success && 'ok', p.disabled && 'dis', p.multiline && 'multi', p.state === 'focus' && 'is-focus-in');
    var props = { className: 't-input', value: p.value, defaultValue: p.defaultValue, placeholder: p.placeholder, disabled: p.disabled, onChange: p.onChange, required: p.required, 'aria-invalid': p.error ? 'true' : undefined, id: p.id, type: p.type || 'text', name: p.name, autoComplete: p.autoComplete, inputMode: p.inputMode, autoCapitalize: p.autoCapitalize };
    return h('label', { className: 'v-field' },
      p.label ? h('span', { className: 'v-label t-label' }, p.label, p.required ? h('span', { className: 'v-req', 'aria-hidden': 'true' }, ' *') : h('span', { className: 'v-opt-tag' }, ' (optional)')) : null,
      h('span', { className: cls }, p.icon ? h(Icon, { name: p.icon, size: 22 }) : null, p.multiline ? h('textarea', Object.assign({ rows: 3 }, props)) : h('input', props), p.trailing || null),
      h(Msg, { kind: p.error ? 'err' : p.success ? 'ok' : '', text: p.error || p.success || p.hint }));
  }

  function SearchField(p) {
    var st = useState(p.defaultValue || ''), v = p.value != null ? p.value : st[0], set = p.onChange || st[1];
    return h('div', { className: 'v-search' },
      h('span', { className: 'v-input' }, h(Icon, { name: 'search', size: 22 }), h('input', { className: 't-input', value: v, placeholder: p.placeholder || 'Search', onChange: function (e) { set(e.target.value); }, 'aria-label': p.placeholder || 'Search', type: 'search' }),
        v ? h('button', { type: 'button', className: 'v-clear', 'aria-label': 'Clear search', onClick: function () { set(''); } }, h(Icon, { name: 'close', size: 18 })) : null),
      p.results && v ? h('ul', { className: 'v-pop v-results', role: 'listbox' }, p.results.map(function (r, i) { return h('li', { key: i, role: 'option', className: 'v-opt t-body' }, h(Icon, { name: r.icon || 'search', size: 20 }), h('span', null, r.label), r.meta ? h('span', { className: 't-caption v-muted v-end' }, r.meta) : null); })) : null);
  }

  function NumberField(p) {
    var st = useState(p.defaultValue == null ? 0 : p.defaultValue), v = p.value != null ? p.value : st[0], step = p.step || 1;
    function set(n) { n = Math.max(p.min == null ? 0 : p.min, Math.min(p.max == null ? 9999 : p.max, n)); (p.onChange || st[1])(n); }
    return h('div', { className: cx('v-field v-numfield', p.large && 'large') },
      p.label ? h('span', { className: 'v-label t-label' }, p.label) : null,
      h('div', { className: 'v-num-wrap' },
        h(IconButton, { icon: 'minus', label: 'Decrease', onClick: function () { set(v - step); }, size: 24 }),
        h('label', { className: 'v-num-in' }, h('input', { className: cx('v-num-val', p.large ? 't-timer' : 't-metric'), inputMode: 'numeric', value: v, onChange: function (e) { var n = parseInt(e.target.value.replace(/\D/g, ''), 10); set(isNaN(n) ? 0 : n); }, 'aria-label': p.label || 'Value' }), p.unit ? h('span', { className: 't-chip v-muted' }, p.unit) : null),
        h(IconButton, { icon: 'plus', label: 'Increase', onClick: function () { set(v + step); }, size: 24 })));
  }

  function DateField(p) {
    var iso = p.value || '', txt = '';
    try { txt = iso ? new Intl.DateTimeFormat(p.locale || 'en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso + 'T12:00:00')) : ''; } catch (e) { txt = iso; }
    return h('label', { className: 'v-field' }, p.label ? h('span', { className: 'v-label t-label' }, p.label, p.required ? h('span', { className: 'v-req', 'aria-hidden': 'true' }, ' *') : null) : null,
      h('span', { className: cx('v-input v-date', p.error && 'err') }, h(Icon, { name: 'calendar', size: 22 }), h('span', { className: cx('t-input v-date-t', !txt && 'v-muted') }, txt || 'Choose a date'), h(Icon, { name: 'chev-d', size: 18 }),
        h('input', { type: 'date', className: 'v-date-native', value: iso, onChange: p.onChange, 'aria-label': p.label || 'Date' })),
      h(Msg, { kind: p.error ? 'err' : '', text: p.error }));
  }

  function Segmented(p) {
    return h('div', { className: 'v-seg', role: 'tablist' }, p.options.map(function (o) {
      var on = o.id === p.value;
      return h('button', { key: o.id, type: 'button', role: 'tab', 'aria-selected': on, className: cx('v-seg-o t-chip', on && 'on'), onClick: function () { p.onChange && p.onChange(o.id); } }, on ? h(Icon, { name: 'check', size: 16 }) : null, o.label);
    }));
  }
  function UnderlineTabs(p) {
    return h('div', { className: 'v-utabs', role: 'tablist' }, p.tabs.map(function (o) {
      var on = o.id === p.value;
      return h('button', { key: o.id, type: 'button', role: 'tab', 'aria-selected': on, className: cx('v-utab t-body-strong', on && 'on'), onClick: function () { p.onChange && p.onChange(o.id); } }, o.label);
    }));
  }

  function Sel(kind) {
    return function (p) {
      var st = useState(!!p.defaultChecked), on = p.checked != null ? p.checked : st[0];
      return h('label', { className: cx('v-sel', p.disabled && 'dis') },
        h('input', { type: kind === 'radio' ? 'radio' : 'checkbox', checked: on, disabled: p.disabled, name: p.name, onChange: function (e) { (p.onChange || st[1])(e.target.checked); }, role: kind === 'switch' ? 'switch' : undefined }),
        kind === 'switch' ? h('span', { className: 'v-track', 'aria-hidden': 'true' }, h('span', { className: 'v-knob' })) : h('span', { className: cx('v-box', kind === 'radio' && 'radio'), 'aria-hidden': 'true' }, kind === 'checkbox' ? h(Icon, { name: 'check', size: 18 }) : null),
        h('span', { className: 'v-sel-t' }, h('span', { className: 't-body-strong' }, p.label), p.description ? h('span', { className: 't-label v-muted' }, p.description) : null));
    };
  }
  var Checkbox = Sel('checkbox'), Radio = Sel('radio'), Switch = Sel('switch');

  function Chip(p) {
    if (p.add) return h('button', { type: 'button', className: 'v-chip add t-chip', onClick: p.onClick }, h(Icon, { name: 'plus', size: 16 }), p.label || 'Add tag');
    var tag = p.onRemove ? 'span' : 'button';
    return h(tag, { type: tag === 'button' ? 'button' : undefined, className: cx('v-chip t-chip', p.selected && 'on', p.onRemove && 'rem'), 'aria-pressed': tag === 'button' && p.selectable !== false ? !!p.selected : undefined, onClick: p.onClick },
      p.selected && !p.onRemove ? h(Icon, { name: 'check', size: 16 }) : null, p.label,
      p.onRemove ? h('button', { type: 'button', className: 'v-chip-x', 'aria-label': 'Remove ' + p.label, onClick: p.onRemove }, h(Icon, { name: 'close', size: 14 })) : null);
  }
  function TagInput(p) {
    var st = useState(p.tags || []), tags = st[0], q = useState(p.query || ''), query = q[0];
    var sugg = (p.suggestions || []).filter(function (s) { return tags.indexOf(s) < 0 && s.toLowerCase().indexOf(query.toLowerCase()) >= 0; });
    function add(t) { if (t && tags.indexOf(t) < 0) st[1](tags.concat([t])); q[1](''); }
    return h('div', { className: 'v-field' }, p.label ? h('span', { className: 'v-label t-label' }, p.label) : null,
      h('div', { className: 'v-input v-taginput' }, tags.map(function (t) { return h(Chip, { key: t, label: t, onRemove: function () { st[1](tags.filter(function (x) { return x !== t; })); } }); }),
        h('input', { className: 't-input', value: query, placeholder: 'Add a tag', 'aria-label': 'Add a tag', onChange: function (e) { q[1](e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); add(query.trim()); } } })),
      query || p.open ? h('div', { className: 'v-pop' }, sugg.map(function (s) { return h('button', { key: s, type: 'button', className: 'v-opt t-body', onClick: function () { add(s); } }, s); }), query && sugg.indexOf(query) < 0 ? h('button', { type: 'button', className: 'v-opt t-body', onClick: function () { add(query.trim()); } }, h(Icon, { name: 'plus', size: 18 }), 'Create "' + query + '"') : null) : null);
  }

  function Select(p) {
    var st = useState(!!p.defaultOpen), open = st[0], vs = useState(p.defaultValue), val = p.value != null ? p.value : vs[0];
    var cur = (p.options || []).filter(function (o) { return o.id === val; })[0];
    return h('div', { className: 'v-field v-select' }, p.label ? h('span', { className: 'v-label t-label' }, p.label) : null,
      h('button', { type: 'button', className: cx('v-input v-sel-trig', p.disabled && 'dis'), 'aria-haspopup': 'listbox', 'aria-expanded': open, disabled: p.disabled, onClick: function () { st[1](!open); } }, h('span', { className: cx('t-input v-date-t', !cur && 'v-muted') }, cur ? cur.label : (p.placeholder || 'Select')), h(Icon, { name: open ? 'chev-u' : 'chev-d', size: 18 })),
      open ? h('ul', { className: 'v-pop', role: 'listbox' }, p.options.map(function (o) { var on = o.id === val; return h('li', { key: o.id, role: 'option', 'aria-selected': on, className: cx('v-opt t-body', on && 'on'), tabIndex: 0, onClick: function () { (p.onChange || vs[1])(o.id); st[1](false); } }, h('span', null, o.label), on ? h(Icon, { name: 'check', size: 18 }) : null); })) : null);
  }

  /* ---------- Surfaces ---------- */
  function Card(p) {
    var tag = p.tappable ? 'button' : 'div';
    return h(tag, { type: p.tappable ? 'button' : undefined, className: cx('v-cardx', p.tappable && 'tap', p.state === 'pressed' && 'is-pressed'), onClick: p.onClick },
      p.thumb ? h('div', { className: 'v-cardx-thumb' }, h(Icon, { name: 'play', size: 24 })) : null,
      h('div', { className: 'v-cardx-body' }, p.title ? h('div', { className: 't-body-strong' }, p.title) : null, p.meta ? h('div', { className: 't-label v-muted' }, p.meta) : null, p.children), p.tappable ? h(Icon, { name: 'chev-r', size: 20 }) : null);
  }

  function ListRow(p) {
    var lead = p.leading === 'avatar' ? h(Avatar, { name: p.title, size: 'md' }) : p.leading === 'thumb' ? h('span', { className: 'v-thumb' }, h(Icon, { name: 'play', size: 16 })) : p.leading;
    var row = h('div', { className: cx('v-row', p.onClick && 'tap', p.dragging && 'drag', p.swiped && 'swiped'), onClick: p.onClick, style: p.swiped ? { '--sw': (p.swipe.length * 72) + 'px' } : undefined },
      p.drag ? h('span', { className: 'v-grip', 'aria-label': 'Drag to reorder', role: 'img' }, h(Icon, { name: 'grip', size: 22 })) : null, lead,
      h('div', { className: 'v-row-b' }, h('div', { className: 't-body-strong' }, p.title), p.subtitle ? h('div', { className: 't-label v-muted' }, p.subtitle) : null),
      p.trailing, p.chevron ? h(Icon, { name: 'chev-r', size: 20 }) : null);
    if (!p.swipe) return row;
    return h('div', { className: 'v-swipe' }, row, h('div', { className: 'v-swipe-acts' }, p.swipe.map(function (a, i) { return h('button', { key: i, type: 'button', className: cx('v-swipe-a t-chip', a.tone === 'danger' && 'danger'), onClick: a.onClick }, h(Icon, { name: a.icon, size: 22 }), a.label); })));
  }

  function DataTable(p) {
    var cols = p.columns, rows = p.rows || [];
    return h('div', { className: 'v-tablewrap' }, h('table', { className: 'v-table' },
      h('thead', null, h('tr', null, cols.map(function (c) {
        var on = p.sortKey === c.key;
        return h('th', { key: c.key, scope: 'col', 'aria-sort': on ? (p.sortDir === 'desc' ? 'descending' : 'ascending') : undefined, className: 't-caption', style: { textAlign: c.align || 'start', width: c.width } },
          c.sortable ? h('button', { type: 'button', className: cx('v-th-b', on && 'on'), onClick: function () { p.onSort && p.onSort(c.key); } }, c.label, h(Icon, { name: on ? (p.sortDir === 'desc' ? 'arrow-down' : 'arrow-up') : 'chev-d', size: 14 })) : c.label);
      }), p.rowActions ? h('th', { className: 'v-th-act' }, h('span', { className: 'v-sr' }, 'Actions')) : null)),
      h('tbody', null, p.loading ? [0, 1, 2, 3].map(function (i) { return h('tr', { key: i }, cols.map(function (c) { return h('td', { key: c.key }, h('div', { className: 'v-sk', style: { height: 16, width: '70%' } })); }), p.rowActions ? h('td', null) : null); })
        : rows.length === 0 ? h('tr', null, h('td', { colSpan: cols.length + (p.rowActions ? 1 : 0), className: 'v-table-empty t-body' }, p.emptyText || 'Nothing here yet.'))
        : rows.map(function (r) {
          return h('tr', { key: r.id, className: cx(r.id === p.selectedId && 'sel', p.hoverId === r.id && 'is-hover'), 'aria-selected': r.id === p.selectedId || undefined, onClick: function () { p.onRowClick && p.onRowClick(r.id); } },
            cols.map(function (c) { return h('td', { key: c.key, className: 't-body', style: { textAlign: c.align || 'start' } }, c.render ? c.render(r) : r[c.key]); }),
            p.rowActions ? h('td', { className: 'v-td-act' }, h(IconButton, { icon: 'dots', label: 'Row actions', size: 20 })) : null);
        }))));
  }

  function BottomSheet(p) {
    var s = h('div', { className: cx('v-sheet', p.height || 'half'), role: 'dialog', 'aria-label': p.title },
      h('div', { className: 'v-handle', 'aria-hidden': 'true' }),
      p.title ? h('div', { className: 'v-sheet-h' }, h('h2', { className: 't-heading' }, p.title), p.onClose ? h(IconButton, { icon: 'close', label: 'Close', onClick: p.onClose, size: 20 }) : null) : null,
      h('div', { className: 'v-sheet-b' }, p.children), p.footer ? h('div', { className: 'v-sheet-f' }, p.footer) : null);
    return p.overlay ? h('div', { className: 'v-overlay end' }, s) : s;
  }
  function Dialog(p) {
    var d = h('div', { className: 'v-dialog', role: p.tone === 'destructive' ? 'alertdialog' : 'dialog', 'aria-label': p.title },
      p.tone === 'destructive' ? h('span', { className: 'v-dialog-ic' }, h(Icon, { name: 'alert', size: 28 })) : null,
      h('h2', { className: 't-heading' }, p.title), h('div', { className: 't-body v-muted v-dialog-b' }, p.children), h('div', { className: 'v-dialog-a' }, p.actions));
    return p.overlay ? h('div', { className: 'v-overlay mid' }, d) : d;
  }

  /* ---------- Feedback ---------- */
  var TOASTI = { success: 'check', error: 'alert', info: 'info' };
  function Toast(p) {
    var tone = p.tone || 'info';
    return h('div', { className: cx('v-toast', tone), role: tone === 'error' ? 'alert' : 'status' }, h(Icon, { name: TOASTI[tone], size: 22 }), h('span', { className: 't-body-strong v-toast-t' }, p.message), p.action ? h('button', { type: 'button', className: 'v-toast-a t-body-strong', onClick: p.onAction }, p.action) : null);
  }
  var BN = { offline: ['wifi-off', 'danger'], update: ['refresh', 'text-blue'], install: ['plus', 'text-blue'], video: ['alert', 'danger'], error: ['alert', 'danger'] };
  function Banner(p) {
    var k = p.kind || 'info', m = BN[k] || ['info', 'text-blue'];
    return h('div', { className: 'v-banner', role: k === 'offline' || k === 'error' ? 'alert' : 'status' }, h('span', { style: { color: 'var(--' + m[1] + ')' }, className: 'v-banner-i' }, h(Icon, { name: m[0], size: 24 })),
      h('div', { className: 'v-banner-b' }, p.title ? h('div', { className: 't-body-strong' }, p.title) : null, h('div', { className: 't-label v-muted-ink' }, p.message)),
      p.action ? h(Button, { size: 'sm', variant: 'secondary', onClick: p.onAction }, p.action) : null,
      p.onDismiss ? h(IconButton, { icon: 'close', label: 'Dismiss', onClick: p.onDismiss, size: 18 }) : null);
  }

  var SC = {
    assignment: { not_started: ['circle', 'Not started', 'muted'], in_progress: ['clock', 'In progress', 'text-blue'], completed: ['check', 'Completed', 'text-green'], skipped: ['skip', 'Skipped', 'muted'] },
    link: { ok: ['check', 'Link OK', 'text-green'], unavailable: ['alert', 'Unavailable', 'danger'], unchecked: ['clock', 'Unchecked', 'muted'] },
    package: { active: ['check', 'Active', 'text-green'], expiring: ['alert', 'Expiring soon', 'warning'], expired: ['close', 'Expired', 'danger'] },
    wearable: { connected: ['check', 'Connected', 'text-green'], disconnected: ['wifi-off', 'Disconnected', 'muted'], error: ['alert', 'Needs reconnect', 'danger'] }
  };
  function StatusChip(p) {
    var m = (SC[p.kind] || {})[p.value] || ['info', p.value, 'muted'];
    return h('span', { className: 'v-schip t-chip' }, h('span', { style: { color: 'var(--' + m[2] + ')' }, className: 'v-schip-i' }, h(Icon, { name: m[0], size: 16 })), p.label || m[1]);
  }

  function Avatar(p) {
    var size = p.size || 'md', parts = (p.name || '?').split(' '), ini = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    return h('span', { className: cx('v-av', 'v-av-' + size), role: 'img', 'aria-label': p.name }, p.src ? h('img', { src: p.src, alt: '' }) : h('span', { className: 't-chip v-av-i' }, ini),
      p.dot ? h('span', { className: cx('v-av-dot', p.dot), title: p.dot }, p.dot === 'error' ? '!' : null) : null);
  }

  function EmptyState(p) {
    return h('div', { className: 'v-empty' }, h('span', { className: 'v-empty-ic' }, h(Icon, { name: p.icon || 'info', size: 32 })), h('h3', { className: 't-heading' }, p.title), p.body ? h('p', { className: 't-body v-muted' }, p.body) : null, p.action ? h(Button, { size: 'md', onClick: p.onAction }, p.action) : null);
  }
  function Skeleton(p) {
    var v = p.variant || 'list', sk = function (w, hh, k, r) { return h('div', { key: k, className: 'v-sk', style: { width: w, height: hh, borderRadius: r } }); };
    if (v === 'card') return h('div', { className: 'v-cardx v-sk-card', 'aria-busy': 'true' }, sk('100%', 140, 0, 16), sk('60%', 18, 1), sk('40%', 14, 2));
    if (v === 'chart') return h('div', { className: 'v-cardx v-sk-card', 'aria-busy': 'true' }, sk('40%', 18, 0), sk('100%', 160, 1, 16));
    if (v === 'detail') return h('div', { className: 'v-sk-card', 'aria-busy': 'true' }, sk('100%', 200, 0, 16), sk('70%', 28, 1), sk('100%', 16, 2), sk('92%', 16, 3), sk('80%', 16, 4));
    return h('div', { className: 'v-sk-list', 'aria-busy': 'true', 'aria-label': 'Loading' }, Array.apply(null, Array(p.rows || 4)).map(function (_, i) { return h('div', { key: i, className: 'v-sk-row' }, sk(48, 48, 'a', 24), h('div', { style: { flex: 1, display: 'grid', gap: 8 } }, sk('60%', 16, 'b'), sk('35%', 12, 'c'))); }));
  }
  function ErrorState(p) {
    return h('div', { className: cx('v-empty err', p.inline && 'inline'), role: 'alert' }, h('span', { className: 'v-empty-ic' }, h(Icon, { name: p.icon || 'alert', size: p.inline ? 22 : 32 })), h('div', { className: 'v-err-b' }, h('h3', { className: p.inline ? 't-body-strong' : 't-heading' }, p.title || 'Something went wrong'), h('p', { className: 't-body v-muted' }, p.body || "We couldn't load this. Check your connection and try again.")), h(Button, { size: p.inline ? 'sm' : 'md', variant: 'secondary', icon: 'refresh', onClick: p.onRetry }, 'Try again'));
  }

  /* ---------- Video and exercises ---------- */
  function VideoPreview(p) {
    var s = p.state || 'ready', compact = p.size === 'compact', prov = p.provider || 'YouTube';
    var msg = s === 'unavailable' ? "This video isn't available right now. Your coach has been notified." : s === 'blocked' ? "The owner doesn't allow this video to play here." : null;
    return h('div', { className: cx('v-vid', compact && 'compact', s) , role: 'group', 'aria-label': (p.title || 'Video') + ', ' + s },
      s === 'loading' ? h('div', { className: 'v-sk v-vid-fill' }) : null,
      s === 'ready' ? h('span', { className: 'v-play' }, h(Icon, { name: 'play', size: compact ? 16 : 30 })) : null,
      s === 'playing' ? [h('span', { key: 'p', className: 'v-vid-live t-chip' }, h(Icon, { name: 'play', size: 14 }), 'Playing'), h('div', { key: 'b', className: 'v-vid-bar' }, h('div', { style: { width: '38%' } }))] : null,
      msg && !compact ? h('div', { className: 'v-vid-msg' }, h(Icon, { name: 'alert', size: 28 }), h('p', { className: 't-body' }, msg), h('a', { className: 'v-vid-link t-body-strong', href: '#' }, 'Open on ' + prov, h(Icon, { name: 'external', size: 16 }))) : null,
      msg && compact ? h(Icon, { name: 'alert', size: 18 }) : null,
      !compact && s !== 'loading' ? h('span', { className: 'v-vid-prov t-chip' }, prov) : null);
  }

  var MEAS = { reps: 'Reps', weight_reps: 'Weight & reps', time: 'Time', distance: 'Distance', rounds: 'Rounds' };
  function ExerciseRow(p) {
    var v = p.variant || 'library';
    return h('div', { className: cx('v-ex', v, p.selected && 'sel') },
      v === 'block' && p.drag !== false ? h('span', { className: 'v-grip', role: 'img', 'aria-label': 'Drag to reorder' }, h(Icon, { name: 'grip', size: 22 })) : null,
      h(VideoPreview, { size: 'compact', state: p.link === 'unavailable' ? 'unavailable' : 'ready' }),
      h('div', { className: 'v-ex-b' }, h('div', { className: 't-body-strong' }, p.name),
        v === 'block' && p.target ? h('div', { className: 't-label v-muted-ink' }, p.target) : h('div', { className: 'v-ex-tags t-caption v-muted' }, (p.tags || []).join(' · '), p.measuredAs ? ' · ' + MEAS[p.measuredAs] : ''),
        p.link && p.link !== 'ok' ? h(StatusChip, { kind: 'link', value: p.link }) : null),
      v === 'add' ? h('span', { className: cx('v-pick', p.selected && 'on'), 'aria-hidden': 'true' }, p.selected ? h(Icon, { name: 'check', size: 18 }) : null) : null,
      p.log ? h('div', { className: 'v-ex-log' }, p.log) : null);
  }

  var BT = { standard: ['Standard', 'dumbbell'], amrap: ['AMRAP', 'clock'], emom: ['EMOM', 'clock'], for_time: ['For Time', 'clock'], tabata: ['Tabata', 'clock'], custom: ['Custom', 'list'] };
  function summarize(type, v) {
    v = v || {};
    if (type === 'amrap') return 'As many rounds as possible in ' + (v.cap || 12) + ' min';
    if (type === 'emom') return 'Every ' + (v.interval || 60) + ' s for ' + (v.minutes || 10) + ' min';
    if (type === 'for_time') return (v.rounds || 5) + ' rounds' + (v.cap ? ', ' + v.cap + ' min cap' : ', no cap');
    if (type === 'tabata') return (v.work || 20) + ' s work, ' + (v.rest || 10) + ' s rest, ' + (v.rounds || 8) + ' rounds';
    if (type === 'custom') return (v.steps || []).length + ' steps';
    return 'Sets and reps';
  }
  function BlockHeader(p) {
    var m = BT[p.type] || BT.standard;
    return h('div', { className: 'v-bh' }, h('div', { className: 'v-bh-b' }, h('div', { className: 't-heading' }, p.title), h('div', { className: 'v-bh-m' }, h('span', { className: 'v-chip t-chip' }, h(Icon, { name: m[1], size: 14 }), m[0]), h('span', { className: 't-label v-muted-ink' }, p.summary || summarize(p.type, p.settings)))), h(IconButton, { icon: 'dots', label: 'Block options', size: 20 }));
  }

  function BlockSettings(p) {
    var t = p.type, st = useState(p.value || {}), v = st[0];
    function set(k) { return function (n) { var o = Object.assign({}, v); o[k] = n; st[1](o); p.onChange && p.onChange(o); }; }
    var f = [];
    if (t === 'standard') f.push(h('p', { key: 's', className: 't-body v-muted' }, 'Standard blocks have no timer settings. Set sets, reps and rest on each exercise.'));
    if (t === 'amrap') f.push(h(NumberField, { key: 'c', label: 'Time cap', unit: 'min', value: v.cap == null ? 12 : v.cap, onChange: set('cap'), min: 1 }));
    if (t === 'emom') f.push(h(NumberField, { key: 'm', label: 'Total minutes', unit: 'min', value: v.minutes == null ? 10 : v.minutes, onChange: set('minutes'), min: 1 }), h(NumberField, { key: 'i', label: 'Interval', unit: 's', step: 5, value: v.interval == null ? 60 : v.interval, onChange: set('interval'), min: 10 }));
    if (t === 'for_time') f.push(h(NumberField, { key: 'r', label: 'Rounds', value: v.rounds == null ? 5 : v.rounds, onChange: set('rounds'), min: 1 }), h(NumberField, { key: 'c', label: 'Time cap (optional)', unit: 'min', value: v.cap == null ? 0 : v.cap, onChange: set('cap') }));
    if (t === 'tabata') f.push(h(NumberField, { key: 'w', label: 'Work', unit: 's', step: 5, value: v.work == null ? 20 : v.work, onChange: set('work'), min: 5 }), h(NumberField, { key: 'r', label: 'Rest', unit: 's', step: 5, value: v.rest == null ? 10 : v.rest, onChange: set('rest') }), h(NumberField, { key: 'n', label: 'Rounds', value: v.rounds == null ? 8 : v.rounds, onChange: set('rounds'), min: 1 }));
    if (t === 'custom') {
      var steps = v.steps || [{ kind: 'Work', secs: 40 }, { kind: 'Rest', secs: 20 }];
      var ch = function (ns) { set('steps')(ns); };
      f.push(h('ol', { key: 'l', className: 'v-steps' }, steps.map(function (s, i) {
        return h('li', { key: i, className: 'v-step-row' }, h('span', { className: 'v-grip' }, h(Icon, { name: 'grip', size: 22 })),
          h('select', { className: 'v-mini t-input', value: s.kind, 'aria-label': 'Step kind', onChange: function (e) { ch(steps.map(function (x, j) { return j === i ? { kind: e.target.value, secs: x.secs } : x; })); } }, ['Work', 'Rest', 'Prepare'].map(function (k) { return h('option', { key: k }, k); })),
          h('input', { className: 'v-mini t-input narrow', inputMode: 'numeric', value: s.secs, 'aria-label': 'Seconds', onChange: function (e) { ch(steps.map(function (x, j) { return j === i ? { kind: x.kind, secs: parseInt(e.target.value, 10) || 0 } : x; })); } }), h('span', { className: 't-chip v-muted' }, 's'),
          h(IconButton, { icon: 'arrow-up', label: 'Move up', size: 18, onClick: function () { if (i) { var a = steps.slice(); a.splice(i - 1, 0, a.splice(i, 1)[0]); ch(a); } } }),
          h(IconButton, { icon: 'close', label: 'Remove step', size: 18, onClick: function () { ch(steps.filter(function (_, j) { return j !== i; })); } }));
      })), h(Button, { key: 'a', size: 'sm', variant: 'secondary', icon: 'plus', onClick: function () { ch(steps.concat([{ kind: 'Work', secs: 30 }])); } }, 'Add step'));
      return h('div', { className: 'v-bset' }, f, h('p', { className: 't-label v-muted-ink' }, summarize('custom', { steps: steps })));
    }
    return h('div', { className: 'v-bset' }, h('div', { className: 'v-bset-g' }, f), t !== 'standard' ? h('p', { className: 't-label v-muted-ink v-bset-sum' }, summarize(t, v)) : null);
  }

  function TargetEditor(p) {
    var mt = p.measuredAs || 'reps', timer = p.blockType && p.blockType !== 'standard', f = [];
    if (!timer) f.push(['Sets', 3, ''], mt === 'time' ? ['Duration', 45, 's'] : mt === 'distance' ? ['Distance', 500, 'm'] : mt === 'rounds' ? ['Rounds', 3, ''] : ['Reps', 8, '']);
    else f.push(mt === 'time' ? ['Duration', 30, 's'] : mt === 'distance' ? ['Distance', 200, 'm'] : mt === 'rounds' ? ['Rounds', 1, ''] : ['Reps', 10, '']);
    if (!timer) f.push(['Rest', 90, 's']);
    var fields = f.map(function (x) { return h(NumberField, { key: x[0], label: x[0], unit: x[2], defaultValue: x[1], step: x[2] === 's' ? 5 : x[2] === 'm' ? 50 : 1 }); });
    return h('div', { className: 'v-target' }, h('div', { className: 'v-target-g' }, fields),
      mt === 'weight_reps' ? h(TextField, { label: 'Load note', placeholder: 'e.g. 80% of 1RM' }) : null,
      h(TextField, { label: 'Notes', placeholder: 'Cues for this exercise', multiline: true }));
  }

  var LCOL = { reps: ['Reps'], weight_reps: ['Kg', 'Reps'], time: ['Time'], distance: ['Meters'], rounds: ['Rounds'] };
  function LogInput(p) {
    var mt = p.measuredAs || 'reps', cols = LCOL[mt], init = p.sets || [{ v: [], done: false }], st = useState(init), sets = st[0];
    function upd(i, k, val) { st[1](sets.map(function (s, j) { if (j !== i) return s; var n = { v: s.v.slice(), done: s.done }; if (k === 'done') n.done = val; else n.v[k] = val; return n; })); }
    return h('div', { className: 'v-log' }, sets.map(function (s, i) {
      return h('div', { key: i, className: cx('v-set', s.done && 'done') }, h('span', { className: 't-chip v-muted v-set-n' }, 'Set ' + (i + 1)),
        cols.map(function (c, k) { return h('label', { key: k, className: 'v-set-f' }, h('span', { className: 't-caption v-muted' }, c), h('input', { className: 'v-set-in t-metric', inputMode: mt === 'time' ? 'text' : 'numeric', value: s.v[k] == null ? '' : s.v[k], placeholder: (p.target && p.target[k]) || '0', onChange: function (e) { upd(i, k, e.target.value); }, 'aria-label': 'Set ' + (i + 1) + ' ' + c })); }),
        h('button', { type: 'button', className: cx('v-set-done', s.done && 'on'), 'aria-pressed': s.done, 'aria-label': 'Mark set ' + (i + 1) + ' done', onClick: function () { upd(i, 'done', !s.done); } }, h(Icon, { name: 'check', size: 26 })),
        sets.length > 1 ? h(IconButton, { icon: 'close', label: 'Remove set', size: 18, onClick: function () { st[1](sets.filter(function (_, j) { return j !== i; })); } }) : null);
    }), h(Button, { size: 'md', variant: 'secondary', icon: 'plus', onClick: function () { st[1](sets.concat([{ v: [], done: false }])); } }, 'Add set'));
  }

  /* ---------- Calendar ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function Dots(p) { return h('span', { className: 'v-sds', 'aria-hidden': 'true' }, (p.list || []).slice(0, 3).map(function (s, i) { return h('i', { key: i, className: 'v-sd ' + s }); })); }
  function Calendar(p) {
    var mode = p.mode || 'month', loc = p.locale || 'en', ws = p.weekStart == null ? 1 : p.weekStart, today = p.today || '2026-10-12', st = useState(p.selected || today), sel = p.selected || st[0], data = p.data || {};
    var set = p.onSelect || st[1], anchor = new Date((p.month || today.slice(0, 7) + '-01') + 'T12:00:00'), days = [], i;
    if (mode === 'week') { var b = new Date(sel + 'T12:00:00'); b.setDate(b.getDate() - ((b.getDay() - ws + 7) % 7)); for (i = 0; i < 7; i++) { var d = new Date(b); d.setDate(b.getDate() + i); days.push(d); } }
    else { var f = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12), lead = (f.getDay() - ws + 7) % 7, n = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate(); for (i = 0; i < lead; i++) days.push(null); for (i = 1; i <= n; i++) days.push(new Date(anchor.getFullYear(), anchor.getMonth(), i, 12)); }
    var wd = []; for (i = 0; i < 7; i++) { var w = new Date(2026, 9, 11 + ws + i, 12); wd.push(new Intl.DateTimeFormat(loc, { weekday: 'narrow' }).format(w)); }
    var title = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(anchor), ag = (p.agenda || data[sel + ':agenda'] || []);
    return h('div', { className: cx('v-cal', mode) },
      h('div', { className: 'v-cal-h' }, h('h3', { className: 't-heading' }, mode === 'week' ? new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(new Date(sel + 'T12:00:00')) : title), h('span', { className: 'v-cal-nav' }, h(IconButton, { icon: 'chev-l', label: 'Previous', size: 20 }), h(IconButton, { icon: 'chev-r', label: 'Next', size: 20 }))),
      h('div', { className: 'v-cal-g', role: 'grid' }, wd.map(function (x, k) { return h('span', { key: 'w' + k, className: 't-caption v-muted v-cal-wd', role: 'columnheader' }, x); }),
        days.map(function (d, k) {
          if (!d) return h('span', { key: 'e' + k });
          var key = iso(d), on = key === sel, td = key === today;
          return h('button', { key: key, type: 'button', role: 'gridcell', 'aria-selected': on, 'aria-current': td ? 'date' : undefined, className: cx('v-cal-d', on && 'on', td && 'today'), onClick: function () { set(key); } }, h('span', { className: 't-body-strong v-num' }, d.getDate()), h(Dots, { list: data[key] }));
        })),
      ag.length ? h('ul', { className: 'v-agenda' }, ag.map(function (a, k) { return h('li', { key: k }, h(ListRow, { title: a.title, subtitle: a.subtitle, trailing: h(StatusChip, { kind: 'assignment', value: a.status }), chevron: true })); })) : null);
  }

  /* ---------- Timer (always dark) ---------- */
  var TONE = { paused: 'var(--muted)', work: 'var(--brand)', rest: 'var(--blue)', ready: 'var(--ink)', final: 'var(--pink)' };
  function TimerDisplay(p) {
    var tone = p.final ? 'final' : p.paused ? 'paused' : (p.tone || 'work'), pr = Math.max(0, Math.min(1, p.progress == null ? 0.4 : p.progress)), R = 130, C = 2 * Math.PI * R, xl = p.size === 'xl';
    var ring = p.variant !== 'bar';
    return h('div', { className: cx('v-td', xl && 'xl', p.paused && 'paused', p.final && 'final'), 'data-theme': 'dark', style: { '--tone': TONE[tone] }, role: 'timer', 'aria-label': (p.phase || '') + ' ' + p.time },
      h('div', { className: 'v-td-phase t-eyebrow' }, p.paused ? [h(Icon, { key: 'i', name: 'pause', size: 22 }), ' Paused'] : p.phase),
      ring ? h('div', { className: 'v-td-ring' }, h('svg', { viewBox: '0 0 300 300', 'aria-hidden': 'true' }, h('circle', { cx: 150, cy: 150, r: R, fill: 'none', stroke: 'var(--surface-raised)', strokeWidth: 16 }), h('circle', { cx: 150, cy: 150, r: R, fill: 'none', stroke: 'var(--tone)', strokeWidth: 16, strokeLinecap: 'round', strokeDasharray: (C * pr) + ' ' + C, transform: 'rotate(-90 150 150)' })), h('div', { className: cx('v-td-num', xl ? 't-timer-xl' : 't-timer') }, p.time))
        : [h('div', { key: 'n', className: cx('v-td-num bar', xl ? 't-timer-xl' : 't-timer') }, p.time), h('div', { key: 'b', className: 'v-td-bar' }, h('div', { style: { width: (pr * 100) + '%' } }))],
      p.sub ? h('div', { className: 'v-td-sub t-eyebrow' }, p.sub) : null);
  }

  function RoundCounter(p) {
    var st = useState(p.count == null ? 0 : p.count), n = p.count != null && p.onChange ? p.count : st[0], set = p.onChange || st[1];
    return h('div', { className: 'v-rc', 'data-theme': 'dark' }, h('button', { type: 'button', className: 'v-rc-b', 'aria-label': 'Remove a round', onClick: function () { set(Math.max(0, n - 1)); } }, h('span', { className: 't-metric' }, '−1')),
      h('div', { className: 'v-rc-n' }, h('span', { className: 't-timer v-num' }, n), h('span', { className: 't-eyebrow' }, n === 1 ? 'round' : 'rounds')),
      h('button', { type: 'button', className: 'v-rc-b plus', 'aria-label': 'Add a round', onClick: function () { set(n + 1); } }, h('span', { className: 't-metric' }, '+1')),
      p.extra ? h('div', { className: 'v-rc-x' }, h(NumberField, { label: 'Extra reps', defaultValue: 0 })) : null);
  }

  function RestTimer(p) {
    var tot = p.total || 90, rem = p.remaining == null ? 62 : p.remaining, m = Math.floor(rem / 60), s = rem % 60;
    return h('div', { className: 'v-rest', 'data-theme': 'dark' }, h(TimerDisplay, { time: m + ':' + pad(s), phase: 'Rest', tone: 'rest', progress: rem / tot, final: rem <= 10 }),
      h('div', { className: 'v-rest-a' }, h(Button, { size: 'md', variant: 'secondary', onClick: p.onSub }, '−15 s'), h(Button, { size: 'md', variant: 'secondary', onClick: p.onAdd }, '+15 s'), h(Button, { size: 'md', icon: 'skip', onClick: p.onSkip }, 'Skip')),
      p.next ? h('div', { className: 'v-rest-n t-label v-muted' }, 'Next: ', h('b', { className: 'v-ink' }, p.next)) : null);
  }

  function Tgl(p) { return h('button', { type: 'button', className: 'v-tgl', 'aria-pressed': p.on, 'aria-label': p.label, onClick: p.onClick }, h(Icon, { name: p.on ? p.icon : p.off, size: 26 }), h('span', { className: 't-caption' }, p.label)); }
  function TimerControls(p) {
    var s = p.state || 'ready', sound = p.sound !== false, voice = !!p.voice, ka = p.keepAwake || 'on';
    var main = s === 'ready' ? h('button', { type: 'button', className: 'v-big', onClick: p.onStart, 'aria-label': 'Start' }, h(Icon, { name: 'play', size: 48 }), h('span', { className: 't-button' }, 'Start'))
      : s === 'running' ? h('button', { type: 'button', className: 'v-big', onClick: p.onPause, 'aria-label': 'Pause' }, h(Icon, { name: 'pause', size: 48 }), h('span', { className: 't-button' }, 'Pause'))
      : s === 'paused' ? h('div', { className: 'v-ctl-row' }, h('button', { type: 'button', className: 'v-big sec', onClick: p.onStop, 'aria-label': 'Stop' }, h(Icon, { name: 'stop', size: 36 }), h('span', { className: 't-button' }, 'Stop')), h('button', { type: 'button', className: 'v-big', onClick: p.onResume, 'aria-label': 'Resume' }, h(Icon, { name: 'play', size: 36 }), h('span', { className: 't-button' }, 'Resume')))
      : h('button', { type: 'button', className: 'v-big', onClick: p.onFinish, 'aria-label': 'Finish' }, h(Icon, { name: 'check', size: 48 }), h('span', { className: 't-button' }, 'Finish'));
    return h('div', { className: 'v-ctl', 'data-theme': 'dark' }, main, h('div', { className: 'v-ctl-t' }, h(Tgl, { on: sound, icon: 'volume', off: 'volume-off', label: 'Sound', onClick: p.onSound }), h(Tgl, { on: voice, icon: 'mic', off: 'mic', label: 'Voice', onClick: p.onVoice }),
      h('span', { className: cx('v-ka t-caption', ka) }, h(Icon, { name: 'sun', size: 18 }), ka === 'on' ? 'Screen stays on' : 'Screen may turn off')));
  }

  /* ---------- Wearables ---------- */
  function BrandChip(p) { return h('span', { className: 'v-brand t-chip' }, p.brand); }
  var MK = { sleep: ['Sleep', 'moon'], rhr: ['Resting heart rate', 'heart'], hrv: ['HRV', 'pulse'], strain: ['Strain', 'zap'], calories: ['Calories', 'flame'], avg_hr: ['Average heart rate', 'heart'], max_hr: ['Max heart rate', 'heart'], live_hr: ['Live heart rate', 'pulse'] };
  function MetricTile(p) {
    if (p.value == null) return null;
    var m = MK[p.kind] || [p.label, 'pulse'];
    return h('div', { className: cx('v-mt', p.live && 'live') }, h('div', { className: 'v-mt-h' }, h('span', { className: 'v-ink-pink' }, h(Icon, { name: m[1], size: 20 })), h('span', { className: 't-label v-muted-ink' }, p.label || m[0])),
      h('div', { className: 'v-mt-v' }, h('span', { className: 't-stat v-num' }, p.value), p.unit ? h('span', { className: 't-label v-muted' }, p.unit) : null), p.brand ? h(BrandChip, { brand: p.brand }) : null);
  }

  var RL = { low: [1, 'arrow-down', 'Low'], ok: [2, 'minus', 'OK'], high: [3, 'arrow-up', 'High'] };
  function ReadinessIndicator(p) {
    var m = RL[p.level] || RL.ok;
    return h('section', { className: 'v-ready', 'aria-label': 'Readiness' }, h('div', { className: 'v-ready-h' }, h('span', { className: 't-chip v-muted-ink' }, 'Readiness'), p.brand ? h(BrandChip, { brand: p.brand }) : null),
      h('div', { className: 'v-ready-l' }, h('span', { className: 'v-ready-ic' }, h(Icon, { name: m[1], size: 24 })), h('span', { className: 't-heading' }, m[2]), h('span', { className: 'v-meter', role: 'img', 'aria-label': m[0] + ' of 3' }, [1, 2, 3].map(function (i) { return h('i', { key: i, className: i <= m[0] ? 'on' : '' }); }))),
      p.basedOn ? h('div', { className: 't-label v-muted-ink' }, 'Based on: ' + p.basedOn.join(', ')) : null,
      h('p', { className: 't-caption v-muted' }, 'A guide based on your recent sleep and recovery. Not medical advice.'));
  }

  function CapabilityList(p) {
    return h('ul', { className: 'v-caps' }, p.items.map(function (c) { return h('li', { key: c, className: 't-body-strong' }, h('span', { className: 'v-caps-c' }, h(Icon, { name: 'check', size: 16 })), c); }));
  }

  /* ---------- Social, data, misc ---------- */
  function CommentThread(p) {
    var st = useState(''), me = p.viewer || 'client', cs = p.comments || [];
    return h('div', { className: 'v-thread' }, cs.length === 0 ? h('p', { className: 't-body v-muted v-thread-e' }, 'No comments yet. Start the conversation about this workout.') : h('ul', { className: 'v-msgs' }, cs.map(function (c, i) {
      return h('li', { key: i, className: cx('v-bub', c.role, c.role === me && 'mine', c.failed && 'failed') }, h('div', { className: 't-caption v-bub-m' }, c.author, ' · ', c.time), h('div', { className: 't-body' }, c.text), c.failed ? h('div', { className: 't-caption v-bub-f' }, h(Icon, { name: 'alert', size: 14 }), 'Not sent. Tap to retry') : null);
    })),
      h('div', { className: 'v-comp' }, h('span', { className: 'v-input' }, h('input', { className: 't-input', value: st[0], placeholder: 'Write a comment', 'aria-label': 'Write a comment', onChange: function (e) { st[1](e.target.value); } })), h(IconButton, { icon: 'arrow-up', label: p.sending ? 'Sending' : 'Send comment', variant: 'action', size: 24, onClick: function () { p.onSend && p.onSend(st[0]); st[1](''); } })));
  }

  function PackageCard(p) {
    var s = p.state || 'active';
    if (s === 'none') return h('div', { className: 'v-cardx v-pkg' }, h('div', { className: 't-body-strong' }, 'No package'), h('p', { className: 't-label v-muted' }, 'No sessions are being tracked for this client yet.'));
    var left = p.total - p.used;
    return h('div', { className: 'v-cardx v-pkg' }, h('div', { className: 'v-pkg-h' }, h('div', { className: 't-heading' }, p.name), h(StatusChip, { kind: 'package', value: s })),
      h('div', { className: 'v-pkg-n' }, h('span', { className: 't-stat v-num' }, p.used), h('span', { className: 't-label v-muted' }, ' of ' + p.total + ' used · ' + left + ' left')),
      h('div', { className: 'v-prog', role: 'progressbar', 'aria-valuenow': p.used, 'aria-valuemin': 0, 'aria-valuemax': p.total }, h('div', { style: { width: (p.used / p.total * 100) + '%' } })),
      h('div', { className: 'v-pkg-f t-label' }, h('span', { className: 'v-muted-ink' }, h(Icon, { name: 'calendar', size: 16 }), ' ', p.expires), h('span', { className: 'v-muted-ink' }, h(Icon, { name: p.paid ? 'check' : 'clock', size: 16 }), ' ', p.paid ? 'Payment received' : 'Payment pending')));
  }

  function PersonalRecord(p) {
    return h('div', { className: cx('v-pr', p.isNew && 'new') }, h('span', { className: 'v-pr-ic' }, h(Icon, { name: 'trophy', size: 24 })), h('div', { className: 'v-pr-b' }, h('div', { className: 't-body-strong' }, p.exercise), h('div', { className: 't-caption v-muted' }, p.date)),
      h('div', { className: 'v-pr-v' }, p.isNew ? h('span', { className: 'v-newpr t-chip' }, 'New PR') : null, h('span', { className: 't-metric v-num' }, p.label)));
  }

  function ProgressChart(p) {
    var pts = p.points || [], st = useState(!!p.showTable), W = 320, H = 160, pad2 = 16;
    var xs = pts.map(function (q, i) { return pad2 + i * (W - 2 * pad2) / Math.max(1, pts.length - 1); }), ys = pts.map(function (q) { var mn = Math.min.apply(null, pts.map(function (z) { return z.y; })), mx = Math.max.apply(null, pts.map(function (z) { return z.y; })); return H - pad2 - (q.y - mn) / Math.max(1, mx - mn) * (H - 2 * pad2); });
    var d = xs.map(function (x, i) { return (i ? 'L' : 'M') + x + ' ' + ys[i]; }).join(' ');
    return h('figure', { className: 'v-chart' }, h('figcaption', { className: 'v-chart-h' }, h('span', { className: 't-body-strong' }, p.title), h('button', { type: 'button', className: 'v-link t-chip', onClick: function () { st[1](!st[0]); } }, st[0] ? 'View chart' : 'View as table')),
      st[0] ? h('table', { className: 'v-table v-chart-t' }, h('thead', null, h('tr', null, h('th', { className: 't-caption' }, 'Date'), h('th', { className: 't-caption' }, p.unit || 'Value'))), h('tbody', null, pts.map(function (q, i) { return h('tr', { key: i }, h('td', { className: 't-body' }, q.x), h('td', { className: 't-body v-num' }, q.y)); })))
        : h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': p.title + ': ' + pts.map(function (q) { return q.x + ' ' + q.y; }).join(', ') }, h('line', { x1: pad2, x2: W - pad2, y1: H - pad2, y2: H - pad2, stroke: 'var(--line)', strokeWidth: 2 }), h('path', { d: d, fill: 'none', stroke: 'var(--text-pink)', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }), xs.map(function (x, i) { return h('circle', { key: i, cx: x, cy: ys[i], r: i === pts.length - 1 ? 7 : 4, fill: i === pts.length - 1 ? 'var(--brand)' : 'var(--text-pink)', stroke: 'var(--bg)', strokeWidth: 2 }); })));
  }

  function Stepper(p) {
    return h('ol', { className: 'v-stp', 'aria-label': 'Progress' }, p.steps.map(function (s, i) {
      var st = i < p.current ? 'done' : i === p.current ? 'cur' : 'todo';
      return h('li', { key: i, className: cx('v-stp-i', st), 'aria-current': st === 'cur' ? 'step' : undefined }, h('span', { className: 'v-stp-d t-chip' }, st === 'done' ? h(Icon, { name: 'check', size: 16 }) : i + 1), h('span', { className: 't-chip v-stp-l' }, s));
    }));
  }

  function OverflowMenu(p) {
    var list = h('ul', { className: cx(p.as === 'sheet' ? 'v-menu sheet' : 'v-pop v-menu'), role: 'menu' }, p.items.map(function (it, i) { return h('li', { key: i, role: 'none' }, h('button', { type: 'button', role: 'menuitem', className: cx('v-opt t-body-strong', it.tone === 'danger' && 'danger'), onClick: it.onClick }, h(Icon, { name: it.icon, size: 22 }), it.label)); }));
    return p.as === 'sheet' ? h(BottomSheet, { height: 'half', title: p.title || 'Options' }, list) : h('div', { className: 'v-menu-wrap' }, h(IconButton, { icon: 'dots', label: 'More options', size: 20 }), list);
  }

  function Tooltip(p) {
    var st = useState(false), on = p.open || st[0];
    return h('span', { className: 'v-tipwrap', onMouseEnter: function () { st[1](true); }, onMouseLeave: function () { st[1](false); }, onFocus: function () { st[1](true); }, onBlur: function () { st[1](false); } }, p.children, on ? h('span', { className: cx('v-tip t-label', p.placement || 'top'), role: 'tooltip' }, p.text) : null);
  }

  function ReorderList(p) {
    var st = useState(p.items), items = st[0], dr = useState(null);
    function move(i, d) { var a = items.slice(), j = i + d; if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); st[1](a); p.onChange && p.onChange(a); }
    return h('ul', { className: 'v-ro-l' }, items.map(function (it, i) {
      var isD = p.dragging === it.id || dr[0] === i;
      return h('li', { key: it.id, className: cx('v-ro', isD && 'dragging'), draggable: true, onDragStart: function () { dr[1](i); }, onDragOver: function (e) { e.preventDefault(); }, onDrop: function () { if (dr[0] != null) { var a = items.slice(); a.splice(i, 0, a.splice(dr[0], 1)[0]); st[1](a); } dr[1](null); }, onDragEnd: function () { dr[1](null); } },
        p.dropAfter === it.id ? null : null, h('span', { className: 'v-grip', 'aria-hidden': 'true' }, h(Icon, { name: 'grip', size: 22 })), h('span', { className: 't-body-strong v-ro-t' }, it.label),
        h(IconButton, { icon: 'arrow-up', label: 'Move ' + it.label + ' up', size: 18, onClick: function () { move(i, -1); }, disabled: i === 0 }), h(IconButton, { icon: 'arrow-down', label: 'Move ' + it.label + ' down', size: 18, onClick: function () { move(i, 1); }, disabled: i === items.length - 1 }),
        p.dropAfter === it.id ? h('span', { className: 'v-drop', 'aria-hidden': 'true' }) : null);
    }));
  }

  /* ---------- Brand ---------- */
  var ASSETS = { emblem: 'data:image/png;base64,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', logotype: 'data:image/png;base64,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' };
  var LOGO_ASPECT = 5.4325;
  var BT2 = { 'brand-on-black': ['bt-bb', 'wm-brand', 'var(--brand-yellow)'], 'black-on-brand': ['bt-yb', 'wm-black', 'var(--brand-black)'], 'white-on-black': ['bt-wb', 'wm-white', 'var(--brand-white)'], 'indigo-on-beige': ['bt-ib', 'wm-indigo', 'var(--brand-indigo)'] };
  function Wordmark(p) {
    var tone = p.tone || 'brand-on-black', hgt = Math.round((p.size || 32) * 0.72);
    return h('span', { className: cx('v-wm', BT2[tone][1]), style: { height: hgt, width: Math.round(hgt * LOGO_ASPECT), '--src': 'url(' + (p.src || ASSETS.logotype) + ')' }, role: 'img', 'aria-label': 'Nimble' });
  }
  function Emblem(p) {
    var tone = p.tone || 'brand-on-black', size = p.size || 96, mode = p.mode || 'alpha';
    var inner = h('span', { className: 'v-emblem-img', role: 'img', 'aria-label': 'Nimble emblem', style: { '--src': 'url(' + (p.src || ASSETS.emblem) + ')', maskMode: mode, WebkitMaskMode: mode } });
    return h('span', { className: cx('v-emblem', p.bg && BT2[tone][0]), style: { width: size, height: size, color: BT2[tone][2] } }, inner);
  }
  function Lockup(p) {
    var tone = p.tone || 'brand-on-black', s = p.size || 56;
    return h('span', { className: cx('v-lockup', p.bg !== false && BT2[tone][0]), style: { gap: s * 0.35, padding: p.bg !== false ? s * 0.5 : 0 } }, h(Emblem, { src: p.src, tone: tone, size: s }), h(Wordmark, { tone: tone, size: s * 0.5 }));
  }
  function AppIcon(p) {
    var s = p.size || 180;
    return h('span', { className: cx('v-appicon', p.masked && 'masked'), style: { width: s, height: s }, role: 'img', 'aria-label': 'Nimble app icon' }, h(Emblem, { src: p.src, size: Math.round(s * 0.62) }));
  }
  function Splash(p) {
    return h('div', { className: 'v-splash', 'data-theme': 'dark' }, h(Emblem, { src: p.src, size: 96 }), h(Wordmark, { size: 28 }), h('span', { className: 'v-spin big', 'aria-label': 'Loading' }));
  }

  /* ---------- Nimble source components ---------- */
  function Headline(p) {
    return h('div', null,
      h('h1', { className: 'v-headline ' + (p.center ? 'v-center t-title' : 't-headline') }, p.children, p.accent ? h('span', { className: 'v-accent' }, p.accent) : null),
      p.subtitle ? h('p', { className: 'v-sub t-label' }, p.subtitle) : null);
  }
  function MetricPill(p) {
    return h('div', { className: 'v-pill' },
      h('div', { className: 'v-pill-face v-tone-' + (p.tone || 'brand') }, h(Icon, { name: p.icon, size: 34 })),
      h('div', { className: 'v-pill-val t-metric' }, p.value, p.unit ? ' ' + p.unit : ''),
      h('div', { className: 'v-pill-lbl t-label' }, p.label));
  }
  function StatCard(p) {
    return h('div', { className: 'v-card' },
      h('span', { className: 'v-ink-' + (p.tone || 'brand') }, h(Icon, { name: p.icon, size: 28 })),
      h('div', null, h('div', { className: 'v-card-val t-stat' }, p.value), h('div', { className: 'v-card-lbl t-label' }, p.label)));
  }
  function DotGrid(p) {
    var total = p.total || 21, done = p.done || 0, dots = [];
    for (var i = 0; i < total; i++) dots.push(h('span', { key: i, className: 'v-dot' + (i < done ? ' on' : '') }));
    return h('div', { role: 'img', 'aria-label': done + ' of ' + total + ' days completed' },
      h('div', { className: 'v-dots-cap t-caption' }, done + '/' + total + ' days'),
      h('div', { className: 'v-dots', style: { '--cols': p.columns || 7 } }, dots));
  }
  function TabBar(p) {
    return h('div', { className: 'v-tabs', role: 'tablist' },
      p.items.map(function (it) {
        return h('button', { key: it.id, type: 'button', role: 'tab', className: 'v-tab', 'aria-label': it.label, 'aria-selected': it.id === p.active, onClick: function () { p.onChange && p.onChange(it.id); } }, h(Icon, { name: it.icon, size: 26 }));
      }));
  }
  function GoalDial(p) {
    var v = p.value, step = p.step || 5, win = 30, ticks = [], nums = [];
    for (var k = -win; k <= win; k++) {
      var x = v + k, left = ((k + win) / (2 * win)) * 100 + '%', major = x % 10 === 0;
      ticks.push(h('span', { key: 't' + k, className: 'v-tick' + (k === 0 ? ' sel' : ''), style: { insetInlineStart: left, height: k === 0 ? 40 : major ? 24 : 14 } }));
      if (major || k === 0) nums.push(h('span', { key: 'n' + k, className: 'v-ruler-num t-caption' + (k === 0 ? ' sel' : ''), style: { insetInlineStart: left } }, x));
    }
    return h('div', { className: 'v-dial' },
      h('div', { className: 'v-dial-eyebrow t-eyebrow' }, p.label),
      h('div', { className: 'v-dial-row' },
        h(IconButton, { icon: 'chev-l', label: 'Decrease', onClick: function () { p.onChange && p.onChange(Math.max(p.min || 0, v - step)); } }),
        h('div', null, h('div', { className: 'v-dial-num t-display' }, v), h('div', { className: 'v-dial-unit t-eyebrow', style: { textAlign: 'center' } }, p.unit)),
        h(IconButton, { icon: 'chev-r', label: 'Increase', onClick: function () { p.onChange && p.onChange(Math.min(p.max || 999, v + step)); } })),
      h('div', { className: 'v-ruler' }, nums, ticks));
  }
  var ROUTE = 'M58 96 L36 86 Q24 82 26 66 L30 36 Q32 26 42 26 L150 26 L186 26 Q198 30 198 42 L200 70 Q200 80 190 80 L122 80 L100 96 Z';
  function RouteCard(p) {
    var ref = React.useRef(null), st = React.useState(null), pt = st[0], setPt = st[1], prog = p.progress == null ? 0.55 : p.progress;
    React.useEffect(function () {
      var el = ref.current; if (!el || !el.getTotalLength) return;
      var L = el.getTotalLength(), a = el.getPointAtLength(L * prog), b = el.getPointAtLength(Math.min(L, L * prog + 2));
      setPt({ x: a.x, y: a.y, r: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI });
    }, [prog]);
    var grid = [];
    for (var gx = 0; gx <= 240; gx += 24) grid.push(h('line', { key: 'x' + gx, x1: gx, y1: 0, x2: gx, y2: 120, stroke: 'var(--surface-control)', strokeWidth: 1 }));
    for (var gy = 0; gy <= 120; gy += 24) grid.push(h('line', { key: 'y' + gy, x1: 0, y1: gy, x2: 240, y2: gy, stroke: 'var(--surface-control)', strokeWidth: 1 }));
    return h('div', { className: 'v-route' },
      h('svg', { viewBox: '0 0 240 120', role: 'img', 'aria-label': 'Route, ' + Math.round(prog * 100) + ' percent complete' },
        grid,
        h('path', { d: ROUTE, fill: 'none', stroke: 'var(--surface-raised)', strokeWidth: 5, strokeLinejoin: 'round' }),
        h('path', { ref: ref, d: ROUTE, pathLength: 100, fill: 'none', stroke: 'var(--text-brand)', strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round', strokeDasharray: (prog * 100) + ' 100' }),
        h('g', { transform: 'translate(58 96)', style: { color: 'var(--text-blue)' } }, h('path', { d: 'M0 0V-14', stroke: 'currentColor', strokeWidth: 2 }), h('path', { d: 'M0 -14h10l-2.5 3.5L10 -7H0z', fill: 'currentColor' })),
        pt ? h('path', { d: 'M-6 -5L6 0L-6 5z', fill: 'var(--text-pink)', transform: 'translate(' + pt.x + ' ' + pt.y + ') rotate(' + pt.r + ')' }) : null),
      h('div', { className: 'v-route-stats' },
        h('div', { className: 'v-route-stat' }, h('div', { className: 'k t-caption' }, 'Time'), h('div', { className: 'v t-metric' }, p.time)),
        h('div', { className: 'v-route-stat r' }, h('div', { className: 'k t-caption' }, 'Distance'), h('div', { className: 'v t-metric' }, p.distance))));
  }

  window.Nimble = { Icon: Icon, Button: Button, IconButton: IconButton, PillNav: PillNav, Sidebar: Sidebar, TopBar: TopBar, TextField: TextField, SearchField: SearchField, NumberField: NumberField, DateField: DateField, Segmented: Segmented, UnderlineTabs: UnderlineTabs, Checkbox: Checkbox, Radio: Radio, Switch: Switch, Chip: Chip, TagInput: TagInput, Select: Select, Card: Card, ListRow: ListRow, DataTable: DataTable, BottomSheet: BottomSheet, Dialog: Dialog, Toast: Toast, Banner: Banner, StatusChip: StatusChip, Avatar: Avatar, EmptyState: EmptyState, Skeleton: Skeleton, ErrorState: ErrorState, VideoPreview: VideoPreview, ExerciseRow: ExerciseRow, BlockHeader: BlockHeader, BlockSettings: BlockSettings, TargetEditor: TargetEditor, LogInput: LogInput, Calendar: Calendar, TimerDisplay: TimerDisplay, RoundCounter: RoundCounter, RestTimer: RestTimer, TimerControls: TimerControls, MetricTile: MetricTile, BrandChip: BrandChip, ReadinessIndicator: ReadinessIndicator, CapabilityList: CapabilityList, CommentThread: CommentThread, PackageCard: PackageCard, PersonalRecord: PersonalRecord, ProgressChart: ProgressChart, Stepper: Stepper, OverflowMenu: OverflowMenu, Tooltip: Tooltip, ReorderList: ReorderList, Wordmark: Wordmark, Emblem: Emblem, Lockup: Lockup, AppIcon: AppIcon, Splash: Splash, Headline: Headline, MetricPill: MetricPill, StatCard: StatCard, DotGrid: DotGrid, TabBar: TabBar, GoalDial: GoalDial, RouteCard: RouteCard, summarize: summarize };
})();
