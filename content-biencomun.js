// ==================== CONTENT-BIENCOMUN.JS ====================
// Automatización de Ficha Catastral Bienes Comunes
// ==================== CONFIGURACIÓN ====================

const CONFIG = {
  delays: {
    short: 300,
    medium: 500,
    long: 1000,
    extraLong: 2000
  }
};

const BienComunState = {
  storedData: {},
};

// ==================== UTILIDADES ====================

function log(message, type = 'info') {
  const prefix = '[BienComun]';
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
  
  const isTextarea = element.tagName === 'TEXTAREA';
  const isInput = element.tagName === 'INPUT';
  
  if (isInput || isTextarea) {
    const prototype = isTextarea 
      ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
      : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    
    if (prototype && prototype.set) {
      prototype.set.call(element, value);
    } else {
      element.value = value;
    }
  } else {
    element.value = value;
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
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

async function waitForModal(titleContains, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const modals = document.querySelectorAll('.ant-modal');
    for (const modal of modals) {
      if (modal.offsetParent === null) continue;
      const title = modal.querySelector('.ant-modal-title');
      if (title && title.textContent.includes(titleContains)) return modal;
      const content = modal.textContent || '';
      if (content.includes(titleContains)) return modal;
    }
    await delay(200);
  }
  return null;
}

async function waitForModalToClose(titleContains, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const modals = document.querySelectorAll('.ant-modal');
    let found = false;
    for (const modal of modals) {
      if (modal.offsetParent === null) continue;
      const title = modal.querySelector('.ant-modal-title');
      if (title && title.textContent.includes(titleContains)) {
        found = true;
        break;
      }
    }
    if (!found) return true;
    await delay(500);
  }
  return false;
}

function findInputByLegend(container, legendText) {
  const fieldsets = container.querySelectorAll('fieldset');
  for (const fs of fieldsets) {
    const legend = fs.querySelector('legend');
    if (legend && legend.textContent.toUpperCase().includes(legendText.toUpperCase())) {
      return fs.querySelector('input, textarea');
    }
  }
  const labels = container.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent.toUpperCase().includes(legendText.toUpperCase())) {
      const formItem = label.closest('.ant-form-item');
      if (formItem) return formItem.querySelector('input, textarea');
    }
  }
  return null;
}

async function findEditBtnWithRetry(labelIdentifiers) {
  const retryDelay = CONFIG.delays.short;
  const totalRetries = Math.ceil(3000 / retryDelay);
  
  for (let attempt = 0; attempt < totalRetries; attempt++) {
    let editBtn = null;
    
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const spanText = span.textContent.trim();
      let found = false;
      for (const identifier of labelIdentifiers) {
        if (identifier.includes) {
          found = identifier.includes.every(part => spanText.includes(part));
        } else if (identifier.text) {
          found = spanText === identifier.text;
        }
        if (found) break;
      }
      if (found) {
        const flexContainer = span.closest('.flex');
        if (flexContainer) {
          editBtn = flexContainer.querySelector('button .anticon-edit')?.closest('button');
          if (editBtn) {
            log(`Botón editar encontrado en intento ${attempt + 1}`, 'success');
            return editBtn;
          }
        }
      }
    }
    
    if (!editBtn) {
      const containers = document.querySelectorAll('.flex.justify-between');
      for (const container of containers) {
        let found = false;
        for (const identifier of labelIdentifiers) {
          if (identifier.includes) {
            found = identifier.includes.every(part => container.textContent.includes(part));
          }
          if (found) break;
        }
        if (found) {
          editBtn = container.querySelector('button .anticon-edit')?.closest('button');
          if (editBtn) return editBtn;
        }
      }
    }
    
    if (attempt < totalRetries - 1) {
      await delay(retryDelay);
    }
  }
  
  return null;
}

// ==================== FUNCIONES DE BÚSQUEDA Y SELECCIÓN ====================

