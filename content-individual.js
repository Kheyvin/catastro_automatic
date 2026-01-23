/**
 * ============================================
 * CONTENT-INDIVIDUAL.JS
 * Automatizacion de Ficha Catastral Individual
 * ============================================
 * 
 * Estructura modular:
 * 1. Configuracion y constantes
 * 2. Utilidades generales
 * 3. Funciones de espera y observadores
 * 4. Funciones de interaccion con selectores
 * 5. Funciones de interaccion con modales
 * 6. Funciones por seccion
 * 7. Controlador principal de flujo
 */

// ============================================
// 1. CONFIGURACION Y CONSTANTES
// ============================================

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

// Estado global de la aplicacion
const AppState = {
  storedData: null,
  currentSection: null,
  isProcessing: false
};

// ============================================
// 2. UTILIDADES GENERALES
// ============================================

/**
 * Obtiene los datos almacenados en chrome.storage.local
 */
async function getStoredData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

/**
 * Guarda datos en chrome.storage.local
 */
async function saveStoredData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
  });
}

/**
 * Actualiza un valor especifico en el storage
 */
async function updateStoredValue(section, key, value) {
  const data = await getStoredData();
  if (!data[section]) data[section] = {};
  data[section][key] = value;
  await saveStoredData(data);
  AppState.storedData = data;
}

/**
 * Espera un tiempo determinado
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula un evento de input nativo
 */
function simulateInput(element, value) {
  if (!element) return;
  
  try {
    // Intentar usar el setter nativo segun el tipo de elemento
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
    // Fallback si falla el setter nativo
    element.value = value;
  }
  
  // Disparar eventos
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  
  // Para componentes React/Ant Design, tambien disparar focus y blur
  element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
}

/**
 * Simula un click en un elemento
 */
function simulateClick(element) {
  if (!element) return false;
  
  // Opciones completas para los eventos de mouse
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
    buttons: 1,
    clientX: element.getBoundingClientRect ? element.getBoundingClientRect().x + 5 : 0,
    clientY: element.getBoundingClientRect ? element.getBoundingClientRect().y + 5 : 0
  };
  
  // Focus primero si es posible
  if (element.focus) {
    element.focus();
  }
  
  element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
  element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
  element.dispatchEvent(new MouseEvent('click', eventOptions));
  return true;
}

/**
 * Simula presionar Enter en un elemento
 */
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

/**
 * Log con prefijo de la extension
 */
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

// ============================================
// 3. FUNCIONES DE ESPERA Y OBSERVADORES
// ============================================

/**
 * Espera a que un elemento aparezca en el DOM
 */
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

/**
 * Espera a que un elemento desaparezca del DOM
 */
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

/**
 * Espera a que una seccion se despliegue completamente
 */
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

    // Verificar si ya esta expandida
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

/**
 * Espera a que el usuario haga click en un boton especifico
 */
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

// ============================================
// 4. FUNCIONES DE INTERACCION CON SELECTORES
// ============================================

/**
 * Abre un selector y espera a que cargue el dropdown
 */
