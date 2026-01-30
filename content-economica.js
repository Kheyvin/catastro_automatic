// ==================== CONTENT-ECONOMICA.JS ====================
// Automatización de Ficha Catastral Económica
// ==================== CONFIGURACIÓN ====================

const CONFIG = {
  delays: {
    short: 200,
    medium: 300,
    long: 500,
    extraLong: 800
  }
};

const EconomicaState = {
  storedData: {},
  licenseValid: false,
  domicilioFiscalProcesado: false,  // Flag para ejecutar solo una vez
  guardarInformacionListenerActivo: false  // Flag para activar después de observaciones
};

// ==================== UTILIDADES ====================

function log(message, type = 'info') {
  const prefix = '[Economica]';
  const styles = {
    info: 'color: #2196F3',
    success: 'color: #4CAF50',
    warning: 'color: #FF9800',
    error: 'color: #f44336'
  };
  console.log(`%c${prefix} ${message}`, styles[type] || styles.info);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getStoredData() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['fichaCatastralData'], (result) => {
        resolve(result.fichaCatastralData || {});
      });
    } else {
      resolve({});
    }
  });
}

function simulateClick(element) {
  if (!element) return;
  
  const events = ['mousedown', 'mouseup', 'click'];
  events.forEach(eventType => {
    const event = new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
  });
}

function simulateInput(element, value) {
  if (!element || value === undefined || value === null) return;
  
  element.focus();
  
  // Detectar el tipo de elemento
  const isTextarea = element.tagName === 'TEXTAREA';
  const isInput = element.tagName === 'INPUT';
  
  if (isInput || isTextarea) {
    // Usar el setter nativo apropiado
    const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }
  } else {
    element.value = value;
  }
  
  // Disparar eventos
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function simulateEnter(element) {
  if (!element) return;
  
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(enterEvent);
}

function findInputByLegend(container, legendText) {
  const legends = container.querySelectorAll('legend, label, p');
  for (const legend of legends) {
    if (legend.textContent.toUpperCase().includes(legendText.toUpperCase())) {
      const fieldset = legend.closest('fieldset, .ant-form-item, div');
      if (fieldset) {
        const input = fieldset.querySelector('input:not([type="hidden"]), textarea');
        if (input) return input;
      }
    }
  }
  return null;
}

function findSearchButtonByLegend(container, legendText) {
  const legends = container.querySelectorAll('legend, label, p');
  for (const legend of legends) {
    if (legend.textContent.toUpperCase().includes(legendText.toUpperCase())) {
      const fieldset = legend.closest('fieldset, .ant-form-item, div');
      if (fieldset) {
        const btn = fieldset.querySelector('button .anticon-search')?.closest('button') ||
                    fieldset.querySelector('button[type="button"]');
        if (btn) return btn;
      }
    }
  }
  return null;
}

async function waitForModal(titleContains) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkModal = () => {
      const modals = document.querySelectorAll('.ant-modal');
      for (const modal of modals) {
        const title = modal.querySelector('.ant-modal-title');
        if (title && title.textContent.toUpperCase().includes(titleContains.toUpperCase())) {
          resolve(modal);
          return;
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkModal, CONFIG.delays.medium);
      } else {
        log(`Modal "${titleContains}" no encontrado después de ${maxAttempts} intentos`, 'warning');
        resolve(null);
      }
    };
    
    checkModal();
  });
}

async function waitForModalToClose(titleContains) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 120; // 60 segundos máximo
    
    const checkModal = () => {
      const modals = document.querySelectorAll('.ant-modal');
      let found = false;
      
      for (const modal of modals) {
        const title = modal.querySelector('.ant-modal-title');
        if (title && title.textContent.toUpperCase().includes(titleContains.toUpperCase())) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        resolve();
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkModal, CONFIG.delays.medium);
      } else {
        log(`Timeout esperando cierre de modal "${titleContains}"`, 'warning');
        resolve();
      }
    };
    
    setTimeout(checkModal, CONFIG.delays.medium);
  });
}

