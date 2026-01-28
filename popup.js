const STORAGE_KEY = 'fichaCatastralData';
const THEME_KEY = 'fichaCatastralTheme';

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

// ==================== VERIFICACIÓN DE LICENCIA ====================

async function checkLicenseBeforeLoad() {
  const mainContainer = document.querySelector('.container');
  
  mainContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 20px;">
      <div style="width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p style="color: #64748b; font-size: 14px;">Verificando licencia...</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  try {
    const result = await LicenseManager.verifyLicense();
    
    if (result.valid) {
      await loadMainContent();
      return true;
    } else {
      showLicenseError(result);
      return false;
    }
  } catch (error) {
    console.error('[Popup] Error verificando licencia:', error);
    showLicenseError({
      message: 'Error al verificar licencia. Por favor intente nuevamente.'
    });
    return false;
  }
}

function showLicenseError(result) {
  const mainContainer = document.querySelector('.container');
  
  let errorMessage = result.message || 'Licencia no válida';
  let additionalInfo = '';
  
  if (result.notFound) {
    additionalInfo = `
      <p style="margin-top: 15px; font-size: 12px; color: #64748b;">
        Licencia no encontrada.<br>
        Por favor contacte al <strong>📱 ${LICENSE_CONFIG.SUPPORT_PHONE}</strong>
      </p>
    `;
  } else if (result.expired) {
    additionalInfo = `
      <p style="margin-top: 10px; font-size: 12px; color: #dc2626;">
        Expiró el: ${LicenseManager.formatExpirationDate(result.expira_en)}
      </p>
      <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
        Para renovar contacte al <strong>📱 ${LICENSE_CONFIG.SUPPORT_PHONE}</strong>
      </p>
    `;
  } else if (result.needsActivation) {
    additionalInfo = `
      <p style="margin-top: 15px; font-size: 12px; color: #64748b;">
        Por favor active su licencia para continuar.
      </p>
    `;
  }
  
  mainContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: 30px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
      <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 10px;">Licencia Requerida</h2>
      <p style="color: #64748b; font-size: 13px;">${errorMessage}</p>
      ${additionalInfo}
      <button id="btn-open-license" style="
        margin-top: 25px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        🔐 Activar Licencia
      </button>
      <a href="https://wa.me/51${LICENSE_CONFIG.SUPPORT_PHONE}" target="_blank" style="
        margin-top: 15px;
        color: #16a34a;
        font-size: 12px;
        text-decoration: none;
      ">
        💬 Contactar soporte vía WhatsApp
      </a>
    </div>
  `;
  
  document.getElementById('btn-open-license').addEventListener('click', () => {
    chrome.tabs.create({ url: 'license.html' });
  });
}

async function loadMainContent() {
  const response = await fetch('popup-content.html');
  const html = await response.text();
  
  const mainContainer = document.querySelector('.container');
  mainContainer.innerHTML = html;
  
  initTheme();
  loadStoredData();
  setupEventListeners();
  
  showLicenseIndicator();
}

async function showLicenseIndicator() {
  const saved = await LicenseManager.getSavedLicenseData();
  if (saved.data && saved.data.expira_en) {
    const days = LicenseManager.getDaysRemaining(saved.data.expira_en);
    const header = document.querySelector('.main-header');
    
    if (header) {
      const indicator = document.createElement('div');
      indicator.className = 'license-indicator';
      indicator.style.cssText = `
        font-size: 9px;
        padding: 3px 8px;
        border-radius: 10px;
        cursor: pointer;
        ${days <= 7 
          ? 'background: #fef2f2; color: #dc2626;' 
          : days <= 30 
            ? 'background: #fef3c7; color: #92400e;' 
            : 'background: #dcfce7; color: #166534;'}
      `;
      indicator.textContent = `📋 ${days} días`;
      indicator.title = `Licencia válida hasta: ${LicenseManager.formatExpirationDate(saved.data.expira_en)}`;
      
      indicator.addEventListener('click', () => {
        chrome.tabs.create({ url: 'license.html' });
      });
      
      header.insertBefore(indicator, header.querySelector('.btn-theme'));
    }
  }
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
  const data = getTableDataFromDOM(tableType);
  await saveSectionData(tableType, data);
  showToast(`"${tableType}" guardado`, 'success');
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
  
  await saveSectionData(tableType, filasConDatos);
  showToast(`Ejecutando ${tableType} (${filasConDatos.length} filas)...`, 'info');
  
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
          showToast('Automatización terminada', 'success');
        }
      });
    }
  });
}

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
    }
    
    else if (action === 'save' && TABLAS_CONFIG[section]) {
      await saveTable(section);
    } else if (action === 'clear' && TABLAS_CONFIG[section]) {
      await clearTable(section);
    } else if (action === 'add-row' && TABLAS_CONFIG[section]) {
      addTableRow(section);
    }
    
    else if (action === 'duplicate') {
      const row = target.closest('tr');
      const tableType = target.closest('table').id.replace('tabla-', '');
      duplicateTableRow(row, tableType);
    } else if (action === 'delete') {
      const row = target.closest('tr');
      const tableType = target.closest('table').id.replace('tabla-', '');
      deleteTableRow(row, tableType);
    }
    
    else if (action === 'execute' && TABLAS_CONFIG[section]) {
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
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
  // Verificar licencia antes de cargar cualquier cosa
  checkLicenseBeforeLoad();
});

// Exportar API
window.FichaCatastralAPI = {
  STORAGE_KEY,
  SECCIONES_CONFIG,
  TABLAS_CONFIG,
  getAllData: getAllStoredData,
  getSectionData,
  saveSectionData
};
