import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// If you rename the GitHub repository, update this to match
// (it must be '/<repo-name>/' for a GitHub Pages *project* site,
// or '/' if you deploy to a user/organization root site instead).
const REPO_NAME = 'infinite-delivery';

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
});