// ==================== BÚSQUEDA Y SELECCIÓN DE PERSONAL ====================

async function searchAndSelectPersonal(nombre) {
  if (!nombre) return false;
  
  const personalModal = await waitForModal('PERSONAL');
  if (!personalModal) {
    log('Modal de búsqueda de personal no encontrado', 'warning');
    return false;
  }
  
  await delay(CONFIG.delays.medium);
  
  const searchInput = personalModal.querySelector('input#form_item_search') ||
                      personalModal.querySelector('input[type="text"]');
  
  if (searchInput) {
    simulateInput(searchInput, nombre);
    await delay(CONFIG.delays.short);
    
    const searchBtn = personalModal.querySelector('button.ant-input-search-button') ||
                      personalModal.querySelector('button .anticon-search')?.closest('button');
    
    if (searchBtn) {
      simulateClick(searchBtn);
      await delay(CONFIG.delays.long);
    }
  }
  
  // Verificar cuántos resultados hay
  const totalRegistros = personalModal.querySelector('p.float-right span.text-black');
  const totalCount = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
  
  log(`Total de registros encontrados: ${totalCount}`, 'info');
  
  if (totalCount === 1) {
    const selectBtn = personalModal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      await delay(CONFIG.delays.short);
      simulateClick(selectBtn);
      log('Personal seleccionado automáticamente', 'success');
      await delay(CONFIG.delays.medium);
      return true;
    }
  } else if (totalCount > 1) {
    log(`Se encontraron ${totalCount} registros. Esperando selección manual...`, 'warning');
    await waitForModalToClose('LISTADO DEL PERSONAL');
    return true;
  } else {
    log('No se encontraron registros', 'warning');
    const closeBtn = personalModal.querySelector('.ant-modal-close');
    if (closeBtn) simulateClick(closeBtn);
  }
  
  return false;
}

// ==================== SETEO DE FECHA EN MODAL DE FIRMA ====================

async function setFechaFirmaModal(modal, fecha) {
  if (!fecha) return;
  
  const fechaFormateada = fecha;
  log(`Estableciendo fecha: ${fechaFormateada}`, 'info');
  
  const dateInput = modal.querySelector('input#form_item_fecharegistro') ||
                    modal.querySelector('input[placeholder*="DD"]') ||
                    modal.querySelector('.ant-picker input');
  
  if (!dateInput) {
    log('Input de fecha no encontrado', 'warning');
    return;
  }
  
  dateInput.focus();
  await delay(CONFIG.delays.short);
  
  // Limpiar el valor actual
  dateInput.value = '';
  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  await delay(100);
  simulateEnter(dateInput);
  
  // Escribir caracter por caracter
  for (let i = 0; i < fechaFormateada.length; i++) {
    dateInput.value += fechaFormateada[i];
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(30);
  }
  
  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
  dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
  simulateEnter(dateInput);
  
  await delay(CONFIG.delays.short);
  
  // Click en el body del modal para cerrar cualquier dropdown
  const modalBody = modal.querySelector('.ant-modal-body');
  if (modalBody) {
    simulateClick(modalBody);
  }
  
  await delay(CONFIG.delays.short);
  log(`Fecha establecida: ${fechaFormateada}`, 'success');
}

// ==================== VERIFICACIÓN DE LICENCIA ====================

async function verifyLicenseForEconomica() {
  try {
    const result = await LicenseManager.verifyLicense();
    
    if (result.valid) {
      EconomicaState.licenseValid = true;
      log('Licencia verificada correctamente', 'success');
      return true;
    } else {
      EconomicaState.licenseValid = false;
      log('Licencia no válida', 'error');
      showLicenseNotification(result);
      return false;
    }
  } catch (error) {
    log('Error al verificar licencia: ' + error.message, 'error');
    EconomicaState.licenseValid = false;
    return false;
  }
}

