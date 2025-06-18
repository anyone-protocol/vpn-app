const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
require('dotenv').config();

module.exports = {
  packagerConfig: {
    asar: {
      unpack: [
        '**/node_modules/@anyone-protocol/anyone-client/bin/{darwin,win32}/{arm64,x64}/{.**,**}/**',
        '**/node_modules/@resvg/resvg-js*/**'
      ]
    },
    icon: process.platform === 'darwin' ? 'resources/icon.icns' : 'resources/icon.ico',
    osxSign: {
      identity: process.env.CSC_NAME,
      'hardened-runtime': true,
      entitlements: 'build/entitlements.mac.plist',
      'entitlements-inherit': 'build/entitlements.mac.plist',
      'gatekeeper-assess': false,
      'signature-size': 4000,
      'signature-flags': 'library',
      timestamp: true,
    },
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.CSC_TEAM_ID
    },
    ignore: [
      /node_modules\/@anyone-protocol\/anyone-client\/bin\/(ios|android|linux)/,
      /\.git/,
      /\.vscode/,
      /\.DS_Store/
    ],
    extraResource: [
      'renderer/.next',
      'terms-agreement'
    ]
  },
  rebuildConfig: {},
  makers: [
    // {
    //   name: '@electron-forge/maker-dmg',
    //   config: {
    //     format: 'ULFO'
    //   }
    // },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
  ],
}; 