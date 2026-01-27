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
    ubicacionDomicilio: '01 - IGUAL A UNIDAD UU.CC.',
    distritoDefault: 'CORONEL GREGORIO ALBARRACIN LANCHIPA'
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
  
  const selectorInput = selectContainer.querySelector('.ant-select-selector');
  
  if (selectorInput) {
    selectorInput.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await delay(50);
    selectorInput.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    await delay(50);
    selectorInput.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } else {
    simulateClick(selectContainer);
  }
  
  await delay(CONFIG.delays.medium);

  let dropdown = null;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    const dropdowns = document.querySelectorAll('.ant-select-dropdown');
    for (const dd of dropdowns) {
      const style = window.getComputedStyle(dd);
      const isHidden = dd.classList.contains('ant-select-dropdown-hidden') || 
                       style.display === 'none' || 
                       dd.style.display === 'none';
      
      if (!isHidden && dd.offsetParent !== null) {
        dropdown = dd;
        break;
      }
    }
    
    if (dropdown) break;
    await delay(100);
  }
  
  if (!dropdown) {
    log('No se pudo abrir el dropdown del selector', 'error');
    return null;
  }
  
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
      const text = content ? content.textContent.trim() : option.textContent.trim();
      const textNormalized = normalizeText(text);

      const optionCode = textNormalized.split(' - ')[0].replace(/^0+/, '');
      
      if (exactMatch) {
        if (textNormalized === targetNormalized) return option;
      } else {
        if (textNormalized === targetNormalized) return option;
        
        if (targetNormalized.length === 1 && /^[A-I]$/.test(targetNormalized)) {
          if (textNormalized === targetNormalized) return option;
          continue;
        }

        if (targetCode && optionCode && targetCode === optionCode) return option;
        
        if (targetNormalized.length > 1) {
          if (textNormalized.includes(targetNormalized) || targetNormalized.includes(textNormalized)) return option;
        }

        if (targetNormalized.length >= 3) {
          const minChars = Math.min(3, targetNormalized.length);
          if (textNormalized.startsWith(targetNormalized.substring(0, minChars))) return option;
        }
      }
    }
    return null;
  };

  const scrollContainer = dropdown.querySelector('.rc-virtual-list-holder');
  const input = selectorElement.querySelector('input') || selectorElement.closest('.ant-select')?.querySelector('input');
  
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const option = findOption();
    if (option) {
      simulateClick(option);
      await delay(CONFIG.delays.short);
      log('Opcion seleccionada: ' + targetText, 'success');
      return true;
    }
    
    if (input) {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40,
        which: 40,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(keydownEvent);
    }

    if (scrollContainer) {
      const scrollElement = scrollContainer.querySelector('.rc-virtual-list-holder-inner')?.parentElement || scrollContainer;
      scrollElement.scrollTop += 200;
      scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
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
      resolve(null);
    }, timeout);

    const checkModal = () => {
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

async function waitForSelectorToBeReady(selectId, maxWaitTime = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const selectInput = document.querySelector(`#${selectId}`);
    if (!selectInput) {
      await delay(200);
      continue;
    }
    
    const selectContainer = selectInput.closest('.ant-select');
    if (!selectContainer) {
      await delay(200);
      continue;
    }
    
    const isDisabled = selectContainer.classList.contains('ant-select-disabled');
    if (!isDisabled) {
      log(`Selector ${selectId} esta listo`, 'success');
      return true;
    }
    
    await delay(200);
  }
  
  log(`Timeout esperando que ${selectId} este listo`, 'warning');
  return false;
}

