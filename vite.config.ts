import { execSync } from 'child_process';
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Stable per-build identifier (git SHA when available, epoch otherwise)
const buildId = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return Date.now().toString(36);
  }
})();

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Inject a build-id meta tag so the version check hook can detect new deployments.
    {
      name: 'inject-build-id',
      transformIndexHtml(html: string) {
        return html.replace(
          '</head>',
          `  <meta name="build-id" content="${buildId}">\n  </head>`,
        );
      },
    },
  ],
  server: {
    hmr: {
      overlay: false,  // disables the red error overlay in browser
    },
  },

  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Alias utils to root utils directory
      '~': path.resolve(__dirname, './'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
