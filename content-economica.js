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
  domicilioFiscalProcesado: false,
  guardarInformacionListenerActivo: false
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
  const isTextarea = element.tagName === 'TEXTAREA';
  const isInput = element.tagName === 'INPUT';
  if (isInput || isTextarea) {
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
    const maxAttempts = 120;
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

// ==================== HELPER: Obtener vía principal del storage ====================

function getViaPrincipalFromStorage() {
  const data = EconomicaState.storedData;
  const vias = data.vias;
  
  if (!vias || !Array.isArray(vias) || vias.length === 0) return null;
  
  const filaPrincipal = vias.find(row =>
    row.puerta && row.puerta.toUpperCase() === 'P'
  );

  if (filaPrincipal) {
    return {
      codigo: filaPrincipal.codigo || '',
      puerta: filaPrincipal.puerta || 'P',
      nro_municipal: filaPrincipal.nro_municipal || '',
      cond_num: filaPrincipal.cond_num || ''
    };
  }

  return null;
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
  dateInput.value = '';
  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  await delay(100);
  simulateEnter(dateInput);
  for (let i = 0; i < fechaFormateada.length; i++) {
    dateInput.value += fechaFormateada[i];
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(30);
  }
  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
  dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
  simulateEnter(dateInput);
  await delay(CONFIG.delays.short);
  const modalBody = modal.querySelector('.ant-modal-body');
  if (modalBody) {
    simulateClick(modalBody);
  }
  await delay(CONFIG.delays.short);
  log(`Fecha establecida: ${fechaFormateada}`, 'success');
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
    const observacionesTextarea = document.getElementById('form_item_observaciones') ||
                                   document.querySelector('textarea#form_item_observaciones') ||
                                   document.querySelector('textarea[id*="observacion"]') ||
                                   document.querySelector('#form_item_observacion');
    if (observacionesTextarea) {
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
  if (EconomicaState.domicilioFiscalProcesado) {
    log('Domicilio fiscal ya fue procesado anteriormente', 'info');
    return;
  }
  EconomicaState.domicilioFiscalProcesado = true;
  const ubicacionData = EconomicaState.storedData?.ubicacion || {};
  const viaPrincipal = getViaPrincipalFromStorage();
  const codigoVia = viaPrincipal ? viaPrincipal.codigo : ubicacion['ubicacion-codigo-via'];
  const nMunicipal = viaPrincipal ? viaPrincipal.nro_municipal : ubicacion['ubicacion-n-municipal'];
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
  if (nMunicipal) {
    const input = findInputByLegend(domicilioSection, 'N° MUNICIPAL') ||
                  findInputByLegend(domicilioSection, 'MUNICIPAL');
    if (input) {
      simulateInput(input, nMunicipal);
      log(`N° Municipal seteado: ${nMunicipal}`, 'success');
    }
  }
  if (ubicacionData['ubicacion-manzana']) {
    const input = findInputByLegend(domicilioSection, 'MANZANA');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-manzana']);
      log(`Manzana seteada: ${ubicacionData['ubicacion-manzana']}`, 'success');
    }
  }
  if (ubicacionData['ubicacion-lote']) {
    const input = findInputByLegend(domicilioSection, 'LOTE');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-lote']);
      log(`Lote seteado: ${ubicacionData['ubicacion-lote']}`, 'success');
    }
  }
  if (ubicacionData['ubicacion-sub-lote']) {
    const input = findInputByLegend(domicilioSection, 'SUB-LOTE') ||
                  findInputByLegend(domicilioSection, 'SUBLOTE');
    if (input) {
      simulateInput(input, ubicacionData['ubicacion-sub-lote']);
      log(`Sub-Lote seteado: ${ubicacionData['ubicacion-sub-lote']}`, 'success');
    }
  }
  if (codigoVia) {
    await handleCodigoViaModal(domicilioSection, codigoVia);
  }
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
      log('Código vía seleccionado automáticamente', 'success');
    }
  } else if (count > 1) {
    log(`Se encontraron ${count} registros para código vía. Usuario debe seleccionar.`, 'warning');
    await waitForModalToClose('VÍA');
  } else {
    log('No se encontraron registros para código vía', 'warning');
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

// ==================== PROCESAMIENTO DE FIRMAS ====================

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
  if (!firmaModal) {
    firmaModal = await waitForModal('NUEVA FIRMA');
  }
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
  if (!firmaModalUpdated) {
    firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  }
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
  
  // Buscar botón con reintentos (3 segundos total)
  const editBtn = await findEditBtnWithRetry([
    { includes: ['[122]', 'FIRMA', 'CNICO'] },
    { includes: ['[122]', 'CNICO CATASTRAL'] }
  ]);
  
  if (!editBtn) {
    log('Botón de editar técnico no encontrado después de reintentos', 'warning');
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

  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    await searchAndSelectPersonal(data['final-tecnico-nombre']);
  }

  await delay(CONFIG.delays.long);

  let firmaModalUpdated = await waitForModal('CNICO CATASTRAL');
  if (!firmaModalUpdated) {
    firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  }
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

async function processFirmaVerificador(data) {
  log('Procesando V°B° del verificador catastral [123]', 'info');

  const editBtn = await findEditBtnWithRetry([
    { includes: ['[123]', 'VERIFICADOR'] },
    { includes: ['VERIFICADOR', 'CATASTRAL'] }
  ]);

  if (!editBtn) {
    log('Botón de editar verificador no encontrado', 'warning');
    return;
  }

  simulateClick(editBtn);
  await delay(CONFIG.delays.long);

  let firmaModal = await waitForModal('VERIFICADOR CATASTRAL');
  if (!firmaModal) firmaModal = await waitForModal('NUEVA V');
  if (!firmaModal) {
    log('Modal de firma verificador no apareció', 'error');
    return;
  }

  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    await searchAndSelectPersonal(data['final-verificador-nombre']);
  }

  await delay(CONFIG.delays.long);

  let firmaModalUpdated = await waitForModal('VERIFICADOR CATASTRAL');
  if (!firmaModalUpdated) firmaModalUpdated = await waitForModal('NUEVA V');
  if (firmaModalUpdated) {
    await setFechaFirmaModal(firmaModalUpdated, data['final-verificador-fecha']);

    if (data['final-verificador-registro']) {
      const registroInput = firmaModalUpdated.querySelector('#form_item_nroregistroverificador');
      if (registroInput) {
        simulateInput(registroInput, data['final-verificador-registro']);
        log('N°Registro verificador: ' + data['final-verificador-registro'], 'success');
      }
    }

    await delay(CONFIG.delays.medium);
    const guardarBtn = firmaModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log('Firma verificador guardada', 'success');
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
      document.removeEventListener('click', handleClick, true);
      await delay(CONFIG.delays.long);
      const result = await expandSectionByName('INFORMACI');
      if (!result) {
        await expandSectionByName('OBSERVACIONES');
      }
      await delay(CONFIG.delays.medium);
      setObservacionesFromStorage();
      await delay(CONFIG.delays.medium);
      log('Activando listener para Domicilio Fiscal...', 'info');
      setupDomicilioFiscalListener();
      log('Activando listener para Guardar información...', 'info');
      setupGuardarInformacionListener();
    }
  };
  document.addEventListener('click', handleClick, true);
}