async function selectCascadeOption(selectId, targetValue) {
  if (!targetValue) return false;
  
  const selectInput = document.querySelector(`#${selectId}`);
  if (!selectInput) {
    log(`Selector ${selectId} no encontrado`, 'error');
    return false;
  }
  
  const selectContainer = selectInput.closest('.ant-select');
  if (!selectContainer) {
    log(`Contenedor del selector ${selectId} no encontrado`, 'error');
    return false;
  }
  
  const selectionItem = selectContainer.querySelector('.ant-select-selection-item');
  if (selectionItem) {
    const currentValue = selectionItem.getAttribute('title') || selectionItem.textContent.trim();
    if (currentValue === targetValue || currentValue.includes(targetValue)) {
      log(`${selectId} ya tiene el valor: ${currentValue}`, 'info');
      return true;
    }
  }
  
  log(`Seleccionando ${selectId}: ${targetValue}`, 'info');
  
  const selectorDiv = selectContainer.querySelector('.ant-select-selector');
  if (selectorDiv) {
    selectorDiv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await delay(100);
    selectorDiv.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
  
  await delay(CONFIG.delays.medium);
  
  let dropdown = null;
  
  for (let attempt = 0; attempt < 15; attempt++) {
    const dropdowns = document.querySelectorAll('.ant-select-dropdown');
    for (const dd of dropdowns) {
      const style = window.getComputedStyle(dd);
      const isHidden = dd.classList.contains('ant-select-dropdown-hidden') || 
                       style.display === 'none';
      
      if (!isHidden && dd.offsetParent !== null) {
        dropdown = dd;
        break;
      }
    }
    
    if (dropdown) break;
    await delay(100);
  }
  
  if (!dropdown) {
    log(`No se pudo abrir el dropdown de ${selectId}`, 'error');
    return false;
  }
  
  const normalizeValue = (val) => {
    return val.toString().trim().toUpperCase().replace(/^0+/, '');
  };
  const targetNormalized = normalizeValue(targetValue);
  
  const findAndClickOption = () => {
    const options = dropdown.querySelectorAll('.ant-select-item-option:not(.ant-select-item-option-disabled)');
    
    for (const option of options) {
      const content = option.querySelector('.ant-select-item-option-content');
      const optionText = content ? content.textContent.trim() : option.textContent.trim();
      const optionNormalized = normalizeValue(optionText);
      
      if (optionNormalized === targetNormalized || optionText === targetValue) {
        simulateClick(option);
        return true;
      }
    }
    return false;
  };
  
  const virtualList = dropdown.querySelector('.rc-virtual-list-holder');
  const maxScrollAttempts = 150;
  
  for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
    if (findAndClickOption()) {
      await delay(CONFIG.delays.short);
      log(`Opcion seleccionada en ${selectId}: ${targetValue}`, 'success');
      return true;
    }
    
    if (virtualList) {
      const scrollableElement = virtualList;
      const currentScroll = scrollableElement.scrollTop;
      const scrollIncrement = 100;
      
      scrollableElement.scrollTop = currentScroll + scrollIncrement;
      scrollableElement.dispatchEvent(new Event('scroll', { bubbles: true }));
      
      const inputElement = selectContainer.querySelector('input');
      if (inputElement) {
        inputElement.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          code: 'ArrowDown',
          keyCode: 40,
          which: 40,
          bubbles: true,
          cancelable: true
        }));
      }
    }
    
    await delay(50);
  }
  
  simulateClick(document.body);
  await delay(CONFIG.delays.short);
  log(`No se encontro la opcion ${targetValue} en ${selectId}`, 'warning');
  return false;
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
  
  await delay(CONFIG.delays.medium);

  if (principales['principales-sector']) {
    const sectorSelect = section.querySelector('#form_item_sector');
    if (sectorSelect) {
      const sectorContainer = sectorSelect.closest('.ant-select');
      const selectionItem = sectorContainer ? sectorContainer.querySelector('.ant-select-selection-item') : null;
      const currentValue = selectionItem ? (selectionItem.getAttribute('title') || selectionItem.textContent.trim()) : '';
      
      if (!currentValue || currentValue === '') {
        log('Sector no tiene valor, seleccionando: ' + principales['principales-sector'], 'info');
        await selectCascadeOption('form_item_sector', principales['principales-sector']);
        await delay(CONFIG.delays.medium);
      } else {
        log('Sector ya tiene valor: ' + currentValue, 'info');
      }
    }
  }

  if (principales['principales-manzana']) {
    const manzanaReady = await waitForSelectorToBeReady('form_item_manzana', 15000);
    
    if (manzanaReady) {
      await delay(CONFIG.delays.medium);
      await selectCascadeOption('form_item_manzana', principales['principales-manzana']);
      await delay(CONFIG.delays.medium);
    } else {
      log('El selector de manzana no se habilito a tiempo', 'error');
    }
  }

  if (principales['principales-lote']) {
    const loteReady = await waitForSelectorToBeReady('form_item_lote', 15000);
    
    if (loteReady) {
      await delay(CONFIG.delays.medium);
      await selectCascadeOption('form_item_lote', principales['principales-lote']);
    } else {
      log('El selector de lote no se habilito a tiempo', 'error');
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
  
  let userSelection = null;
  await new Promise((resolve) => {
    const checkSelection = setInterval(() => {
      const selectionItems = section.querySelectorAll('.ant-select-selection-item');
      for (const item of selectionItems) {
        const text = item.textContent || '';
        if (text.includes('01 - IGUAL A UNIDAD UU.CC.')) {
          userSelection = 'IGUAL_UNIDAD';
          clearInterval(checkSelection);
          resolve();
          return;
        } else if (text.includes('02 -') || text.includes('03 -') || text.includes('00 -')) {
          userSelection = 'OTRA_OPCION';
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

  log(`Usuario selecciono ubicacion: ${userSelection}`, 'info');
  await delay(CONFIG.delays.medium);

  if (userSelection === 'IGUAL_UNIDAD') {
    const distritoSelect = section.querySelector('.ant-select');
    if (distritoSelect) {
      const formItems = section.querySelectorAll('.ant-form-item, fieldset');
      for (const item of formItems) {
        const label = item.querySelector('label, legend');
        if (label && label.textContent.toUpperCase().includes('DISTRITO')) {
          const select = item.querySelector('.ant-select');
          if (select) {
            await selectOptionByText(select, CONFIG.defaultValues.distritoDefault);
            log('DISTRITO seteado: ' + CONFIG.defaultValues.distritoDefault, 'success');
            break;
          }
        }
      }
    }

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
  } else {
    log('Usuario eligió opción diferente a "IGUAL A UNIDAD UU.CC.", no se auto-poblará', 'info');
  }

  log('Seccion 04 completada. Esperando click en "Guardar domicilio fiscal..."', 'success');

  await waitForButtonClick('button', 'Guardar domicio fiscal');
  log('Usuario guardo DOMICILIO FISCAL', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(4);
}

async function handleSeccion05Caracteristicas() {
  log('Procesando Seccion 05: CARACTERISTICAS DE LA TITULARIDAD', 'info');

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[4];
  if (!section) return;

  const fieldsets = section.querySelectorAll('fieldset');
  for (const fieldset of fieldsets) {
    const legend = fieldset.querySelector('legend');
    if (legend && (legend.textContent.includes('FECHA DE ADQUISI') || legend.textContent.includes('[39]'))) {
      const selects = fieldset.querySelectorAll('.ant-select');
      selects.forEach(select => {
        const inputs = select.querySelectorAll('input');
        inputs.forEach(input => {
          input.removeAttribute('readonly');
          log('Readonly removido del selector MES en FECHA DE ADQUISICION', 'success');
        });
      });
      break;
    }
  }

  const flexContainers = section.querySelectorAll('.flex.gap-3');
  for (const container of flexContainers) {
    const selects = container.querySelectorAll('.ant-select');
    selects.forEach(select => {
      const selectionItem = select.querySelector('.ant-select-selection-item');
      if (selectionItem && selectionItem.textContent.trim() === 'Mes') {
        const inputs = select.querySelectorAll('input');
        inputs.forEach(input => {
          input.removeAttribute('readonly');
          log('Readonly removido del selector MES', 'success');
        });
      }
    });
  }

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

  if (inscripcion['inscripcion-asiento']) {
    const input = findInputByLegend(section, 'ASIENTO');
    if (input) {
      simulateInput(input, inscripcion['inscripcion-asiento']);
      log('Asiento seteado', 'success');
    }
  }

  if (inscripcion['inscripcion-fecha']) {
    const fecha = inscripcion['inscripcion-fecha'];
    log('Buscando campo de fecha inscripcion...', 'info');
    
    let pickerContainer = null;
    const datePickers = section.querySelectorAll('.ant-picker');
    
    for (const picker of datePickers) {
      const formItem = picker.closest('.ant-form-item, fieldset');
      if (formItem) {
        const label = formItem.querySelector('label, legend');
        if (label && label.textContent.toUpperCase().includes('FECHA')) {
          pickerContainer = picker;
          break;
        }
      }
    }
    
    if (!pickerContainer && datePickers.length > 0) {
      pickerContainer = datePickers[0];
    }
    
    if (pickerContainer) {
      log('Picker de fecha encontrado, haciendo click para abrir...', 'info');
      
      simulateClick(pickerContainer);
      await delay(CONFIG.delays.medium);
      
      const fechaInput = pickerContainer.querySelector('input');
      
      if (fechaInput) {
        fechaInput.focus();
        await delay(CONFIG.delays.short);
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(fechaInput, '');
        fechaInput.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(100);
        
        for (let i = 0; i < fecha.length; i++) {
          const currentValue = fechaInput.value + fecha[i];
          nativeInputValueSetter.call(fechaInput, currentValue);
          fechaInput.dispatchEvent(new Event('input', { bubbles: true }));
          await delay(50);
        }
        
        await delay(CONFIG.delays.medium);
        
        fechaInput.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(CONFIG.delays.short);
        
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        fechaInput.dispatchEvent(enterEvent);
        
        await delay(CONFIG.delays.short);
        
        log('Fecha de inscripcion seteada: ' + fecha, 'success');
      } else {
        log('No se encontro el input dentro del picker de fecha', 'warning');
      }
    } else {
      log('No se encontro el picker de fecha', 'warning');
    }
  }

  if (inscripcion['inscripcion-numero']) {
    let input = findInputByLegend(section, 'NUMERO');
    if (!input) input = findInputByLegend(section, 'MERO');
    if (input) {
      simulateInput(input, inscripcion['inscripcion-numero']);
      log('Numero de inscripcion seteado', 'success');
    }
  }

  log('Seccion 11 completada. Iniciando proceso de observaciones y firmas...', 'success');
  
  await handleSeccionFinal();
}

const CONSTRUCCION_MAPPINGS = {
  mep: {
    '0': '00 - NINGUNO', '00': '00 - NINGUNO',
    '1': '01 - CONCRETO', '01': '01 - CONCRETO',
    '2': '02 - LADRILLO', '02': '02 - LADRILLO',
    '3': '03 - ADOBE', '03': '03 - ADOBE'
  },
  ecs: {
    '0': '00 - NINGUNO', '00': '00 - NINGUNO',
    '1': '01 - MUY BUENO', '01': '01 - MUY BUENO',
    '2': '02 - BUENO', '02': '02 - BUENO',
    '3': '03 - REGULAR', '03': '03 - REGULAR',
    '4': '04 - MALO', '04': '04 - MALO'
  },
  ecc: {
    '0': '00 - NINGUNO', '00': '00 - NINGUNO',
    '1': '01 - TERMINADO', '01': '01 - TERMINADO',
    '2': '02 - EN CONSTRUCCION', '02': '02 - EN CONSTRUCCION',
    '3': '03 - INCONCLUSA', '03': '03 - INCONCLUSA',
    '4': '04 - EN RUINAS', '04': '04 - EN RUINAS'
  },
  uca: {
    '0': '00 - NINGUNO', '00': '00 - NINGUNO',
    '1': '01 - EN RETIRO', '01': '01 - EN RETIRO',
    '2': '02 - EN JARDIN', '02': '02 - EN JARDIN',
    '3': '03 - EN VIA', '03': '03 - EN VIA',
    '4': '04 - EN LOTE', '04': '04 - EN LOTE',
    '5': '05 - ALTURA', '05': '05 - ALTURA',
    '6': '06 - EN PARQUE', '06': '06 - EN PARQUE',
    '7': '07 - EN BIEN', '07': '07 - EN BIEN'
  },
  letras: {
    '0': '00 - NINGUNO', '00': '00 - NINGUNO',
    'a': 'A', 'A': 'A',
    'b': 'B', 'B': 'B',
    'c': 'C', 'C': 'C',
    'd': 'D', 'D': 'D',
    'e': 'E', 'E': 'E',
    'f': 'F', 'F': 'F',
    'g': 'G', 'G': 'G',
    'h': 'H', 'H': 'H',
    'i': 'I', 'I': 'I'
  }
};

async function selectModalOption(modal, labelText, value) {
  if (!value || value.toString().trim() === '') return;
  
  log(`Buscando selector para: ${labelText} con valor: ${value}`, 'info');
  
  const formItems = modal.querySelectorAll('.ant-form-item');
  let targetSelector = null;
  
  for (const item of formItems) {
    const label = item.querySelector('label');
    if (label) {
      const labelTitle = label.getAttribute('title') || '';
      const labelContent = label.textContent || '';
      
      if (labelTitle.toUpperCase().includes(labelText.toUpperCase()) ||
          labelContent.toUpperCase().includes(labelText.toUpperCase())) {
        targetSelector = item.querySelector('.ant-select');
        if (targetSelector) {
          log(`Encontrado selector para ${labelText} en form-item`, 'success');
          break;
        }
      }
    }
  }
  
  if (!targetSelector) {
    const allSelects = modal.querySelectorAll('.ant-select');
    for (const select of allSelects) {
      const parent = select.closest('.ant-form-item') || select.parentElement?.parentElement?.parentElement;
      if (parent) {
        const parentText = parent.textContent || '';
        if (parentText.toUpperCase().includes(labelText.toUpperCase())) {
          targetSelector = select;
          log(`Encontrado selector para ${labelText} por fallback`, 'success');
          break;
        }
      }
    }
  }
  
  if (!targetSelector) {
    log(`Selector no encontrado para: ${labelText}`, 'warning');
    return;
  }

  const result = await selectOptionByText(targetSelector, value, false);
  if (result) {
    log(`Seleccionado ${labelText}: ${value}`, 'success');
  } else {
    log(`No se pudo seleccionar ${labelText}: ${value}`, 'warning');
  }
}

async function selectMesModal(modal, mesValue) {
  if (!mesValue || mesValue.toString().trim() === '') return;
  
  const formItems = modal.querySelectorAll('.ant-form-item');
  let mesSelector = null;
  
  for (const item of formItems) {
    const label = item.querySelector('label');
    if (label && label.textContent.includes('FECHA DE CONSTRUCCI')) {
      const flexContainer = item.querySelector('.flex.gap-3, .flex');
      if (flexContainer) {
        mesSelector = flexContainer.querySelector('.ant-select');
      }
      break;
    }
  }
  
  if (!mesSelector) {
    const allSelectors = modal.querySelectorAll('.ant-select');
    for (const sel of allSelectors) {
      const placeholder = sel.querySelector('.ant-select-selection-item');
      if (placeholder && placeholder.textContent.trim() === 'Mes') {
        mesSelector = sel;
        break;
      }
    }
  }
  
  if (!mesSelector) {
    log('Selector de mes no encontrado', 'warning');
    return;
  }
  
  const mesNormalized = mesValue.toString().padStart(2, '0');
  
  await selectOptionByText(mesSelector, mesNormalized, true);
}

async function setAnioModal(modal, anioValue) {
  if (!anioValue || anioValue.toString().trim() === '') return;
  
  const anioInput = modal.querySelector('input[placeholder="Año"]');
  if (anioInput) {
    simulateInput(anioInput, anioValue.toString());
    log(`Año establecido: ${anioValue}`, 'success');
  }
}

async function processConstruccionRow(rowData, rowIndex) {
  log(`Procesando construccion fila ${rowIndex + 1}`, 'info');
  
  const section = document.querySelectorAll('.ant-collapse-item')[7];
  if (!section) {
    log('Sección 08 no encontrada', 'error');
    return;
  }
  
  const nuevoBtn = section.querySelector('button.ant-btn-primary .anticon-plus')?.closest('button') ||
                   Array.from(section.querySelectorAll('button')).find(b => b.textContent.includes('NUEVO'));
  
  if (!nuevoBtn) {
    log('Botón NUEVO no encontrado en sección 08', 'error');
    return;
  }
  
  simulateClick(nuevoBtn);
  await delay(CONFIG.delays.long);
  
  const modal = await waitForModal('NUEVA CONSTRUCCI');
  if (!modal) {
    log('Modal de nueva construcción no apareció', 'error');
    return;
  }

  if (rowData.npiso) {
    const npisoInput = modal.querySelector('input.ant-input[type="text"]');
    if (npisoInput) {
      simulateInput(npisoInput, rowData.npiso);
      log(`N° Piso: ${rowData.npiso}`, 'success');
    }
  }
  
  await selectMesModal(modal, rowData.mes);

  await setAnioModal(modal, rowData.anio);
  
  if (rowData.mep) {
    const mappedValue = CONSTRUCCION_MAPPINGS.mep[rowData.mep] || rowData.mep;
    await selectModalOption(modal, 'MATERIAL ESTRUC', mappedValue);
  }

  if (rowData.ecs) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecs[rowData.ecs] || rowData.ecs;
    await selectModalOption(modal, 'ESTADO CONSERV', mappedValue);
  }

  if (rowData.ecc) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecc[rowData.ecc] || rowData.ecc;
    await selectModalOption(modal, 'ESTADO CONSTRUCC', mappedValue);
  }
  
  if (rowData.muro) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.muro] || rowData.muro.toUpperCase();
    await selectModalOption(modal, 'MUROS Y COLUMNAS', mappedValue);
  }
  
  if (rowData.techo) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.techo] || rowData.techo.toUpperCase();
    await selectModalOption(modal, 'TECHOS', mappedValue);
  }
  
  if (rowData.piso) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.piso] || rowData.piso.toUpperCase();
    await selectModalOption(modal, 'PISOS', mappedValue);
  }
  
  if (rowData.puerta) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.puerta] || rowData.puerta.toUpperCase();
    await selectModalOption(modal, 'PUERTAS Y VENTANAS', mappedValue);
  }
  
  if (rowData.revest) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.revest] || rowData.revest.toUpperCase();
    await selectModalOption(modal, 'REVESTIMIENTOS', mappedValue);
  }

  if (rowData.banio) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.banio] || rowData.banio.toUpperCase();
    await selectModalOption(modal, 'BAÑOS', mappedValue);
  }

  if (rowData.inst) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.inst] || rowData.inst.toUpperCase();
    await selectModalOption(modal, 'INST. EL', mappedValue);
  }
  
  if (rowData.area) {
    const areaInput = modal.querySelector('input[type="number"][maxlength="11"]');
    if (areaInput) {
      simulateInput(areaInput, rowData.area);
      log(`Área: ${rowData.area}`, 'success');
    }
  }
  
  if (rowData.uca) {
    const mappedValue = CONSTRUCCION_MAPPINGS.uca[rowData.uca] || rowData.uca;
    await selectModalOption(modal, 'UBI. CONSTRUC', mappedValue);
  }
  
  await delay(CONFIG.delays.medium);
  
  const guardarBtn = modal.querySelector('.ant-modal-footer button.ant-btn-primary');
  if (guardarBtn) {
    simulateClick(guardarBtn);
    log(`Construcción fila ${rowIndex + 1} guardada`, 'success');
  }
  
  await delay(CONFIG.delays.extraLong);
}

