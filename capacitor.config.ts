import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.jonathansalim.belajarjepang',
  appName: 'Belajar Jepang',
  webDir: 'dist',
  android: {
    // Aplikasi sepenuhnya offline; tidak memuat konten dari internet.
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'DEFAULT',
    },
  },
};

export default config;
