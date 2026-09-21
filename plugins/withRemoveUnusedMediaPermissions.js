const { withAndroidManifest } = require('@expo/config-plugins');

// expo-screen-capture's own AndroidManifest.xml declares READ_MEDIA_IMAGES
// (Android 13, API 33 only) and READ_EXTERNAL_STORAGE (up to API 32) — these
// support its addScreenshotListener() feature for detecting when the user
// takes a screenshot. ZAAL only uses usePreventScreenCapture() (blocking
// screenshots via FLAG_SECURE), never addScreenshotListener(), so this app
// never actually reads the user's photo library. Play Console's "Photo and
// video permissions" declaration flags READ_MEDIA_IMAGES and asks for a
// description of real usage — since there isn't any, the honest fix is to
// remove the permission rather than describe a feature that doesn't exist.
//
// Same mechanism as withRemoveForegroundServiceMediaPlayback.js: a
// library-injected manifest entry can only be removed via Android's real
// manifest merger (tools:node="remove"), applied in our own app manifest.
module.exports = function withRemoveUnusedMediaPermissions(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    manifest['uses-permission'].push({
      $: {
        'android:name': 'android.permission.READ_MEDIA_IMAGES',
        'tools:node': 'remove',
      },
    });

    return config;
  });
};
