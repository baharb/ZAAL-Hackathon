const { withAndroidManifest } = require('@expo/config-plugins');

// expo-audio's own AndroidManifest.xml unconditionally declares
// FOREGROUND_SERVICE and FOREGROUND_SERVICE_MEDIA_PLAYBACK (for apps that
// want audio to keep playing while backgrounded). ZAAL doesn't do that —
// narration only plays while the app is in the foreground — so the merged
// permission is unused. Play Console's "Foreground service permissions"
// declaration requires a video demonstrating real background-media use for
// FOREGROUND_SERVICE_MEDIA_PLAYBACK specifically, which we can't honestly
// provide since the feature doesn't exist. Simplest correct fix: strip the
// permission from the final manifest so the declaration isn't required at
// all. This only removes the MEDIA_PLAYBACK service *type* permission, not
// the general FOREGROUND_SERVICE permission (which isn't separately gated
// by Play the same way and other things may still rely on it).
//
// Removing a library-injected manifest entry has to happen via Android's
// real manifest merger (tools:node="remove"), not by editing the app's own
// AndroidManifest.xml content directly — the library's manifest is merged
// in later at Gradle build time regardless of what our own file contains,
// so without this directive the permission would just come right back.
module.exports = function withRemoveForegroundServiceMediaPlayback(config) {
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
        'android:name': 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'tools:node': 'remove',
      },
    });

    return config;
  });
};
