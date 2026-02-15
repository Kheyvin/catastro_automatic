const STORAGE_KEY = 'fichaCatastralData';
const THEME_KEY = 'fichaCatastralTheme';

const SECCIONES_CONFIG = {
  principales: {
    fields: ['principales-sector', 'principales-manzana', 'principales-lote']
  },
  ubicacion: {
    fields: [
      'ubicacion-codigo-hu',
      'ubicacion-manzana', 'ubicacion-lote', 'ubicacion-sub-lote'
    ]
  },
  descripcion: {
    fields: [
      'descripcion-zonificacion', 'descripcion-area-adquirida', 'descripcion-area-verificada',
      'lindero-frente-medida', 'lindero-frente-colindancia',
      'lindero-derecha-medida', 'lindero-derecha-colindancia',
      'lindero-izquierda-medida', 'lindero-izquierda-colindancia',
      'lindero-fondo-medida', 'lindero-fondo-colindancia'
    ]
  },
  servicios: {
    fields: [
      'servicios-luz', 'servicios-agua', 'servicios-telf',
      'servicios-desague', 'servicios-gas', 'servicios-internet', 'servicios-tv'
    ]
  },
  inscripcion: {
    fields: ['inscripcion-numero', 'inscripcion-asiento', 'inscripcion-fecha']
  },
  final: {
    fields: [
      'final-observaciones', 'final-supervisor-nombre', 'final-supervisor-fecha',
      'final-tecnico-nombre', 'final-tecnico-fecha'
    ]
  }
};

const TABLAS_CONFIG = {
  vias: {
    tableId: 'tabla-vias',
    tbodyId: 'tbody-vias',
    columns: ['codigo', 'puerta', 'nro_municipal', 'cond_num']
  },
  construcciones: {
    tableId: 'tabla-construcciones',
    tbodyId: 'tbody-construcciones',
    columns: ['npiso', 'mes', 'anio', 'mep', 'ecs', 'ecc', 'muro', 'techo', 'piso', 'puerta', 'revest', 'banio', 'inst', 'area', 'uca']
  },
  obras: {
    tableId: 'tabla-obras',
    tbodyId: 'tbody-obras',
    columns: ['codigo', 'mes', 'anio', 'mep', 'ecs', 'ecc', 'total', 'uca']
  }
};

// ==================== CONFIGURACIÓN DE VALIDACIONES ====================