async function openSelector(selectorElement) {
  if (!selectorElement) {
    log('Selector no encontrado', 'error');
    return null;
  }

  const selectContainer = selectorElement.closest('.ant-select') || selectorElement;
  
  // Primero intentar con el selector principal
  const selectorInput = selectContainer.querySelector('.ant-select-selector');
  
  if (selectorInput) {
    // Simular mousedown + mouseup + click (secuencia completa)
    selectorInput.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await delay(50);
    selectorInput.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    await delay(50);
    selectorInput.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } else {
    simulateClick(selectContainer);
  }
  
  await delay(CONFIG.delays.medium);

  // Buscar el dropdown que no esté oculto
  let dropdown = null;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Buscar todos los dropdowns visibles
    const dropdowns = document.querySelectorAll('.ant-select-dropdown');
    for (const dd of dropdowns) {
      // Verificar que no esté oculto
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

/**
 * Selecciona una opcion en un selector por su texto exacto o parcial
 * Maneja el scroll para cargar mas opciones si es necesario
 */
async function selectOptionByText(selectorElement, targetText, exactMatch = false) {
  const dropdown = await openSelector(selectorElement);
  if (!dropdown) return false;

  // Normalizar texto para comparacion - quitar acentos y caracteres especiales
  const normalizeText = (text) => {
    return text.trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
  };

  const targetNormalized = normalizeText(targetText);
  
  // Extraer solo el código si el target tiene formato "XX - TEXTO"
  const targetCode = targetNormalized.split(' - ')[0].replace(/^0+/, '');

  const findOption = () => {
    const options = dropdown.querySelectorAll('.ant-select-item-option:not(.ant-select-item-option-disabled)');
    for (const option of options) {
      const content = option.querySelector('.ant-select-item-option-content');
      const text = content ? content.textContent.trim() : option.textContent.trim();
      const textNormalized = normalizeText(text);
      
      // Extraer código del texto de opción
      const optionCode = textNormalized.split(' - ')[0].replace(/^0+/, '');
      
      if (exactMatch) {
        if (textNormalized === targetNormalized) return option;
      } else {
        // Busqueda flexible:
        // 1. Coincidencia exacta (prioridad máxima)
        if (textNormalized === targetNormalized) return option;
        
        // 2. Para letras sueltas (A-I), solo coincidencia exacta
        if (targetNormalized.length === 1 && /^[A-I]$/.test(targetNormalized)) {
          // Solo coincidir si el texto es exactamente la letra
          if (textNormalized === targetNormalized) return option;
          // No hacer más búsquedas flexibles para letras
          continue;
        }
        
        // 3. El código coincide (ej: "1" == "01", "01" == "1")
        if (targetCode && optionCode && targetCode === optionCode) return option;
        
        // 4. El texto contiene el target o viceversa (solo para targets > 1 caracter)
        if (targetNormalized.length > 1) {
          if (textNormalized.includes(targetNormalized) || targetNormalized.includes(textNormalized)) return option;
        }
        
        // 5. Coincidencia parcial al inicio (mínimo 3 caracteres)
        if (targetNormalized.length >= 3) {
          const minChars = Math.min(3, targetNormalized.length);
          if (textNormalized.startsWith(targetNormalized.substring(0, minChars))) return option;
        }
      }
    }
    return null;
  };

  // Si no se encontró, usar navegación con teclas de flecha
  // Esto funciona mejor con virtual lists de Ant Design
  const scrollContainer = dropdown.querySelector('.rc-virtual-list-holder');
  const input = selectorElement.querySelector('input') || selectorElement.closest('.ant-select')?.querySelector('input');
  
  let attempts = 0;
  const maxAttempts = 20; // Máximo de flechas hacia abajo
  
  while (attempts < maxAttempts) {
    // Buscar la opción
    const option = findOption();
    if (option) {
      simulateClick(option);
      await delay(CONFIG.delays.short);
      log('Opcion seleccionada: ' + targetText, 'success');
      return true;
    }
    
    // Enviar tecla flecha abajo al input del selector
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
    
    // También hacer scroll directo en el contenedor
    if (scrollContainer) {
      scrollContainer.scrollTop += 35; // Altura aproximada de una opción
    }
    
    await delay(80);
    
    attempts++;
  }

  // Cerrar dropdown
  simulateClick(document.body);
  await delay(CONFIG.delays.short);
  log('No se encontro la opcion: ' + targetText, 'warning');
  return false;
}

/**
 * Funcion reutilizable para seleccionar en cualquier selector
 */
async function selectByLegend(container, legendText, targetValue, exactMatch = false) {
  // Buscar en fieldsets
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
  
  // Buscar en ant-form-item (estructura comun en modales)
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
  
  // Buscar directamente en selectores y subir al padre
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

/**
 * Quita el atributo readonly de un selector
 */
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

// ============================================
// 5. FUNCIONES DE INTERACCION CON MODALES
// ============================================

/**
 * Espera a que aparezca un modal con un titulo especifico
 */
async function waitForModal(titleText, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let observer;
    const timeoutId = setTimeout(() => {
      if (observer) observer.disconnect();
      // No rechazar, devolver null para que el código continúe
      resolve(null);
    }, timeout);

    const checkModal = () => {
      const modals = document.querySelectorAll('.ant-modal');
      for (const modal of modals) {
        const title = modal.querySelector('.ant-modal-title');
        // Búsqueda case-insensitive
        if (title && title.textContent.toUpperCase().includes(titleText.toUpperCase())) {
          // Verificar que el modal sea visible
          if (modal.offsetParent !== null || modal.style.display !== 'none') {
            return modal;
          }
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

/**
 * Busca en un modal de listado y espera resultados
 */
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

/**
 * Espera a que el total de registros sea un valor especifico
 */
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

/**
 * Selecciona el primer registro en una tabla de modal
 */
async function selectFirstRecord(modal) {
  const selectButton = modal.querySelector('button span.anticon-select');
  if (selectButton) {
    simulateClick(selectButton.closest('button'));
    await delay(CONFIG.delays.medium);
    return true;
  }
  return false;
}

/**
 * Espera a que el usuario seleccione manualmente un registro
 */
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

/**
 * Maneja la busqueda y seleccion en un modal de listado
 */
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

// ============================================
// 6. FUNCIONES POR SECCION
// ============================================

/**
 * Busca un input por el texto de su legend/label dentro de una seccion
 */
function findInputByLegend(section, legendText) {
  const searchText = legendText.toUpperCase();
  
  // Buscar en fieldsets
  const fieldsets = section.querySelectorAll('fieldset');
  for (const fieldset of fieldsets) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent.toUpperCase().includes(searchText)) {
      const input = fieldset.querySelector('input:not([role="combobox"]):not([type="search"])');
      if (input) return input;
    }
  }
  
  // Buscar en ant-form-item
  const formItems = section.querySelectorAll('.ant-form-item');
  for (const formItem of formItems) {
    const label = formItem.querySelector('.ant-form-item-label label, label, legend');
    if (label && label.textContent.toUpperCase().includes(searchText)) {
      const input = formItem.querySelector('input:not([role="combobox"]):not([type="search"])');
      if (input) return input;
    }
  }
  
  // Buscar por cualquier estructura padre-hijo
  const allLabels = section.querySelectorAll('label, legend, p, h1, h2, h3, span');
  for (const label of allLabels) {
    if (label.textContent.toUpperCase().includes(searchText)) {
      // Buscar input en el mismo contenedor
      const container = label.closest('fieldset, .ant-form-item, .ant-col, .ant-row, div[class*="flex"]');
      if (container) {
        const input = container.querySelector('input:not([role="combobox"]):not([type="search"])');
        if (input) return input;
      }
      // Buscar en hermano siguiente
      const parent = label.parentElement;
      if (parent) {
        const input = parent.querySelector('input:not([role="combobox"]):not([type="search"])');
        if (input) return input;
      }
    }
  }
  
  return null;
}

/**
 * Busca un boton de busqueda por el texto del legend cercano
 */
function findSearchButtonByLegend(section, legendText) {
  const searchText = legendText.toUpperCase();
  
  // Buscar en fieldsets
  const fieldsets = section.querySelectorAll('fieldset');
  for (const fieldset of fieldsets) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent.toUpperCase().includes(searchText)) {
      const btn = fieldset.querySelector('button .anticon-search, button[class*="search"]');
      if (btn) return btn.closest('button');
    }
  }
  
  // Buscar en ant-form-item
  const formItems = section.querySelectorAll('.ant-form-item');
  for (const formItem of formItems) {
    const label = formItem.querySelector('.ant-form-item-label label, label, legend, h1');
    if (label && label.textContent.toUpperCase().includes(searchText)) {
      const btn = formItem.querySelector('button .anticon-search, button[class*="search"]');
      if (btn) return btn.closest('button');
    }
  }
  
  // Buscar en cualquier contenedor con el texto
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

/**
 * SECCION 01: PRINCIPALES
 */
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

  // Setear SECTOR si tiene valor
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

  // Setear MANZANA si tiene valor
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

  // Setear LOTE si tiene valor
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

  // Setear valores fijos en inputs
  const edificaInput = section.querySelector('#form_item_codigoedifica');
  if (edificaInput) simulateInput(edificaInput, CONFIG.defaultValues.edifica);

  const entradaInput = section.querySelector('#form_item_codigoentrada');
  if (entradaInput) simulateInput(entradaInput, CONFIG.defaultValues.entrada);

  const pisoInput = section.querySelector('#form_item_codigopiso');
  if (pisoInput) simulateInput(pisoInput, CONFIG.defaultValues.piso);

  const unidadInput = section.querySelector('#form_item_codigounidad');
  if (unidadInput) simulateInput(unidadInput, CONFIG.defaultValues.unidad);

  // Buscar y setear OBSERVACIONES si existe
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

/**
 * SECCION 02: UBICACION DEL PREDIO CATASTRAL
 */
async function handleSeccion02Ubicacion() {
  log('Procesando Seccion 02: UBICACION DEL PREDIO', 'info');

  const data = AppState.storedData;
  const ubicacion = data.ubicacion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[1];
  if (!section) return;

  // [17] MANZANA
  if (ubicacion['ubicacion-manzana']) {
    const manzanaInput = findInputByLegend(section, 'MANZANA');
    if (manzanaInput) simulateInput(manzanaInput, ubicacion['ubicacion-manzana']);
  }

  // [18] LOTE
  if (ubicacion['ubicacion-lote']) {
    const loteInput = findInputByLegend(section, 'LOTE');
    if (loteInput) simulateInput(loteInput, ubicacion['ubicacion-lote']);
  }

  // [19] SUB-LOTE
  if (ubicacion['ubicacion-sub-lote']) {
    const subLoteInput = findInputByLegend(section, 'SUB-LOTE') || 
                          findInputByLegend(section, 'SUBLOTE');
    if (subLoteInput) simulateInput(subLoteInput, ubicacion['ubicacion-sub-lote']);
  }

  // [11] TIPO DE EDIFICACION - Selector
  await selectByLegend(section, 'TIPO DE EDIFICACI', CONFIG.defaultValues.tipoEdificacion);

  await delay(CONFIG.delays.medium);

  // [18] CODIGO HU - Buscar en modal
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

  // Hacer click en el boton NUEVO para ubicacion
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

/**
 * Maneja el modal de NUEVA UBICACION DEL PREDIO
 */
async function handleNuevaUbicacionModal(ubicacion) {
  try {
    const modal = await waitForModal('NUEVA UBICACI');
    
    // Click en boton de busqueda de 05 COD. VIA
    if (ubicacion['ubicacion-codigo-via']) {
      const searchButton = modal.querySelector('button .anticon-search');
      if (searchButton) {
        simulateClick(searchButton.closest('button'));
        await handleModalSearch('LISTADO DE V', ubicacion['ubicacion-codigo-via']);
      }
    }

    await delay(CONFIG.delays.medium);

    // 08 - TIPO DE PUERTA (selector)
    await selectByLegend(modal, 'TIPO DE PUERTA', CONFIG.defaultValues.tipoPuerta);

    await delay(CONFIG.delays.short);

    // 10 - COND. NUMER. (selector)
    await selectByLegend(modal, 'COND. NUMER', CONFIG.defaultValues.condNumeracion);

    // 09 - NRO MUNICIPAL
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

/**
 * Captura datos de ubicacion antes de continuar
 */
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

/**
 * SECCION 03: IDENTIFICACION DEL TITULAR CATASTRAL
 */
async function handleSeccion03Titular() {
  log('Procesando Seccion 03: IDENTIFICACION DEL TITULAR', 'info');

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[2];
  if (!section) return;

  // [20] TIPO DE TITULAR - Selector
  await selectByLegend(section, 'TIPO DE TITULAR', CONFIG.defaultValues.tipoTitular);

  await delay(CONFIG.delays.medium);

  // Click en busqueda de [27] NRO DOC.
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

/**
 * SECCION 04: DOMICILIO FISCAL DEL TITULAR CATASTRAL
 */
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

  // [09] N MUNICIPAL - Buscar por ID o por texto mas especifico
  if (ubicacion['ubicacion-n-municipal']) {
    let nroMunicipalInput = section.querySelector('#form_item_numeromunicipal');
    
    // Si no se encuentra por ID, buscar por legend
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
    
    // Fallback: buscar en fieldsets
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

  // [17] MANZANA
  if (ubicacion['ubicacion-manzana']) {
    const manzanaInput = findInputByLegend(section, 'MANZANA');
    if (manzanaInput) simulateInput(manzanaInput, ubicacion['ubicacion-manzana']);
  }

  // [18] LOTE
  if (ubicacion['ubicacion-lote']) {
    const loteInput = findInputByLegend(section, 'LOTE');
    if (loteInput) simulateInput(loteInput, ubicacion['ubicacion-lote']);
  }

  // [19] SUB-LOTE
  if (ubicacion['ubicacion-sub-lote']) {
    const subLoteInput = findInputByLegend(section, 'SUB-LOTE') || 
                          findInputByLegend(section, 'SUBLOTE');
    if (subLoteInput) simulateInput(subLoteInput, ubicacion['ubicacion-sub-lote']);
  }

  await delay(CONFIG.delays.medium);

  // [14] CODIGO HAB. URBANA
  if (ubicacion['ubicacion-codigo-hu']) {
    const searchButton = findSearchButtonByLegend(section, 'DIGO HAB') || 
                         findSearchButtonByLegend(section, 'COD. HAB');
    if (searchButton) {
      simulateClick(searchButton);
      await handleModalSearch('LISTADO DE HABITACIONES URBANAS', ubicacion['ubicacion-codigo-hu']);
    }
  }

  await delay(CONFIG.delays.medium);

  // [05] CODIGO VIA
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

/**
 * SECCION 05: CARACTERISTICAS DE LA TITULARIDAD
 */
async function handleSeccion05Caracteristicas() {
  log('Procesando Seccion 05: CARACTERISTICAS DE LA TITULARIDAD', 'info');

  log('Seccion 05 - Esperando click en "Guardar caracteristicas de la titularidad"...', 'success');

  await waitForButtonClick('button', 'Guardar caracter');
  log('Usuario guardo CARACTERISTICAS', 'success');
  
  await delay(CONFIG.delays.medium);
  await expandAndProcessSection(5);
}

/**
 * SECCION 06: DESCRIPCION DEL PREDIO
 */
async function handleSeccion06Descripcion() {
  log('Procesando Seccion 06: DESCRIPCION DEL PREDIO', 'info');

  const data = AppState.storedData;
  const descripcion = data.descripcion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[5];
  if (!section) return;

  // [40] CLASIF. DE PREDIO - Selector
  await selectByLegend(section, 'CLASIF. DE PREDIO', CONFIG.defaultValues.clasificacionPredio);

  await delay(CONFIG.delays.short);

  // [41] PREDIO CATASTRAL EN - Selector
  await selectByLegend(section, 'PREDIO CATASTRAL EN', CONFIG.defaultValues.predioCatastralEn);

  await delay(CONFIG.delays.short);

  // [44] ZONIFICACION
  if (descripcion['descripcion-zonificacion']) {
    const input = findInputByLegend(section, 'ZONIFICACI');
    if (input) simulateInput(input, descripcion['descripcion-zonificacion']);
  }

  // [45] AREA DE TERRENO ADQUIRIDA
  if (descripcion['descripcion-area-adquirida']) {
    const input = findInputByLegend(section, 'REA DE TERRENO ADQUIRIDA') ||
                  findInputByLegend(section, 'AREA DE TERRENO ADQUIRIDA');
    if (input) simulateInput(input, descripcion['descripcion-area-adquirida']);
  }

  // [46] AREA DE TERRENO VERIFICADA
  if (descripcion['descripcion-area-verificada']) {
    const input = findInputByLegend(section, 'REA DE TERRENO VERIFICADA') ||
                  findInputByLegend(section, 'AREA DE TERRENO VERIFICADA');
    if (input) simulateInput(input, descripcion['descripcion-area-verificada']);
  }

  // LINDEROS DEL LOTE - Buscar en estructura grid-cols-3
  const linderoLabels = ['FRENTE', 'DERECHA', 'IZQUIERDA', 'FONDO'];
  const linderoKeys = ['frente', 'derecha', 'izquierda', 'fondo'];

  // Buscar contenedores de linderos (div.grid.grid-cols-3)
  const gridContainers = section.querySelectorAll('.grid.grid-cols-3, div[class*="grid-cols-3"]');
  
  for (let i = 0; i < linderoLabels.length; i++) {
    const label = linderoLabels[i];
    const key = linderoKeys[i];
    
    for (const grid of gridContainers) {
      const legendText = grid.querySelector('legend, p');
      if (legendText && legendText.textContent.trim().toUpperCase().includes(label)) {
        const inputs = grid.querySelectorAll('input');
        
        // Primer input: medida
        if (inputs[0] && descripcion['lindero-' + key + '-medida']) {
          simulateInput(inputs[0], descripcion['lindero-' + key + '-medida']);
          log('Lindero ' + label + ' medida seteado', 'success');
        }
        
        // Segundo input: colindancia
        if (inputs[1] && descripcion['lindero-' + key + '-colindancia']) {
          simulateInput(inputs[1], descripcion['lindero-' + key + '-colindancia']);
          log('Lindero ' + label + ' colindancia seteado', 'success');
        }
        break;
      }
    }
  }
  
  // Fallback: buscar por texto en toda la seccion
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

  // [42] CODIGO DE USO - Solo hacer click en search
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

/**
 * SECCION 07: SERVICIOS BASICOS
 */
async function handleSeccion07Servicios() {
  log('Procesando Seccion 07: SERVICIOS BASICOS', 'info');

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[6];
  if (!section) return;

  // Quitar readonly de todos los selectores de esta seccion
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
  // Saltar a seccion 11 (indice 10)
  await expandAndProcessSection(10);
}

/**
 * SECCION 11: INSCRIPCION DEL PREDIO CATASTRAL
 */
async function handleSeccion11Inscripcion() {
  log('Procesando Seccion 11: INSCRIPCION DEL PREDIO', 'info');

  const data = AppState.storedData;
  const inscripcion = data.inscripcion || {};

  await delay(CONFIG.delays.medium);
  const section = document.querySelectorAll('.ant-collapse-item')[10];
  if (!section) return;

  // [79] TIPO PARTIDA REGISTRAL - Selector
  await selectByLegend(section, 'TIPO PARTIDA', CONFIG.defaultValues.tipoPartidaRegistral);

  await delay(CONFIG.delays.short);

  // [80] NUMERO
  if (inscripcion['inscripcion-numero']) {
    let input = findInputByLegend(section, 'NUMERO');
    if (!input) input = findInputByLegend(section, 'MERO');
    if (input) {
      simulateInput(input, inscripcion['inscripcion-numero']);
      log('Numero de inscripcion seteado', 'success');
    }
  }

  // [82] ASIENTO
  if (inscripcion['inscripcion-asiento']) {
    const input = findInputByLegend(section, 'ASIENTO');
    if (input) {
      simulateInput(input, inscripcion['inscripcion-asiento']);
      log('Asiento seteado', 'success');
    }
  }

  // [83] FECHA INSCRIPCION PREDIO - Formato dd/mm/yyyy como texto
  if (inscripcion['inscripcion-fecha']) {
    const fecha = inscripcion['inscripcion-fecha']; // Formato esperado: dd/mm/yyyy
    let fechaInput = null;
    
    // Buscar el input dentro de ant-picker
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
    
    // Fallback: buscar por legend
    if (!fechaInput) {
      fechaInput = findInputByLegend(section, 'FECHA');
    }
    
    // Fallback: buscar cualquier input dentro de ant-picker
    if (!fechaInput && datePickers.length > 0) {
      fechaInput = datePickers[0].querySelector('input');
    }
    
    if (fechaInput) {
      // Enfocar el input
      fechaInput.focus();
      await delay(CONFIG.delays.short);
      
      // Limpiar el input
      fechaInput.value = '';
      
      // Escribir la fecha caracter por caracter simulando escritura
      for (let i = 0; i < fecha.length; i++) {
        fechaInput.value += fecha[i];
        fechaInput.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(50);
      }
      
      await delay(CONFIG.delays.medium);
      
      // Disparar evento change
      fechaInput.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(CONFIG.delays.short);
      
      // Simular Enter para confirmar
      simulateEnter(fechaInput);
      await delay(CONFIG.delays.short);
      
      // Segundo Enter por si acaso
      simulateEnter(fechaInput);
      
      log('Fecha de inscripcion seteada: ' + fecha, 'success');
    } else {
      log('No se encontro el input de fecha', 'warning');
    }
  }

  log('Seccion 11 completada', 'success');
}

// ============================================
// 6B. SECCIÓN 08: CONSTRUCCIONES
// ============================================

/**
 * Mapeo de valores para selectores de construcciones
 */
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

/**
 * Selecciona una opción en un selector de modal
 */
async function selectModalOption(modal, labelText, value) {
  if (!value || value.toString().trim() === '') return;
  
  log(`Buscando selector para: ${labelText} con valor: ${value}`, 'info');
  
  // Buscar el form-item por label - buscar el texto en el label title o textContent
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
  
  // Fallback: buscar en divs que tengan el selector
  if (!targetSelector) {
    const allSelects = modal.querySelectorAll('.ant-select');
    for (const select of allSelects) {
      // Subir al contenedor padre
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
  
  // Usar la función existente selectOptionByText que ya funciona correctamente
  const result = await selectOptionByText(targetSelector, value, false);
  if (result) {
    log(`Seleccionado ${labelText}: ${value}`, 'success');
  } else {
    log(`No se pudo seleccionar ${labelText}: ${value}`, 'warning');
  }
}

/**
 * Selecciona mes en modal de construcción
 */
async function selectMesModal(modal, mesValue) {
  if (!mesValue || mesValue.toString().trim() === '') return;
  
  // El selector de mes está en la sección de FECHA DE CONSTRUCCIÓN
  const formItems = modal.querySelectorAll('.ant-form-item');
  let mesSelector = null;
  
  for (const item of formItems) {
    const label = item.querySelector('label');
    if (label && label.textContent.includes('FECHA DE CONSTRUCCI')) {
      // Buscar el selector dentro del flex gap-3
      const flexContainer = item.querySelector('.flex.gap-3, .flex');
      if (flexContainer) {
        mesSelector = flexContainer.querySelector('.ant-select');
      }
      break;
    }
  }
  
  // Fallback: buscar el primer selector con placeholder "Mes"
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
  
  // Normalizar el mes (puede venir como "1", "01", "12", etc.)
  const mesNormalized = mesValue.toString().padStart(2, '0');
  
  // Usar selectOptionByText
  await selectOptionByText(mesSelector, mesNormalized, true);
}

/**
 * Establece el año en el input de modal
 */
async function setAnioModal(modal, anioValue) {
  if (!anioValue || anioValue.toString().trim() === '') return;
  
  // El input de año tiene placeholder="Año"
  const anioInput = modal.querySelector('input[placeholder="Año"]');
  if (anioInput) {
    simulateInput(anioInput, anioValue.toString());
    log(`Año establecido: ${anioValue}`, 'success');
  }
}

/**
 * Procesa una fila de construcción
 */
async function processConstruccionRow(rowData, rowIndex) {
  log(`Procesando construccion fila ${rowIndex + 1}`, 'info');
  
  // Click en botón NUEVO de la sección 08
  const section = document.querySelectorAll('.ant-collapse-item')[7]; // Índice 7 = sección 08
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
  
  // Esperar el modal
  const modal = await waitForModal('NUEVA CONSTRUCCI');
  if (!modal) {
    log('Modal de nueva construcción no apareció', 'error');
    return;
  }
  
  // [56] N° PISO SÓTANO MEZZASINE
  if (rowData.npiso) {
    const npisoInput = modal.querySelector('input.ant-input[type="text"]');
    if (npisoInput) {
      simulateInput(npisoInput, rowData.npiso);
      log(`N° Piso: ${rowData.npiso}`, 'success');
    }
  }
  
  // [57] MES
  await selectMesModal(modal, rowData.mes);
  
  // [57] AÑO
  await setAnioModal(modal, rowData.anio);
  
  // [58] MATERIAL ESTRUC. PREDOMINANTE
  if (rowData.mep) {
    const mappedValue = CONSTRUCCION_MAPPINGS.mep[rowData.mep] || rowData.mep;
    await selectModalOption(modal, 'MATERIAL ESTRUC', mappedValue);
  }
  
  // [59] ESTADO CONSERVACIÓN
  if (rowData.ecs) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecs[rowData.ecs] || rowData.ecs;
    await selectModalOption(modal, 'ESTADO CONSERV', mappedValue);
  }
  
  // [60] ESTADO CONSTRUCCIÓN
  if (rowData.ecc) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecc[rowData.ecc] || rowData.ecc;
    await selectModalOption(modal, 'ESTADO CONSTRUCC', mappedValue);
  }
  
  // [61] MUROS Y COLUMNAS
  if (rowData.muro) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.muro] || rowData.muro.toUpperCase();
    await selectModalOption(modal, 'MUROS Y COLUMNAS', mappedValue);
  }
  
  // [62] TECHOS
  if (rowData.techo) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.techo] || rowData.techo.toUpperCase();
    await selectModalOption(modal, 'TECHOS', mappedValue);
  }
  
  // [63] PISOS
  if (rowData.piso) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.piso] || rowData.piso.toUpperCase();
    await selectModalOption(modal, 'PISOS', mappedValue);
  }
  
  // [64] PUERTAS Y VENTANAS
  if (rowData.puerta) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.puerta] || rowData.puerta.toUpperCase();
    await selectModalOption(modal, 'PUERTAS Y VENTANAS', mappedValue);
  }
  
  // [65] REVESTIMIENTOS
  if (rowData.revest) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.revest] || rowData.revest.toUpperCase();
    await selectModalOption(modal, 'REVESTIMIENTOS', mappedValue);
  }
  
  // [66] BAÑOS
  if (rowData.banio) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.banio] || rowData.banio.toUpperCase();
    await selectModalOption(modal, 'BAÑOS', mappedValue);
  }
  
  // [67] INST. ELÉCTRICAS SANITARIAS
  if (rowData.inst) {
    const mappedValue = CONSTRUCCION_MAPPINGS.letras[rowData.inst] || rowData.inst.toUpperCase();
    await selectModalOption(modal, 'INST. EL', mappedValue);
  }
  
  // [68] AREA VERIFICADA
  if (rowData.area) {
    const areaInput = modal.querySelector('input[type="number"][maxlength="11"]');
    if (areaInput) {
      simulateInput(areaInput, rowData.area);
      log(`Área: ${rowData.area}`, 'success');
    }
  }
  
  // [69] UBI. CONSTRUC. ANTI.
  if (rowData.uca) {
    const mappedValue = CONSTRUCCION_MAPPINGS.uca[rowData.uca] || rowData.uca;
    await selectModalOption(modal, 'UBI. CONSTRUC', mappedValue);
  }
  
  await delay(CONFIG.delays.medium);
  
  // Click en Guardar
  const guardarBtn = modal.querySelector('.ant-modal-footer button.ant-btn-primary');
  if (guardarBtn) {
    simulateClick(guardarBtn);
    log(`Construcción fila ${rowIndex + 1} guardada`, 'success');
  }
  
  await delay(CONFIG.delays.extraLong);
}