async function handleSeccion08Construcciones(construccionesData) {
  log('Procesando Seccion 08: CONSTRUCCIONES', 'info');
  
  const sections = document.querySelectorAll('.ant-collapse-item');
  const section = sections[7];
  
  if (!section) {
    log('Sección 08 no encontrada', 'error');
    return;
  }
  
  if (!section.classList.contains('ant-collapse-item-active')) {
    const header = section.querySelector('.ant-collapse-header');
    simulateClick(header);
    await delay(CONFIG.delays.long);
  }
  
  for (let i = 0; i < construccionesData.length; i++) {
    await processConstruccionRow(construccionesData[i], i);
    await delay(CONFIG.delays.medium);
  }
  
  log('Sección 08 completada', 'success');
}

async function processObraRow(rowData, rowIndex) {
  log(`Procesando obra fila ${rowIndex + 1}`, 'info');
  
  const section = document.querySelectorAll('.ant-collapse-item')[8];
  if (!section) {
    log('Sección 09 no encontrada', 'error');
    return;
  }
  
  const nuevoBtn = section.querySelector('button.ant-btn-primary .anticon-plus')?.closest('button') ||
                   Array.from(section.querySelectorAll('button')).find(b => b.textContent.includes('NUEVO'));
  
  if (!nuevoBtn) {
    log('Botón NUEVO no encontrado en sección 09', 'error');
    return;
  }
  
  simulateClick(nuevoBtn);
  await delay(CONFIG.delays.long);
  
  const obraModal = await waitForModal('NUEVA OBRA COMPLEMENTARIA');
  if (!obraModal) {
    log('Modal de nueva obra no apareció', 'error');
    return;
  }

  const searchCodeBtn = obraModal.querySelector('button .anticon-search')?.closest('button');
  if (searchCodeBtn) {
    simulateClick(searchCodeBtn);
    await delay(CONFIG.delays.long);
  }

  const codigosModal = await waitForModal('CÓDIGOS DE INSTALACIÓN');
  if (!codigosModal) {
    log('Modal de códigos no apareció', 'error');
    return;
  }

  const searchInput = codigosModal.querySelector('input#form_item_search');
  if (searchInput && rowData.codigo) {
    simulateInput(searchInput, rowData.codigo);
    await delay(CONFIG.delays.short);
    
    const searchBtn = codigosModal.querySelector('button.ant-input-search-button');
    if (searchBtn) {
      simulateClick(searchBtn);
      await delay(CONFIG.delays.long);
    }
  }
  
  const totalRegistros = codigosModal.querySelector('p.float-right span.text-black');
  const totalCount = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
  
  if (totalCount === 1) {
    const selectBtn = codigosModal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      simulateClick(selectBtn);
      log('Código seleccionado automáticamente', 'success');
    }
  } else if (totalCount > 1) {
    log(`Se encontraron ${totalCount} registros. Esperando selección manual...`, 'warning');
    await waitForModalToClose('CÓDIGOS DE INSTALACIÓN');
  }
  
  await delay(CONFIG.delays.long);
  
  const obraModalUpdated = await waitForModal('NUEVA OBRA COMPLEMENTARIA');
  if (!obraModalUpdated) return;
  
  await selectMesModal(obraModalUpdated, rowData.mes);
  
  await setAnioModal(obraModalUpdated, rowData.anio);
  
  if (rowData.mep) {
    const mappedValue = CONSTRUCCION_MAPPINGS.mep[rowData.mep] || rowData.mep;
    await selectModalOption(obraModalUpdated, 'MEP', mappedValue);
  }
  
  if (rowData.ecs) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecs[rowData.ecs] || rowData.ecs;
    await selectModalOption(obraModalUpdated, 'ECS', mappedValue);
  }
  
  if (rowData.ecc) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecc[rowData.ecc] || rowData.ecc;
    await selectModalOption(obraModalUpdated, 'ECC', mappedValue);
  }
  
  if (rowData.total) {
    const totalInput = obraModalUpdated.querySelector('input[type="number"]:not([placeholder])');
    if (totalInput) {
      simulateInput(totalInput, rowData.total);
      log(`Total: ${rowData.total}`, 'success');
    }
  }
  
  if (rowData.uca) {
    const mappedValue = CONSTRUCCION_MAPPINGS.uca[rowData.uca] || rowData.uca;
    await selectModalOption(obraModalUpdated, 'UCA', mappedValue);
  }
  
  await delay(CONFIG.delays.medium);
  
  const guardarBtn = obraModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
  if (guardarBtn) {
    simulateClick(guardarBtn);
    log(`Obra fila ${rowIndex + 1} guardada`, 'success');
  }
  
  await delay(CONFIG.delays.extraLong);
}

