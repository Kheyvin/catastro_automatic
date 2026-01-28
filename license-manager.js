const LicenseManager = {
  async checkLicenseOnline(licenseCode) {
    try {
      const response = await fetch(`${LICENSE_CONFIG.API_URL}${LICENSE_CONFIG.CHECK_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codigo: licenseCode })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[License] Error al verificar licencia online:', error);
      return {
        success: false,
        message: 'Error de conexión. Verificando licencia local...',
        connectionError: true
      };
    }
  },
  
  async saveLicenseData(licenseCode, responseData) {
    const dataToSave = {
      [LICENSE_CONFIG.STORAGE_KEYS.LICENSE_CODE]: licenseCode,
      [LICENSE_CONFIG.STORAGE_KEYS.LICENSE_DATA]: {
        success: responseData.success,
        expired: responseData.expired || false,
        expira_en: responseData.expira_en,
        message: responseData.message
      },
      [LICENSE_CONFIG.STORAGE_KEYS.LAST_CHECK]: new Date().toISOString()
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set(dataToSave, resolve);
    });
  },
  
  async getSavedLicenseData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        LICENSE_CONFIG.STORAGE_KEYS.LICENSE_CODE,
        LICENSE_CONFIG.STORAGE_KEYS.LICENSE_DATA,
        LICENSE_CONFIG.STORAGE_KEYS.LAST_CHECK
      ], (result) => {
        resolve({
          code: result[LICENSE_CONFIG.STORAGE_KEYS.LICENSE_CODE] || null,
          data: result[LICENSE_CONFIG.STORAGE_KEYS.LICENSE_DATA] || null,
          lastCheck: result[LICENSE_CONFIG.STORAGE_KEYS.LAST_CHECK] || null
        });
      });
    });
  },
  
  async clearLicenseData() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([
        LICENSE_CONFIG.STORAGE_KEYS.LICENSE_CODE,
        LICENSE_CONFIG.STORAGE_KEYS.LICENSE_DATA,
        LICENSE_CONFIG.STORAGE_KEYS.LAST_CHECK
      ], resolve);
    });
  },
  
  needsOnlineCheck(lastCheck) {
    if (!lastCheck) return true;
    
    const lastCheckDate = new Date(lastCheck);
    const now = new Date();
    const hoursDiff = (now - lastCheckDate) / (1000 * 60 * 60);
    
    return hoursDiff >= LICENSE_CONFIG.LOCAL_CHECK_INTERVAL;
  },
  
  isLicenseExpiredLocally(licenseData) {
    if (!licenseData || !licenseData.expira_en) return true;
    
    const expirationDate = new Date(licenseData.expira_en);
    const now = new Date();
    
    return now > expirationDate;
  },
  
  async verifyLicense(forceOnline = false) {
    const saved = await this.getSavedLicenseData();
    
    if (!saved.code) {
      return {
        valid: false,
        needsActivation: true,
        message: 'Por favor ingrese su código de licencia'
      };
    }
    
    const needsOnline = forceOnline || this.needsOnlineCheck(saved.lastCheck);
    
    if (needsOnline) {
      const onlineResult = await this.checkLicenseOnline(saved.code);
      
      if (onlineResult.connectionError) {
        return this.verifyLocally(saved);
      }
      
      if (onlineResult.success) {
        await this.saveLicenseData(saved.code, onlineResult);
        return {
          valid: true,
          expira_en: onlineResult.expira_en,
          message: onlineResult.message
        };
      } else {
        if (onlineResult.expired) {
          await this.saveLicenseData(saved.code, onlineResult);
          return {
            valid: false,
            expired: true,
            expira_en: onlineResult.expira_en,
            message: onlineResult.message
          };
        } else {
          await this.clearLicenseData();
          return {
            valid: false,
            notFound: true,
            message: onlineResult.message
          };
        }
      }
    } else {
      return this.verifyLocally(saved);
    }
  },
  
  verifyLocally(saved) {
    if (!saved.data) {
      return {
        valid: false,
        needsActivation: true,
        message: 'Por favor ingrese su código de licencia'
      };
    }
    
    if (this.isLicenseExpiredLocally(saved.data)) {
      return {
        valid: false,
        expired: true,
        expira_en: saved.data.expira_en,
        message: 'La licencia ha expirado'
      };
    }
    
    return {
      valid: true,
      expira_en: saved.data.expira_en,
      message: 'Licencia válida (verificación local)',
      isLocalCheck: true
    };
  },
  
  async activateLicense(licenseCode) {
    if (!licenseCode || licenseCode.trim() === '') {
      return {
        success: false,
        message: 'Por favor ingrese un código de licencia válido'
      };
    }
    
    const result = await this.checkLicenseOnline(licenseCode.trim());
    
    if (result.connectionError) {
      return {
        success: false,
        message: 'Error de conexión. Por favor verifique su conexión a internet e intente nuevamente.'
      };
    }
    
    if (result.success) {
      await this.saveLicenseData(licenseCode.trim(), result);
      return {
        success: true,
        expira_en: result.expira_en,
        message: 'Licencia activada correctamente'
      };
    } else {
      if (result.expired) {
        return {
          success: false,
          expired: true,
          expira_en: result.expira_en,
          message: result.message
        };
      } else {
        return {
          success: false,
          notFound: true,
          message: result.message
        };
      }
    }
  },
  
  formatExpirationDate(dateString) {
    if (!dateString) return 'No disponible';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  getDaysRemaining(dateString) {
    if (!dateString) return 0;
    
    const expiration = new Date(dateString);
    const now = new Date();
    const diff = expiration - now;
    
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
};
