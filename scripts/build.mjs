import {build} from 'vite';
import react from '@vitejs/plugin-react';

const shared = {
  configFile: false,
  logLevel: 'info',
};

await build({
  ...shared,
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {input: 'sidepanel.html'},
  },
});

for (const entry of [
  {name: 'service-worker', path: 'src/background/service-worker.ts', formats: ['es']},
  {name: 'content-script', path: 'src/content/content-script.ts', formats: ['iife']},
]) {
  await build({
    ...shared,
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      codeSplitting: false,
      lib: {
        entry: entry.path,
        name: entry.name.replace('-', '_'),
        formats: entry.formats,
        fileName: () => `${entry.name}.js`,
      },
    },
  });
}