async function searchAndSelectPersonal(nombre) {
  if (!nombre) return false;
  
  const personalModal = await waitForModal('LISTADO DEL PERSONAL');
  if (!personalModal) {
    log('Modal de personal no encontrado', 'error');
    return false;
  }
  
  const searchInput = personalModal.querySelector('input#form_item_search') ||
                      personalModal.querySelector('input[type="text"]');
  
  if (searchInput) {
    simulateInput(searchInput, nombre);
    await delay(CONFIG.delays.short);
    
    const submitBtn = personalModal.querySelector('button[type="submit"]') ||
                      personalModal.querySelector('button .anticon-search')?.closest('button');
    if (submitBtn) {
      simulateClick(submitBtn);
      await delay(CONFIG.delays.long);
    }
  }
  
  const totalRegistros = personalModal.querySelector('p.float-right span.text-black');
  const totalCount = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
  
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

async function setFechaFirmaModal(modal, fecha) {
  if (!fecha) return;
  
  log('Estableciendo fecha: ' + fecha, 'info');
  
  const dateInput = modal.querySelector('input#form_item_fecharegistro') ||
                    modal.querySelector('input[placeholder*="DD"]') ||
                    modal.querySelector('.ant-picker input');
  
  if (!dateInput) {
    log('Input de fecha no encontrado', 'warning');
    return;
  }
  
  dateInput.focus();
  await delay(CONFIG.delays.short);
  
  dateInput.value = '';
  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  await delay(100);
  simulateEnter(dateInput);
  
  for (let i = 0; i < fecha.length; i++) {
    dateInput.value += fecha[i];
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(30);
  }
  
  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
  dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
  simulateEnter(dateInput);
  
  await delay(CONFIG.delays.short);
  
  const modalBody = modal.querySelector('.ant-modal-body');
  if (modalBody) simulateClick(modalBody);
  
  await delay(CONFIG.delays.short);
  log('Fecha establecida: ' + fecha, 'success');
}

async function findEditBtnWithRetry(labelIdentifiers, maxRetries) {
  // labelIdentifiers: array de objetos {text: 'texto a buscar', includes: ['parte1', 'parte2']}
  // maxRetries: cantidad de reintentos (total ~3 segundos con delay.short entre cada uno)
  const retryDelay = CONFIG.delays.short; // ~300ms
  const totalRetries = Math.ceil(3000 / retryDelay); // ~10 reintentos en 3 segundos
  const attempts = maxRetries || totalRetries;
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    let editBtn = null;
    
    // Búsqueda principal: por spans con texto específico
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const spanText = span.textContent.trim();
      let found = false;
      
      for (const identifier of labelIdentifiers) {
        if (identifier.includes) {
          found = identifier.includes.every(part => spanText.includes(part));
        } else if (identifier.text) {
          found = spanText === identifier.text;
        }
        if (found) break;
      }
      
      if (found) {
        const flexContainer = span.closest('.flex');
        if (flexContainer) {
          editBtn = flexContainer.querySelector('button .anticon-edit')?.closest('button');
          if (editBtn) {
            log(`Botón editar encontrado en intento ${attempt + 1}`, 'success');
            return editBtn;
          }
        }
      }
    }
    
    // Búsqueda alternativa: por contenedores flex
    if (!editBtn) {
      const containers = document.querySelectorAll('.flex.justify-between');
      for (const container of containers) {
        let found = false;
        for (const identifier of labelIdentifiers) {
          if (identifier.includes) {
            found = identifier.includes.every(part => container.textContent.includes(part));
          }
          if (found) break;
        }
        
        if (found) {
          editBtn = container.querySelector('button .anticon-edit')?.closest('button');
          if (editBtn) {
            log(`Botón editar encontrado (búsqueda alternativa) en intento ${attempt + 1}`, 'success');
            return editBtn;
          }
        }
      }
    }
    
    if (attempt < attempts - 1) {
      log(`Botón editar no encontrado, reintentando... (${attempt + 1}/${attempts})`, 'warning');
      await delay(retryDelay);
    }
  }
  
  log('Botón editar no encontrado después de todos los reintentos', 'warning');
  return null;
}

// ==================== FIRMAS ====================

