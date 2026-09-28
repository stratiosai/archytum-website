import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.archytum.com',
  base: process.env.ARCHYTUM_DEPLOY_BASE || '/',
  output: 'static',
  integrations: [sitemap()],
  build: {
    format: 'directory'
  }
});
