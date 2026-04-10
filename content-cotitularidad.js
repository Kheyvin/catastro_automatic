// ==================== CONFIGURACIÓN ====================

const STORAGE_KEY = 'fichaCatastralData';

const CONFIG = {
  delays: {
    short: 200,
    medium: 300,
    long: 500,
    extraLong: 800
  },
  selectors: {
    sectionHeader: '.ant-collapse-header',
    sectionContent: '.ant-collapse-content',
    sectionActive: '.ant-collapse-item-active',
    selectDropdown: '.ant-select-dropdown',
    selectItem: '.ant-select-item-option',
    selectItemContent: '.ant-select-item-option-content',
    modalRoot: '.ant-modal-root',
    modalBody: '.ant-modal-body',
    modalTitle: '.ant-modal-title',
    tableRow: '.ant-table-row',
    paginationTotal: '.float-right.font-semibold span.text-black',
    inputSearch: 'input[placeholder="Buscar"]',
    searchButton: '.ant-input-search-button'
  },
  defaultValues: {
    provinciaDefault: 'TACNA',
    distritoDefault: 'CORONEL GREGORIO ALBARRACIN LANCHIPA'
  }
};

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
  storedData: null,
  isProcessing: false
};

// ==================== FUNCIONES DE UTILIDAD ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message, type = 'info') {
  const prefix = '[FichaCatastral-Cotitularidad]';
  const styles = {
    info: 'color: #3b82f6',
    success: 'color: #22c55e',
    error: 'color: #ef4444',
    warning: 'color: #f59e0b'
  };
  console.log('%c' + prefix + ' ' + message, styles[type] || styles.info);
}

function simulateInput(element, value) {
  if (!element) return;
  
  try {
    let nativeInputValueSetter;
    
    if (element instanceof HTMLInputElement) {
      nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype, 'value'
      ).set;
    } else if (element instanceof HTMLTextAreaElement) {
      nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value'
      ).set;
    }
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }
  } catch (e) {
    element.value = value;
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
}

function simulateClick(element) {
  if (!element) return false;
  
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
    buttons: 1,
    clientX: element.getBoundingClientRect ? element.getBoundingClientRect().x + 5 : 0,
    clientY: element.getBoundingClientRect ? element.getBoundingClientRect().y + 5 : 0
  };
  
  if (element.focus) {
    element.focus();
  }
  
  element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
  element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
  element.dispatchEvent(new MouseEvent('click', eventOptions));
  return true;
}

function simulateEnter(element) {
  if (!element) return;
  
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  });
  element.dispatchEvent(enterEvent);
  
  const enterEventUp = new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true
  });
  element.dispatchEvent(enterEventUp);
}

async function getStoredData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

// ==================== FUNCIONES DE SELECTORES ====================

