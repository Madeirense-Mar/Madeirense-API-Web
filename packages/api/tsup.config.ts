import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/server.ts'],
    format: ['esm'],
    target: 'node20',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    external: [
        // Prisma - CJS runtime, cannot be bundled into ESM
        '@prisma/client',
        '@Madeirense/database',           // your db workspace package (contains the Prisma client)
        // Other workspace packages
        '@Madeirense/shared',
        // Node built-ins (tsup usually handles these, but explicit is safer)
        'fs', 'path', 'os', 'crypto', 'http', 'https', 'stream', 'util',
    ],
});