/**
 * Procesa la sección 08 - Construcciones
 */
async function handleSeccion08Construcciones(construccionesData) {
  log('Procesando Seccion 08: CONSTRUCCIONES', 'info');
  
  // Expandir sección 08 (índice 7)
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
  
  // Iterar por cada fila de construcciones
  for (let i = 0; i < construccionesData.length; i++) {
    await processConstruccionRow(construccionesData[i], i);
    await delay(CONFIG.delays.medium);
  }
  
  log('Sección 08 completada', 'success');
}

// ============================================
// 6C. SECCIÓN 09: OBRAS COMPLEMENTARIAS
// ============================================

/**
 * Procesa una fila de obra complementaria
 */
async function processObraRow(rowData, rowIndex) {
  log(`Procesando obra fila ${rowIndex + 1}`, 'info');
  
  // Click en botón NUEVO de la sección 09
  const section = document.querySelectorAll('.ant-collapse-item')[8]; // Índice 8 = sección 09
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
  
  // Esperar el modal de NUEVA OBRA COMPLEMENTARIA
  const obraModal = await waitForModal('NUEVA OBRA COMPLEMENTARIA');
  if (!obraModal) {
    log('Modal de nueva obra no apareció', 'error');
    return;
  }
  
  // Click en botón de búsqueda de código
  const searchCodeBtn = obraModal.querySelector('button .anticon-search')?.closest('button');
  if (searchCodeBtn) {
    simulateClick(searchCodeBtn);
    await delay(CONFIG.delays.long);
  }
  
  // Esperar modal de CÓDIGOS DE INSTALACIÓN
  const codigosModal = await waitForModal('CÓDIGOS DE INSTALACIÓN');
  if (!codigosModal) {
    log('Modal de códigos no apareció', 'error');
    return;
  }
  
  // Buscar el código
  const searchInput = codigosModal.querySelector('input#form_item_search');
  if (searchInput && rowData.codigo) {
    simulateInput(searchInput, rowData.codigo);
    await delay(CONFIG.delays.short);
    
    // Click en botón buscar
    const searchBtn = codigosModal.querySelector('button.ant-input-search-button');
    if (searchBtn) {
      simulateClick(searchBtn);
      await delay(CONFIG.delays.long);
    }
  }
  
  // Verificar total de registros
  const totalRegistros = codigosModal.querySelector('p.float-right span.text-black');
  const totalCount = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
  
  if (totalCount === 1) {
    // Click automático en seleccionar
    const selectBtn = codigosModal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      simulateClick(selectBtn);
      log('Código seleccionado automáticamente', 'success');
    }
  } else if (totalCount > 1) {
    // Esperar click manual del usuario
    log(`Se encontraron ${totalCount} registros. Esperando selección manual...`, 'warning');
    await waitForModalToClose('CÓDIGOS DE INSTALACIÓN');
  }
  
  await delay(CONFIG.delays.long);
  
  // Verificar que volvimos al modal de obra
  const obraModalUpdated = await waitForModal('NUEVA OBRA COMPLEMENTARIA');
  if (!obraModalUpdated) return;
  
  // MES
  await selectMesModal(obraModalUpdated, rowData.mes);
  
  // AÑO
  await setAnioModal(obraModalUpdated, rowData.anio);
  
  // [58] MEP
  if (rowData.mep) {
    const mappedValue = CONSTRUCCION_MAPPINGS.mep[rowData.mep] || rowData.mep;
    await selectModalOption(obraModalUpdated, 'MEP', mappedValue);
  }
  
  // [59] ECS
  if (rowData.ecs) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecs[rowData.ecs] || rowData.ecs;
    await selectModalOption(obraModalUpdated, 'ECS', mappedValue);
  }
  
  // [60] ECC
  if (rowData.ecc) {
    const mappedValue = CONSTRUCCION_MAPPINGS.ecc[rowData.ecc] || rowData.ecc;
    await selectModalOption(obraModalUpdated, 'ECC', mappedValue);
  }
  
  // [73] PRODUCTO TOTAL
  if (rowData.total) {
    const totalInput = obraModalUpdated.querySelector('input[type="number"]:not([placeholder])');
    if (totalInput) {
      simulateInput(totalInput, rowData.total);
      log(`Total: ${rowData.total}`, 'success');
    }
  }
  
  // [69] UCA
  if (rowData.uca) {
    const mappedValue = CONSTRUCCION_MAPPINGS.uca[rowData.uca] || rowData.uca;
    await selectModalOption(obraModalUpdated, 'UCA', mappedValue);
  }
  
  await delay(CONFIG.delays.medium);
  
  // Click en Guardar
  const guardarBtn = obraModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
  if (guardarBtn) {
    simulateClick(guardarBtn);
    log(`Obra fila ${rowIndex + 1} guardada`, 'success');
  }
  
  await delay(CONFIG.delays.extraLong);
}

