import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      // Generates a self-contained single-file offline HTML build (classic IIFE script,
      // zero file:// CORS issues) alongside the GitHub Pages dist/ output.
      {
        name: 'generate-offline-singlefile',
        apply: 'build',
        async closeBundle(error?: Error): Promise<void> {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const assetsDir = path.resolve(distDir, 'assets');
          const indexHtmlPath = path.resolve(__dirname, 'index.html');
          if (!fs.existsSync(indexHtmlPath) || !fs.existsSync(distDir)) {
            return;
          }

          let compiledCss = '';
          if (fs.existsSync(assetsDir)) {
            const cssFiles = fs
              .readdirSync(assetsDir)
              .filter((file) => file.endsWith('.css'))
              .sort();
            compiledCss = cssFiles
              .map((file) => fs.readFileSync(path.join(assetsDir, file), 'utf-8'))
              .join('\n');
          }

          const bundleResult = await esbuild.build({
            entryPoints: [path.resolve(__dirname, 'src/main.tsx')],
            bundle: true,
            minify: true,
            format: 'iife',
            jsx: 'automatic',
            platform: 'browser',
            target: ['es2020'],
            define: {
              'process.env.NODE_ENV': '"production"',
            },
            plugins: [
              {
                name: 'ignore-css-imports',
                setup(build) {
                  build.onResolve({filter: /\.css$/}, (args) => ({
                    path: args.path,
                    namespace: 'ignore-css',
                  }));
                  build.onLoad({filter: /.*/, namespace: 'ignore-css'}, () => ({
                    contents: '',
                    loader: 'js',
                  }));
                },
              },
            ],
            write: false,
          });

          const jsCode = bundleResult.outputFiles?.[0]?.text ?? '';
          const safeCss = compiledCss.replace(/<\/style/gi, '<\\/style');
          const safeJs = jsCode.replace(/<\/script/gi, '<\\/script');

          let offlineHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
          // Strip external Google Fonts links so offline file:// opens instantaneously
          offlineHtml = offlineHtml.replace(
            /\s*<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*\/?>/gi,
            ''
          );
          // Remove dev Vite module entry script
          offlineHtml = offlineHtml.replace(
            /\s*<script\s+type="module"\s+src="\/src\/main\.tsx"><\/script>/i,
            ''
          );
          // Inline compiled CSS in <head> (use function replacement so $ patterns in CSS/JS are literal)
          offlineHtml = offlineHtml.replace(
            '</head>',
            () => `  <style>\n${safeCss}\n  </style>\n</head>`
          );
          // Inline standalone IIFE JS bundle before </body>
          offlineHtml = offlineHtml.replace(
            '</body>',
            () => `  <script>\n${safeJs}\n  </script>\n</body>`
          );

          fs.writeFileSync(
            path.join(distDir, 'VektorStudio-Offline.html'),
            offlineHtml,
            'utf-8'
          );

          const offlineDir = path.resolve(__dirname, 'offline');
          fs.mkdirSync(offlineDir, {recursive: true});
          fs.writeFileSync(
            path.join(offlineDir, 'VektorStudio-Offline.html'),
            offlineHtml,
            'utf-8'
          );
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