async function openSelector(selectorElement) {
  if (!selectorElement) {
    log('Selector no encontrado', 'error');
    return null;
  }
  const selectContainer = selectorElement.closest('.ant-select') || selectorElement;
  if (selectContainer.classList.contains('ant-select-disabled')) {
    log('El selector está deshabilitado', 'warning');
    return null;
  }
  const selectorInput = selectContainer.querySelector('.ant-select-selector');
  const tryOpenDropdown = async () => {
    if (selectorInput) {
      selectorInput.dispatchEvent(new MouseEvent('mousedown', { 
        bubbles: true, 
        cancelable: true, 
        view: window 
      }));
      await delay(100);
      selectorInput.dispatchEvent(new MouseEvent('mouseup', { 
        bubbles: true, 
        cancelable: true, 
        view: window 
      }));
      await delay(100);
      selectorInput.dispatchEvent(new MouseEvent('click', { 
        bubbles: true, 
        cancelable: true, 
        view: window 
      }));
    } else {
      simulateClick(selectContainer);
    }
  };
  await tryOpenDropdown();
  await delay(CONFIG.delays.short);
  let dropdown = null;
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const dropdowns = document.querySelectorAll('.ant-select-dropdown');
    for (const dd of dropdowns) {
      try {
        const style = window.getComputedStyle(dd);
        const isHidden = dd.classList.contains('ant-select-dropdown-hidden') || 
                         style.display === 'none' || 
                         dd.style.display === 'none' ||
                         style.visibility === 'hidden';
        
        if (!isHidden && dd.offsetParent !== null) {
          dropdown = dd;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (dropdown) break;
    if (i === 5) {
      await tryOpenDropdown();
    }
    await delay(150);
  }
  if (!dropdown) {
    log('No se pudo abrir el dropdown del selector', 'error');
    return null;
  }
  await delay(100);
  return dropdown;
}

async function selectOptionByText(selectorElement, targetText, exactMatch = false) {
  const dropdown = await openSelector(selectorElement);
  if (!dropdown) return false;
  const normalizeText = (text) => {
    return text.trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };
  const targetNormalized = normalizeText(targetText);
  const targetCode = targetNormalized.split(' - ')[0].replace(/^0+/, '');
  const findOption = () => {
    const options = dropdown.querySelectorAll('.ant-select-item-option:not(.ant-select-item-option-disabled)');
    for (const option of options) {
      const content = option.querySelector('.ant-select-item-option-content');
      const optionText = content ? content.textContent.trim() : option.textContent.trim();
      const optionNormalized = normalizeText(optionText);
      const optionCode = optionNormalized.split(' - ')[0].replace(/^0+/, '');
      if (exactMatch) {
        if (optionNormalized === targetNormalized) return option;
      } else {
        if (optionNormalized === targetNormalized) return option;
        if (targetCode && optionCode && targetCode === optionCode) return option;
        if (targetNormalized.length > 1 && 
            (optionNormalized.includes(targetNormalized) || targetNormalized.includes(optionNormalized))) {
          return option;
        }
      }
    }
    return null;
  };
  const virtualList = dropdown.querySelector('.rc-virtual-list-holder');
  const inputElement = selectorElement.querySelector('input') || 
                       selectorElement.closest('.ant-select')?.querySelector('input');
  let attempts = 0;
  const maxScrollAttempts = 100;
  while (attempts < maxScrollAttempts) {
    const option = findOption();
    if (option) {
      simulateClick(option);
      await delay(CONFIG.delays.short);
      log('Opcion seleccionada: ' + targetText, 'success');
      return true;
    }
    if (inputElement) {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40,
        which: 40,
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(keyEvent);
    }
    if (virtualList) {
      const scrollableElement = virtualList.querySelector('.rc-virtual-list-holder-inner')?.parentElement || virtualList;
      scrollableElement.scrollTop += 200;
      scrollableElement.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
    await delay(80);
    attempts++;
  }
  simulateClick(document.body);
  await delay(CONFIG.delays.short);
  log('No se encontro la opcion: ' + targetText, 'warning');
  return false;
}

async function selectByLegend(container, legendText, targetValue, exactMatch = false) {
  const fieldsets = container.querySelectorAll('fieldset');
  for (const fieldset of fieldsets) {
    const legend = fieldset.querySelector('legend, label, p, h1');
    if (legend && legend.textContent.includes(legendText)) {
      const select = fieldset.querySelector('.ant-select');
      if (select) {
        return await selectOptionByText(select, targetValue, exactMatch);
      }
    }
  }
  const formItems = container.querySelectorAll('.ant-form-item');
  for (const formItem of formItems) {
    const label = formItem.querySelector('.ant-form-item-label label, .ant-form-item-label, label');
    if (label && label.textContent.includes(legendText)) {
      const select = formItem.querySelector('.ant-select');
      if (select) {
        return await selectOptionByText(select, targetValue, exactMatch);
      }
    }
  }
  log('No se encontro selector para: ' + legendText, 'warning');
  return false;
}

function findInputByLegend(section, legendText) {
  const searchText = legendText.toUpperCase();
  const fieldsets = section.querySelectorAll('fieldset');
  for (const fieldset of fieldsets) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent.toUpperCase().includes(searchText)) {
      const input = fieldset.querySelector('input:not([role="combobox"]):not([type="search"])');
      if (input) return input;
    }
  }
  const formItems = section.querySelectorAll('.ant-form-item');
  for (const formItem of formItems) {
    const label = formItem.querySelector('.ant-form-item-label label, label, legend');
    if (label && label.textContent.toUpperCase().includes(searchText)) {
      const input = formItem.querySelector('input:not([role="combobox"]):not([type="search"])');
      if (input) return input;
    }
  }
  const allLabels = section.querySelectorAll('label, legend, p, h1, h2, h3, span');
  for (const label of allLabels) {
    if (label.textContent.toUpperCase().includes(searchText)) {
      const container = label.closest('fieldset, .ant-form-item, .ant-col, .ant-row, div[class*="flex"]');
      if (container) {
        const input = container.querySelector('input:not([role="combobox"]):not([type="search"])');
        if (input) return input;
      }
    }
  }
  return null;
}

function findSearchButtonByLegend(section, legendText) {
  const searchText = legendText.toUpperCase();
  const fieldsets = section.querySelectorAll('fieldset');
  for (const fieldset of fieldsets) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent.toUpperCase().includes(searchText)) {
      const searchBtn = fieldset.querySelector('button .anticon-search')?.closest('button') ||
                        fieldset.querySelector('.ant-input-search-button');
      if (searchBtn) return searchBtn;
    }
  }
  const allLabels = section.querySelectorAll('label, legend, p, h1, h2, h3, span');
  for (const label of allLabels) {
    if (label.textContent.toUpperCase().includes(searchText)) {
      const container = label.closest('fieldset, .ant-form-item, .ant-col, .ant-row, div[class*="flex"]');
      if (container) {
        const searchBtn = container.querySelector('button .anticon-search')?.closest('button') ||
                          container.querySelector('.ant-input-search-button');
        if (searchBtn) return searchBtn;
      }
    }
  }
  return null;
}

