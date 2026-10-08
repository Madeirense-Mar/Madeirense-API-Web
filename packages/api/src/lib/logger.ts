import fs from 'fs';
import path from 'path';
import util from 'util';

import { AsyncLocalStorage } from 'async_hooks';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import env from '../env';

// ***************************************************************************************************************

/**
 * # Logger
 *
 * One logger for the whole API. Everything ends up in three rotating files
 * under `LOG_DIR` (default `<cwd>/logs`), plus the console:
 *
 * | File                     | What goes in                                   |
 * | ------------------------ | ---------------------------------------------- |
 * | `app-YYYY-MM-DD.log`     | `info` and above — application events          |
 * | `error-YYYY-MM-DD.log`   | `error` only — the file to check first         |
 * | `access-YYYY-MM-DD.log`  | `http` only — one line per request             |
 *
 * Lines are JSON so they can be grepped/`jq`-ed on the VPS and read back by
 * the `/api/management/logs` viewer. Old files are gzipped and deleted after
 * `LOG_RETENTION_DAYS`.
 *
 * Every line written while a request is being handled automatically carries
 * that request's `requestId`, `userId` and `apiKey` (see {@link logContext}),
 * so a single `requestId` greps out the whole story of one request.
 *
 * Existing `console.*` calls across the codebase are routed into the logger
 * by {@link bridgeConsole}, so they're captured without having to rewrite
 * every call site — new code should still prefer `logger.*` directly.
 */

export type logContextType = {
    requestId?: string;
    userId?: number;
    apiKey?: string;
    method?: string;
    path?: string;
};

export const logContext = new AsyncLocalStorage<logContextType>();

/** Merges fields into the current request's log context (no-op outside a request). */
export const setLogContext = (fields: Partial<logContextType>) => {
    const store = logContext.getStore();

    if (store) Object.assign(store, fields);
};

export const LOG_DIR = path.resolve(process.cwd(), env.LOG_DIR);

export const LOG_FILES = {
    app: 'app',
    error: 'error',
    access: 'access'
} as const;

export type logFileType = keyof typeof LOG_FILES;

try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
    // Falls back to console-only if the folder can't be created (read-only FS, permissions…).
}

// --------------------------------------------------------------------------------------------- Formats

/** Injects the async request context into every log line. */
const withContext = winston.format((info) => {
    const store = logContext.getStore();

    if (store) {
        for (const [key, value] of Object.entries(store)) {
            if (value !== undefined && info[key] === undefined) info[key] = value;
        }
    }

    return info;
});

/** Turns `Error` instances found in metadata into plain, serialisable objects. */
const serializeErrors = winston.format((info) => {
    for (const [key, value] of Object.entries(info)) {
        if (value instanceof Error) {
            info[key] = {
                name: value.name,
                message: value.message,
                stack: value.stack,
                ...(typeof (value as any).code !== 'undefined' && { code: (value as any).code })
            };
        }
    }

    return info;
});

const only = (level: string) => winston.format((info) => (info.level === level ? info : false))();

const fileFormat = winston.format.combine(
    withContext(),
    winston.format.errors({ stack: true }),
    serializeErrors(),
    winston.format.timestamp(),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    withContext(),
    winston.format.errors({ stack: true }),
    serializeErrors(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    (env.NODE_ENV === 'development') ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.printf(({ timestamp, level, message, stack, requestId, scope, service: _service, method: _method, path: _path, ...meta }) => {
        const rid = requestId ? ` [${String(requestId).slice(0, 8)}]` : '';
        const tag = scope && scope !== 'console' ? ` (${scope})` : '';
        // Object.entries drops winston's internal Symbol keys.
        const fields = Object.fromEntries(Object.entries(meta));
        const rest = Object.keys(fields).length ? ` ${util.inspect(fields, { depth: 4, breakLength: Infinity, colors: env.NODE_ENV === 'development' })}` : '';

        return `${timestamp} ${level}${rid}${tag} ${message}${rest}${stack ? `\n${stack}` : ''}`;
    })
);

// --------------------------------------------------------------------------------------------- Transports

const rotating = (name: logFileType, level: string, extra?: winston.Logform.Format) => new DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${name}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: env.LOG_MAX_FILE_SIZE,
    maxFiles: `${env.LOG_RETENTION_DAYS}d`,
    level,
    format: extra ? winston.format.combine(extra, fileFormat) : fileFormat
});