async function processFirmaSupervisor(data) {
  log('Procesando firma del supervisor [121]', 'info');
  
  const editBtn = await findEditBtnWithRetry([
    { includes: ['[121]', 'FIRMA', 'SUPERVISOR'] }
  ]);
  
  if (!editBtn) {
    log('Botón de editar supervisor no encontrado', 'warning');
    return;
  }
  
  simulateClick(editBtn);
  await delay(CONFIG.delays.long);
  
  let firmaModal = await waitForModal('FIRMA DEL SUPERVISOR');
  if (!firmaModal) firmaModal = await waitForModal('NUEVA FIRMA');
  if (!firmaModal) {
    log('Modal de firma supervisor no apareció', 'error');
    return;
  }
  
  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    await searchAndSelectPersonal(data['final-supervisor-nombre']);
  }
  
  await delay(CONFIG.delays.long);
  
  let firmaModalUpdated = await waitForModal('FIRMA DEL SUPERVISOR');
  if (!firmaModalUpdated) firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  if (firmaModalUpdated) {
    await setFechaFirmaModal(firmaModalUpdated, data['final-supervisor-fecha']);
    await delay(CONFIG.delays.medium);
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
  
  const editBtn = await findEditBtnWithRetry([
    { includes: ['[122]', 'FIRMA', 'CNICO'] },
    { includes: ['[122]', 'CNICO CATASTRAL'] }
  ]);
  
  if (!editBtn) {
    log('Botón de editar técnico no encontrado', 'warning');
    return;
  }
  
  simulateClick(editBtn);
  await delay(CONFIG.delays.long);
  
  let firmaModal = await waitForModal('CNICO CATASTRAL');
  if (!firmaModal) firmaModal = await waitForModal('NUEVA FIRMA');
  if (!firmaModal) {
    log('Modal de firma técnico no apareció', 'error');
    return;
  }
  
  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    await searchAndSelectPersonal(data['final-tecnico-nombre']);
  }
  
  await delay(CONFIG.delays.long);
  
  let firmaModalUpdated = await waitForModal('CNICO CATASTRAL');
  if (!firmaModalUpdated) firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  if (firmaModalUpdated) {
    await setFechaFirmaModal(firmaModalUpdated, data['final-tecnico-fecha']);
    await delay(CONFIG.delays.medium);
    const guardarBtn = firmaModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log('Firma técnico guardada', 'success');
    }
  }
  
  await delay(CONFIG.delays.extraLong);
}

// ==================== SETEO DE OBSERVACIONES ====================

async function setObservacionesFromStorage() {
  const finalData = BienComunState.storedData.final || {};
  const observaciones = finalData['final-observaciones'];
  
  if (!observaciones) {
    log('No hay observaciones para setear', 'warning');
    return;
  }
  
  // Buscar la sección de Observaciones y expandirla
  const sections = document.querySelectorAll('.ant-collapse-item');
  let observacionesSection = null;
  
  for (const section of sections) {
    const headerText = section.querySelector('.ant-collapse-header-text');
    if (headerText && headerText.textContent.includes('OBSERVACIONES')) {
      observacionesSection = section;
      break;
    }
  }
  
  if (!observacionesSection) {
    // En biencomun la sección puede llamarse diferente, buscar por número
    for (const section of sections) {
      const headerText = section.querySelector('.ant-collapse-header-text');
      if (headerText && (headerText.textContent.includes('7.-') || headerText.textContent.includes('OBSERVACIONES'))) {
        observacionesSection = section;
        break;
      }
    }
  }
  
  if (observacionesSection && !observacionesSection.classList.contains('ant-collapse-item-active')) {
    const header = observacionesSection.querySelector('.ant-collapse-header');
    if (header) {
      simulateClick(header);
      await delay(CONFIG.delays.long);
    }
  }
  
  await delay(CONFIG.delays.medium);
  
  // Buscar el textarea de observaciones
  const textarea = document.querySelector('#form_item_observaciones') ||
                   document.querySelector('#form_item_observacion') ||
                   document.querySelector('textarea[id*="observacion"]');
  
  if (textarea) {
    simulateInput(textarea, observaciones);
    log('Observaciones seteadas: ' + observaciones.substring(0, 50) + '...', 'success');
  } else {
    log('Textarea de observaciones no encontrado', 'error');
  }
}

