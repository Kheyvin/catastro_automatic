const LICENSE_CONFIG = {
  // Cambiar esta URL cuando se tenga el servidor de producción
  API_URL: 'https://kda.ksperu.com',
  CHECK_ENDPOINT: '/api/check',
  SUPPORT_PHONE: '992517309',
  LOCAL_CHECK_INTERVAL: 24,
  STORAGE_KEYS: {
    LICENSE_CODE: 'licenseCode',
    LICENSE_DATA: 'licenseData',
    LAST_CHECK: 'lastLicenseCheck'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LICENSE_CONFIG;
}