/**
 * Espera a que un modal se cierre
 */
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

/**
 * Procesa la sección 09 - Obras Complementarias
 */
async function handleSeccion09Obras(obrasData) {
  log('Procesando Seccion 09: OBRAS COMPLEMENTARIAS', 'info');
  
  // Expandir sección 09 (índice 8)
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
  
  // Iterar por cada fila de obras
  for (let i = 0; i < obrasData.length; i++) {
    await processObraRow(obrasData[i], i);
    await delay(CONFIG.delays.medium);
  }
  
  log('Sección 09 completada', 'success');
}

// ============================================
// 6D. SECCIÓN FINAL: FIRMAS
// ============================================

/**
 * Busca y selecciona personal en el modal de listado
 */
async function searchAndSelectPersonal(searchName) {
  // Esperar el modal de LISTADO DEL PERSONAL
  const personalModal = await waitForModal('LISTADO DEL PERSONAL');
  if (!personalModal) {
    log('Modal de listado de personal no apareció', 'error');
    return false;
  }
  
  await delay(CONFIG.delays.medium);
  
  // Buscar el input de búsqueda
  const searchInput = personalModal.querySelector('input#form_item_search') || 
                      personalModal.querySelector('input[placeholder="Buscar"]');
  
  if (searchInput && searchName) {
    // Limpiar y escribir el nombre
    searchInput.focus();
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(CONFIG.delays.short);
    
    // Escribir el nombre de búsqueda
    simulateInput(searchInput, searchName);
    await delay(CONFIG.delays.short);
    
    // Presionar Enter para buscar
    simulateEnter(searchInput);
    await delay(CONFIG.delays.long);
    
    // Esperar a que se actualice la tabla
    await delay(CONFIG.delays.long);
  }
  
  // Verificar total de registros
  const totalRegistros = personalModal.querySelector('p.float-right span.text-black');
  const totalCount = totalRegistros ? parseInt(totalRegistros.textContent) : 0;
  
  log(`Total de registros encontrados: ${totalCount}`, 'info');
  
  if (totalCount === 1) {
    // Click automático en el único botón de seleccionar
    const selectBtn = personalModal.querySelector('button .anticon-select')?.closest('button');
    if (selectBtn) {
      await delay(CONFIG.delays.short);
      simulateClick(selectBtn);
      log('Personal seleccionado automáticamente', 'success');
      await delay(CONFIG.delays.medium);
      return true;
    }
  } else if (totalCount > 1) {
    // Esperar click manual del usuario
    log(`Se encontraron ${totalCount} registros. Esperando selección manual...`, 'warning');
    await waitForModalToClose('LISTADO DEL PERSONAL');
    return true;
  } else {
    log('No se encontraron registros', 'warning');
    // Cerrar modal si no hay resultados
    const closeBtn = personalModal.querySelector('.ant-modal-close');
    if (closeBtn) simulateClick(closeBtn);
  }
  
  return false;
}

