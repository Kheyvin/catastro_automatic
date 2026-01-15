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

    if (hasData) {
        chrome.storage.sync.set({ 'catastroFormData': formData }, () => {
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
    chrome.storage.sync.set({ 'catastroFormData': {} });
});

chrome.storage.sync.get(['catastroFormData'], (result) => {
    if (result.catastroFormData && Object.keys(result.catastroFormData).length > 0) {
        Object.keys(result.catastroFormData).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = result.catastroFormData[fieldId];
            }
        });
    }
});
