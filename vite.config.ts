import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { renderCloudflareHeadersFile } from './shared/securityHeaders';

const ROOT = import.meta.dirname || process.cwd();

/**
 * Menulis dist/_headers saat build, dengan CSP connect-src yang otomatis
 * menyertakan origin Supabase dan VITE_API_URL dari environment build.
 */
function securityHeadersPlugin(mode: string): Plugin {
  return {
    name: 'kawai-security-headers',
    apply: 'build',
    closeBundle() {
      const env = loadEnv(mode, ROOT, '');
      const content = renderCloudflareHeadersFile({
        supabaseUrl: env.VITE_SUPABASE_URL || 'https://rbfnjgrnojvzvrpyryms.supabase.co',
        apiUrl: env.VITE_API_URL,
      });
      fs.writeFileSync(path.resolve(ROOT, 'dist', '_headers'), content);
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss(), securityHeadersPlugin(mode)],
    resolve: {
      alias: {
        '@': path.resolve(ROOT, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