async function waitForModalToClose(titleContains, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const modals = document.querySelectorAll('.ant-modal');
    let found = false;
    
    for (const modal of modals) {
      const title = modal.querySelector('.ant-modal-title');
      if (title && title.textContent.toUpperCase().includes(titleContains.toUpperCase())) {
        if (modal.offsetParent !== null) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) return true;
    await delay(500);
  }
  
  return false;
}

async function handleSeccion09Obras(obrasData) {
  log('Procesando Sección 09: OBRAS COMPLEMENTARIAS', 'info');
  
  const sections = document.querySelectorAll('.ant-collapse-item');
  const section = sections[8];
  
  if (!section) {
    log('Sección 09 no encontrada', 'error');
    return;
  }
  
  if (!section.classList.contains('ant-collapse-item-active')) {
    const header = section.querySelector('.ant-collapse-header');
    simulateClick(header);
    await delay(CONFIG.delays.long);
  }
  
  for (let i = 0; i < obrasData.length; i++) {
    await processObraRow(obrasData[i], i);
    await delay(CONFIG.delays.medium);
  }

  log('Sección 09 completada', 'success');
}

async function searchAndSelectPersonal(searchName) {
  const personalModal = await waitForModal('LISTADO DEL PERSONAL');
  if (!personalModal) {
    log('Modal de listado de personal no apareció', 'error');
    return false;
  }
  
  await delay(CONFIG.delays.medium);
  
  const searchInput = personalModal.querySelector('input#form_item_search') || 
                      personalModal.querySelector('input[placeholder="Buscar"]');
  
  if (searchInput && searchName) {
    searchInput.focus();
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(CONFIG.delays.short);
    
    simulateInput(searchInput, searchName);
    await delay(CONFIG.delays.short);
    
    const searchButton = personalModal.querySelector('button[type="submit"]') ||
                         personalModal.querySelector('button .anticon-search')?.closest('button');
    
    if (searchButton) {
      log('Click en boton de busqueda del modal', 'info');
      simulateClick(searchButton);
    } else {
      const allButtons = personalModal.querySelectorAll('button');
      for (const btn of allButtons) {
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

async function processFirmaSupervisor(data) {
  log('Procesando firma del supervisor', 'info');
  
  let editBtn = null;
  
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    if (span.textContent.trim() === '[95] FIRMA DEL SUPERVISOR') {
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
  
  if (!editBtn) {
    const containers = document.querySelectorAll('.flex.justify-between');
    for (const container of containers) {
      if (container.textContent.includes('[95]') && container.textContent.includes('SUPERVISOR')) {
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
  log('Procesando firma del técnico catastral', 'info');
  
  let editBtn = null;
  
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    const spanText = span.textContent.trim();
    if (spanText.includes('[96]') && spanText.includes('FIRMA') && spanText.includes('CNICO')) {
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
  
  if (!editBtn) {
    const containers = document.querySelectorAll('.flex.justify-between');
    for (const container of containers) {
      if (container.textContent.includes('[96]') && container.textContent.includes('CNICO')) {
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

async function handleSeccionFinal() {
  log('Procesando seccion final: FIRMAS', 'info');
  
  const data = AppState.storedData;
  const finalData = data.final || {};
  
  log('Esperando click en boton "Guardar observaciones"...', 'info');
  
  await waitForObservacionesButtonClick();
  log('Usuario guardo observaciones', 'success');
  
  await delay(CONFIG.delays.long);
  
  if (finalData['final-supervisor-nombre']) {
    await processFirmaSupervisor(finalData);
  }
  
  await delay(CONFIG.delays.long);
  
  if (finalData['final-tecnico-nombre']) {
    await processFirmaTecnico(finalData);
  }
  
  log('Seccion final completada', 'success');
}

function waitForObservacionesButtonClick() {
  return new Promise((resolve) => {
    log('Configurando listener para boton Guardar observaciones...', 'info');
    
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
    
    const mouseDownHandler = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      
      const buttonText = button.textContent || '';
      if (buttonText.includes('Guardar observaciones')) {
        log('MouseDown detectado en Guardar observaciones!', 'success');
      }
    };
    document.addEventListener('mousedown', mouseDownHandler, true);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'executeSection') {
    log(`Recibida solicitud de ejecución: ${message.section}`, 'info');
    
    if (message.section === 'construcciones') {
      handleSeccion08Construcciones(message.data).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        log(`Error en construcciones: ${err.message}`, 'error');
        sendResponse({ success: false, error: err.message });
      });
    } else if (message.section === 'obras') {
      handleSeccion09Obras(message.data).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        log(`Error en obras: ${err.message}`, 'error');
        sendResponse({ success: false, error: err.message });
      });
    }

    return true;
  }
});

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