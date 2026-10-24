import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { assertEntitlementPublicKeyConfig } from './src/utils/entitlementToken.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const fileEnv = loadEnv(mode, process.cwd(), '');
    assertEntitlementPublicKeyConfig({ ...fileEnv, ...process.env });
  }

  return {
    plugins: [react()],
    test: {
      environment: 'happy-dom',
      globals: true,
      include: [
        'src/**/*.{test,spec}.{js,jsx}',
        'test/**/*.{test,spec}.{js,jsx}',
        'api/**/*.{test,spec}.js',
      ],
    },
  };
})