function showLicenseNotification(result) {
  const existing = document.getElementById('license-notification-kda');
  if (existing) existing.remove();
  
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
        La automatización de ficha económica no se ejecutará hasta que active una licencia válida.
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

// ==================== EXPANSIÓN DE SECCIONES ====================

async function expandSection(sectionIndex) {
  const sections = document.querySelectorAll('.ant-collapse-item');
  const section = sections[sectionIndex];
  
  if (!section) {
    log(`Sección ${sectionIndex} no encontrada`, 'error');
    return false;
  }
  
  if (!section.classList.contains('ant-collapse-item-active')) {
    const header = section.querySelector('.ant-collapse-header');
    if (header) {
      simulateClick(header);
      await delay(CONFIG.delays.long);
      log(`Sección ${sectionIndex + 1} expandida`, 'success');
    }
  }
  
  return true;
}

async function expandSectionByName(nameContains) {
  const sections = document.querySelectorAll('.ant-collapse-item');
  
  for (let i = 0; i < sections.length; i++) {
    const headerText = sections[i].querySelector('.ant-collapse-header-text');
    if (headerText && headerText.textContent.toUpperCase().includes(nameContains.toUpperCase())) {
      if (!sections[i].classList.contains('ant-collapse-item-active')) {
        const header = sections[i].querySelector('.ant-collapse-header');
        if (header) {
          simulateClick(header);
          await delay(CONFIG.delays.long);
          log(`Sección "${nameContains}" expandida`, 'success');
        }
      }
      return { section: sections[i], index: i };
    }
  }
  
  log(`Sección "${nameContains}" no encontrada`, 'warning');
  return null;
}

// ==================== SETEO DE OBSERVACIONES (SECCIÓN 6) ====================

function setObservacionesFromStorage() {
  const finalData = EconomicaState.storedData?.final || {};
  
  if (finalData['final-observaciones']) {
    // Buscar el textarea de observaciones específicamente
    const observacionesTextarea = document.getElementById('form_item_observaciones') ||
                                   document.querySelector('textarea#form_item_observaciones') ||
                                   document.querySelector('textarea[id*="observacion"]') ||
                                   document.querySelector('#form_item_observacion');
    
    if (observacionesTextarea) {
      // Usar método directo para textarea
      observacionesTextarea.focus();
      observacionesTextarea.value = finalData['final-observaciones'];
      observacionesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      observacionesTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      observacionesTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
      
      log('Observaciones seteadas: ' + finalData['final-observaciones'].substring(0, 50) + '...', 'success');
      return true;
    } else {
      log('Textarea de observaciones no encontrado, reintentando...', 'warning');
      
      setTimeout(() => {
        const textarea = document.getElementById('form_item_observaciones') ||
                         document.querySelector('textarea#form_item_observaciones') ||
                         document.querySelector('textarea[id*="observacion"]') ||
                         document.querySelector('#form_item_observacion');
        
        if (textarea && finalData['final-observaciones']) {
          textarea.focus();
          textarea.value = finalData['final-observaciones'];
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.dispatchEvent(new Event('blur', { bubbles: true }));
          log('Observaciones seteadas en reintento', 'success');
        }
      }, CONFIG.delays.extraLong);
      
      return false;
    }
  }
  
  return true;
}

// ==================== SETEO DE DATOS EN SECCIÓN 3 (DOMICILIO FISCAL) ====================

async function setDomicilioFiscalFromStorage() {
  // Verificar que solo se ejecute una vez
  if (EconomicaState.domicilioFiscalProcesado) {
    log('Domicilio fiscal ya fue procesado anteriormente', 'info');
    return;
  }
  
  EconomicaState.domicilioFiscalProcesado = true;
  
  const ubicacionData = EconomicaState.storedData?.ubicacion || {};
  
  // Obtener la sección 3 - DOMICILIO FISCAL DEL CONDUCTOR DE LA ACTIVIDAD
  const sections = document.querySelectorAll('.ant-collapse-item');
  let domicilioSection = null;
  
  for (const section of sections) {
    const headerText = section.querySelector('.ant-collapse-header-text');
    if (headerText && headerText.textContent.includes('DOMICILIO FISCAL')) {
      domicilioSection = section;
      break;
    }
  }
  
  if (!domicilioSection) {
    log('Sección de Domicilio Fiscal no encontrada', 'error');
    EconomicaState.domicilioFiscalProcesado = false; // Permitir reintentar
    return;
  }
  
  await delay(CONFIG.delays.medium);
  
  // [11] N° MUNICIPAL
  if (ubicacionData['ubicacion-n-municipal']) {
    const input = findInputByLegend(domicilioSection, 'N° MUNICIPAL') ||
                  findInputByLegend(domicilioSection, 'MUNICIPAL');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-n-municipal']);
      log(`N° Municipal seteado: ${ubicacionData['ubicacion-n-municipal']}`, 'success');
    }
  }
  
  // [21] MANZANA
  if (ubicacionData['ubicacion-manzana']) {
    const input = findInputByLegend(domicilioSection, 'MANZANA');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-manzana']);
      log(`Manzana seteada: ${ubicacionData['ubicacion-manzana']}`, 'success');
    }
  }
  
  // [22] LOTE
  if (ubicacionData['ubicacion-lote']) {
    const input = findInputByLegend(domicilioSection, 'LOTE');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-lote']);
      log(`Lote seteado: ${ubicacionData['ubicacion-lote']}`, 'success');
    }
  }
  
  // [23] SUB-LOTE
  if (ubicacionData['ubicacion-sub-lote']) {
    const input = findInputByLegend(domicilioSection, 'SUB-LOTE') ||
                  findInputByLegend(domicilioSection, 'SUBLOTE');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-sub-lote']);
      log(`Sub-Lote seteado: ${ubicacionData['ubicacion-sub-lote']}`, 'success');
    }
  }
  
  // [07] CÓDIGO VÍA - Con modal de selección si hay más de 2 registros
  if (ubicacionData['ubicacion-codigo-via']) {
    await handleCodigoViaModal(domicilioSection, ubicacionData['ubicacion-codigo-via']);
  }
  
  // [18] CÓDIGO HU - Con modal de selección si hay más de 2 registros
  if (ubicacionData['ubicacion-codigo-hu']) {
    await handleCodigoHuModal(domicilioSection, ubicacionData['ubicacion-codigo-hu']);
  }
  
  log('Domicilio fiscal procesado completamente', 'success');
}