const VALIDACIONES = {
  vias: {
    codigo: { type: 'numero', label: 'CÓDIGO', errorMsg: 'Solo números permitidos' },
    puerta: { type: 'puerta', label: 'PUERTA', errorMsg: 'Debe ser P, S, G, E, 0 o vacío' },
    nro_municipal: { type: 'numero', label: 'NRO MUNICIPAL', errorMsg: 'Solo números permitidos' },
    cond_num: { type: 'cond_num', label: 'COND NUM', errorMsg: 'Debe ser 0-4 (ej: 0, 01, 02, 03, 04)' }
  },
  construcciones: {
    npiso: { type: 'any', label: 'NPISO' },
    mes: { type: 'mes', label: 'MES', errorMsg: 'Debe ser 0-12 (ej: 1, 01, 02)' },
    anio: { type: 'anio', label: 'AÑO', errorMsg: 'Debe tener 4 dígitos' },
    mep: { type: 'mep', label: 'MEP', errorMsg: 'Debe ser 0-3 (ej: 0, 01, 02, 03)' },
    ecs: { type: 'ecs', label: 'ECS', errorMsg: 'Debe ser 0-4 (ej: 0, 01, 02, 03, 04)' },
    ecc: { type: 'ecc', label: 'ECC', errorMsg: 'Debe ser 0-4 (ej: 0, 01, 02, 03, 04)' },
    muro: { type: 'letra', label: 'MURO', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    techo: { type: 'letra', label: 'TECHO', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    piso: { type: 'letra', label: 'PISO', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    puerta: { type: 'letra', label: 'PUERTA', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    revest: { type: 'letra', label: 'REVEST', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    banio: { type: 'letra', label: 'BAÑO', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    inst: { type: 'letra', label: 'INST', errorMsg: 'Debe ser A-I, vacío, 0 o 00' },
    area: { type: 'any', label: 'AREA' },
    uca: { type: 'uca', label: 'UCA', errorMsg: 'Debe ser 0-7 (ej: 0, 01, 02...07)' }
  },
  obras: {
    codigo: { type: 'numero', label: 'CÓDIGO', errorMsg: 'Solo números permitidos' },
    mes: { type: 'mes', label: 'MES', errorMsg: 'Debe ser 0-12 (ej: 1, 01, 02)' },
    anio: { type: 'anio', label: 'AÑO', errorMsg: 'Debe tener 4 dígitos' },
    mep: { type: 'mep', label: 'MEP', errorMsg: 'Debe ser 0-3 (ej: 0, 01, 02, 03)' },
    ecs: { type: 'ecs', label: 'ECS', errorMsg: 'Debe ser 0-4 (ej: 0, 01, 02, 03, 04)' },
    ecc: { type: 'ecc', label: 'ECC', errorMsg: 'Debe ser 0-4 (ej: 0, 01, 02, 03, 04)' },
    total: { type: 'any', label: 'TOTAL' },
    uca: { type: 'uca', label: 'UCA', errorMsg: 'Debe ser 0-7 (ej: 0, 01, 02...07)' }
  }
};

// ==================== FUNCIONES DE VALIDACIÓN ====================

function validarCampo(valor, tipo) {
  const v = valor.trim();
  switch (tipo) {
    case 'any':
      return { valid: true, normalized: v };
    case 'mes':
      if (v === '' || v === '0' || v === '00') return { valid: true, normalized: '0' };
      const mesNum = parseInt(v, 10);
      if (!isNaN(mesNum) && mesNum >= 0 && mesNum <= 12) {
        return { valid: true, normalized: v };
      }
      return { valid: false };
    case 'anio':
      if (v === '') return { valid: true, normalized: '' };
      if (/^\d{4}$/.test(v)) {
        return { valid: true, normalized: v };
      }
      return { valid: false };
    case 'mep':
      if (v === '' || v === '0' || v === '00') return { valid: true, normalized: '0' };
      if (/^(0?[0-3])$/.test(v)) {
        return { valid: true, normalized: v };
      }
      return { valid: false };
    case 'ecs':
    case 'ecc':
      if (v === '' || v === '0' || v === '00') return { valid: true, normalized: '0' };
      if (/^(0?[0-4])$/.test(v)) {
        return { valid: true, normalized: v };
      }
      return { valid: false };
    case 'letra':
      if (v === '' || v === '0' || v === '00') return { valid: true, normalized: '0' };
      if (/^[A-Ia-i]$/.test(v)) {
        return { valid: true, normalized: v.toUpperCase() };
      }
      return { valid: false };
    case 'uca':
      if (v === '' || v === '0' || v === '00') return { valid: true, normalized: '0' };
      if (/^(0?[0-7])$/.test(v)) {
        return { valid: true, normalized: v };
      }
      return { valid: false };
    case 'numero':
      if (v === '') return { valid: true, normalized: '' };
      if (/^\d+$/.test(v)) {
        return { valid: true, normalized: v };
      }
      return { valid: false };
    case 'puerta':
      // FIX: usar 'v' en vez de 'value' (variable no definida)
      if (v === '' || v === '0') return { valid: true, normalized: v };
      const upperPuerta = v.toUpperCase();
      if (['P', 'S', 'G', 'E'].includes(upperPuerta)) {
        return { valid: true, normalized: upperPuerta };
      }
      return { valid: false };
    case 'cond_num':
      // FIX: usar 'v' en vez de 'value' (variable no definida)
      if (v === '' || v === '0' || v === '00') return { valid: true, normalized: v };
      const numCond = parseInt(v, 10);
      if (!isNaN(numCond) && numCond >= 0 && numCond <= 4) {
        return { valid: true, normalized: numCond.toString().padStart(2, '0') };
      }
      return { valid: false };
    default:
      return { valid: true, normalized: v };
  }
}

function validarFilaTabla(row, tableType) {
  const config = VALIDACIONES[tableType];
  if (!config) return { valid: true, errors: [] };
  const errors = [];
  const inputs = row.querySelectorAll('input[name]');
  inputs.forEach(input => {
    const fieldName = input.name;
    const fieldConfig = config[fieldName];
    if (fieldConfig) {
      const resultado = validarCampo(input.value, fieldConfig.type);
      input.classList.remove('valid', 'invalid');
      if (!resultado.valid) {
        input.classList.add('invalid');
        errors.push({
          field: fieldConfig.label,
          message: fieldConfig.errorMsg || 'Valor inválido',
          input: input
        });
      } else if (input.value.trim() !== '') {
        input.classList.add('valid');
      }
    }
  });
  return { valid: errors.length === 0, errors };
}

function validarTablaCompleta(tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return { valid: true, allErrors: [] };
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return { valid: true, allErrors: [] };
  const rows = tbody.querySelectorAll('tr');
  const allErrors = [];
  let rowIndex = 1;
  rows.forEach(row => {
    const { valid, errors } = validarFilaTabla(row, tableType);
    if (!valid) {
      errors.forEach(err => {
        allErrors.push({
          fila: rowIndex,
          ...err
        });
      });
    }
    rowIndex++;
  });
  return { valid: allErrors.length === 0, allErrors };
}

function mostrarErroresValidacion(tableType, allErrors) {
  const existingSummary = document.querySelector(`#seccion-${tableType} .validation-summary`);
  if (existingSummary) existingSummary.remove();
  if (allErrors.length === 0) return;
  const container = document.querySelector(`#seccion-${tableType} .tabla-excel-container`);
  // Para vías, el contenedor está dentro de seccion-ubicacion
  const altContainer = document.querySelector(`#seccion-ubicacion .tabla-excel-container`);
  const targetContainer = container || altContainer;
  if (!targetContainer) return;
  const summary = document.createElement('div');
  summary.className = 'validation-summary';
  const errorList = allErrors.map(err =>
    `<li>Fila ${err.fila}, ${err.field}: ${err.message}</li>`
  ).join('');
  summary.innerHTML = `
    <strong>⚠️ Errores de validación (${allErrors.length}):</strong>
    <ul>${errorList}</ul>
  `;
  targetContainer.appendChild(summary);
}

function limpiarErroresValidacion(tableType) {
  const existingSummary = document.querySelector(`#seccion-${tableType} .validation-summary`);
  if (existingSummary) existingSummary.remove();
  // También limpiar en ubicacion (para vías)
  if (tableType === 'vias') {
    const altSummary = document.querySelector(`#seccion-ubicacion .validation-summary`);
    if (altSummary) altSummary.remove();
  }
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return;
  tbody.querySelectorAll('input').forEach(input => {
    input.classList.remove('valid', 'invalid');
  });
}

// ==================== FUNCIONES PARA FICHAS NETAS ====================

const FICHAS_COUNTER_KEY = 'fichasCounterData';

async function loadFichasCounter() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FICHAS_COUNTER_KEY], (result) => {
      resolve(result[FICHAS_COUNTER_KEY] || { meta: 0, avance: 0 });
    });
  });
}

async function saveFichasCounter(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FICHAS_COUNTER_KEY]: data }, resolve);
  });
}

