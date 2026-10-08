import type { apiKeyListItemType } from '../services/apiKeys';
import type { emailTemplateMetaType } from '../services/emailTemplates';
import type { managementUserType } from './session';

// ***************************************************************************************************************

/**
 * Server-rendered HTML for /api/management. Deliberately dependency-free:
 * no bundler, no framework, and no inline scripts (Helmet's CSP forbids
 * them) — the only JS is the tiny external `assets/app.js` for copy buttons
 * and confirmation prompts, and every page still works without it.
 */

export const h = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const fmtDate = (value: Date | string | null | undefined) => {
    if (!value) return '—';

    const date = value instanceof Date ? value : new Date(value);

    return new Intl.DateTimeFormat('pt-PT', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Luanda'
    }).format(date);
};

const fmtRelative = (value: Date | null) => {
    if (!value) return 'never';

    const seconds = Math.round((Date.now() - value.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;

    return `${Math.floor(seconds / 86400)} d ago`;
};

export type flashType = { kind: 'ok' | 'error' | 'warn', message: string };

const STYLES = `
:root{--bg:#f4f6f9;--surface:#fff;--text:#14181f;--muted:#5d6675;--line:#dfe3ea;--primary:#0b5196;--primary-ink:#fff;--accent:#9b0808;--ok:#1d6b2c;--ok-bg:#e6f4e8;--warn:#7a5a00;--warn-bg:#fff6cc;--err:#9b0808;--err-bg:#fbe9e9;--code:#eef1f5;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#0e1116;--surface:#161a21;--text:#e6e9ef;--muted:#9aa3b2;--line:#2a303b;--primary:#61a7ec;--primary-ink:#05223d;--accent:#ff8a8a;--ok:#8dd751;--ok-bg:#16260f;--warn:#fbe200;--warn-bg:#2a2600;--err:#ff8a8a;--err-bg:#2c1414;--code:#1f2430}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--primary)}
header.top{background:var(--surface);border-bottom:1px solid var(--line)}
header.top .in{max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px}
.brand small{display:block;font-weight:400;letter-spacing:0;text-transform:none;color:var(--muted)}
nav{display:flex;gap:4px;flex:1}
nav a{padding:6px 10px;border-radius:6px;text-decoration:none;color:var(--muted)}
nav a.on{background:var(--code);color:var(--text);font-weight:600}
.who{display:flex;gap:10px;align-items:center;color:var(--muted)}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:20px;margin:0 0 4px}
h2{font-size:15px;margin:0 0 12px}
.sub{color:var(--muted);margin:0 0 20px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:20px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin:0 0 4px}
input,select,textarea{width:100%;font:inherit;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px}
button,.btn{display:inline-block;font:inherit;font-weight:600;border:1px solid transparent;border-radius:6px;padding:8px 14px;background:var(--primary);color:var(--primary-ink);cursor:pointer;text-decoration:none;white-space:nowrap}
button.ghost,.btn.ghost{background:transparent;color:var(--text);border-color:var(--line)}
button.danger{background:transparent;color:var(--err);border-color:var(--err)}
button.small{padding:4px 10px;font-size:12px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}
code,.mono{font-family:var(--mono);font-size:12.5px}
code{background:var(--code);padding:2px 6px;border-radius:4px}
.pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;text-transform:uppercase;letter-spacing:.04em}
.pill.active{background:var(--ok-bg);color:var(--ok)}
.pill.expired{background:var(--warn-bg);color:var(--warn)}
.pill.revoked{background:var(--err-bg);color:var(--err)}
.pill.lvl-error{background:var(--err-bg);color:var(--err)}
.pill.lvl-warn{background:var(--warn-bg);color:var(--warn)}
.pill.lvl-info,.pill.lvl-http{background:var(--code);color:var(--muted)}
.flash{border-radius:8px;padding:12px 14px;margin:0 0 20px;border:1px solid}
.flash.ok{background:var(--ok-bg);color:var(--ok);border-color:var(--ok)}
.flash.warn{background:var(--warn-bg);color:var(--warn);border-color:var(--warn)}
.flash.error{background:var(--err-bg);color:var(--err);border-color:var(--err)}
.secret{display:flex;gap:8px;align-items:center;margin:10px 0}
.secret input{font-family:var(--mono);font-size:13px}
.muted{color:var(--muted)}
.row{display:flex;gap:12px;align-items:end;flex-wrap:wrap}
.row>*{flex:1}
.row>.shrink{flex:0}
details summary{cursor:pointer;color:var(--muted)}
pre{background:var(--code);padding:10px;border-radius:6px;overflow:auto;font-family:var(--mono);font-size:12px;margin:6px 0 0;white-space:pre-wrap;word-break:break-all}
.login{max-width:360px;margin:12vh auto}
.login .card{padding:28px}
.inline{display:inline}
`;

export const page = ({
    title,
    base,
    manager,
    active,
    flash,
    body
}: {
    title: string;
    base: string;
    manager?: managementUserType;
    active?: 'keys' | 'logs' | 'emails';
    flash?: flashType | null;
    body: string;
}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${h(title)} · Madeirense management</title>
<style>${STYLES}</style>
<script src="${h(base)}/assets/app.js" defer></script>
</head>
<body>
${manager ? `<header class="top"><div class="in">
  <div class="brand">Madeirense<small>API management</small></div>
  <nav>
    <a href="${h(base)}/" class="${active === 'keys' ? 'on' : ''}">API keys</a>
    <a href="${h(base)}/logs" class="${active === 'logs' ? 'on' : ''}">Logs</a>
    <a href="${h(base)}/emails" class="${active === 'emails' ? 'on' : ''}">E-mails</a>
  </nav>
  <div class="who"><span>${h(manager.name)}</span>
    <form method="post" action="${h(base)}/logout" class="inline"><button class="ghost small" type="submit">Sign out</button></form>
  </div>
</div></header>` : ''}
<main>
${flash ? `<div class="flash ${flash.kind}">${h(flash.message)}</div>` : ''}
${body}
</main>
</body>
</html>`;

// --------------------------------------------------------------------------------------------- Login

export const loginView = ({ base, error, next }: { base: string, error?: string, next?: string }) => page({
    title: 'Sign in',
    base,
    body: `<div class="login">
  <div class="card">
    <div class="brand" style="margin:0 0 18px">Madeirense<small>API management</small></div>
    ${error ? `<div class="flash error">${h(error)}</div>` : ''}
    <form method="post" action="${h(base)}/login">
      <input type="hidden" name="next" value="${h(next ?? '')}">
      <p><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required autofocus></p>
      <p><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></p>
      <button type="submit" style="width:100%">Sign in</button>
    </form>
    <p class="muted" style="margin:16px 0 0;font-size:12px">Admin accounts only. Attempts are rate-limited and logged.</p>
  </div>
</div>`
});

// --------------------------------------------------------------------------------------------- Keys

const USAGE_LABEL: Record<string, string> = {
    web: 'Web app',
    mobile: 'Mobile app',
    developer: 'Developer',
    shareholder: 'Shareholder',
    service: 'Service / script',
    other: 'Other'
};

export const keysView = ({
    base,
    manager,
    keys,
    showAll,
    created,
    flash,
    mode
}: {
    base: string;
    manager: managementUserType;
    keys: apiKeyListItemType[];
    showAll: boolean;
    created?: { name: string, plain: string } | null;
    flash?: flashType | null;
    mode: string;
}) => page({
    title: 'API keys',
    base,
    manager,
    active: 'keys',
    flash,
    body: `
<h1>API keys</h1>
<p class="sub">Every request to <code>/api/v1/*</code> must send a valid key in the <code>x-api-key</code> header. Enforcement mode: <strong>${h(mode)}</strong>${mode !== 'enforce' ? ' — requests without a key are currently <em>not</em> rejected (set <code>API_KEY_MODE=enforce</code>).' : '.'}</p>

${created ? `<div class="card" style="border-color:var(--ok)">
  <h2>Key created for “${h(created.name)}”</h2>
  <p class="muted" style="margin:0">Copy it now — it is stored hashed and <strong>will never be shown again</strong>.</p>
  <div class="secret">
    <input id="new-key" type="text" readonly value="${h(created.plain)}">
    <button type="button" class="shrink" data-copy="#new-key">Copy</button>
  </div>
  <p class="muted" style="margin:0">Use it as a request header: <code>x-api-key: ${h(created.plain.slice(0, 15))}…</code></p>
</div>` : ''}

<div class="card">
  <h2>Generate a key</h2>
  <form method="post" action="${h(base)}/keys">
    <div class="grid">
      <div><label for="name">Name</label><input id="name" name="name" required maxlength="100" placeholder="e.g. Web app — production"></div>
      <div><label for="usage_type">Used by</label><select id="usage_type" name="usage_type">
        ${Object.entries(USAGE_LABEL).map(([value, label]) => `<option value="${value}">${h(label)}</option>`).join('')}
      </select></div>
      <div><label for="expires_in">Expires</label><select id="expires_in" name="expires_in">
        <option value="30">in 30 days</option>
        <option value="90">in 90 days</option>
        <option value="365" selected>in 1 year</option>
        <option value="730">in 2 years</option>
        <option value="never">never</option>
      </select></div>
    </div>
    <p style="margin:12px 0"><label for="description">Notes (optional)</label><input id="description" name="description" maxlength="500" placeholder="Who has it, where it's deployed…"></p>
    <button type="submit">Generate key</button>
  </form>
</div>

<div class="card">
  <div class="row" style="margin:0 0 12px">
    <h2 style="margin:0">${showAll ? 'All keys' : 'Active keys'} <span class="muted">(${keys.length})</span></h2>
    <div class="shrink"><a class="btn ghost" href="${h(base)}/${showAll ? '' : '?all=1'}">${showAll ? 'Hide revoked/expired' : 'Show revoked/expired'}</a></div>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Key</th><th>Status</th><th>Requests</th><th>Last used</th><th>Expires</th><th>Created</th><th></th></tr></thead>
    <tbody>
    ${keys.length === 0 ? `<tr><td colspan="8" class="muted">No keys yet.</td></tr>` : keys.map(key => `<tr>
      <td><strong>${h(key.name)}</strong><br><span class="muted">${h(USAGE_LABEL[key.usage_type] ?? key.usage_type)}</span>${key.description ? `<br><span class="muted">${h(key.description)}</span>` : ''}</td>
      <td><code>${h(key.key_prefix)}…</code></td>
      <td><span class="pill ${key.status}">${key.status}</span>${key.revoked_at ? `<br><span class="muted">${fmtDate(key.revoked_at)}${key.revoked_by_name ? ` by ${h(key.revoked_by_name)}` : ''}</span>` : ''}</td>
      <td class="mono">${key.usage_count.toLocaleString('en')}</td>
      <td>${fmtRelative(key.last_used_at)}${key.last_used_ip ? `<br><span class="muted mono">${h(key.last_used_ip)}</span>` : ''}</td>
      <td>${key.expires_at ? fmtDate(key.expires_at) : 'never'}</td>
      <td>${fmtDate(key.created_at)}${key.created_by_name ? `<br><span class="muted">by ${h(key.created_by_name)}</span>` : ''}</td>
      <td>${key.status === 'revoked' ? '' : `<form method="post" action="${h(base)}/keys/${key.key_id}/revoke" class="inline" data-confirm="Revoke “${h(key.name)}”? Apps using it will start getting 401 immediately.">
        <button type="submit" class="danger small">Revoke</button></form>`}</td>
    </tr>`).join('')}
    </tbody>
  </table></div>
</div>`
});

// --------------------------------------------------------------------------------------------- Logs

export type parsedLogLine = {
    timestamp?: string;
    level?: string;
    message?: string;
    requestId?: string;
    scope?: string;
    raw: string;
    data: Record<string, unknown> | null;
};

export const logsView = ({
    base,
    manager,
    log,
    files,
    file,
    level,
    q,
    limit,
    lines
}: {
    base: string;
    manager: managementUserType;
    log: string;
    files: string[];
    file: string;
    level: string;
    q: string;
    limit: number;
    lines: parsedLogLine[];
}) => page({
    title: 'Logs',
    base,
    manager,
    active: 'logs',
    body: `
<h1>Logs</h1>
<p class="sub">Newest first. Files rotate daily and are kept on the server under <code>LOG_DIR</code>; older days are gzipped. Filter by a request id to see everything one request did.</p>
<div class="card">
  <form method="get" action="${h(base)}/logs" class="row">
    <div><label for="log">Log</label><select id="log" name="log">
      ${['error', 'app', 'access'].map(name => `<option value="${name}" ${name === log ? 'selected' : ''}>${name}</option>`).join('')}
    </select></div>
    <div><label for="file">Day</label><select id="file" name="file">
      ${files.length === 0 ? '<option value="">(no files yet)</option>' : files.map(f => `<option value="${h(f)}" ${f === file ? 'selected' : ''}>${h(f.replace(/^\w+-|\.log$/g, ''))}</option>`).join('')}
    </select></div>
    <div><label for="level">Level</label><select id="level" name="level">
      ${['', 'error', 'warn', 'info', 'http', 'debug'].map(l => `<option value="${l}" ${l === level ? 'selected' : ''}>${l || 'any'}</option>`).join('')}
    </select></div>
    <div style="flex:2"><label for="q">Contains</label><input id="q" name="q" value="${h(q)}" placeholder="request id, user id, path, text…"></div>
    <div><label for="limit">Lines</label><select id="limit" name="limit">
      ${[100, 300, 1000].map(n => `<option value="${n}" ${n === limit ? 'selected' : ''}>${n}</option>`).join('')}
    </select></div>
    <div class="shrink"><button type="submit">Filter</button></div>
  </form>
</div>
<div class="card">
  <div class="table-wrap"><table>
    <thead><tr><th style="width:150px">Time</th><th style="width:70px">Level</th><th>Message</th></tr></thead>
    <tbody>
    ${lines.length === 0 ? `<tr><td colspan="3" class="muted">Nothing to show.</td></tr>` : lines.map(line => `<tr>
      <td class="mono muted">${line.timestamp ? fmtDate(line.timestamp) : ''}</td>
      <td><span class="pill lvl-${h(line.level ?? '')}">${h(line.level ?? '?')}</span></td>
      <td><div>${line.scope ? `<span class="muted">[${h(line.scope)}]</span> ` : ''}${h(line.message ?? line.raw)}</div>
        ${line.requestId ? `<a class="mono muted" href="${h(base)}/logs?log=app&amp;file=${h(file.replace(/^\w+-/, 'app-'))}&amp;q=${h(line.requestId)}">${h(String(line.requestId).slice(0, 8))}</a>` : ''}
        ${line.data ? `<details><summary>details</summary><pre>${h(JSON.stringify(line.data, null, 2))}</pre></details>` : ''}
      </td>
    </tr>`).join('')}
    </tbody>
  </table></div>
</div>`
});

// --------------------------------------------------------------------------------------------- E-mails

export const emailsView = ({
    base,
    manager,
    templates,
    smtp,
    stats,
    flash,
    templatesDir
}: {
    base: string;
    manager: managementUserType;
    templates: emailTemplateMetaType[];
    smtp: string;
    stats: { queued: number, sending: number, waitingRetry: number };
    flash?: flashType | null;
    templatesDir: string;
}) => page({
    title: 'E-mails',
    base,
    manager,
    active: 'emails',
    flash,
    body: `
<h1>E-mails</h1>
<p class="sub">Templates are read from <code>${h(templatesDir)}</code> — edit or drop in a file and refresh, no restart needed.</p>
<div class="card grid">
  <div><label>Transport</label>${h(smtp)}</div>
  <div><label>Queue</label>${stats.queued} queued · ${stats.sending} sending · ${stats.waitingRetry} waiting to retry</div>
  <div><label>Test recipient</label>${h(manager.email)}</div>
</div>
<div class="card">
  <div class="table-wrap"><table>
    <thead><tr><th>Template</th><th>Subject</th><th>Type</th><th></th></tr></thead>
    <tbody>
    ${templates.length === 0 ? `<tr><td colspan="4" class="muted">No templates found.</td></tr>` : templates.map(t => `<tr>
      <td><strong class="mono">${h(t.name)}</strong>${t.description ? `<br><span class="muted">${h(t.description)}</span>` : ''}</td>
      <td class="mono">${h(t.subject)}</td>
      <td>${h(t.category)}</td>
      <td style="white-space:nowrap">
        <a class="btn ghost small" href="${h(base)}/emails/preview/${h(t.name)}" target="_blank" rel="noopener">Preview</a>
        <form method="post" action="${h(base)}/emails/test" class="inline">
          <input type="hidden" name="template" value="${h(t.name)}">
          <button type="submit" class="small">Send test to me</button>
        </form>
      </td>
    </tr>`).join('')}
    </tbody>
  </table></div>
</div>`
});
