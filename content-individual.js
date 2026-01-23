const STORAGE_KEY = 'fichaCatastralData';

const CONFIG = {
  delays: {
      short: 100,
      medium: 300,
      long: 500,
      extraLong: 1000
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
      edifica: '01',
      entrada: '01',
      piso: '01',
      unidad: '001',
      tipoEdificacion: '02 - CASA / CHALET',
      tipoPuerta: 'P - PRINCIPAL',
      condNumeracion: '01 - GENERADO POR MUNICIPALIDAD',
      tipoTitular: '01 - PERSONA NATURAL',
      clasificacionPredio: '01 - CASA HABITACION',
      predioCatastralEn: '07 - PREDIO INDEPENDIENTE',
      tipoPartidaRegistral: '03 - PARTIDA ELECTRONICA',
      ubicacionDomicilio: '01 - IGUAL A UNIDAD UU.CC.'
  }
};

const AppState = {
  storedData: null,
  currentSection: null,
  isProcessing: false
};

async function getStoredData() {
  return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || {});
      });
  });
}

async function saveStoredData(data) {
  return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
  });
}

async function updateStoredValue(section, key, value) {
  const data = await getStoredData();
  if (!data[section]) data[section] = {};
  data[section][key] = value;
  await saveStoredData(data);
  AppState.storedData = data;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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

function log(message, type = 'info') {
  const prefix = '[FichaCatastral]';
  const styles = {
      info: 'color: #3b82f6',
      success: 'color: #22c55e',
      error: 'color: #ef4444',
      warning: 'color: #f59e0b'
  };
  console.log('%c' + prefix + ' ' + message, styles[type] || styles.info);
}

function waitForElement(selector, timeout = 10000, parent = document) {
  return new Promise((resolve, reject) => {
      const element = parent.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = parent.querySelector(selector);
        if (el) {
            obs.disconnect();
            resolve(el);
        }
      });

      observer.observe(parent === document ? document.body : parent, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout esperando elemento: ' + selector));
      }, timeout);
  });
}

function waitForElementToDisappear(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (!element) {
        resolve();
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (!el) {
            obs.disconnect();
            resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout esperando que desaparezca: ' + selector));
      }, timeout);
  });
}

