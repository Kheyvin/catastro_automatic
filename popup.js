const formFields = [
    'codeVia',
    'numberMunicipal',
    'codeHu',
    'numberManzana',
    'numberLote',
    'numberSubLote',
    'observations',
    'supervisorName',
    'supervisorDate',
    'technicianName',
    'technicianDate'
];

// Cargar datos guardados al abrir el popup
chrome.storage.sync.get(['catastroFormData', 'construccionesData'], (result) => {
    // Cargar datos del formulario principal
    if (result.catastroFormData && Object.keys(result.catastroFormData).length > 0) {
        Object.keys(result.catastroFormData).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = result.catastroFormData[fieldId];
            }
        });
    }

    // Cargar datos de construcciones
    if (result.construccionesData && Array.isArray(result.construccionesData)) {
        result.construccionesData.forEach(rowData => {
            addTableRow(rowData);
        });
    }
});

// Función para añadir una fila a la tabla
function addTableRow(data = null) {
    const tbody = document.getElementById('construccionesBody');
    const row = tbody.insertRow();
    
    const columns = ['n', 'mes', 'anio', 'c58', 'c59', 'c60', 'c61', 'c62', 'c63', 'c64', 'c65', 'c66', 'c67', 'c68', 'c69'];
    
    columns.forEach(col => {
        const cell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = `construccion-${col}`;
        
        if (data && data[col]) {
            input.value = data[col];
        }
        
        cell.appendChild(input);
    });
}

// Función para obtener datos de la tabla
function getTableData() {
    const tbody = document.getElementById('construccionesBody');
    const rows = tbody.getElementsByTagName('tr');
    const data = [];
    
    for (let row of rows) {
        const inputs = row.getElementsByTagName('input');
        const rowData = {
            n: inputs[0].value.trim(),
            mes: inputs[1].value.trim(),
            anio: inputs[2].value.trim(),
            c58: inputs[3].value.trim(),
            c59: inputs[4].value.trim(),
            c60: inputs[5].value.trim(),
            c61: inputs[6].value.trim(),
            c62: inputs[7].value.trim(),
            c63: inputs[8].value.trim(),
            c64: inputs[9].value.trim(),
            c65: inputs[10].value.trim(),
            c66: inputs[11].value.trim(),
            c67: inputs[12].value.trim(),
            c68: inputs[13].value.trim(),
            c69: inputs[14].value.trim()
        };
        
        // Solo agregar filas con al menos el campo N lleno
        if (rowData.n) {
            data.push(rowData);
        }
    }
    
    return data;
}

// Botón añadir fila
document.getElementById('addRowBtn').addEventListener('click', () => {
    addTableRow();
});

// Botón borrar última fila
document.getElementById('deleteRowBtn').addEventListener('click', () => {
    const tbody = document.getElementById('construccionesBody');
    if (tbody.rows.length > 0) {
        tbody.deleteRow(tbody.rows.length - 1);
    }
});

// Botón limpiar tabla
document.getElementById('clearTableBtn').addEventListener('click', () => {
    const tbody = document.getElementById('construccionesBody');
    tbody.innerHTML = '';
});

// Botón ejecutar
document.getElementById('executeBtn').addEventListener('click', () => {
    const construccionesData = getTableData();
    
    if (construccionesData.length === 0) {
        alert('No hay datos en la tabla de construcciones para ejecutar.');
        return;
    }
    
    // Guardar y enviar mensaje al content script para ejecutar
    chrome.storage.sync.set({ 'construccionesData': construccionesData }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'executeConstrucciones',
                data: construccionesData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    alert('Error: Asegúrate de estar en la página correcta.');
                } else {
                    alert('Ejecución iniciada. Revisa la consola del navegador para más detalles.');
                }
            });
        });
    });
});

// Botón guardar
document.getElementById('saveBtn').addEventListener('click', () => {
    const formData = {};
    let hasData = false;

    formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            const value = element.value.trim();
            if (value) {
                formData[fieldId] = value;
                hasData = true;
            }
        }
    });

    const construccionesData = getTableData();

    if (hasData || construccionesData.length > 0) {
        chrome.storage.sync.set({ 
            'catastroFormData': formData,
            'construccionesData': construccionesData
        }, () => {
            window.close();
        });
    }
});

// Botón limpiar todo
document.getElementById('clearBtn').addEventListener('click', () => {
    formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });
    
    const tbody = document.getElementById('construccionesBody');
    tbody.innerHTML = '';
    
    chrome.storage.sync.set({ 
        'catastroFormData': {},
        'construccionesData': []
    });
});