// ==================== HELPER: Obtener vía principal del storage ====================

function getViaPrincipalFromStorage() {
  const data = CotitularidadState.storedData;
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

// ==================== FUNCIONES DE MODAL ====================

async function waitForModal(titleText, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let observer;
    const timeoutId = setTimeout(() => {
      if (observer) observer.disconnect();
      resolve(null);
    }, timeout);
    const findModal = () => {
      try {
        const modals = document.querySelectorAll('.ant-modal');
        for (const modal of modals) {
          const title = modal.querySelector('.ant-modal-title');
          if (title && title.textContent && title.textContent.toUpperCase().includes(titleText.toUpperCase())) {
            try {
              if (modal.offsetParent !== null || modal.style.display !== 'none') {
                return modal;
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        return null;
      }
      return null;
    };
    const existingModal = findModal();
    if (existingModal) {
      clearTimeout(timeoutId);
      return setTimeout(() => resolve(existingModal), CONFIG.delays.medium);
    }
    observer = new MutationObserver(() => {
      const modal = findModal();
      if (modal) {
        clearTimeout(timeoutId);
        observer.disconnect();
        setTimeout(() => resolve(modal), CONFIG.delays.medium);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function searchInModal(modal, searchText) {
  const searchInput = modal.querySelector('input[placeholder="Buscar"]');
  if (!searchInput) {
    log('Input de busqueda no encontrado en modal', 'error');
    return false;
  }
  searchInput.value = '';
  simulateInput(searchInput, searchText);
  await delay(CONFIG.delays.medium);
  const searchBtn = modal.querySelector('.ant-input-search-button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
  }
  return true;
}

async function handleModalSearch(titleText, searchValue, autoSelect = true) {
  try {
    const modal = await waitForModal(titleText);
    if (!modal) {
      log('Modal no encontrado: ' + titleText, 'error');
      return false;
    }
    await searchInModal(modal, searchValue);
    await delay(CONFIG.delays.long);
    const totalRegistros = modal.querySelector('p.float-right span.text-black');
    const count = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
    if (count === 1 && autoSelect) {
      const selectBtn = modal.querySelector('button .anticon-select')?.closest('button');
      if (selectBtn) {
        simulateClick(selectBtn);
        log('Registro seleccionado automaticamente', 'success');
        await delay(CONFIG.delays.medium);
        return true;
      }
    } else if (count > 1) {
      log(`Se encontraron ${count} registros. Esperando seleccion manual...`, 'warning');
      await waitForModalToClose(titleText);
      return true;
    }
    return false;
  } catch (e) {
    log('Error en busqueda de modal: ' + e.message, 'error');
    return false;
  }
}

function waitForModalToClose(titleText) {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const modals = document.querySelectorAll('.ant-modal');
      let found = false;
      for (const modal of modals) {
        const title = modal.querySelector('.ant-modal-title');
        if (title && title.textContent.includes(titleText)) {
          if (modal.offsetParent !== null) {
            found = true;
            break;
          }
        }
      }
      if (!found) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 60000);
  });
}

// ==================== FUNCIONES DE FIRMAS ====================

async function searchAndSelectPersonal(searchName) {
  if (!searchName) return false;
  const personalModal = await waitForModal('LISTADO DEL PERSONAL');
  if (!personalModal) {
    log('Modal de personal no apareció', 'error');
    return false;
  }
  const searchInput = personalModal.querySelector('input[placeholder="Buscar"]');
  if (searchInput && searchName) {
    searchInput.focus();
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(CONFIG.delays.short);
    simulateInput(searchInput, searchName);
    await delay(CONFIG.delays.short);
    const searchBtn = personalModal.querySelector('button[type="submit"]') ||
                      personalModal.querySelector('button .anticon-search')?.closest('button');
    if (searchBtn) {
      log('Click en boton de busqueda del modal', 'info');
      simulateClick(searchBtn);
    } else {
      const buttons = personalModal.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('BUSCAR')) {
          log('Click en boton BUSCAR del modal', 'info');
          simulateClick(btn);
          break;
        }
      }
    }
    await delay(CONFIG.delays.long);
    await delay(CONFIG.delays.long);
  }
  const totalRegistros = personalModal.querySelector('p.float-right span.text-black');
  const totalCount = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
  log(`Total de registros encontrados: ${totalCount}`, 'info');
  if (totalCount === 1) {
    const selectBtn = personalModal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      await delay(CONFIG.delays.short);
      simulateClick(selectBtn);
      log('Personal seleccionado automaticamente', 'success');
      await delay(CONFIG.delays.medium);
      return true;
    }
  } else if (totalCount > 1) {
    log(`Se encontraron ${totalCount} registros. Esperando seleccion manual...`, 'warning');
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

// ==================== MANEJO DE LISTADO DE ADMINISTRADOS ====================

async function handleListadoAdministrados(modal) {
  log('Modal LISTADO DE ADMINISTRADOS abierto. Esperando búsqueda del usuario...', 'info');

  await new Promise((resolve) => {
    const searchInput = modal.querySelector('input#form_item_search') ||
                        modal.querySelector('input[placeholder="Buscar"]');
    const searchBtn = modal.querySelector('button[type="submit"]') ||
                      modal.querySelector('button .anticon-search')?.closest('button');

    if (!searchInput) {
      log('Input de búsqueda no encontrado en modal', 'error');
      resolve();
      return;
    }

    let resolved = false;
    const doResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doResolve();
    });

    if (searchBtn) {
      searchBtn.addEventListener('click', () => doResolve());
    }

    const allButtons = modal.querySelectorAll('button');
    for (const btn of allButtons) {
      if ((btn.textContent || '').includes('BUSCAR')) {
        btn.addEventListener('click', () => doResolve());
      }
    }

    setTimeout(doResolve, 120000);
  });

  log('Usuario realizó búsqueda. Esperando 1.5s para resultados...', 'info');
  await delay(1500);

  const totalSpan = modal.querySelector('p.float-right span.text-black');
  const totalRegistros = totalSpan ? parseInt(totalSpan.textContent) : -1;
  log('Total de registros: ' + totalRegistros, 'info');

  if (totalRegistros === 0) {
    const searchInput = modal.querySelector('input#form_item_search') ||
                        modal.querySelector('input[placeholder="Buscar"]');
    const valorBusqueda = searchInput ? searchInput.value.trim() : '';
    log('0 registros. Valor guardado: ' + valorBusqueda, 'info');

    const nuevoBtn = modal.querySelector('button .anticon-file-add')?.closest('button');
    if (nuevoBtn) {
      simulateClick(nuevoBtn);
      log('Click en NUEVO', 'success');
    } else {
      const allBtns = modal.querySelectorAll('button');
      for (const btn of allBtns) {
        if ((btn.textContent || '').includes('NUEVO')) {
          simulateClick(btn);
          log('Click en NUEVO (por texto)', 'success');
          break;
        }
      }
    }

    await delay(CONFIG.delays.long);
    const nuevoModal = await waitForModal('NUEVO LISTADO DE ADMINISTRADOS') ||
                       await waitForModal('NUEVO');
    if (nuevoModal) {
      await fillNuevoAdministradoModal(nuevoModal, valorBusqueda);
    } else {
      log('Modal NUEVO no apareció', 'error');
    }
  } else if (totalRegistros === 1) {
    const selectBtn = modal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      simulateClick(selectBtn);
      log('Registro seleccionado automáticamente', 'success');
    }
  } else if (totalRegistros > 1) {
    log(totalRegistros + ' registros encontrados. Esperando selección manual...', 'warning');
    await waitForModalToClose('LISTADO DE ADMINISTRADOS');
  }
}

async function fillNuevoAdministradoModal(modal, valorDocumento) {
  log('Llenando NUEVO ADMINISTRADO: ' + valorDocumento, 'info');
  await delay(CONFIG.delays.medium);

  const docInput = modal.querySelector('input#form_item_documentoregistro') ||
                   modal.querySelector('input[placeholder="Buscar por documento de identidad"]');
  if (docInput) {
    simulateInput(docInput, valorDocumento);
    log('Documento seteado: ' + valorDocumento, 'success');
    await delay(CONFIG.delays.short);

    const searchBtn = docInput.closest('.ant-input-group-wrapper')?.querySelector('.ant-input-search-button') ||
                      docInput.closest('.ant-input-wrapper')?.querySelector('.ant-input-search-button') ||
                      modal.querySelector('.ant-input-search-button');
    if (searchBtn) {
      simulateClick(searchBtn);
      log('Click en búsqueda de documento', 'success');
      await delay(CONFIG.delays.long);
      await delay(CONFIG.delays.long);
    }
  } else {
    log('Input de documento no encontrado', 'error');
  }

  await delay(CONFIG.delays.medium);
  const formItems = modal.querySelectorAll('.ant-form-item');
  let estadoCivilSet = false;
  for (const formItem of formItems) {
    const label = formItem.querySelector('label');
    if (label && label.textContent && label.textContent.includes('Estado Civil')) {
      const select = formItem.querySelector('.ant-select');
      if (select) {
        await selectOptionByText(select, 'SOLTERO');
        log('Estado Civil → SOLTERO(A)', 'success');
        estadoCivilSet = true;
        break;
      }
    }
  }

  if (!estadoCivilSet) {
    const selectInput = modal.querySelector('#form_item_idestadocivil');
    if (selectInput) {
      const selectContainer = selectInput.closest('.ant-select');
      if (selectContainer) {
        await selectOptionByText(selectContainer, 'SOLTERO');
        log('Estado Civil → SOLTERO(A) (por id)', 'success');
      }
    }
  }

  log('Formulario NUEVO ADMINISTRADO completado', 'info');
}

// ==================== FUNCIÓN PRINCIPAL DE COTITULARIDAD ====================

async function handleNuevoCotitularModal(ubicacion) {
  try {
    log('Procesando modal de Nuevo Cotitular', 'info');
    const viaPrincipal = getViaPrincipalFromStorage();
    const codigoVia = viaPrincipal ? viaPrincipal.codigo : ubicacion['ubicacion-codigo-via'];
    const nMunicipal = viaPrincipal ? viaPrincipal.nro_municipal : ubicacion['ubicacion-n-municipal'];
    const modal = await waitForModal('NUEVO COTITULAR CATASTRAL');
    if (!modal) {
      log('Modal de nuevo cotitular no encontrado', 'error');
      return;
    }
    await delay(CONFIG.delays.medium);
    if (ubicacion['ubicacion-manzana']) {
      const manzanaInput = findInputByLegend(modal, 'MANZANA') || 
                           findInputByLegend(modal, '[17]');
      if (manzanaInput) {
        simulateInput(manzanaInput, ubicacion['ubicacion-manzana']);
        log('Manzana seteada: ' + ubicacion['ubicacion-manzana'], 'success');
      }
    }
    if (ubicacion['ubicacion-lote']) {
      const loteInput = findInputByLegend(modal, 'LOTE') ||
                        findInputByLegend(modal, '[18]');
      if (loteInput && !loteInput.closest('fieldset')?.querySelector('legend')?.textContent.includes('SUB')) {
        simulateInput(loteInput, ubicacion['ubicacion-lote']);
        log('Lote seteado: ' + ubicacion['ubicacion-lote'], 'success');
      }
    }
    if (ubicacion['ubicacion-sub-lote']) {
      const subLoteInput = findInputByLegend(modal, 'SUB-LOTE') || 
                           findInputByLegend(modal, 'SUB LOTE') ||
                           findInputByLegend(modal, '[19]');
      if (subLoteInput) {
        simulateInput(subLoteInput, ubicacion['ubicacion-sub-lote']);
        log('Sub-Lote seteado: ' + ubicacion['ubicacion-sub-lote'], 'success');
      }
    }
    if (nMunicipal) {
      const nMunicipalInput = findInputByLegend(modal, 'MUNICIPAL') ||
                              findInputByLegend(modal, '[11]');
      if (nMunicipalInput) {
        simulateInput(nMunicipalInput, nMunicipal);
        log('N° Municipal seteado: ' + nMunicipal, 'success');
      }
    }
    await delay(CONFIG.delays.short);
    log('Seleccionando Provincia: TACNA', 'info');
    const provinciaSelected = await selectByLegend(modal, 'PROVINCIA', CONFIG.defaultValues.provinciaDefault);
    if (provinciaSelected) {
      log('Provincia TACNA seleccionada', 'success');
    }
    await delay(CONFIG.delays.short);
    log('Seleccionando Distrito: ' + CONFIG.defaultValues.distritoDefault, 'info');
    const distritoSelected = await selectByLegend(modal, 'DISTRITO', CONFIG.defaultValues.distritoDefault);
    if (distritoSelected) {
      log('Distrito seleccionado', 'success');
    }
    await delay(CONFIG.delays.short);
    if (codigoVia) {
      const codigoViaInput = findInputByLegend(modal, 'DIGO V') ||
                             findInputByLegend(modal, 'CODIGO VIA') ||
                             findInputByLegend(modal, '[07]');
      if (codigoViaInput) {
        simulateInput(codigoViaInput, codigoVia);
        log('Código Vía seteado: ' + codigoVia, 'success');
        await delay(CONFIG.delays.short);
        const searchBtn = findSearchButtonByLegend(modal, 'DIGO V') ||
                          findSearchButtonByLegend(modal, 'CODIGO VIA') ||
                          findSearchButtonByLegend(modal, '[07]');
        if (searchBtn) {
          simulateClick(searchBtn);
          log('Click en botón de búsqueda de Código Vía', 'info');
          await delay(CONFIG.delays.long);
          await handleModalSearch('LISTADO DE V', codigoVia);
        }
      }
    }
    await delay(CONFIG.delays.medium);
    if (ubicacion['ubicacion-codigo-hu']) {
      const codigoHUInput = findInputByLegend(modal, 'DIGO HU') ||
                            findInputByLegend(modal, 'CODIGO HU') ||
                            findInputByLegend(modal, '[14]');
      if (codigoHUInput) {
        simulateInput(codigoHUInput, ubicacion['ubicacion-codigo-hu']);
        log('Código HU seteado: ' + ubicacion['ubicacion-codigo-hu'], 'success');
        await delay(CONFIG.delays.short);
        const searchBtn = findSearchButtonByLegend(modal, 'DIGO HU') ||
                          findSearchButtonByLegend(modal, 'CODIGO HU') ||
                          findSearchButtonByLegend(modal, '[14]');
        if (searchBtn) {
          simulateClick(searchBtn);
          log('Click en botón de búsqueda de Código HU', 'info');
          await delay(CONFIG.delays.long);
          await handleModalSearch('LISTADO DE HABITACIONES URBANAS', ubicacion['ubicacion-codigo-hu']);
        }
      }
    }
    // Esperar que el usuario haga click en el botón de búsqueda de NRO DOC [23]
    log('Esperando que usuario haga click en búsqueda de NRO DOC...', 'info');

    await new Promise((resolve) => {
      const handler = (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        // Detectar si es el botón search dentro del fieldset NRO DOC [23]
        const fieldset = button.closest('fieldset');
        if (fieldset) {
          const legend = fieldset.querySelector('legend');
          if (legend && legend.textContent.toUpperCase().includes('NRO DOC')) {
            const isSearchBtn = button.querySelector('.anticon-search') ||
                                button.classList.contains('ant-input-search-button');
            if (isSearchBtn) {
              log('Click detectado en búsqueda NRO DOC del cotitular', 'success');
              document.removeEventListener('click', handler, true);
              resolve();
              return;
            }
          }
        }
      };
      document.addEventListener('click', handler, true);
      // Timeout: 2 minutos
      setTimeout(() => {
        document.removeEventListener('click', handler, true);
        resolve();
      }, 120000);
    });

    // Esperar que aparezca el modal LISTADO DE ADMINISTRADOS
    await delay(CONFIG.delays.long);
    const adminModal = await waitForModal('LISTADO DE ADMINISTRADOS');
    if (adminModal) {
      await handleListadoAdministrados(adminModal);
    } else {
      log('Modal LISTADO DE ADMINISTRADOS no apareció después de NRO DOC', 'warning');
    }
    log('Modal de nuevo cotitular procesado', 'success');
  } catch (e) {
    log('Error en modal de nuevo cotitular: ' + e.message, 'error');
  }
}

function waitForGuardarPrincipalesClick() {
  return new Promise((resolve) => {
    log('Configurando listener para botón Guardar principales...', 'info');
    const handler = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const buttonText = button.textContent || '';
      if (buttonText.includes('Guardar principales')) {
        log('Click detectado en Guardar principales!', 'success');
        document.removeEventListener('click', handler, true);
        resolve(button);
      }
    };
    document.addEventListener('click', handler, true);
  });
}

function waitForNuevoCotitularClick() {
  return new Promise((resolve) => {
    log('Configurando listener para botón NUEVO en sección Cotitulares...', 'info');
    const handler = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const buttonText = button.textContent || '';
      const hasIcon = button.querySelector('.anticon-plus');
      const section = button.closest('.ant-collapse-item');
      const sectionHeader = section?.querySelector('.ant-collapse-header-text');
      const sectionTitle = sectionHeader?.textContent || '';
      if ((buttonText.includes('NUEVO') || hasIcon) && sectionTitle.includes('DATOS DEL COTITULAR')) {
        log('Click detectado en NUEVO de sección Cotitulares!', 'success');
        document.removeEventListener('click', handler, true);
        setTimeout(() => resolve(button), CONFIG.delays.long);
      }
    };
    document.addEventListener('click', handler, true);
  });
}

