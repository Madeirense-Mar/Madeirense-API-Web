import fs from 'fs';
import path from 'path';

import Handlebars from 'handlebars';
import juice from 'juice';
import matter from 'gray-matter';

import env from '../env';

// ***************************************************************************************************************

/**
 * # E-mail templates
 *
 * Templates are plain `.html` files in `packages/api/content/emails/`, edited
 * without touching code or rebuilding (same idea as `content/legal/`):
 *
 * ```html
 * ---
 * subject: "A sua encomenda #{{order.order_id}} foi {{status_label}}"
 * preheader: Short grey preview line shown by inbox lists
 * category: transactional        # or `marketing` → respects opt-out, gets an unsubscribe link
 * description: Shown on /api/management/emails
 * sample:                        # fake data used by the preview page
 *   user: { first_name: Ana }
 * ---
 * <!doctype html> … {{user.first_name}} …
 * ```
 *
 * The body is [Handlebars](https://handlebarsjs.com/guide/): `{{var}}` is
 * HTML-escaped, `{{{var}}}` is raw, `{{#if}}`/`{{#each}}` work. Any template
 * can either be a full HTML document (e.g. exported from a visual editor
 * like Beefree/Stripo/MJML) or wrap itself in the shared layout with
 * `{{#> layout}} … {{/layout}}`. After rendering, `<style>` rules are
 * inlined (juice) so Gmail/Outlook keep the styling.
 *
 * Files whose name starts with `_` are partials (`_layout.html` → `{{> layout}}`).
 */

export const EMAIL_TEMPLATES_DIR = path.resolve(process.cwd(), 'content', 'emails');

export type emailCategoryType = 'transactional' | 'marketing';

export type emailTemplateMetaType = {
    name: string;
    subject: string;
    preheader?: string;
    category: emailCategoryType;
    description?: string;
    sample: Record<string, unknown>;
};

export type renderedEmailType = {
    subject: string;
    html: string;
    text: string;
    category: emailCategoryType;
};

const handlebars = Handlebars.create();

// --------------------------------------------------------------------------------------------- Helpers

const LOCALE = 'pt-AO';

const toDate = (value: unknown) => (value instanceof Date ? value : new Date(String(value)));

handlebars.registerHelper('money', (value: unknown) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));

    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'AOA' }).format(Number.isFinite(n) ? n : 0);
});

handlebars.registerHelper('date', (value: unknown, options?: Handlebars.HelperOptions) => {
    if (!value) return '';

    const style = (typeof options?.hash?.style === 'string' ? options.hash.style : 'long') as 'long' | 'short' | 'full' | 'medium';

    return new Intl.DateTimeFormat(LOCALE, { dateStyle: style, timeZone: 'Africa/Luanda' }).format(toDate(value));
});

handlebars.registerHelper('time', (value: unknown) => {
    if (!value) return '';

    // MySQL TIME columns arrive as 1970-01-01THH:mm:ss.000Z
    return toDate(value).toISOString().slice(11, 16);
});

handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

handlebars.registerHelper('multiply', (a: unknown, b: unknown) => Number(a) * Number(b));