async function updateFichasUI() {
  const data = await loadFichasCounter();
  const metaInput = document.getElementById('fichas-meta');
  const avanceEl = document.getElementById('fichas-avance');
  const faltantesEl = document.getElementById('fichas-faltantes');
  const progressEl = document.getElementById('fichas-progress');
  const infoEl = document.getElementById('fichas-info-text');

  if (metaInput && !metaInput.dataset.loaded) {
    metaInput.value = data.meta || '';
    metaInput.dataset.loaded = 'true';
  }

  if (avanceEl) avanceEl.textContent = data.avance || 0;

  const faltantes = Math.max(0, (data.meta || 0) - (data.avance || 0));
  if (faltantesEl) faltantesEl.textContent = faltantes;

  const percent = data.meta > 0 ? Math.min(100, ((data.avance || 0) / data.meta) * 100) : 0;
  if (progressEl) progressEl.style.width = percent.toFixed(1) + '%';

  if (infoEl) {
    if (!data.meta || data.meta === 0) {
      infoEl.textContent = 'Configura tu meta para iniciar el seguimiento';
    } else if (faltantes === 0) {
      infoEl.textContent = '🎉 ¡Meta alcanzada! Completaste todas las fichas';
      infoEl.style.color = '#22c55e';
    } else {
      infoEl.textContent = `📋 ${data.avance}/${data.meta} fichas completadas (${percent.toFixed(0)}%)`;
      infoEl.style.color = '';
    }
  }
}

