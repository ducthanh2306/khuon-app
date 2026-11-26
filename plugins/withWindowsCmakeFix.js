const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// --- KHUON WINDOWS CMAKE PATH FIX ---';

const DEFAULT_CONFIG_SNIPPET = `        ${MARKER}
        if (System.getProperty("os.name").toLowerCase().contains("win")) {
            externalNativeBuild {
                cmake {
                    // Use 225 (instead of 1024 or 180): high enough (> ~190 hashed len in RelWithDebInfo) so CMake hashes long paths, low enough (< 260) for Ninja
                    arguments "-DCMAKE_OBJECT_PATH_MAX=225"
                }
            }
        }`;

const ANDROID_BLOCK_SNIPPET = `    ${MARKER}
    if (System.getProperty("os.name").toLowerCase().contains("win")) {
        def shortCxxBase = new File("D:/").exists() ? "D:/kcxx" : "C:/kcxx"
        externalNativeBuild {
            cmake {
                buildStagingDirectory = file(shortCxxBase)
            }
        }
    }`;

module.exports = function withWindowsCmakeFix(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (contents.includes(MARKER)) {
      return mod;
    }

    // Inject arguments into defaultConfig { ... }
    contents = contents.replace(
      /(buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL"[^\n]*\n)/,
      `$1\n${DEFAULT_CONFIG_SNIPPET}\n`
    );

    // Inject short buildStagingDirectory into android { ... } right before signingConfigs
    contents = contents.replace(
      /(\s*signingConfigs\s*\{)/,
      `\n${ANDROID_BLOCK_SNIPPET}$1`
    );

    mod.modResults.contents = contents;
    return mod;
  });
};