function waitForObservacionesButtonClick() {
  return new Promise((resolve) => {
    log('Configurando listener para botón Guardar observaciones...', 'info');
    const handler = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const buttonText = button.textContent || '';
      if (buttonText.includes('Guardar observaciones')) {
        log('Click detectado en Guardar observaciones!', 'success');
        document.removeEventListener('click', handler, true);
        resolve(button);
      }
    };
    document.addEventListener('click', handler, true);
  });
}

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

async function handleSeccionFinal() {
  log('Procesando seccion final: FIRMAS', 'info');
  const data = CotitularidadState.storedData;
  const finalData = data.final || {};
  log('Esperando click en botón "Guardar observaciones"...', 'info');
  await waitForObservacionesButtonClick();
  log('Usuario guardó observaciones', 'success');
  await delay(CONFIG.delays.long);
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
  log('Seccion final completada', 'success');
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

async function initCotitularidad() {
  log('Iniciando automatización de Ficha Catastral Cotitularidad', 'info');
  CotitularidadState.storedData = await getStoredData();
  log('Datos cargados del storage', 'success');
  await delay(CONFIG.delays.medium);
  log('Esperando click en "Guardar principales" para desplegar sección de Cotitulares...', 'info');
  await waitForGuardarPrincipalesClick();
  log('Usuario guardó principales', 'success');
  await delay(CONFIG.delays.long);
  await expandSection(1);
  setupNuevoCotitularListener();
  setupObservacionesListener();
}

function setupNuevoCotitularListener() {
  log('Configurando listener continuo para botón NUEVO...', 'info');
  const handleNuevoClick = async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const buttonText = button.textContent || '';
    const hasIcon = button.querySelector('.anticon-plus');
    const section = button.closest('.ant-collapse-item');
    const sectionHeader = section?.querySelector('.ant-collapse-header-text');
    const sectionTitle = sectionHeader?.textContent || '';
    if ((buttonText.includes('NUEVO') || hasIcon) && sectionTitle.includes('DATOS DEL COTITULAR')) {
      log('Click detectado en NUEVO de sección Cotitulares!', 'success');
      await delay(CONFIG.delays.long);
      const ubicacion = CotitularidadState.storedData.ubicacion || {};
      await handleNuevoCotitularModal(ubicacion);
    }
  };
  document.addEventListener('click', handleNuevoClick, true);
}