function setupFichasCounter() {
  const metaInput = document.getElementById('fichas-meta');
  if (metaInput) {
    metaInput.addEventListener('change', async () => {
      const data = await loadFichasCounter();
      data.meta = parseInt(metaInput.value) || 0;
      await saveFichasCounter(data);
      await updateFichasUI();
      showToast('Meta actualizada', 'success');
    });
  }

  const resetBtn = document.getElementById('btn-reset-fichas');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('¿Reiniciar el contador de fichas?')) {
        await saveFichasCounter({ meta: 0, avance: 0 });
        const metaInput = document.getElementById('fichas-meta');
        if (metaInput) {
          metaInput.value = '';
          metaInput.dataset.loaded = '';
        }
        await updateFichasUI();
        showToast('Contador reiniciado', 'info');
      }
    });
  }

  updateFichasUI();
}

// ==================== HELPER: Obtener fila con puerta P de vías ====================

function getViaPrincipalFromStorage() {
  const viasData = getTableDataFromDOM('vias');
  if (!viasData || viasData.length === 0) return null;

  // Buscar fila con PUERTA = P
  const filaPrincipal = viasData.find(row =>
    row.puerta && row.puerta.toUpperCase() === 'P'
  );

  return filaPrincipal || null;
}

// ==================== FUNCIÓN CREAR LOTES ====================

function setupCrearLotes() {
  const btn = document.getElementById('btn-crear-lotes');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const loteInput = document.getElementById('principales-lote');
    if (!loteInput || !loteInput.value.trim()) {
      showToast('Ingresa un valor en LOTE primero', 'error');
      return;
    }

    const targetLote = loteInput.value.trim();

    // Guardar datos primero
    const principales = getSectionValuesFromDOM('principales');
    await saveSectionData('principales', principales);

    showToast(`Ejecutando creación de lotes hasta ${targetLote}...`, 'info');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'createLotes',
          targetLote: targetLote
        }, (response) => {
          if (chrome.runtime.lastError) {
            showToast('Error: No se pudo conectar con la página', 'error');
          } else if (response && response.success) {
            showToast(`Lotes creados correctamente ✓`, 'success');
          } else {
            showToast('Error al crear lotes: ' + (response?.error || 'desconocido'), 'error');
          }
        });
      }
    });
  });
}

// ==================== NAVEGACIÓN TIPO EXCEL ====================