function waitForSectionToExpand(sectionIndex) {
  return new Promise((resolve, reject) => {
      let observer;
      const timeout = setTimeout(() => {
        if (observer) observer.disconnect();
        reject(new Error('Timeout esperando seccion ' + sectionIndex));
      }, 10000);

      observer = new MutationObserver((mutations) => {
        const sections = document.querySelectorAll('.ant-collapse-item');
        const section = sections[sectionIndex];
        
        if (section && section.classList.contains('ant-collapse-item-active')) {
            const content = section.querySelector('.ant-collapse-content-active');
            if (content) {
              clearTimeout(timeout);
              observer.disconnect();
              setTimeout(() => resolve(section), CONFIG.delays.medium);
            }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });

      const sections = document.querySelectorAll('.ant-collapse-item');
      const section = sections[sectionIndex];
      if (section && section.classList.contains('ant-collapse-item-active')) {
        const content = section.querySelector('.ant-collapse-content-active');
        if (content) {
            clearTimeout(timeout);
            observer.disconnect();
            setTimeout(() => resolve(section), CONFIG.delays.medium);
        }
      }
  });
}

function waitForButtonClick(buttonSelector, buttonText = null) {
  return new Promise((resolve) => {
      const handler = (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const matchesSelector = buttonSelector ? button.matches(buttonSelector) || button.closest(buttonSelector) : true;
        const matchesText = buttonText ? button.textContent.includes(buttonText) : true;

        if (matchesSelector && matchesText) {
            document.removeEventListener('click', handler, true);
            resolve(button);
        }
      };

      document.addEventListener('click', handler, true);
  });
}

async function openSelector(selectorElement) {
  if (!selectorElement) {
      log('Selector no encontrado', 'error');
      return null;
  }

  const selectContainer = selectorElement.closest('.ant-select') || selectorElement;
  const selectorInput = selectContainer.querySelector('.ant-select-selector') || selectContainer;
  
  simulateClick(selectorInput);
  await delay(CONFIG.delays.medium);

  try {
      const dropdown = await waitForElement('.ant-select-dropdown:not(.ant-select-dropdown-hidden)', 3000);
      return dropdown;
  } catch (e) {
      log('No se pudo abrir el dropdown del selector', 'error');
      return null;
  }
}

async function selectOptionByText(selectorElement, targetText, exactMatch = false) {
  const dropdown = await openSelector(selectorElement);
  if (!dropdown) return false;

  const normalizeText = (text) => {
      return text.trim().toUpperCase().replace(/\s+/g, ' ');
  };

  const targetNormalized = normalizeText(targetText);

  const findOption = () => {
      const options = dropdown.querySelectorAll('.ant-select-item-option');
      for (const option of options) {
        const content = option.querySelector('.ant-select-item-option-content');
        const text = content ? content.textContent.trim() : option.textContent.trim();
        const textNormalized = normalizeText(text);
        
        if (exactMatch) {
            if (textNormalized === targetNormalized) return option;
        } else {
            if (textNormalized.includes(targetNormalized) || 
                targetNormalized.includes(textNormalized) ||
                textNormalized.startsWith(targetNormalized.substring(0, 5))) {
              return option;
            }
        }
      }
      return null;
  };

  let attempts = 0;
  const maxAttempts = 30;
  const scrollContainer = dropdown.querySelector('.rc-virtual-list-holder') || 
                          dropdown.querySelector('.rc-virtual-list') ||
                          dropdown;

  while (attempts < maxAttempts) {
      const option = findOption();
      if (option) {
        simulateClick(option);
        await delay(CONFIG.delays.short);
        log('Opcion seleccionada: ' + targetText, 'success');
        return true;
      }

      const scrollElement = scrollContainer.querySelector('.rc-virtual-list-holder-inner') || scrollContainer;
      if (scrollElement.scrollHeight > scrollElement.clientHeight + scrollElement.scrollTop) {
        scrollElement.scrollTop += 150;
        await delay(CONFIG.delays.medium);
      } else {
        if (scrollContainer.scrollHeight > scrollContainer.clientHeight + scrollContainer.scrollTop) {
            scrollContainer.scrollTop += 150;
            await delay(CONFIG.delays.medium);
        } else {
            break;
        }
      }
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
  
  const selects = container.querySelectorAll('.ant-select');
  for (const select of selects) {
      const parent = select.closest('fieldset, .ant-form-item, .ant-col, .ant-row');
      if (parent) {
        const label = parent.querySelector('legend, label, p, h1, .ant-form-item-label');
        if (label && label.textContent.includes(legendText)) {
            return await selectOptionByText(select, targetValue, exactMatch);
        }
      }
  }
  
  log('No se encontro selector para: ' + legendText, 'warning');
  return false;
}

function removeReadonly(element) {
  if (!element) return;
  
  const input = element.querySelector('input') || element;
  input.removeAttribute('readonly');
  
  const selectContainer = element.closest('.ant-select');
  if (selectContainer) {
      const allInputs = selectContainer.querySelectorAll('input');
      allInputs.forEach(inp => inp.removeAttribute('readonly'));
  }
}

async function waitForModal(titleText, timeout = 10000) {
  return new Promise((resolve, reject) => {
      let observer;
      const timeoutId = setTimeout(() => {
        if (observer) observer.disconnect();
        reject(new Error('Timeout esperando modal: ' + titleText));
      }, timeout);

      const checkModal = () => {
        const modals = document.querySelectorAll('.ant-modal');
        for (const modal of modals) {
            const title = modal.querySelector('.ant-modal-title');
            if (title && title.textContent.includes(titleText)) {
              return modal;
            }
        }
        return null;
      };

      const modal = checkModal();
      if (modal) {
        clearTimeout(timeoutId);
        setTimeout(() => resolve(modal), CONFIG.delays.medium);
        return;
      }

      observer = new MutationObserver(() => {
        const modal = checkModal();
        if (modal) {
            clearTimeout(timeoutId);
            observer.disconnect();
            setTimeout(() => resolve(modal), CONFIG.delays.medium);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
  });
}

async function searchInModal(modal, searchValue) {
  const searchInput = modal.querySelector('input[placeholder="Buscar"]');
  if (!searchInput) {
      log('Input de busqueda no encontrado en modal', 'error');
      return false;
  }

  searchInput.value = '';
  simulateInput(searchInput, searchValue);
  await delay(CONFIG.delays.medium);

  const searchButton = modal.querySelector('.ant-input-search-button');
  if (searchButton) {
      simulateClick(searchButton);
      await delay(CONFIG.delays.long);
  }

  return true;
}

async function waitForSearchResults(modal, expectedCount = 1, timeout = 10000) {
  return new Promise((resolve) => {
      const checkResults = () => {
        const totalSpan = modal.querySelector('.float-right.font-semibold span.text-black');
        if (totalSpan) {
            return parseInt(totalSpan.textContent, 10);
        }
        return -1;
      };

      const startTime = Date.now();
      const interval = setInterval(() => {
        const count = checkResults();
        
        if (count === expectedCount) {
            clearInterval(interval);
            resolve({ count, autoSelect: true });
        } else if (count > 0 && count !== expectedCount) {
            clearInterval(interval);
            resolve({ count, autoSelect: false });
        } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            resolve({ count: -1, autoSelect: false });
        }
      }, 500);
  });
}

async function selectFirstRecord(modal) {
  const selectButton = modal.querySelector('button span.anticon-select');
  if (selectButton) {
      simulateClick(selectButton.closest('button'));
      await delay(CONFIG.delays.medium);
      return true;
  }
  return false;
}

function waitForUserSelection(modal) {
  return new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        if (!document.body.contains(modal) || modal.style.display === 'none') {
            obs.disconnect();
            resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      const handler = (e) => {
        const button = e.target.closest('button');
        if (button && button.textContent.includes('Seleccionar')) {
            document.removeEventListener('click', handler, true);
            setTimeout(() => {
              observer.disconnect();
              resolve();
            }, CONFIG.delays.medium);
        }
      };

      document.addEventListener('click', handler, true);
  });
}

async function handleModalSearch(modalTitle, searchValue, autoSelectIfOne = true) {
  try {
      const modal = await waitForModal(modalTitle);
      await searchInModal(modal, searchValue);
      
      const result = await waitForSearchResults(modal);
      
      if (result.autoSelect && autoSelectIfOne) {
        await selectFirstRecord(modal);
        log('Registro seleccionado automaticamente en ' + modalTitle, 'success');
      } else if (result.count > 1) {
        log('Multiples registros encontrados (' + result.count + '). Esperando seleccion del usuario...', 'warning');
        await waitForUserSelection(modal);
        log('Usuario selecciono un registro', 'success');
      }
      
      await delay(CONFIG.delays.medium);
      return true;
  } catch (e) {
      log('Error en busqueda de modal: ' + e.message, 'error');
      return false;
  }
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
        const parent = label.parentElement;
        if (parent) {
            const input = parent.querySelector('input:not([role="combobox"]):not([type="search"])');
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
        const btn = fieldset.querySelector('button .anticon-search, button[class*="search"]');
        if (btn) return btn.closest('button');
      }
  }
  
  const formItems = section.querySelectorAll('.ant-form-item');
  for (const formItem of formItems) {
      const label = formItem.querySelector('.ant-form-item-label label, label, legend, h1');
      if (label && label.textContent.toUpperCase().includes(searchText)) {
        const btn = formItem.querySelector('button .anticon-search, button[class*="search"]');
        if (btn) return btn.closest('button');
      }
  }
  
  const allElements = section.querySelectorAll('*');
  for (const el of allElements) {
      if (el.childElementCount === 0 && el.textContent.toUpperCase().includes(searchText)) {
        const container = el.closest('fieldset, .ant-form-item, .ant-col, .ant-row, div');
        if (container) {
            const btn = container.querySelector('button .anticon-search');
            if (btn) return btn.closest('button');
        }
      }
  }
  
  return null;
}

async function handleSeccion01Principales() {
  log('Procesando Seccion 01: PRINCIPALES', 'info');
  
  const data = AppState.storedData;
  const principales = data.principales || {};
  const final = data.final || {};

  const section = document.querySelector('.ant-collapse-item-active');
  if (!section) {
      log('Seccion PRINCIPALES no esta activa', 'error');
      return;
  }

  if (principales['principales-sector']) {
      const sectorSelect = section.querySelector('#form_item_sector');
      if (sectorSelect) {
        const currentValue = sectorSelect.closest('.ant-select');
        const selectionItem = currentValue ? currentValue.querySelector('.ant-select-selection-item') : null;
        if (!selectionItem || selectionItem.textContent.trim() === '') {
            await selectOptionByText(sectorSelect, principales['principales-sector']);
            await delay(CONFIG.delays.medium);
        }
      }
  }

  if (principales['principales-manzana']) {
      const manzanaSelect = section.querySelector('#form_item_manzana');
      if (manzanaSelect) {
        const currentValue = manzanaSelect.closest('.ant-select');
        const selectionItem = currentValue ? currentValue.querySelector('.ant-select-selection-item') : null;
        if (!selectionItem || selectionItem.textContent.trim() === '') {
            await selectOptionByText(manzanaSelect, principales['principales-manzana']);
            await delay(CONFIG.delays.medium);
        }
      }
  }

  if (principales['principales-lote']) {
      const loteSelect = section.querySelector('#form_item_lote');
      if (loteSelect) {
        const currentValue = loteSelect.closest('.ant-select');
        const selectionItem = currentValue ? currentValue.querySelector('.ant-select-selection-item') : null;
        if (!selectionItem || selectionItem.textContent.trim() === '') {
            await selectOptionByText(loteSelect, principales['principales-lote']);
            await delay(CONFIG.delays.medium);
        }
      }
  }

  const edificaInput = section.querySelector('#form_item_codigoedifica');
  if (edificaInput) simulateInput(edificaInput, CONFIG.defaultValues.edifica);

  const entradaInput = section.querySelector('#form_item_codigoentrada');
  if (entradaInput) simulateInput(entradaInput, CONFIG.defaultValues.entrada);

  const pisoInput = section.querySelector('#form_item_codigopiso');
  if (pisoInput) simulateInput(pisoInput, CONFIG.defaultValues.piso);

  const unidadInput = section.querySelector('#form_item_codigounidad');
  if (unidadInput) simulateInput(unidadInput, CONFIG.defaultValues.unidad);

  if (final['final-observaciones']) {
      const observacionesInput = document.querySelector('textarea[id*="observacion"]') || 
                                document.querySelector('input[id*="observacion"]');
      if (observacionesInput) {
        simulateInput(observacionesInput, final['final-observaciones']);
      }
  }

  log('Seccion 01 completada. Esperando click en "Guardar principales"...', 'success');

  await waitForButtonClick('button', 'Guardar principales');
  log('Usuario guardo PRINCIPALES', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(1);
}

async function handleSeccion02Ubicacion() {
  log('Procesando Seccion 02: UBICACION DEL PREDIO', 'info');

  const data = AppState.storedData;
  const ubicacion = data.ubicacion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[1];
  if (!section) return;

  if (ubicacion['ubicacion-manzana']) {
      const manzanaInput = findInputByLegend(section, 'MANZANA');
      if (manzanaInput) simulateInput(manzanaInput, ubicacion['ubicacion-manzana']);
  }

  if (ubicacion['ubicacion-lote']) {
      const loteInput = findInputByLegend(section, 'LOTE');
      if (loteInput) simulateInput(loteInput, ubicacion['ubicacion-lote']);
  }

  if (ubicacion['ubicacion-sub-lote']) {
      const subLoteInput = findInputByLegend(section, 'SUB-LOTE') || 
                          findInputByLegend(section, 'SUBLOTE');
      if (subLoteInput) simulateInput(subLoteInput, ubicacion['ubicacion-sub-lote']);
  }

  await selectByLegend(section, 'TIPO DE EDIFICACI', CONFIG.defaultValues.tipoEdificacion);

  await delay(CONFIG.delays.medium);

  if (ubicacion['ubicacion-codigo-hu']) {
      const searchButton = findSearchButtonByLegend(section, 'CODIGO HU') || 
                          findSearchButtonByLegend(section, 'COD. HU') ||
                          findSearchButtonByLegend(section, 'DIGO HU');
      if (searchButton) {
        simulateClick(searchButton);
        await handleModalSearch('LISTADO DE HABITACIONES URBANAS', ubicacion['ubicacion-codigo-hu']);
      }
  }

  await delay(CONFIG.delays.medium);

  const buttons = section.querySelectorAll('button');
  for (const btn of buttons) {
      if (btn.textContent.includes('NUEVO') || btn.querySelector('.anticon-plus')) {
        simulateClick(btn);
        await delay(CONFIG.delays.long);
        await handleNuevaUbicacionModal(ubicacion);
        break;
      }
  }

  log('Seccion 02 completada. Esperando click en "Guardar ubicacion de predio"...', 'success');

  await waitForButtonClick('button', 'Guardar ubicaci');
  await captureUbicacionData(section);
  
  log('Usuario guardo UBICACION', 'success');
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(2);
}

async function handleNuevaUbicacionModal(ubicacion) {
  try {
      const modal = await waitForModal('NUEVA UBICACI');
      
      if (ubicacion['ubicacion-codigo-via']) {
        const searchButton = modal.querySelector('button .anticon-search');
        if (searchButton) {
            simulateClick(searchButton.closest('button'));
            await handleModalSearch('LISTADO DE V', ubicacion['ubicacion-codigo-via']);
        }
      }

      await delay(CONFIG.delays.medium);

      await selectByLegend(modal, 'TIPO DE PUERTA', CONFIG.defaultValues.tipoPuerta);

      await delay(CONFIG.delays.short);

      await selectByLegend(modal, 'COND. NUMER', CONFIG.defaultValues.condNumeracion);

      if (ubicacion['ubicacion-n-municipal']) {
        const nroMunicipalInput = modal.querySelector('#form_item_numeromunicipal');
        if (nroMunicipalInput) {
            simulateInput(nroMunicipalInput, ubicacion['ubicacion-n-municipal']);
            
            nroMunicipalInput.addEventListener('change', async () => {
              await updateStoredValue('ubicacion', 'ubicacion-n-municipal', nroMunicipalInput.value);
            });
        }
      }

      await waitForButtonClick('button.ant-btn-primary', 'Guardar');
      await delay(CONFIG.delays.medium);

  } catch (e) {
      log('Error en modal Nueva Ubicacion: ' + e.message, 'error');
  }
}

async function captureUbicacionData(section) {
  const data = AppState.storedData;
  
  let tipoVia = '';
  let nombreVia = '';
  
  const tipoViaSpan = section.querySelector('.ant-select-selection-item[title]');
  if (tipoViaSpan) {
      tipoVia = tipoViaSpan.getAttribute('title') || tipoViaSpan.textContent.trim();
  }
  
  const nombreViaInput = findInputByLegend(section, 'NOMBRE DE V') || 
                          findInputByLegend(section, 'NOMBRE V');
  if (nombreViaInput) {
      nombreVia = nombreViaInput.value.trim();
  }
  
  const colindancia = (tipoVia + ' ' + nombreVia).trim();
  
  if (colindancia && colindancia !== ' ') {
      await updateStoredValue('descripcion', 'lindero-frente-colindancia', colindancia);
      log('Colindancia guardada: ' + colindancia, 'success');
  }

  const manzanaInput = findInputByLegend(section, 'MANZANA');
  const loteInput = findInputByLegend(section, 'LOTE');
  const subLoteInput = findInputByLegend(section, 'SUB-LOTE') || findInputByLegend(section, 'SUBLOTE');

  if (manzanaInput && manzanaInput.value && manzanaInput.value !== (data.ubicacion || {})['ubicacion-manzana']) {
      await updateStoredValue('ubicacion', 'ubicacion-manzana', manzanaInput.value);
  }
  if (loteInput && loteInput.value && loteInput.value !== (data.ubicacion || {})['ubicacion-lote']) {
      await updateStoredValue('ubicacion', 'ubicacion-lote', loteInput.value);
  }
  if (subLoteInput && subLoteInput.value && subLoteInput.value !== (data.ubicacion || {})['ubicacion-sub-lote']) {
      await updateStoredValue('ubicacion', 'ubicacion-sub-lote', subLoteInput.value);
  }
}

async function handleSeccion03Titular() {
  log('Procesando Seccion 03: IDENTIFICACION DEL TITULAR', 'info');

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[2];
  if (!section) return;

  await selectByLegend(section, 'TIPO DE TITULAR', CONFIG.defaultValues.tipoTitular);

  await delay(CONFIG.delays.medium);

  const searchButton = findSearchButtonByLegend(section, 'NRO DOC');
  if (searchButton) {
      simulateClick(searchButton);
  }

  log('Seccion 03 completada. Esperando click en "Guardar identificacion titular catastral"...', 'success');

  await waitForButtonClick('button', 'Guardar identificaci');
  log('Usuario guardo TITULAR', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(3);
}

async function handleSeccion04Domicilio() {
  log('Procesando Seccion 04: DOMICILIO FISCAL', 'info');

  const data = AppState.storedData;
  const ubicacion = data.ubicacion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[3];
  if (!section) return;

  log('Esperando que el usuario seleccione la ubicacion...', 'info');
  
  await new Promise((resolve) => {
      const checkSelection = setInterval(() => {
        const selectionItems = section.querySelectorAll('.ant-select-selection-item');
        for (const item of selectionItems) {
            if (item.textContent.includes('01 - IGUAL A UNIDAD UU.CC.')) {
              clearInterval(checkSelection);
              resolve();
              return;
            }
        }
      }, 500);
      
      setTimeout(() => {
        clearInterval(checkSelection);
        resolve();
      }, 60000);
  });

  log('Usuario selecciono ubicacion', 'info');
  await delay(CONFIG.delays.medium);

  if (ubicacion['ubicacion-n-municipal']) {
      let nroMunicipalInput = section.querySelector('#form_item_numeromunicipal');
      
      if (!nroMunicipalInput) {
        const formItems = section.querySelectorAll('.ant-form-item');
        for (const formItem of formItems) {
            const label = formItem.querySelector('label, legend, p');
            if (label && (label.textContent.includes('N° MUNICIPAL') || 
                          label.textContent.includes('NRO MUNICIPAL') ||
                          label.textContent.includes('MUNICIPAL'))) {
              nroMunicipalInput = formItem.querySelector('input:not([role="combobox"])');
              break;
            }
        }
      }
      
      if (!nroMunicipalInput) {
        nroMunicipalInput = findInputByLegend(section, 'MUNICIPAL');
      }
      
      if (nroMunicipalInput) {
        simulateInput(nroMunicipalInput, ubicacion['ubicacion-n-municipal']);
        log('N Municipal seteado: ' + ubicacion['ubicacion-n-municipal'], 'success');
      } else {
        log('No se encontro input de N Municipal', 'warning');
      }
  }

  if (ubicacion['ubicacion-manzana']) {
      const manzanaInput = findInputByLegend(section, 'MANZANA');
      if (manzanaInput) simulateInput(manzanaInput, ubicacion['ubicacion-manzana']);
  }

  if (ubicacion['ubicacion-lote']) {
      const loteInput = findInputByLegend(section, 'LOTE');
      if (loteInput) simulateInput(loteInput, ubicacion['ubicacion-lote']);
  }

  if (ubicacion['ubicacion-sub-lote']) {
      const subLoteInput = findInputByLegend(section, 'SUB-LOTE') || 
                          findInputByLegend(section, 'SUBLOTE');
      if (subLoteInput) simulateInput(subLoteInput, ubicacion['ubicacion-sub-lote']);
  }

  await delay(CONFIG.delays.medium);

  if (ubicacion['ubicacion-codigo-hu']) {
      const searchButton = findSearchButtonByLegend(section, 'DIGO HAB') || 
                          findSearchButtonByLegend(section, 'COD. HAB');
      if (searchButton) {
        simulateClick(searchButton);
        await handleModalSearch('LISTADO DE HABITACIONES URBANAS', ubicacion['ubicacion-codigo-hu']);
      }
  }

  await delay(CONFIG.delays.medium);

  if (ubicacion['ubicacion-codigo-via']) {
      const searchButton = findSearchButtonByLegend(section, 'DIGO V') || 
                          findSearchButtonByLegend(section, 'COD. V');
      if (searchButton) {
        simulateClick(searchButton);
        await handleModalSearch('LISTADO DE V', ubicacion['ubicacion-codigo-via']);
      }
  }

  log('Seccion 04 completada. Esperando click en "Guardar domicilio fiscal..."', 'success');

  await waitForButtonClick('button', 'Guardar domicio fiscal');
  log('Usuario guardo DOMICILIO FISCAL', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(4);
}

async function handleSeccion05Caracteristicas() {
  log('Procesando Seccion 05: CARACTERISTICAS DE LA TITULARIDAD', 'info');

  log('Seccion 05 - Esperando click en "Guardar caracteristicas de la titularidad"...', 'success');

  await waitForButtonClick('button', 'Guardar caracter');
  log('Usuario guardo CARACTERISTICAS', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(5);
}

async function handleSeccion06Descripcion() {
  log('Procesando Seccion 06: DESCRIPCION DEL PREDIO', 'info');

  const data = AppState.storedData;
  const descripcion = data.descripcion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[5];
  if (!section) return;

  await selectByLegend(section, 'CLASIF. DE PREDIO', CONFIG.defaultValues.clasificacionPredio);

  await delay(CONFIG.delays.short);

  await selectByLegend(section, 'PREDIO CATASTRAL EN', CONFIG.defaultValues.predioCatastralEn);

  await delay(CONFIG.delays.short);

  if (descripcion['descripcion-zonificacion']) {
      const input = findInputByLegend(section, 'ZONIFICACI');
      if (input) simulateInput(input, descripcion['descripcion-zonificacion']);
  }

  if (descripcion['descripcion-area-adquirida']) {
      const input = findInputByLegend(section, 'REA DE TERRENO ADQUIRIDA') ||
                    findInputByLegend(section, 'AREA DE TERRENO ADQUIRIDA');
      if (input) simulateInput(input, descripcion['descripcion-area-adquirida']);
  }

  if (descripcion['descripcion-area-verificada']) {
      const input = findInputByLegend(section, 'REA DE TERRENO VERIFICADA') ||
                    findInputByLegend(section, 'AREA DE TERRENO VERIFICADA');
      if (input) simulateInput(input, descripcion['descripcion-area-verificada']);
  }

  const linderoLabels = ['FRENTE', 'DERECHA', 'IZQUIERDA', 'FONDO'];
  const linderoKeys = ['frente', 'derecha', 'izquierda', 'fondo'];

  const gridContainers = section.querySelectorAll('.grid.grid-cols-3, div[class*="grid-cols-3"]');
  
  for (let i = 0; i < linderoLabels.length; i++) {
      const label = linderoLabels[i];
      const key = linderoKeys[i];
      
      for (const grid of gridContainers) {
        const legendText = grid.querySelector('legend, p');
        if (legendText && legendText.textContent.trim().toUpperCase().includes(label)) {
            const inputs = grid.querySelectorAll('input');
            
            if (inputs[0] && descripcion['lindero-' + key + '-medida']) {
              simulateInput(inputs[0], descripcion['lindero-' + key + '-medida']);
              log('Lindero ' + label + ' medida seteado', 'success');
            }
            
            if (inputs[1] && descripcion['lindero-' + key + '-colindancia']) {
              simulateInput(inputs[1], descripcion['lindero-' + key + '-colindancia']);
              log('Lindero ' + label + ' colindancia seteado', 'success');
            }
            break;
        }
      }
  }
  
  if (gridContainers.length === 0) {
      for (let i = 0; i < linderoLabels.length; i++) {
        const label = linderoLabels[i];
        const key = linderoKeys[i];
        
        const allElements = section.querySelectorAll('*');
        for (const el of allElements) {
            if (el.children.length === 0 && el.textContent.trim().toUpperCase() === label) {
              const container = el.closest('.grid, tr, .ant-row, div[class*="grid"]');
              if (container) {
                  const inputs = container.querySelectorAll('input');
                  if (inputs[0] && descripcion['lindero-' + key + '-medida']) {
                    simulateInput(inputs[0], descripcion['lindero-' + key + '-medida']);
                  }
                  if (inputs[1] && descripcion['lindero-' + key + '-colindancia']) {
                    simulateInput(inputs[1], descripcion['lindero-' + key + '-colindancia']);
                  }
                  break;
              }
            }
        }
      }
  }

  const searchButton = findSearchButtonByLegend(section, 'DIGO DE USO') ||
                        findSearchButtonByLegend(section, 'COD. DE USO');
  if (searchButton) {
      simulateClick(searchButton);
  }

  log('Seccion 06 completada. Esperando click en "Guardar descripcion del predio"...', 'success');

  await waitForButtonClick('button', 'Guardar descripci');
  log('Usuario guardo DESCRIPCION', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(6);
}

async function handleSeccion07Servicios() {
  log('Procesando Seccion 07: SERVICIOS BASICOS', 'info');

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[6];
  if (!section) return;

  const allSelects = section.querySelectorAll('.ant-select');
  allSelects.forEach(select => {
      removeReadonly(select);
  });

  const allInputs = section.querySelectorAll('.ant-select input');
  allInputs.forEach(input => {
      input.removeAttribute('readonly');
  });

  log('Seccion 07 - Readonly removido de selectores. Esperando click en "Guardar servicios basicos"...', 'success');

  await waitForButtonClick('button', 'Guardar servicios b');
  log('Usuario guardo SERVICIOS BASICOS', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(10);
}

async function handleSeccion11Inscripcion() {
  log('Procesando Seccion 11: INSCRIPCION DEL PREDIO', 'info');

  const data = AppState.storedData;
  const inscripcion = data.inscripcion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[10];
  if (!section) return;

  await selectByLegend(section, 'TIPO PARTIDA', CONFIG.defaultValues.tipoPartidaRegistral);

  await delay(CONFIG.delays.short);

  if (inscripcion['inscripcion-numero']) {
      let input = findInputByLegend(section, 'NUMERO');
      if (!input) input = findInputByLegend(section, 'MERO');
      if (input) {
        simulateInput(input, inscripcion['inscripcion-numero']);
        log('Numero de inscripcion seteado', 'success');
      }
  }

  if (inscripcion['inscripcion-asiento']) {
      const input = findInputByLegend(section, 'ASIENTO');
      if (input) {
        simulateInput(input, inscripcion['inscripcion-asiento']);
        log('Asiento seteado', 'success');
      }
  }

  if (inscripcion['inscripcion-fecha']) {
      const fecha = inscripcion['inscripcion-fecha'];
      let fechaInput = null;
      
      const datePickers = section.querySelectorAll('.ant-picker');
      for (const picker of datePickers) {
        const formItem = picker.closest('.ant-form-item, fieldset');
        if (formItem) {
            const label = formItem.querySelector('label, legend');
            if (label && label.textContent.toUpperCase().includes('FECHA')) {
              fechaInput = picker.querySelector('input');
              break;
            }
        }
      }
      
      if (!fechaInput) {
        fechaInput = findInputByLegend(section, 'FECHA');
      }
      
      if (!fechaInput && datePickers.length > 0) {
        fechaInput = datePickers[0].querySelector('input');
      }
      
      if (fechaInput) {
        fechaInput.focus();
        await delay(CONFIG.delays.short);
        
        fechaInput.value = '';
        
        for (let i = 0; i < fecha.length; i++) {
            fechaInput.value += fecha[i];
            fechaInput.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(50);
        }
        
        await delay(CONFIG.delays.medium);
        
        fechaInput.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(CONFIG.delays.short);
        
        simulateEnter(fechaInput);
        await delay(CONFIG.delays.short);
        
        simulateEnter(fechaInput);
        
        log('Fecha de inscripcion seteada: ' + fecha, 'success');
      } else {
        log('No se encontro el input de fecha', 'warning');
      }
  }

  log('Seccion 11 completada', 'success');
}

async function expandAndProcessSection(sectionIndex) {
  const sections = document.querySelectorAll('.ant-collapse-item');
  
  if (sectionIndex >= sections.length) {
      log('Todas las secciones procesadas', 'success');
      return;
  }

  const section = sections[sectionIndex];
  const header = section.querySelector('.ant-collapse-header');
  
  if (!section.classList.contains('ant-collapse-item-active')) {
      simulateClick(header);
      await waitForSectionToExpand(sectionIndex);
  }

  const handlers = {
      0: handleSeccion01Principales,
      1: handleSeccion02Ubicacion,
      2: handleSeccion03Titular,
      3: handleSeccion04Domicilio,
      4: handleSeccion05Caracteristicas,
      5: handleSeccion06Descripcion,
      6: handleSeccion07Servicios,
      10: handleSeccion11Inscripcion
  };

  const handler = handlers[sectionIndex];
  if (handler) {
      await handler();
  }
}

async function init() {
  log('Iniciando automatizacion de Ficha Catastral Individual', 'info');
  
  AppState.storedData = await getStoredData();
  log('Datos cargados del storage', 'success');

  document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        simulateEnter(e.target);
      }
  });

  await delay(CONFIG.delays.extraLong);

  const firstSection = document.querySelector('.ant-collapse-item');
  if (firstSection && firstSection.classList.contains('ant-collapse-item-active')) {
      log('Seccion 01 detectada como activa', 'info');
      await handleSeccion01Principales();
  } else {
      await waitForSectionToExpand(0);
      await handleSeccion01Principales();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

//Queda pendiente migrar la seccion de construcciones, firma del supervisor y tecnico
//Generar la seccion de obras

//Reparar selectores 08 - TIPO DE PUERTA, 10 - COND. NUMER., la [83] FECHA INSCRIPCIÓN PREDIO lo setea mal