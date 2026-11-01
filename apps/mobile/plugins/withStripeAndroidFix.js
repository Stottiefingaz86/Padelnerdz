const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withDangerousMod,
} = require('expo/config-plugins');

const MARKER = 'padel-nerdz-stripe-no-tapandpay';

/**
 * stripe-android-issuing-push-provisioning pulls Google's private
 * play-services-tapandpay (not on public Maven). Keep Issuing compileOnly
 * but drop that transitive, and tell R8 to ignore the optional wallet APIs.
 */
function patchStripeGradle(gradlePath) {
  if (!fs.existsSync(gradlePath)) return false;
  let contents = fs.readFileSync(gradlePath, 'utf8');
  if (contents.includes(MARKER)) return true;

  const next = contents.replace(
    /^\s*compileOnly\s+"com\.stripe:stripe-android-issuing-push-provisioning:([^"]+)"\s*$/m,
    `  // ${MARKER}
  compileOnly("com.stripe:stripe-android-issuing-push-provisioning:$1") {
    exclude group: 'com.google.android.gms', module: 'play-services-tapandpay'
  }`,
  );

  if (next === contents) {
    console.warn('[withStripeAndroidFix] compileOnly issuing line not found');
    return false;
  }

  fs.writeFileSync(gradlePath, next);
  return true;
}

function findStripeGradle(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'node_modules/@stripe/stripe-react-native/android/build.gradle'),
    path.join(projectRoot, '../../node_modules/@stripe/stripe-react-native/android/build.gradle'),
    path.join(projectRoot, '../node_modules/@stripe/stripe-react-native/android/build.gradle'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function withStripeGradlePatch(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const gradlePath = findStripeGradle(cfg.modRequest.projectRoot);
      if (!gradlePath) {
        console.warn(
          '[withStripeAndroidFix] stripe-react-native android/build.gradle not found — skip',
        );
        return cfg;
      }
      const ok = patchStripeGradle(gradlePath);
      console.log(
        `[withStripeAndroidFix] ${ok ? 'patched' : 'failed'} ${gradlePath}`,
      );
      return cfg;
    },
  ]);
}

function withStripeProguard(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const rulesPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/proguard-rules.pro',
      );
      const rules = `
# ${MARKER}
-dontwarn com.stripe.android.pushProvisioning.**
-dontwarn com.google.android.gms.tapandpay.**
-dontwarn com.reactnativestripesdk.pushprovisioning.**
`;
      if (!fs.existsSync(rulesPath)) {
        fs.writeFileSync(rulesPath, rules.trimStart());
        return cfg;
      }
      const existing = fs.readFileSync(rulesPath, 'utf8');
      if (!existing.includes(MARKER)) {
        fs.writeFileSync(rulesPath, `${existing.trimEnd()}\n${rules}`);
      }
      return cfg;
    },
  ]);
}

/** R8 treats missing optional Stripe wallet classes as errors — allow the build. */
function withStripeMissingClasses(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (cfg.modResults.contents.includes(MARKER)) return cfg;

    // Prefer disabling minify for preview APKs if the template uses the Expo flag.
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /minifyEnabled\s+enableMinifyInReleaseBuilds/g,
      `minifyEnabled false // ${MARKER}: Stripe optional push-provisioning + public Maven`,
    );

    return cfg;
  });
}

function withStripeAndroidFix(config) {
  config = withStripeGradlePatch(config);
  config = withStripeProguard(config);
  config = withStripeMissingClasses(config);
  return config;
}

module.exports = withStripeAndroidFix;