function setupDomicilioFiscalListener() {
  log('Configurando listener para expansión de Domicilio Fiscal...', 'info');
  const handleClick = async (e) => {
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
      document.removeEventListener('click', handleClick, true);
      await delay(CONFIG.delays.long);
      const finalData = EconomicaState.storedData.final || {};
      if (finalData['final-supervisor-nombre']) {
        await processFirmaSupervisor(finalData);
      }
      await delay(CONFIG.delays.long);
      if (finalData['final-tecnico-nombre']) {
        await processFirmaTecnico(finalData);
      }
      await delay(CONFIG.delays.long);
      if (finalData['final-verificador-nombre']) {
        await processFirmaVerificador(finalData);
      }
      log('Sección final (firmas) completada', 'success');
    }
  };

  document.addEventListener('click', handleClick, true);
}

// Agregar ANTES de la sección de inicialización (antes de initCotitularidad)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'executeSection') {
    if (message.section === 'firmas-only') {
      (async () => {
        const finalData = message.data || {};
        log('Ejecutando firmas directamente (sin guardar observaciones)', 'info');

        if (finalData['final-supervisor-nombre']) {
          await processFirmaSupervisor(finalData);
        }
        await delay(CONFIG.delays.long);
        if (finalData['final-tecnico-nombre']) {
          await processFirmaTecnico(finalData);
        }
        await delay(CONFIG.delays.long);
        if (finalData['final-verificador-nombre']) {
          await processFirmaVerificador(finalData);
        }

        log('Firmas seteadas correctamente', 'success');
        sendResponse({ success: true });
      })();
      return true;
    }
  }
});

// ==================== INICIALIZACIÓN ====================

async function initEconomica() {
  log('Iniciando automatización de Ficha Catastral Económica', 'info');
  EconomicaState.storedData = await getStoredData();
  log('Datos cargados del storage', 'success');
  await delay(CONFIG.delays.extraLong);
  setupGuardarPrincipalesListener();
  log('Esperando click en "Guardar principales" para iniciar el flujo...', 'info');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEconomica);
} else {
  initEconomica();
}