// ==================== RECAPITULACIÓN DE BIENES COMUNES ====================

async function handleRecapitulacionBienesComunes(bienComunData) {
  log('Procesando 8.- RECAPITULACIÓN DE BIENES COMUNES', 'info');
  
  if (!bienComunData || bienComunData.length === 0) {
    log('No hay datos de bienes comunes', 'warning');
    return;
  }
  
  const sections = document.querySelectorAll('.ant-collapse-item');
  let recapSection = null;
  
  for (const section of sections) {
    const headerText = section.querySelector('.ant-collapse-header-text');
    if (headerText && headerText.textContent.includes('DE BIENES COMUNES')) {
      recapSection = section;
      break;
    }
    if (headerText && headerText.textContent.includes('8.-')) {
      recapSection = section;
      break;
    }
  }
  
  if (!recapSection) {
    log('Sección 8 de Recapitulación no encontrada', 'error');
    return;
  }
  
  if (!recapSection.classList.contains('ant-collapse-item-active')) {
    const header = recapSection.querySelector('.ant-collapse-header');
    if (header) {
      simulateClick(header);
      await delay(CONFIG.delays.long);
    }
  }
  
  await delay(CONFIG.delays.medium);
  
  for (let i = 0; i < bienComunData.length; i++) {
    const rowData = bienComunData[i];
    log(`Procesando bien común ${i + 1}/${bienComunData.length}`, 'info');
    
    const nuevoBtn = recapSection.querySelector('button.ant-btn-primary .anticon-plus')?.closest('button') ||
                     Array.from(recapSection.querySelectorAll('button')).find(b => b.textContent.includes('NUEVO'));
    
    if (!nuevoBtn) {
      log('Botón NUEVO no encontrado en sección 8', 'error');
      break;
    }
    
    simulateClick(nuevoBtn);
    await delay(CONFIG.delays.long);
    
    let modal = await waitForModal('Nueva Autorizaci') ||
                await waitForModal('NUEVA AUTORIZACI') ||
                await waitForModal('Nueva Autorización');
    
    if (!modal) {
      const modals = document.querySelectorAll('.ant-modal');
      for (const m of modals) {
        if (m.offsetParent !== null) {
          modal = m;
          break;
        }
      }
    }
    
    if (!modal) {
      log('Modal no apareció para fila ' + (i + 1), 'error');
      await delay(CONFIG.delays.medium);
      continue;
    }
    
    await delay(CONFIG.delays.medium);
    
    const modalInputs = modal.querySelectorAll('input.ant-input');
    const modalLabels = modal.querySelectorAll('label');
    
    // Mapeo: EDIFICACIÓN = n_edifi
    await setModalFieldByLabel(modal, 'EDIFICACI', rowData.n_edifi);
    
    // PORCENTAJE = porcentaje
    await setModalFieldByLabel(modal, 'PORCENTAJE', rowData.porcentaje);
    
    // AREA TERRENO COMÚN = atc
    await setModalFieldByLabel(modal, 'AREA TERRENO COM', rowData.atc);
    if (!rowData.atc) await setModalFieldByLabel(modal, 'REA TERRENO', rowData.atc);
    
    // AREA CONSTRUIDA COMÚN = acc
    await setModalFieldByLabel(modal, 'AREA CONSTRUIDA COM', rowData.acc);
    if (!rowData.acc) await setModalFieldByLabel(modal, 'REA CONSTRUIDA', rowData.acc);
    
    // ÁREA DE OTRAS INSTALACIONES = aoic
    await setModalFieldByLabel(modal, 'OTRAS INSTALACIONES', rowData.aoic);
    if (!rowData.aoic) await setModalFieldByLabel(modal, 'REA DE OTRAS', rowData.aoic);
    
    // ENTRADA = entrada
    await setModalFieldByLabel(modal, 'ENTRADA', rowData.entrada);
    
    // PISO = piso
    await setModalFieldByLabel(modal, 'PISO', rowData.piso);
    
    // UNIDAD = unidad
    await setModalFieldByLabel(modal, 'UNIDAD', rowData.unidad);
    
    await delay(CONFIG.delays.medium);
    
    const guardarBtn = modal.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log(`Bien común ${i + 1} guardado ✓`, 'success');
    } else {
      log('Botón Guardar no encontrado en modal', 'error');
      const closeBtn = modal.querySelector('.ant-modal-close');
      if (closeBtn) simulateClick(closeBtn);
    }
    
    await delay(CONFIG.delays.extraLong);
  }
  
  log('Recapitulación de Bienes Comunes completada', 'success');
}

