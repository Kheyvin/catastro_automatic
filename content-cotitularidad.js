const FIELD_MAP = {
    'codeVia':          { label: '[05]', keyword: 'VÍA' },
    'tipoVia':          { label: '[06]', keyword: 'TIPO' },
    'nombreVia':        { label: '[07]', keyword: 'NOMBRE' },
    'numberMunicipal':  { label: '[09]', keyword: 'MUNICIPAL' },
    'numberInterior':   { label: '[13]', keyword: 'INTERIOR' },
    'codeHu':           { label: '[14]', keyword: 'CÓDIGO' },
    'nombreHu':         { label: '[15]', keyword: 'NOMBRE' },
    'zonaSector':       { label: '[16]', keyword: 'ZONA' },
    'numberManzana':    { label: '[17]', keyword: 'MANZANA' },
    'numberLote':       { label: '[18]', keyword: 'LOTE' },
    'numberSubLote':    { label: '[19]', keyword: 'SUB' },
    'telefono':         { label: '[34]', keyword: 'TELÉFONO' },
    'anexo':            { label: '[35]', keyword: 'ANEXO' },
    'email':            { label: '[36]', keyword: 'CORREO' },
    'observations':     { selector: '#form_item_observacion' },
    'supervisorName':   { selector: '#form_item_supervisornombre' },
    'technicianName':   { selector: '#form_item_tecniconombre' },
    'supervisorDate':   { isModal: true, modalTitle: 'SUPERVISOR', selector: '#form_item_fecharegistro', isDate: true },
    'technicianDate':   { isModal: true, modalTitle: 'TÉCNICO', selector: '#form_item_fecharegistro', isDate: true }
};

const CotitularidadState = {
  licenseValid: false
};

async function verifyLicenseForCotitularidad() {
  try {
    const result = await LicenseManager.verifyLicense();
    
    if (result.valid) {
      CotitularidadState.licenseValid = true;
      console.log('%c[FichaCatastral-Cotitularidad] Licencia verificada correctamente', 'color: #22c55e');
      return true;
    } else {
      CotitularidadState.licenseValid = false;
      console.log('%c[FichaCatastral-Cotitularidad] Licencia no válida', 'color: #ef4444');
      showLicenseNotification(result);
      return false;
    }
  } catch (error) {
    console.error('[FichaCatastral-Cotitularidad] Error al verificar licencia:', error);
    CotitularidadState.licenseValid = false;
    return false;
  }
}

function showLicenseNotification(result) {
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
        La automatización de cotitularidad no se ejecutará hasta que active una licencia válida.
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
}

async function initCotitularidad() {
  console.log('%c[FichaCatastral-Cotitularidad] Verificando licencia...', 'color: #3b82f6');
  
  const licenseValid = await verifyLicenseForCotitularidad();
  
  if (!licenseValid) {
    console.log('%c[FichaCatastral-Cotitularidad] Automatización detenida: Licencia no válida', 'color: #ef4444');
    return;
  }
  
  console.log('%c[FichaCatastral-Cotitularidad] Iniciando automatización...', 'color: #22c55e');
  
  // Aquí iría la lógica de automatización de cotitularidad
  // Por ahora solo tiene el FIELD_MAP definido
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCotitularidad);
} else {
  initCotitularidad();
}

// Ponganle condon que ya se me acabaron las ideas para la de cotitularidad :v
