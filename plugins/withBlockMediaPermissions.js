/**
 * Expo config plugin: force-remove READ_MEDIA_IMAGES and READ_MEDIA_VIDEO from the
 * Android manifest so the app complies with Google Play's Photo and Video Permissions policy.
 * The app uses the system photo picker (one-time access) only; we must not declare these permissions.
 *
 * @see https://support.google.com/googleplay/android-developer/answer/14115180
 */

const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

const BLOCKED = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
];

function withBlockMediaPermissions(config) {
  return withAndroidManifest(config, (c) => {
    let manifest = c.modResults;
    manifest = AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    manifest = AndroidConfig.Permissions.addBlockedPermissions(manifest, BLOCKED);
    c.modResults = manifest;
    return c;
  });
}

module.exports = withBlockMediaPermissions;