async function setModalFieldByLabel(modal, labelText, value) {
  if (!value && value !== 0) return;
  
  const strValue = String(value);
  
  const labels = modal.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent.toUpperCase().includes(labelText.toUpperCase())) {
      const formItem = label.closest('.ant-form-item') || label.closest('.ant-row');
      if (formItem) {
        const input = formItem.querySelector('input.ant-input');
        if (input) {
          simulateInput(input, strValue);
          log(`${labelText}: ${strValue}`, 'success');
          await delay(CONFIG.delays.short);
          return;
        }
      }
    }
  }
  
  const fieldsets = modal.querySelectorAll('fieldset');
  for (const fs of fieldsets) {
    const legend = fs.querySelector('legend');
    if (legend && legend.textContent.toUpperCase().includes(labelText.toUpperCase())) {
      const input = fs.querySelector('input');
      if (input) {
        simulateInput(input, strValue);
        log(`${labelText}: ${strValue}`, 'success');
        await delay(CONFIG.delays.short);
        return;
      }
    }
  }
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
      document.removeEventListener('click', handleClick, true);
      
      await delay(CONFIG.delays.long);
      await setObservacionesFromStorage();
      setupGuardarInformacionListener();
      
      log('Listener de Guardar información activado', 'info');
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
    
    if (buttonText.includes('Guardar informaci') || buttonText.includes('Guardar información')) {
      log('Click detectado en Guardar información!', 'success');
      document.removeEventListener('click', handleClick, true);
      await delay(CONFIG.delays.long);
      const finalData = BienComunState.storedData.final || {};
      if (finalData['final-supervisor-nombre']) {
        await processFirmaSupervisor(finalData);
      }
      await delay(CONFIG.delays.long);
      if (finalData['final-tecnico-nombre']) {
        await processFirmaTecnico(finalData);
      }
      log('Firmas completadas', 'success');
    }
  };
  
  document.addEventListener('click', handleClick, true);
}

// ==================== MENSAJE HANDLER ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'executeSection') {
    log('Recibida solicitud de ejecución: ' + message.section, 'info');
    
    if (message.section === 'biencomun') {
      handleRecapitulacionBienesComunes(message.data).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        log('Error en bienes comunes: ' + err.message, 'error');
        sendResponse({ success: false, error: err.message });
      });
    } else if (message.section === 'firmas-only') {
      (async () => {
        const finalData = message.data || {};
        log('Ejecutando firmas directamente', 'info');
        
        if (finalData['final-supervisor-nombre']) {
          await processFirmaSupervisor(finalData);
        }
        await delay(CONFIG.delays.long);
        if (finalData['final-tecnico-nombre']) {
          await processFirmaTecnico(finalData);
        }
        
        log('Firmas seteadas correctamente', 'success');
        sendResponse({ success: true });
      })();
    }
    
    return true;
  }
});

// ==================== INICIALIZACIÓN ====================

async function initBienComun() {
  log('Iniciando automatización de Ficha Catastral Bienes Comunes', 'info');
  BienComunState.storedData = await getStoredData();
  log('Datos cargados del storage', 'success');
  await delay(CONFIG.delays.extraLong);
  setupGuardarPrincipalesListener();
  log('Esperando click en "Guardar principales" para iniciar el flujo...', 'info');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBienComun);
} else {
  initBienComun();
}