function setupExcelNavigation() {
  const tables = document.querySelectorAll('.tabla-navegable');
  tables.forEach(table => {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.addEventListener('keydown', (e) => {
      const input = e.target;
      if (input.tagName !== 'INPUT') return;
      const cell = input.closest('td');
      const row = input.closest('tr');
      const tableType = table.dataset.tableType;
      const allRows = Array.from(tbody.querySelectorAll('tr'));
      const rowIndex = allRows.indexOf(row);
      const cells = Array.from(row.querySelectorAll('td:not(.acciones-cell)'));
      const colIndex = cells.indexOf(cell);
      let targetInput = null;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (rowIndex > 0) {
            const prevRow = allRows[rowIndex - 1];
            const prevCells = prevRow.querySelectorAll('td:not(.acciones-cell)');
            if (prevCells[colIndex]) {
              targetInput = prevCells[colIndex].querySelector('input');
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (rowIndex < allRows.length - 1) {
            const nextRow = allRows[rowIndex + 1];
            const nextCells = nextRow.querySelectorAll('td:not(.acciones-cell)');
            if (nextCells[colIndex]) {
              targetInput = nextCells[colIndex].querySelector('input');
            }
          }
          break;

        case 'ArrowLeft':
          if (input.selectionStart === 0 && input.selectionEnd === 0) {
            e.preventDefault();
            if (colIndex > 0) {
              targetInput = cells[colIndex - 1].querySelector('input');
            } else if (rowIndex > 0) {
              const prevRow = allRows[rowIndex - 1];
              const prevCells = prevRow.querySelectorAll('td:not(.acciones-cell)');
              targetInput = prevCells[prevCells.length - 1].querySelector('input');
            }
          }
          break;
        case 'ArrowRight':
          if (input.selectionStart === input.value.length) {
            e.preventDefault();
            if (colIndex < cells.length - 1) {
              targetInput = cells[colIndex + 1].querySelector('input');
            } else if (rowIndex < allRows.length - 1) {
              const nextRow = allRows[rowIndex + 1];
              const nextCells = nextRow.querySelectorAll('td:not(.acciones-cell)');
              targetInput = nextCells[0].querySelector('input');
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (colIndex < cells.length - 1) {
            targetInput = cells[colIndex + 1].querySelector('input');
          } else if (rowIndex < allRows.length - 1) {
            const nextRow = allRows[rowIndex + 1];
            const nextCells = nextRow.querySelectorAll('td:not(.acciones-cell)');
            targetInput = nextCells[0].querySelector('input');
          } else {
            addTableRow(tableType);
            setTimeout(() => {
              const newRows = tbody.querySelectorAll('tr');
              const lastRow = newRows[newRows.length - 1];
              const firstInput = lastRow.querySelector('td:not(.acciones-cell) input');
              if (firstInput) firstInput.focus();
            }, 50);
          }
          break;
        case 'Tab':
          setTimeout(() => {
            validarCampoEnTiempoReal(input, tableType);
          }, 0);
          break;
        case 'Escape':
          input.blur();
          break;
      }
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    });
    tbody.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT') {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('row-active'));
        e.target.closest('tr').classList.add('row-active');
      }
    });
    tbody.addEventListener('focusout', (e) => {
      if (e.target.tagName === 'INPUT') {
        const tableType = table.dataset.tableType;
        validarCampoEnTiempoReal(e.target, tableType);
      }
    });
    tbody.addEventListener('focus', (e) => {
      if (e.target.tagName === 'INPUT') {
        setTimeout(() => e.target.select(), 0);
      }
    }, true);
  });
}

function validarCampoEnTiempoReal(input, tableType) {
  const fieldName = input.name;
  const config = VALIDACIONES[tableType];
  if (!config || !config[fieldName]) return;
  const fieldConfig = config[fieldName];
  const resultado = validarCampo(input.value, fieldConfig.type);
  input.classList.remove('valid', 'invalid');
  if (input.value.trim() === '') {
    return;
  }
  if (resultado.valid) {
    input.classList.add('valid');
    if (resultado.normalized !== input.value) {
      input.value = resultado.normalized;
    }
  } else {
    input.classList.add('invalid');
  }
}

async function loadMainContent() {
  const response = await fetch('popup-content.html');
  const html = await response.text();
  const mainContainer = document.querySelector('.container');
  mainContainer.innerHTML = html;
  initTheme();
  loadStoredData();
  setupEventListeners();
  setupExcelNavigation();
}

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function generateRowId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function initTheme() {
  chrome.storage.local.get([THEME_KEY], (result) => {
    const isDark = result[THEME_KEY] === 'dark';
    if (isDark) {
      document.body.classList.add('dark-mode');
      const themeBtn = document.getElementById('btn-theme');
      if (themeBtn) themeBtn.textContent = '☀️';
    }
  });
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  chrome.storage.local.set({ [THEME_KEY]: isDark ? 'dark' : 'light' });
  showToast(isDark ? 'Modo oscuro activado' : 'Modo claro activado', 'info');
}