async function handleCodigoViaModal(section, codigo) {
  const searchBtn = findSearchButtonByLegend(section, 'DIGO VÍA') ||
                    findSearchButtonByLegend(section, 'CODIGO VIA') ||
                    findSearchButtonByLegend(section, '[07]');
  
  if (!searchBtn) {
    log('Botón de búsqueda de código vía no encontrado', 'warning');
    // Intentar setear directamente en el input
    const input = findInputByLegend(section, 'DIGO VÍA') ||
                  findInputByLegend(section, 'CODIGO VIA');
    if (input) {
      simulateInput(input, codigo);
      log(`Código vía seteado directamente: ${codigo}`, 'success');
    }
    return;
  }
  
  simulateClick(searchBtn);
  await delay(CONFIG.delays.long);
  
  const modal = await waitForModal('VÍA') || await waitForModal('VIA');
  if (!modal) {
    log('Modal de código vía no apareció', 'warning');
    return;
  }
  
  // Buscar el código
  const searchInput = modal.querySelector('input#form_item_search') ||
                      modal.querySelector('input[type="text"]');
  
  if (searchInput) {
    simulateInput(searchInput, codigo);
    await delay(CONFIG.delays.short);
    
    const searchButton = modal.querySelector('button.ant-input-search-button') ||
                         modal.querySelector('button .anticon-search')?.closest('button');
    
    if (searchButton) {
      simulateClick(searchButton);
      await delay(CONFIG.delays.long);
    }
  }
  
  // Verificar cuántos resultados hay
  const countSpan = modal.querySelector('p.float-right span.text-black');
  const count = countSpan ? parseInt(countSpan.textContent) : 0;
  
  if (count === 1) {
    const selectBtn = modal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      simulateClick(selectBtn);
      log('Código vía seleccionado automáticamente', 'success');
    }
  } else if (count > 1) {
    log(`Se encontraron ${count} registros para código vía. Usuario debe seleccionar.`, 'warning');
    await waitForModalToClose('VÍA');
  } else {
    log('No se encontraron registros para código vía', 'warning');
    // Cerrar modal
    const closeBtn = modal.querySelector('.ant-modal-close');
    if (closeBtn) simulateClick(closeBtn);
  }
}