function setupObservacionesListener() {
  log('Configurando listener para Guardar observaciones...', 'info');
  setObservacionesFromStorage();
  const handleObservacionesClick = async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const buttonText = button.textContent || '';
    if (buttonText.includes('Guardar observaciones')) {
      log('Click detectado en Guardar observaciones!', 'success');
      document.removeEventListener('click', handleObservacionesClick, true);
      await delay(CONFIG.delays.long);
      const finalData = CotitularidadState.storedData.final || {};
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
      log('Sección final completada', 'success');
    }
  };
  document.addEventListener('click', handleObservacionesClick, true);
}

function setObservacionesFromStorage() {
  const finalData = CotitularidadState.storedData?.final || {};
  if (finalData['final-observaciones']) {
    const observacionesTextarea = document.querySelector('#form_item_observacion') ||
                                   document.querySelector('textarea[id*="observacion"]');
    if (observacionesTextarea) {
      simulateInput(observacionesTextarea, finalData['final-observaciones']);
      log('Observaciones seteadas: ' + finalData['final-observaciones'].substring(0, 50) + '...', 'success');
    } else {
      log('Textarea de observaciones no encontrado, reintentando...', 'warning');
      setTimeout(() => {
        const textarea = document.querySelector('#form_item_observacion') ||
                         document.querySelector('textarea[id*="observacion"]');
        if (textarea && finalData['final-observaciones']) {
          simulateInput(textarea, finalData['final-observaciones']);
          log('Observaciones seteadas en reintento', 'success');
        }
      }, CONFIG.delays.extraLong);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCotitularidad);
} else {
  initCotitularidad();
}