async function getAllStoredData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

async function saveAllData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
  });
}

async function getSectionData(section) {
  const allData = await getAllStoredData();
  return allData[section] || {};
}

async function saveSectionData(section, data) {
  const allData = await getAllStoredData();
  allData[section] = data;
  await saveAllData(allData);
}

function getSectionValuesFromDOM(section) {
  const config = SECCIONES_CONFIG[section];
  if (!config) return {};

  const values = {};
  config.fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) values[fieldId] = element.value;
  });
  return values;
}

function setSectionValuesInDOM(section, values) {
  const config = SECCIONES_CONFIG[section];
  if (!config) return;

  config.fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element && values[fieldId] !== undefined) {
      element.value = values[fieldId];
    }
  });
}

function clearSectionInDOM(section) {
  const config = SECCIONES_CONFIG[section];
  if (!config) return;

  config.fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) element.value = '';
  });
}

async function saveSection(section) {
  const values = getSectionValuesFromDOM(section);
  await saveSectionData(section, values);
  showToast(`"${section}" guardado`, 'success');
}

async function clearSection(section) {
  clearSectionInDOM(section);
  await saveSectionData(section, {});
  showToast(`"${section}" limpiado`, 'info');
}

function createTableRow(tableType, values = {}) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return null;
  const row = document.createElement('tr');
  const rowId = values.rowId || generateRowId();
  row.setAttribute('data-row-id', rowId);
  config.columns.forEach((colName, index) => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = colName;
    input.value = values[colName] || '';
    input.setAttribute('data-col', index);
    const validationConfig = VALIDACIONES[tableType]?.[colName];
    if (validationConfig) {
      input.setAttribute('data-validation', validationConfig.type);
    }
    td.appendChild(input);
    row.appendChild(td);
  });
  const actionsTd = document.createElement('td');
  actionsTd.className = 'acciones-cell';
  actionsTd.innerHTML = `
    <button class="btn-row btn-duplicate" data-action="duplicate">📋</button>
    <button class="btn-row btn-delete" data-action="delete">❌</button>
  `;
  row.appendChild(actionsTd);
  return row;
}

function getTableDataFromDOM(tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return [];
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return [];
  const rows = tbody.querySelectorAll('tr');
  const data = [];
  rows.forEach(row => {
    const rowData = { rowId: row.getAttribute('data-row-id') };
    config.columns.forEach(colName => {
      const input = row.querySelector(`input[name="${colName}"]`);
      if (input) rowData[colName] = input.value;
    });
    data.push(rowData);
  });
  return data;
}

function setTableDataInDOM(tableType, data) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  if (data && data.length > 0) {
    data.forEach(rowData => {
      const row = createTableRow(tableType, rowData);
      tbody.appendChild(row);
    });
  } else {
    tbody.appendChild(createTableRow(tableType));
  }
}

function clearTableInDOM(tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  tbody.appendChild(createTableRow(tableType));
  limpiarErroresValidacion(tableType);
}

function addTableRow(tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return;
  const row = createTableRow(tableType);
  tbody.appendChild(row);
  row.querySelector('input').focus();
}

function duplicateTableRow(row, tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;
  const values = {};
  config.columns.forEach(colName => {
    const input = row.querySelector(`input[name="${colName}"]`);
    if (input) values[colName] = input.value;
  });
  const newRow = createTableRow(tableType, values);
  row.parentNode.insertBefore(newRow, row.nextSibling);
  showToast('Fila duplicada', 'success');
}

function deleteTableRow(row, tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;
  const tbody = document.getElementById(config.tbodyId);
  if (!tbody) return;
  if (tbody.querySelectorAll('tr').length <= 1) {
    showToast('No se puede eliminar la última fila', 'error');
    return;
  }
  row.remove();
  showToast('Fila eliminada', 'info');
}

