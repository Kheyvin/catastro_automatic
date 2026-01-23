/**
 * ============================================
 * POPUP.JS - Gestor de Ficha Catastral Individual
 * ============================================
 * Gestiona:
 * - Guardar/Limpiar secciones individuales
 * - Tablas tipo Excel (agregar, duplicar, eliminar filas)
 * - Almacenamiento en chrome.storage.local
 * - Exportar/Importar datos en JSON
 * - Modo oscuro/claro
 */

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const STORAGE_KEY = 'fichaCatastralData';
const THEME_KEY = 'fichaCatastralTheme';

// Secciones simples
const SECCIONES_CONFIG = {
  principales: {
    fields: ['principales-sector', 'principales-manzana', 'principales-lote']
  },
  ubicacion: {
    fields: [
      'ubicacion-codigo-via', 'ubicacion-codigo-hu', 'ubicacion-n-municipal',
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

// Tablas tipo Excel
const TABLAS_CONFIG = {
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

// ============================================
// UTILIDADES
// ============================================

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

// ============================================
// MODO OSCURO
// ============================================

function initTheme() {
  chrome.storage.local.get([THEME_KEY], (result) => {
    const isDark = result[THEME_KEY] === 'dark';
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.getElementById('btn-theme').textContent = '☀️';
    }
  });
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('btn-theme');
  btn.textContent = isDark ? '☀️' : '🌙';
  
  chrome.storage.local.set({ [THEME_KEY]: isDark ? 'dark' : 'light' });
  showToast(isDark ? 'Modo oscuro activado' : 'Modo claro activado', 'info');
}

// ============================================
// ALMACENAMIENTO
// ============================================

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

// ============================================
// SECCIONES SIMPLES
// ============================================

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

// ============================================
// TABLAS TIPO EXCEL
// ============================================

function createTableRow(tableType, values = {}) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return null;

  const row = document.createElement('tr');
  const rowId = values.rowId || generateRowId();
  row.setAttribute('data-row-id', rowId);

  config.columns.forEach(colName => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = colName;
    input.value = values[colName] || '';
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
  tbody.innerHTML = '';
  tbody.appendChild(createTableRow(tableType));
}

function addTableRow(tableType) {
  const config = TABLAS_CONFIG[tableType];
  if (!config) return;

  const tbody = document.getElementById(config.tbodyId);
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
  if (tbody.querySelectorAll('tr').length <= 1) {
    showToast('No se puede eliminar la última fila', 'error');
    return;
  }

  row.remove();
  showToast('Fila eliminada', 'info');
}

async function saveTable(tableType) {
  const data = getTableDataFromDOM(tableType);
  await saveSectionData(tableType, data);
  showToast(`"${tableType}" guardado`, 'success');
}

async function clearTable(tableType) {
  clearTableInDOM(tableType);
  await saveSectionData(tableType, []);
  showToast(`"${tableType}" limpiado`, 'info');
}

// ============================================
// EJECUTAR AUTOMATIZACIÓN
// ============================================

async function executeAutomation(tableType) {
  // Primero guardar los datos de la tabla
  const data = getTableDataFromDOM(tableType);
  
  // Filtrar filas que tienen al menos un campo con datos
  const filasConDatos = data.filter(row => {
    const columns = TABLAS_CONFIG[tableType].columns;
    return columns.some(col => row[col] && row[col].trim() !== '');
  });
  
  if (filasConDatos.length === 0) {
    showToast('No hay datos para ejecutar', 'error');
    return;
  }
  
  // Guardar los datos
  await saveSectionData(tableType, filasConDatos);
  showToast(`Ejecutando ${tableType} (${filasConDatos.length} filas)...`, 'info');
  
  // Enviar mensaje al content script para ejecutar la automatización
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'executeSection',
        section: tableType,
        data: filasConDatos
      }, (response) => {
        if (chrome.runtime.lastError) {
          showToast('Error: No se pudo conectar con la página', 'error');
        } else if (response && response.success) {
          showToast('Automatización iniciada', 'success');
        }
      });
    }
  });
}

// ============================================
// ACCIONES GLOBALES
// ============================================

async function saveAll() {
  const allData = {};

  for (const section of Object.keys(SECCIONES_CONFIG)) {
    allData[section] = getSectionValuesFromDOM(section);
  }

  for (const tableType of Object.keys(TABLAS_CONFIG)) {
    allData[tableType] = getTableDataFromDOM(tableType);
  }

  await saveAllData(allData);
  showToast('Todo guardado correctamente', 'success');
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

// ============================================
// CARGA INICIAL
// ============================================

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

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadStoredData();

  // Botón de tema
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);

  // Delegación de eventos para botones
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const action = target.dataset.action;
    const section = target.dataset.section;

    // Secciones simples
    if (action === 'save' && SECCIONES_CONFIG[section]) {
      await saveSection(section);
    } else if (action === 'clear' && SECCIONES_CONFIG[section]) {
      await clearSection(section);
    }
    
    // Tablas
    else if (action === 'save' && TABLAS_CONFIG[section]) {
      await saveTable(section);
    } else if (action === 'clear' && TABLAS_CONFIG[section]) {
      await clearTable(section);
    } else if (action === 'add-row' && TABLAS_CONFIG[section]) {
      addTableRow(section);
    }
    
    // Acciones de fila
    else if (action === 'duplicate') {
      const row = target.closest('tr');
      const tableType = target.closest('table').id.replace('tabla-', '');
      duplicateTableRow(row, tableType);
    } else if (action === 'delete') {
      const row = target.closest('tr');
      const tableType = target.closest('table').id.replace('tabla-', '');
      deleteTableRow(row, tableType);
    }
    
    // Ejecutar automatización
    else if (action === 'execute' && TABLAS_CONFIG[section]) {
      await executeAutomation(section);
    }
  });

  // Botones globales
  document.getElementById('btn-guardar-todo').addEventListener('click', saveAll);
  document.getElementById('btn-limpiar-todo').addEventListener('click', clearAll);
  document.getElementById('btn-exportar').addEventListener('click', exportData);
  
  document.getElementById('btn-importar').addEventListener('click', () => {
    document.getElementById('input-importar').click();
  });
  
  document.getElementById('input-importar').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importData(e.target.files[0]);
      e.target.value = '';
    }
  });
});

// ============================================
// API PÚBLICA PARA CONTENT SCRIPTS
// ============================================

window.FichaCatastralAPI = {
  STORAGE_KEY,
  SECCIONES_CONFIG,
  TABLAS_CONFIG,
  getAllData: getAllStoredData,
  getSectionData,
  saveSectionData
};