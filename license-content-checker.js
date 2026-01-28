const ContentLicenseChecker = {
  licenseValid: false,
  
  async verify() {
    try {
      const result = await LicenseManager.verifyLicense();
      
      if (result.valid) {
        this.licenseValid = true;
        console.log('%c[FichaCatastral] Licencia verificada correctamente', 'color: #22c55e');
        return true;
      } else {
        this.licenseValid = false;
        console.log('%c[FichaCatastral] Licencia no válida: ' + (result.message || 'Sin detalles'), 'color: #ef4444');
        this.showNotification(result);
        return false;
      }
    } catch (error) {
      console.error('[FichaCatastral] Error al verificar licencia:', error);
      this.licenseValid = false;
      return false;
    }
  },
  
  showNotification(result) {
    const existingNotif = document.getElementById('license-notification-kda');
    if (existingNotif) existingNotif.remove();
    
    const notification = document.createElement('div');
    notification.id = 'license-notification-kda';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        color: white;
        padding: 20px 25px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 999999;
        max-width: 350px;
        font-family: 'Segoe UI', Arial, sans-serif;
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <span style="font-size: 28px;">🔒</span>
          <strong style="font-size: 16px;">Webinar Catastro - Licencia Requerida</strong>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 13px; opacity: 0.95; line-height: 1.5;">
          ${result.expired 
            ? 'Su licencia ha expirado. Por favor renueve para continuar usando la extensión.' 
            : result.notFound 
              ? 'Licencia no encontrada. Por favor active su licencia.' 
              : 'Se requiere una licencia válida para usar esta extensión.'}
        </p>
        <p style="margin: 0 0 15px 0; font-size: 12px; opacity: 0.8;">
          La automatización no se ejecutará hasta que active una licencia válida.
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="https://wa.me/51${LICENSE_CONFIG.SUPPORT_PHONE}" target="_blank" style="
            padding: 8px 16px;
            background: white;
            color: #16a34a;
            text-decoration: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
          ">📱 Contactar: ${LICENSE_CONFIG.SUPPORT_PHONE}</a>
          <button onclick="this.closest('#license-notification-kda').remove()" style="
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
          ">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      const notif = document.getElementById('license-notification-kda');
      if (notif) notif.remove();
    }, 30000);
  },
  
  isValid() {
    return this.licenseValid;
  }
};

window.ContentLicenseChecker = ContentLicenseChecker;