async function saveTable(tableType) {
  const { valid, allErrors } = validarTablaCompleta(tableType);
  if (!valid) {
    mostrarErroresValidacion(tableType, allErrors);
    showToast(`Hay ${allErrors.length} error(es) de validación`, 'error');
    if (allErrors.length > 0 && allErrors[0].input) {
      allErrors[0].input.focus();
      allErrors[0].input.select();
    }
    return;
  }
  limpiarErroresValidacion(tableType);
  const data = getTableDataFromDOM(tableType);
  await saveSectionData(tableType, data);
  showToast(`"${tableType}" guardado ✓`, 'success');
}

async function clearTable(tableType) {
  clearTableInDOM(tableType);
  await saveSectionData(tableType, []);
  showToast(`"${tableType}" limpiado`, 'info');
}

async function executeAutomation(tableType) {
  const data = getTableDataFromDOM(tableType);
  const filasConDatos = data.filter(row => {
    const columns = TABLAS_CONFIG[tableType].columns;
    return columns.some(col => row[col] && row[col].trim() !== '');
  });
  if (filasConDatos.length === 0) {
    showToast('No hay datos para ejecutar', 'error');
    return;
  }
  const { valid, allErrors } = validarTablaCompleta(tableType);
  if (!valid) {
    mostrarErroresValidacion(tableType, allErrors);
    showToast(`Corrige ${allErrors.length} error(es) antes de ejecutar`, 'error');
    if (allErrors.length > 0 && allErrors[0].input) {
      allErrors[0].input.focus();
      allErrors[0].input.select();
    }
    return;
  }
  limpiarErroresValidacion(tableType);
  const filasNormalizadas = filasConDatos.map(row => {
    const normalizedRow = { ...row };
    const config = VALIDACIONES[tableType];
    Object.keys(row).forEach(key => {
      if (config && config[key]) {
        const resultado = validarCampo(row[key], config[key].type);
        if (resultado.valid) {
          normalizedRow[key] = resultado.normalized;
        }
      }
    });
    return normalizedRow;
  });
  await saveSectionData(tableType, filasNormalizadas);

  // ==================== CASO ESPECIAL: VÍAS ====================
  // Para vías, enviar también los datos de ubicación junto con las filas de vías
  if (tableType === 'vias') {
    const ubicacionData = getSectionValuesFromDOM('ubicacion');
    showToast(`Ejecutando vías (${filasNormalizadas.length} filas)...`, 'info');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'executeSection',
          section: 'vias',
          data: filasNormalizadas,
          ubicacion: ubicacionData
        }, (response) => {
          if (chrome.runtime.lastError) {
            showToast('Error: No se pudo conectar con la página', 'error');
          } else if (response && response.success) {
            showToast('Automatización de vías terminada ✓', 'success');
          } else {
            showToast('Error en vías: ' + (response?.error || 'desconocido'), 'error');
          }
        });
      }
    });
    return; // Salir, ya se manejó el caso de vías
  }

  // ==================== CASO GENÉRICO: construcciones, obras, etc. ====================
  showToast(`Ejecutando ${tableType} (${filasNormalizadas.length} filas)...`, 'info');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'executeSection',
        section: tableType,
        data: filasNormalizadas
      }, (response) => {
        if (chrome.runtime.lastError) {
          showToast('Error: No se pudo conectar con la página', 'error');
        } else if (response && response.success) {
          showToast('Automatización terminada ✓', 'success');
        }
      });
    }
  });
}

async function saveAll() {
  const allData = {};
  let hasErrors = false;
  let totalErrors = 0;
  for (const section of Object.keys(SECCIONES_CONFIG)) {
    allData[section] = getSectionValuesFromDOM(section);
  }
  for (const tableType of Object.keys(TABLAS_CONFIG)) {
    const { valid, allErrors } = validarTablaCompleta(tableType);
    if (!valid) {
      hasErrors = true;
      totalErrors += allErrors.length;
      mostrarErroresValidacion(tableType, allErrors);
    } else {
      limpiarErroresValidacion(tableType);
    }

    allData[tableType] = getTableDataFromDOM(tableType);
  }
  if (hasErrors) {
    showToast(`Hay ${totalErrors} error(es) de validación`, 'error');
    return;
  }
  await saveAllData(allData);
  showToast('Todo guardado correctamente ✓', 'success');
}