/**
 * Establece la fecha en el modal de firma (formato dd/mm/yyyy)
 */
async function setFechaFirmaModal(modal, fecha) {
  if (!fecha) return;
  
  // Formatear fecha a dd/mm/yyyy
  let fechaFormateada = fecha;
  if (fecha.includes('-')) {
    // Viene en formato yyyy-mm-dd o similar
    const parts = fecha.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // yyyy-mm-dd
        fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        // dd-mm-yyyy
        fechaFormateada = `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
  }
  
  log(`Estableciendo fecha: ${fechaFormateada}`, 'info');
  
  // Buscar el input de fecha directamente
  const dateInput = modal.querySelector('input#form_item_fecharegistro') ||
                    modal.querySelector('input[placeholder*="DD"]') ||
                    modal.querySelector('.ant-picker input');
  
  if (!dateInput) {
    log('Input de fecha no encontrado', 'warning');
    return;
  }
  
  // Focus en el input
  dateInput.focus();
  await delay(CONFIG.delays.short);
  
  // Limpiar el valor actual
  dateInput.value = '';
  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  await delay(100);
  
  // Escribir la fecha caracter por caracter
  for (let i = 0; i < fechaFormateada.length; i++) {
    dateInput.value += fechaFormateada[i];
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(30);
  }
  
  // Disparar eventos de cambio
  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
  dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // Presionar Enter para confirmar
  simulateEnter(dateInput);
  
  await delay(CONFIG.delays.short);
  
  // Click fuera para cerrar cualquier picker abierto
  const modalBody = modal.querySelector('.ant-modal-body');
  if (modalBody) {
    simulateClick(modalBody);
  }
  
  await delay(CONFIG.delays.short);
  log(`Fecha establecida: ${fechaFormateada}`, 'success');
}

/**
 * Procesa la firma del supervisor
 */
async function processFirmaSupervisor(data) {
  log('Procesando firma del supervisor', 'info');
  
  // Buscar el botón de editar cerca de "FIRMA DEL SUPERVISOR"
  const allElements = document.querySelectorAll('*');
  let editBtn = null;
  
  for (const el of allElements) {
    if (el.textContent && el.textContent.includes('95') && el.textContent.includes('FIRMA') && el.textContent.includes('SUPERVISOR')) {
      // Buscar el botón de editar cercano
      const parent = el.closest('fieldset') || el.closest('.ant-form-item') || el.parentElement;
      if (parent) {
        editBtn = parent.querySelector('button .anticon-edit')?.closest('button');
        if (editBtn) break;
      }
    }
  }
  
  // Fallback: buscar cualquier botón de editar en la zona de firmas
  if (!editBtn) {
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fs of fieldsets) {
      if (fs.textContent.includes('SUPERVISOR')) {
        editBtn = fs.querySelector('button .anticon-edit')?.closest('button');
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
  
  // Esperar modal de FIRMA DEL SUPERVISOR (puede ser "NUEVA FIRMA DEL SUPERVISOR")
  let firmaModal = await waitForModal('FIRMA DEL SUPERVISOR');
  if (!firmaModal) {
    firmaModal = await waitForModal('NUEVA FIRMA');
  }
  if (!firmaModal) {
    log('Modal de firma supervisor no apareció', 'error');
    return;
  }
  
  // Click en botón de búsqueda para abrir listado de personal
  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    
    // Buscar y seleccionar personal
    await searchAndSelectPersonal(data['final-supervisor-nombre']);
  }
  
  await delay(CONFIG.delays.long);
  
  // Verificar que volvimos al modal de firma
  let firmaModalUpdated = await waitForModal('FIRMA DEL SUPERVISOR');
  if (!firmaModalUpdated) {
    firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  }
  if (firmaModalUpdated) {
    // Establecer fecha
    await setFechaFirmaModal(firmaModalUpdated, data['final-supervisor-fecha']);
    
    await delay(CONFIG.delays.medium);
    
    // Click en Guardar
    const guardarBtn = firmaModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log('Firma supervisor guardada', 'success');
    }
  }
  
  await delay(CONFIG.delays.extraLong);
}

/**
 * Procesa la firma del técnico catastral
 */
async function processFirmaTecnico(data) {
  log('Procesando firma del técnico catastral', 'info');
  
  // Buscar el botón de editar cerca de "FIRMA DEL TÉCNICO"
  const allElements = document.querySelectorAll('*');
  let editBtn = null;
  
  for (const el of allElements) {
    if (el.textContent && el.textContent.includes('96') && el.textContent.includes('FIRMA') && el.textContent.includes('CNICO')) {
      const parent = el.closest('fieldset') || el.closest('.ant-form-item') || el.parentElement;
      if (parent) {
        editBtn = parent.querySelector('button .anticon-edit')?.closest('button');
        if (editBtn) break;
      }
    }
  }
  
  // Fallback
  if (!editBtn) {
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fs of fieldsets) {
      if (fs.textContent.includes('CNICO') && fs.textContent.includes('CATASTRAL')) {
        editBtn = fs.querySelector('button .anticon-edit')?.closest('button');
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
  
  // Esperar modal de FIRMA DEL TÉCNICO (puede ser "NUEVA FIRMA DEL TÉCNICO")
  let firmaModal = await waitForModal('CNICO CATASTRAL');
  if (!firmaModal) {
    firmaModal = await waitForModal('NUEVA FIRMA');
  }
  if (!firmaModal) {
    log('Modal de firma técnico no apareció', 'error');
    return;
  }
  
  // Click en botón de búsqueda
  const searchBtn = firmaModal.querySelector('legend button .anticon-search')?.closest('button') ||
                    firmaModal.querySelector('button .anticon-search')?.closest('button');
  if (searchBtn) {
    simulateClick(searchBtn);
    await delay(CONFIG.delays.long);
    
    // Buscar y seleccionar personal
    await searchAndSelectPersonal(data['final-tecnico-nombre']);
  }
  
  await delay(CONFIG.delays.long);
  
  // Verificar que volvimos al modal de firma
  let firmaModalUpdated = await waitForModal('CNICO CATASTRAL');
  if (!firmaModalUpdated) {
    firmaModalUpdated = await waitForModal('NUEVA FIRMA');
  }
  if (firmaModalUpdated) {
    // Establecer fecha
    await setFechaFirmaModal(firmaModalUpdated, data['final-tecnico-fecha']);
    
    await delay(CONFIG.delays.medium);
    
    // Click en Guardar
    const guardarBtn = firmaModalUpdated.querySelector('.ant-modal-footer button.ant-btn-primary');
    if (guardarBtn) {
      simulateClick(guardarBtn);
      log('Firma técnico guardada', 'success');
    }
  }
  
  await delay(CONFIG.delays.extraLong);
}

/**
 * Procesa la sección final después de guardar observaciones
 */
async function handleSeccionFinal() {
  log('Procesando seccion final: FIRMAS', 'info');
  
  const data = AppState.storedData;
  const finalData = data.final || {};
  
  // Esperar a que el usuario haga click en "Guardar observaciones"
  await waitForButtonClick('button', 'Guardar observaciones');
  log('Usuario guardó observaciones', 'success');
  
  await delay(CONFIG.delays.long);
  
  // Procesar firma del supervisor
  if (finalData['final-supervisor-nombre']) {
    await processFirmaSupervisor(finalData);
  }
  
  await delay(CONFIG.delays.long);
  
  // Procesar firma del técnico
  if (finalData['final-tecnico-nombre']) {
    await processFirmaTecnico(finalData);
  }
  
  log('Seccion final completada', 'success');
}

// ============================================
// 7. LISTENER DE MENSAJES DEL POPUP
// ============================================

/**
 * Escucha mensajes del popup para ejecutar acciones
 */
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
    
    return true; // Indica respuesta asíncrona
  }
});

// ============================================
// 7. CONTROLADOR PRINCIPAL DE FLUJO
// ============================================

/**
 * Expande una seccion y ejecuta su handler correspondiente
 */
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

/**
 * Inicializa la extension
 */
async function init() {
  log('Iniciando automatizacion de Ficha Catastral Individual', 'info');
  
  AppState.storedData = await getStoredData();
  log('Datos cargados del storage', 'success');

  // Configurar interceptor de tecla Tab para simular Enter
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

// Iniciar cuando el DOM este listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}