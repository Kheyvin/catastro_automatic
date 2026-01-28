document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    activationForm: document.getElementById('activation-form'),
    licenseStatus: document.getElementById('license-status'),
    licenseInput: document.getElementById('license-code'),
    btnActivate: document.getElementById('btn-activate'),
    btnContinue: document.getElementById('btn-continue'),
    btnChangeLicense: document.getElementById('btn-change-license'),
    messageBox: document.getElementById('message-box'),
    expirationDate: document.getElementById('expiration-date'),
    daysRemaining: document.getElementById('days-remaining')
  };
  
  await checkLicenseStatus();
  
  elements.btnActivate.addEventListener('click', handleActivation);
  elements.btnContinue.addEventListener('click', handleContinue);
  elements.btnChangeLicense.addEventListener('click', handleChangeLicense);
  
  elements.licenseInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleActivation();
    }
  });
  
  async function checkLicenseStatus() {
    showLoading(true);
    
    try {
      const result = await LicenseManager.verifyLicense();
      
      if (result.valid) {
        showLicenseActive(result);
      } else if (result.needsActivation) {
        showActivationForm();
      } else if (result.expired) {
        showActivationForm();
        showMessage('error', `La licencia ha expirado el ${LicenseManager.formatExpirationDate(result.expira_en)}. Por favor renueve su licencia.`);
      } else if (result.notFound) {
        showActivationForm();
        showMessage('error', `Licencia no encontrada. Por favor contacte al 📱 ${LICENSE_CONFIG.SUPPORT_PHONE}`);
      }
    } catch (error) {
      console.error('[License UI] Error:', error);
      showActivationForm();
      showMessage('error', 'Error al verificar licencia. Por favor intente nuevamente.');
    }
    
    showLoading(false);
  }
  
  async function handleActivation() {
    const licenseCode = elements.licenseInput.value.trim();
    
    if (!licenseCode) {
      showMessage('warning', 'Por favor ingrese un código de licencia válido.');
      elements.licenseInput.focus();
      return;
    }
    
    showLoading(true);
    hideMessage();
    
    try {
      const result = await LicenseManager.activateLicense(licenseCode);
      
      if (result.success) {
        showMessage('success', '¡Licencia activada correctamente! Redirigiendo...');
        
        setTimeout(() => {
          showLicenseActive({
            expira_en: result.expira_en
          });
        }, 1500);
      } else {
        if (result.notFound) {
          showMessage('error', `Licencia no encontrada. Por favor verifique el código o contacte al 📱 ${LICENSE_CONFIG.SUPPORT_PHONE}`);
        } else if (result.expired) {
          showMessage('error', `Esta licencia ha expirado el ${LicenseManager.formatExpirationDate(result.expira_en)}. Contacte al 📱 ${LICENSE_CONFIG.SUPPORT_PHONE} para renovar.`);
        } else {
          showMessage('error', result.message || 'Error al activar licencia.');
        }
      }
    } catch (error) {
      console.error('[License UI] Activation error:', error);
      showMessage('error', 'Error de conexión. Por favor verifique su conexión a internet.');
    }
    
    showLoading(false);
  }
  
  function handleContinue() {
    window.close();
  }
  
  async function handleChangeLicense() {
    if (confirm('¿Está seguro de que desea cambiar la licencia actual?')) {
      await LicenseManager.clearLicenseData();
      showActivationForm();
      elements.licenseInput.value = '';
      hideMessage();
    }
  }
  
  function showActivationForm() {
    elements.activationForm.classList.remove('hidden');
    elements.licenseStatus.classList.remove('active');
    elements.licenseInput.focus();
  }
  
  function showLicenseActive(data) {
    elements.activationForm.classList.add('hidden');
    elements.licenseStatus.classList.add('active');
    
    elements.expirationDate.textContent = LicenseManager.formatExpirationDate(data.expira_en);
    elements.daysRemaining.textContent = LicenseManager.getDaysRemaining(data.expira_en);
    
    const days = LicenseManager.getDaysRemaining(data.expira_en);
    if (days <= 7) {
      elements.daysRemaining.style.color = '#dc2626';
    } else if (days <= 30) {
      elements.daysRemaining.style.color = '#f59e0b';
    } else {
      elements.daysRemaining.style.color = '#16a34a';
    }
  }
  
  function showMessage(type, message) {
    elements.messageBox.className = `message-box ${type}`;
    elements.messageBox.textContent = message;
    elements.messageBox.style.display = 'block';
  }
  
  function hideMessage() {
    elements.messageBox.style.display = 'none';
  }
  
  function showLoading(loading) {
    elements.btnActivate.disabled = loading;
    elements.btnActivate.classList.toggle('loading', loading);
  }
});