async function handleCodigoHuModal(section, codigo) {
  const searchBtn = findSearchButtonByLegend(section, 'DIGO HU') ||
                    findSearchButtonByLegend(section, 'CODIGO HU') ||
                    findSearchButtonByLegend(section, '[18]');
  
  if (!searchBtn) {
    log('Botón de búsqueda de código HU no encontrado', 'warning');
    const input = findInputByLegend(section, 'DIGO HU') ||
                  findInputByLegend(section, 'CODIGO HU');
    if (input) {
      simulateInput(input, codigo);
      log(`Código HU seteado directamente: ${codigo}`, 'success');
    }
    return;
  }
  
  simulateClick(searchBtn);
  await delay(CONFIG.delays.long);
  
  const modal = await waitForModal('HAB') || await waitForModal('URBANA');
  if (!modal) {
    log('Modal de código HU no apareció', 'warning');
    return;
  }
  
  const searchInput = modal.querySelector('input#form_item_search') ||
                      modal.querySelector('input[type="text"]');
  
  if (searchInput) {
    simulateInput(searchInput, codigo);
    await delay(CONFIG.delays.short);
    
    const searchButton = modal.querySelector('button.ant-input-search-button') ||
                         modal.querySelector('button .anticon-search')?.closest('button');
    
    if (searchButton) {
      simulateClick(searchButton);
      await delay(CONFIG.delays.long);
    }
  }
  
  const countSpan = modal.querySelector('p.float-right span.text-black');
  const count = countSpan ? parseInt(countSpan.textContent) : 0;
  
  if (count === 1) {
    const selectBtn = modal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      simulateClick(selectBtn);
      log('Código HU seleccionado automáticamente', 'success');
    }
  } else if (count > 1) {
    log(`Se encontraron ${count} registros para código HU. Usuario debe seleccionar.`, 'warning');
    await waitForModalToClose('HAB');
  } else {
    log('No se encontraron registros para código HU', 'warning');
    const closeBtn = modal.querySelector('.ant-modal-close');
    if (closeBtn) simulateClick(closeBtn);
  }
}

// ==================== PROCESAMIENTO DE FIRMAS ====================

