/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
            '@': path.resolve(__dirname, './src'),
            react: path.resolve(__dirname, './node_modules/react'),
            'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
                        return 'firebase-vendor';
                    }
                    if (id.includes('node_modules/react-dom') ||
                        id.includes('node_modules/react-router') ||
                        id.includes('node_modules/@tanstack')) {
                        return 'react-vendor';
                    }
                    return undefined;
                },
            },
        },
    },
    server: {
        port: 5173,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        server: {
            deps: {
                inline: ['qrcode.react'],
            },
        },
    },
});
