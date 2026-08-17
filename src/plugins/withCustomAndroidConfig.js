const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCustomAndroidConfig(config) {
  // 1. AndroidManifest.xml modifications
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Disable cleartext traffic (SSL enforcement)
    mainApplication.$['android:usesCleartextTraffic'] = 'false';

    // Reference backup and data extraction rules
    mainApplication.$['android:fullBackupContent'] = '@xml/backup_rules';
    mainApplication.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';

    // Disable predictive back callback to allow JS BackHandler to capture back button events
    mainApplication.$['android:enableOnBackInvokedCallback'] = 'false';

    // Remove SYSTEM_ALERT_WINDOW permission if present
    if (androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'].filter(
        (permission) => permission.$['android:name'] !== 'android.permission.SYSTEM_ALERT_WINDOW'
      );
    }

    return config;
  });

  // 2. Generate backup rules XML resource files dynamically in the build directory
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      
      // Ensure res/xml directory exists
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }

      // XML content for backup_rules
      const backupRulesContent = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="database" path="app.db" />
    <exclude domain="file" path="cached_images" />
    <exclude domain="file" path="." regex=".*\\.mbtiles" />
</full-backup-content>`;

      // XML content for data_extraction_rules
      const dataExtractionRulesContent = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="database" path="app.db" />
        <exclude domain="file" path="cached_images" />
        <exclude domain="file" path="." regex=".*\\.mbtiles" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="database" path="app.db" />
        <exclude domain="file" path="cached_images" />
        <exclude domain="file" path="." regex=".*\\.mbtiles" />
    </device-transfer>
</data-extraction-rules>`;

      fs.writeFileSync(path.join(resXmlDir, 'backup_rules.xml'), backupRulesContent, 'utf8');
      fs.writeFileSync(path.join(resXmlDir, 'data_extraction_rules.xml'), dataExtractionRulesContent, 'utf8');

      return config;
    },
  ]);

  return config;
}

module.exports = withCustomAndroidConfig;