async function clearAll() {
  if (!confirm('¿Limpiar todos los datos?')) return;
  for (const section of Object.keys(SECCIONES_CONFIG)) {
    clearSectionInDOM(section);
  }
  for (const tableType of Object.keys(TABLAS_CONFIG)) {
    clearTableInDOM(tableType);
  }
  await saveAllData({});
  showToast('Todo limpiado', 'info');
}

async function exportData() {
  const allData = {};
  for (const section of Object.keys(SECCIONES_CONFIG)) {
    allData[section] = getSectionValuesFromDOM(section);
  }
  for (const tableType of Object.keys(TABLAS_CONFIG)) {
    allData[tableType] = getTableDataFromDOM(tableType);
  }
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ficha_catastral_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Datos exportados', 'success');
}

async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    for (const section of Object.keys(SECCIONES_CONFIG)) {
      if (data[section]) setSectionValuesInDOM(section, data[section]);
    }
    for (const tableType of Object.keys(TABLAS_CONFIG)) {
      if (data[tableType]) setTableDataInDOM(tableType, data[tableType]);
    }
    await saveAllData(data);
    showToast('Datos importados', 'success');
  } catch (error) {
    console.error('Error al importar:', error);
    showToast('Error al importar', 'error');
  }
}

async function loadStoredData() {
  const allData = await getAllStoredData();
  for (const section of Object.keys(SECCIONES_CONFIG)) {
    if (allData[section]) setSectionValuesInDOM(section, allData[section]);
  }
  for (const tableType of Object.keys(TABLAS_CONFIG)) {
    if (allData[tableType] && allData[tableType].length > 0) {
      setTableDataInDOM(tableType, allData[tableType]);
    }
  }
}

function setupEventListeners() {
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const action = target.dataset.action;
    const section = target.dataset.section;
    if (action === 'save' && SECCIONES_CONFIG[section]) {
      await saveSection(section);
    } else if (action === 'clear' && SECCIONES_CONFIG[section]) {
      await clearSection(section);
    } else if (action === 'save' && TABLAS_CONFIG[section]) {
      await saveTable(section);
    } else if (action === 'clear' && TABLAS_CONFIG[section]) {
      await clearTable(section);
    } else if (action === 'add-row' && TABLAS_CONFIG[section]) {
      addTableRow(section);
    } else if (action === 'duplicate') {
      const row = target.closest('tr');
      const tableType = target.closest('table').id.replace('tabla-', '');
      duplicateTableRow(row, tableType);
    } else if (action === 'delete') {
      const row = target.closest('tr');
      const tableType = target.closest('table').id.replace('tabla-', '');
      deleteTableRow(row, tableType);
    } else if (action === 'execute' && TABLAS_CONFIG[section]) {
      await executeAutomation(section);
    }
  });
  const btnGuardar = document.getElementById('btn-guardar-todo');
  if (btnGuardar) btnGuardar.addEventListener('click', saveAll);
  const btnLimpiar = document.getElementById('btn-limpiar-todo');
  if (btnLimpiar) btnLimpiar.addEventListener('click', clearAll);
  const btnExportar = document.getElementById('btn-exportar');
  if (btnExportar) btnExportar.addEventListener('click', exportData);
  const btnImportar = document.getElementById('btn-importar');
  if (btnImportar) {
    btnImportar.addEventListener('click', () => {
      document.getElementById('input-importar').click();
    });
  }
  const inputImportar = document.getElementById('input-importar');
  if (inputImportar) {
    inputImportar.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importData(e.target.files[0]);
        e.target.value = '';
      }
    });
  }
  setupFichasCounter();
  setupCrearLotes();
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
  loadMainContent();
});

window.FichaCatastralAPI = {
  STORAGE_KEY,
  SECCIONES_CONFIG,
  TABLAS_CONFIG,
  VALIDACIONES,
  getAllData: getAllStoredData,
  getSectionData,
  saveSectionData,
  validarCampo,
  validarTablaCompleta,
  getViaPrincipalFromStorage
};