async function processFirmaSupervisor(data) {
  log('Procesando firma del supervisor [121]', 'info');
  
  let editBtn = null;
  
  // Buscar el botón de editar para [121] FIRMA DEL SUPERVISOR
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    const spanText = span.textContent.trim();
    if (spanText.includes('[121]') && spanText.includes('FIRMA') && spanText.includes('SUPERVISOR')) {
      const flexContainer = span.closest('.flex');
      if (flexContainer) {
        editBtn = flexContainer.querySelector('button .anticon-edit')?.closest('button');
        if (editBtn) {
          log('Botón de editar supervisor encontrado', 'success');
          break;
        }
      }
    }
  }
  
  // Búsqueda alternativa
  if (!editBtn) {
    const containers = document.querySelectorAll('.flex.justify-between');
    for (const container of containers) {
      if (container.textContent.includes('[121]') && container.textContent.includes('SUPERVISOR')) {
        editBtn = container.querySelector('button .anticon-edit')?.closest('button');
        if (editBtn) break;
      }
    }
  }
  
  if (!editBtn) {
    log('Botón de editar supervisor no encontrado', 'warning');
    return;
  }
  
  simulateClick(editBtn);
  await delay(CONFIG.delays.long);
  
  let firmaModal = await waitForModal('FIRMA DEL SUPERVISOR');
  if (!firmaModal) {
    firmaModal = await waitForModal('NUEVA FIRMA');
  }
  if (!firmaModal) {
    log('Modal de firma supervisor no apareció', 'error');
    return;
  }
  
  // Buscar y usar el botón de búsqueda de personal
  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    
    await searchAndSelectPersonal(data['final-supervisor-nombre']);
  }
  
  await delay(CONFIG.delays.long);
  
  // Actualizar referencia al modal después de seleccionar personal
  let firmaModalUpdated = await waitForModal('FIRMA DEL SUPERVISOR');
  if (!firmaModalUpdated) {
    firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  }
  if (firmaModalUpdated) {
    // Setear la fecha
    await setFechaFirmaModal(firmaModalUpdated, data['final-supervisor-fecha']);
    
    await delay(CONFIG.delays.medium);
    
    // Guardar
    const guardarBtn = firmaModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log('Firma supervisor guardada', 'success');
    }
  }
  
  await delay(CONFIG.delays.extraLong);
}

async function processFirmaTecnico(data) {
  log('Procesando firma del técnico catastral [122]', 'info');
  
  let editBtn = null;
  
  // Buscar el botón de editar para [122] FIRMA DEL TÉCNICO CATASTRAL
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    const spanText = span.textContent.trim();
    if (spanText.includes('[122]') && spanText.includes('FIRMA') && spanText.includes('CNICO')) {
      const flexContainer = span.closest('.flex');
      if (flexContainer) {
        editBtn = flexContainer.querySelector('button .anticon-edit')?.closest('button');
        if (editBtn) {
          log('Botón de editar técnico encontrado', 'success');
          break;
        }
      }
    }
  }
  
  // Búsqueda alternativa
  if (!editBtn) {
    const containers = document.querySelectorAll('.flex.justify-between');
    for (const container of containers) {
      if (container.textContent.includes('[122]') && container.textContent.includes('CNICO')) {
        editBtn = container.querySelector('button .anticon-edit')?.closest('button');
        if (editBtn) break;
      }
    }
  }
  
  if (!editBtn) {
    log('Botón de editar técnico no encontrado', 'warning');
    return;
  }
  
  simulateClick(editBtn);
  await delay(CONFIG.delays.long);
  
  let firmaModal = await waitForModal('CNICO CATASTRAL');
  if (!firmaModal) {
    firmaModal = await waitForModal('NUEVA FIRMA');
  }
  if (!firmaModal) {
    log('Modal de firma técnico no apareció', 'error');
    return;
  }
  
  // Buscar y usar el botón de búsqueda de personal
  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    
    await searchAndSelectPersonal(data['final-tecnico-nombre']);
  }
  
  await delay(CONFIG.delays.long);
  
  // Actualizar referencia al modal después de seleccionar personal
  let firmaModalUpdated = await waitForModal('CNICO CATASTRAL');
  if (!firmaModalUpdated) {
    firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  }
  if (firmaModalUpdated) {
    // Setear la fecha
    await setFechaFirmaModal(firmaModalUpdated, data['final-tecnico-fecha']);
    
    await delay(CONFIG.delays.medium);
    
    // Guardar
    const guardarBtn = firmaModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log('Firma técnico guardada', 'success');
    }
  }
  
  await delay(CONFIG.delays.extraLong);
}

// ==================== SETUP DE LISTENERS ====================