const transports: winston.transport[] = [
    new winston.transports.Console({
        level: env.LOG_CONSOLE_LEVEL,
        stderrLevels: ['error'],
        format: consoleFormat
    })
];

if (env.LOG_TO_FILES) {
    transports.push(
        rotating('app', 'info'),
        rotating('error', 'error'),
        rotating('access', 'http', only('http'))
    );
}

// --------------------------------------------------------------------------------------------- Logger

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    levels: winston.config.npm.levels,
    defaultMeta: { service: env.APP_NAME },
    transports,
    exitOnError: false
});

/**
 * Scoped child logger — tags every line with a `scope` so a subsystem's
 * lines can be filtered out (`"scope":"email"`, `"scope":"api-keys"`…).
 */
export const scoped = (scope: string) => logger.child({ scope });

// --------------------------------------------------------------------------------------------- Console bridge

let bridged = false;

/**
 * Re-points `console.log/info/warn/error/debug` at the logger so the many
 * existing `console.*` calls are captured in the log files too. Winston's
 * own Console transport writes straight to `process.stdout/stderr`, so this
 * can't recurse.
 */
export const bridgeConsole = () => {
    if (bridged) return;

    bridged = true;

    const forward = (level: 'debug' | 'info' | 'warn' | 'error') => (...args: unknown[]) => {
        const error = args.find((a): a is Error => a instanceof Error);
        const message = util.format(...args.map(a => (a instanceof Error ? a.message : a)));

        // The boot banner prints a lot of blank spacer lines — keep them out of the files.
        if (!message.trim() || /^[*=\-\s]+$/.test(message)) return;

        logger.log(level, message, { scope: 'console', ...(error && { error }) });
    };

    console.log = forward('info');
    console.info = forward('info');
    console.warn = forward('warn');
    console.error = forward('error');
    console.debug = forward('debug');
};

// --------------------------------------------------------------------------------------------- Process

let processHandlersAttached = false;

/** Logs crashes and unhandled promise rejections instead of letting them vanish. */
export const attachProcessHandlers = () => {
    if (processHandlersAttached) return;

    processHandlersAttached = true;

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled promise rejection', {
            scope: 'process',
            error: reason instanceof Error ? reason : new Error(util.inspect(reason))
        });
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception — process will exit', { scope: 'process', error });

        // State is undefined after an uncaught exception; let PM2 restart us
        // once the log line has had a chance to flush.
        setTimeout(() => process.exit(1), 500).unref();
    });
};

// --------------------------------------------------------------------------------------------- Reading

/** Lists the rotated (non-gzipped) files for a log, newest first. */
export const listLogFiles = (name: logFileType): string[] => {
    try {
        return fs.readdirSync(LOG_DIR)
            .filter(f => f.startsWith(`${name}-`) && f.endsWith('.log'))
            .sort()
            .reverse();
    } catch {
        return [];
    }
};

/**
 * Reads the last `limit` lines of a log file without loading the whole file
 * (reads backwards in 64KB chunks). Used by the management log viewer.
 */
export const tailLogFile = (file: string, limit = 200): string[] => {
    const safe = path.basename(file);
    const full = path.join(LOG_DIR, safe);

    if (!fs.existsSync(full)) return [];

    const fd = fs.openSync(full, 'r');

    try {
        const { size } = fs.fstatSync(fd);
        const chunk = 64 * 1024;

        let position = size;
        let buffer = '';
        let lines: string[] = [];

        while (position > 0 && lines.length <= limit) {
            const length = Math.min(chunk, position);

            position -= length;

            const data = Buffer.alloc(length);

            fs.readSync(fd, data, 0, length, position);

            buffer = data.toString('utf8') + buffer;
            lines = buffer.split('\n');
        }

        return lines.filter(Boolean).slice(-limit);
    } finally {
        fs.closeSync(fd);
    }
};

export default logger;