/** `{{paragraphs body}}` — turns plain text with blank lines into escaped <p> blocks. */
handlebars.registerHelper('paragraphs', (value: unknown) => new Handlebars.SafeString(
    String(value ?? '')
        .split(/\n{2,}/)
        .map(p => `<p>${Handlebars.escapeExpression(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('')
));

// --------------------------------------------------------------------------------------------- Loading

type compiledTemplate = {
    mtimeMs: number;
    meta: emailTemplateMetaType;
    subject: Handlebars.TemplateDelegate;
    preheader?: Handlebars.TemplateDelegate;
    body: Handlebars.TemplateDelegate;
};

const compiled = new Map<string, compiledTemplate>();

let partialsSignature = '';

const isPartial = (file: string) => file.startsWith('_');

const listFiles = () => {
    try {
        return fs.readdirSync(EMAIL_TEMPLATES_DIR).filter(f => f.endsWith('.html'));
    } catch {
        return [];
    }
};

/** (Re)registers `_*.html` partials whenever one of them changes on disk. */
const loadPartials = () => {
    const partials = listFiles().filter(isPartial);

    const signature = partials
        .map(f => `${f}:${fs.statSync(path.join(EMAIL_TEMPLATES_DIR, f)).mtimeMs}`)
        .join('|');

    if (signature === partialsSignature) return;

    partials.forEach(file => {
        handlebars.registerPartial(
            file.slice(1, -'.html'.length),
            fs.readFileSync(path.join(EMAIL_TEMPLATES_DIR, file), 'utf-8')
        );
    });

    partialsSignature = signature;

    // Templates compiled against the old partials must be recompiled.
    compiled.clear();
};

const load = (name: string): compiledTemplate => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid e-mail template name "${name}"`);

    loadPartials();

    const file = path.join(EMAIL_TEMPLATES_DIR, `${name}.html`);

    if (!fs.existsSync(file)) throw new Error(`E-mail template "${name}" not found in content/emails/`);

    const { mtimeMs } = fs.statSync(file);
    const cached = compiled.get(name);

    if (cached && cached.mtimeMs === mtimeMs) return cached;

    const { content, data } = matter(fs.readFileSync(file, 'utf-8'));

    const meta: emailTemplateMetaType = {
        name,
        subject: String(data['subject'] ?? env.APP_NAME),
        preheader: data['preheader'] ? String(data['preheader']) : undefined,
        category: data['category'] === 'marketing' ? 'marketing' : 'transactional',
        description: data['description'] ? String(data['description']) : undefined,
        sample: (data['sample'] && typeof data['sample'] === 'object') ? data['sample'] as Record<string, unknown> : {}
    };

    const template: compiledTemplate = {
        mtimeMs,
        meta,
        subject: handlebars.compile(meta.subject, { noEscape: true }),
        preheader: meta.preheader ? handlebars.compile(meta.preheader, { noEscape: true }) : undefined,
        body: handlebars.compile(content, { strict: false })
    };

    compiled.set(name, template);

    return template;
};

export const listEmailTemplates = (): emailTemplateMetaType[] => listFiles()
    .filter(f => !isPartial(f))
    .map(f => {
        try {
            return load(f.slice(0, -'.html'.length)).meta;
        } catch {
            return null;
        }
    })
    .filter((m): m is emailTemplateMetaType => m !== null);

export const getEmailTemplateMeta = (name: string) => load(name).meta;

// --------------------------------------------------------------------------------------------- Rendering

const firstUrl = (value: string) => value.replace(/\/+$/, '');

/** Values every template can use without them being passed in. */
export const globalEmailVariables = () => ({
    app_name: 'Madeirense',
    frontend_url: firstUrl(env.FRONTEND_URL),
    logo_url: env.MAIL_LOGO_URL,
    support_email: env.MAIL_SUPPORT_EMAIL,
    year: new Date().getFullYear(),
    colors: {
        primary: '#0b5196',
        primary_dark: '#05223d',
        primary_light: '#61a7ec',
        secondary: '#fbe200',
        accent: '#9b0808',
        neutral: '#a2a2a2',
        neutral_dark: '#1a1a1a'
    }
});

/** Very small HTML → plain-text fallback for the text/plain part of the e-mail. */
const NAMED_ENTITIES: Record<string, string> = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    times: '×', middot: '·', copy: '©', ndash: '–', mdash: '—', hellip: '…', zwnj: '', euro: '€'
};

export const htmlToText = (html: string) => html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    // Hidden preheader block
    .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]+>/g, '').trim()} (${href})`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[\u034f\u200c]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const renderEmail = (name: string, variables: Record<string, unknown> = {}): renderedEmailType => {
    const template = load(name);

    const context = {
        ...globalEmailVariables(),
        ...variables
    };

    const preheader = template.preheader?.(context);

    const html = juice(template.body({ ...context, preheader }), {
        preserveMediaQueries: true,
        preserveFontFaces: true,
        removeStyleTags: false
    });

    return {
        subject: template.subject(context).replace(/\s+/g, ' ').trim(),
        html,
        text: htmlToText(html),
        category: template.meta.category
    };
};

/** Renders a template with its own `sample` front-matter data (management preview). */
export const renderEmailSample = (name: string, overrides: Record<string, unknown> = {}) => renderEmail(name, {
    ...getEmailTemplateMeta(name).sample,
    ...overrides
});
