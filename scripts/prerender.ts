import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function prerender() {
  const distDir = path.join(rootDir, 'dist');
  const templatePath = path.join(distDir, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error('Error: dist/index.html not found. Please run vite build first.');
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  // Launch a minimal Vite dev server in middleware mode to load TSX/React SSR with plugins & CSS handling
  const vite = await createServer({
    root: rootDir,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn',
  });

  try {
    console.log('⚡ Prerendering static HTML for BRANDTRACE...');
    const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
    const { appHtml } = await render();

    if (!appHtml || appHtml.trim().length === 0) {
      throw new Error('Render output is empty.');
    }

    const prerenderedHtml = template.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`
    );

    fs.writeFileSync(templatePath, prerenderedHtml, 'utf-8');
    console.log(`✅ Static HTML successfully prerendered into ${path.relative(rootDir, templatePath)} (${appHtml.length} characters)`);
  } catch (error) {
    console.error('❌ Prerendering failed:', error);
    process.exit(1);
  } finally {
    await vite.close();
  }
}

prerender();