function setupGuardarPrincipalesListener() {
  log('Configurando listener para "Guardar principales"...', 'info');
  
  const handleClick = async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    const buttonText = button.textContent || '';
    if (buttonText.includes('Guardar principales') || buttonText.includes('Guardar Principales')) {
      log('Click detectado en Guardar principales!', 'success');
      
      // Remover este listener para que no se ejecute múltiples veces
      document.removeEventListener('click', handleClick, true);
      
      await delay(CONFIG.delays.long);
      
      // 1. Expandir sección 6 - INFORMACIÓN COMPLEMENTARIA / OBSERVACIONES
      const result = await expandSectionByName('INFORMACI');
      if (!result) {
        await expandSectionByName('OBSERVACIONES');
      }
      
      await delay(CONFIG.delays.medium);
      
      // 2. Setear observaciones
      setObservacionesFromStorage();
      
      await delay(CONFIG.delays.medium);
      
      // 3. Ahora activar el listener para Domicilio Fiscal
      log('Activando listener para Domicilio Fiscal...', 'info');
      setupDomicilioFiscalListener();
      
      // 4. Activar el listener para Guardar información
      log('Activando listener para Guardar información...', 'info');
      setupGuardarInformacionListener();
    }
  };
  
  document.addEventListener('click', handleClick, true);
}

function setupDomicilioFiscalListener() {
  log('Configurando listener para expansión de Domicilio Fiscal...', 'info');
  
  const handleClick = async (e) => {
    // Verificar que no se haya procesado ya
    if (EconomicaState.domicilioFiscalProcesado) return;
    
    const header = e.target.closest('.ant-collapse-header');
    if (!header) return;
    
    const headerText = header.querySelector('.ant-collapse-header-text');
    if (headerText && headerText.textContent.includes('DOMICILIO FISCAL')) {
      log('Click detectado en sección Domicilio Fiscal!', 'success');
      
      await delay(CONFIG.delays.long);
      await setDomicilioFiscalFromStorage();
    }
  };
  
  document.addEventListener('click', handleClick, true);
}

function setupGuardarInformacionListener() {
  log('Configurando listener para "Guardar información"...', 'info');
  
  const handleClick = async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    const buttonText = button.textContent || '';
    if (buttonText.includes('Guardar informaci') || buttonText.includes('Guardar Informaci')) {
      log('Click detectado en Guardar información!', 'success');
      
      // Remover el listener para evitar múltiples ejecuciones
      document.removeEventListener('click', handleClick, true);
      
      await delay(CONFIG.delays.long);
      
      const finalData = EconomicaState.storedData.final || {};
      
      // Procesar firma del supervisor
      if (finalData['final-supervisor-nombre']) {
        await processFirmaSupervisor(finalData);
      }
      
      await delay(CONFIG.delays.long);
      
      // Procesar firma del técnico
      if (finalData['final-tecnico-nombre']) {
        await processFirmaTecnico(finalData);
      }
      
      log('Sección final (firmas) completada', 'success');
    }
  };
  
  document.addEventListener('click', handleClick, true);
}

// ==================== INICIALIZACIÓN ====================

async function initEconomica() {
  log('Verificando licencia...', 'info');
  
  const licenseValid = await verifyLicenseForEconomica();
  
  if (!licenseValid) {
    log('Automatización detenida: Licencia no válida', 'error');
    return;
  }
  
  log('Iniciando automatización de Ficha Catastral Económica', 'info');
  
  // Cargar datos del storage
  EconomicaState.storedData = await getStoredData();
  log('Datos cargados del storage', 'success');
  
  await delay(CONFIG.delays.extraLong);
  
  // Configurar SOLO el listener de Guardar Principales inicialmente
  // Los demás listeners se activarán después de que el usuario haga click en Guardar Principales
  setupGuardarPrincipalesListener();
  
  log('Esperando click en "Guardar principales" para iniciar el flujo...', 'info');
}

// Inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEconomica);
} else {
  initEconomica();
}