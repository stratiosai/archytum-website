import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.archytum.com',
  output: 'static',
  integrations: [sitemap()],
  build: {
    format: 'directory'
  }
});
