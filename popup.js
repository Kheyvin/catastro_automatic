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
    'technicianDate',
    'sectorValue',
    'manzanaValue',
    'loteValue',
    'inscripcionNumero',
    'inscripcionFecha'
];

chrome.storage.sync.get(['catastroFormData', 'construccionesData'], (result) => {
    if (result.catastroFormData && Object.keys(result.catastroFormData).length > 0) {
        Object.keys(result.catastroFormData).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = result.catastroFormData[fieldId];
            }
        });
    }

    if (result.construccionesData && Array.isArray(result.construccionesData)) {
        result.construccionesData.forEach(rowData => {
            addTableRow(rowData);
        });
    }
});

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
        
        if (rowData.n) {
            data.push(rowData);
        }
    }
    
    return data;
}

document.getElementById('addRowBtn').addEventListener('click', () => {
    addTableRow();
});

document.getElementById('deleteRowBtn').addEventListener('click', () => {
    const tbody = document.getElementById('construccionesBody');
    if (tbody.rows.length > 0) {
        tbody.deleteRow(tbody.rows.length - 1);
    }
});

document.getElementById('clearTableBtn').addEventListener('click', () => {
    const tbody = document.getElementById('construccionesBody');
    tbody.innerHTML = '';
});

document.getElementById('executeBtn').addEventListener('click', () => {
    const construccionesData = getTableData();
    
    if (construccionesData.length === 0) {
        alert('No hay datos en la tabla de construcciones para ejecutar.');
        return;
    }
    
    chrome.storage.sync.set({ 'construccionesData': construccionesData }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'executeConstrucciones',
                data: construccionesData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    alert('Error: Carga la Pagina.');
                }
            });
        });
    });
});

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