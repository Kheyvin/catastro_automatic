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

const cleanText = (text) => text.replace(/[^a-zA-Z0-9ÑñÁÉÍÓÚáéíóú\[\]]/g, '').toUpperCase();

const formatDate = (val) => {
    if (!val) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const findAllInputsByLabel = (config) => {
    const fieldsets = document.querySelectorAll('fieldset');
    const matchedElements = [];
    const labelClean = cleanText(config.label);
    const keywordClean = config.keyword ? cleanText(config.keyword) : '';

    fieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        if (!legend) return;
        const legendTextClean = cleanText(legend.innerText);
        if (legendTextClean.includes(labelClean) && legendTextClean.includes(keywordClean)) {
            const input = fieldset.querySelector('input:not([type="hidden"]), textarea');
            if (input) matchedElements.push(input);
        }
    });
    return matchedElements;
};

const fastInject = (input, value) => {
    if (!input || input.value === value) return;

    input.removeAttribute('readonly');
    input.removeAttribute('disabled');

    const nativeSetter = Object.getOwnPropertyDescriptor(
        input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 
        "value"
    ).set;
    
    if (nativeSetter) {
        nativeSetter.call(input, value);
    } else {
        input.value = value;
    }

    const tracker = input._valueTracker;
    if (tracker) tracker.setValue(""); 

    const events = ['input', 'change', 'blur'];
    events.forEach(name => input.dispatchEvent(new Event(name, { bubbles: true })));
};

const makeSelectsSearchable = () => {
    const selectInputs = document.querySelectorAll('.ant-select-selection-search-input[readonly]');
    
    selectInputs.forEach(input => {
        input.removeAttribute('readonly');
        input.style.opacity = '1';
        input.style.pointerEvents = 'auto';
        const selectContainer = input.closest('.ant-select');
        if (selectContainer) {
            selectContainer.classList.add('ant-select-searchable');
        }
    });
};

const setupTabAsEnter = () => {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                e.preventDefault();
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                activeElement.dispatchEvent(enterEvent);
                const enterPressEvent = new KeyboardEvent('keypress', {
                    key: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                activeElement.dispatchEvent(enterPressEvent);
                
                const enterUpEvent = new KeyboardEvent('keyup', {
                    key: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                activeElement.dispatchEvent(enterUpEvent);
                setTimeout(() => {
                    activeElement.blur();
                    const form = activeElement.closest('form') || document;
                    const focusableElements = form.querySelectorAll(
                        'input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), button:not([disabled])'
                    );
                    const currentIndex = Array.from(focusableElements).indexOf(activeElement);
                    const nextElement = focusableElements[currentIndex + 1];
                    
                    if (nextElement) {
                        nextElement.focus();
                    }
                }, 100);
            }
        }
    }, true);
};

const setCatastralDefaults = () => {
    const idDefaults = {
        '#form_item_codigoedifica': '01',
        '#form_item_codigoentrada': '01',
        '#form_item_codigopiso': '01',
        '#form_item_codigounidad': '001'
    };

    Object.entries(idDefaults).forEach(([selector, value]) => {
        const input = document.querySelector(selector);
        if (input && (input.value === "" || input.value === null)) {
            fastInject(input, value);
        }
    });

    const zonificacionInputs = findAllInputsByLabel({ label: '[44]', keyword: 'ZONIFICACIÓN' });
    zonificacionInputs.forEach(input => {
        if (input && (input.value === "" || input.value === null)) {
            fastInject(input, 'R3');
        }
    });
};

const fillAllFields = () => {
    chrome.storage.sync.get(['catastroFormData'], (result) => {
        const data = result.catastroFormData;
        if (!data) return;

        Object.keys(FIELD_MAP).forEach(key => {
            const config = FIELD_MAP[key];
            let value = data[key];
            if (!value) return;

            if (config.isDate) value = formatDate(value);

            // CASO A: Es un campo de MODAL
            if (config.isModal) {
                const activeModal = document.querySelector('.ant-modal-content:not([style*="display: none"])');
                if (activeModal) {
                    const title = activeModal.querySelector('.ant-modal-title')?.innerText.toUpperCase() || '';
                    if (title.includes(config.modalTitle)) {
                        const input = activeModal.querySelector(config.selector);
                        fastInject(input, value);
                    }
                }
            } 
            // CASO B: Es un selector por ID directo
            else if (config.selector) {
                const el = document.querySelector(config.selector);
                fastInject(el, value);
            } 
            // CASO C: Búsqueda por Label (Lote, Manzana, etc.)
            else {
                const elements = findAllInputsByLabel(config);
                elements.forEach(el => fastInject(el, value));
            }
        });
    });
};

const fillSignatureModal = async (type) => {
    const isSupervisor = type === 'SUPERVISOR';
    const nameField = isSupervisor ? 'supervisorName' : 'technicianName';
    const dateField = isSupervisor ? 'supervisorDate' : 'technicianDate';
    const modalTitle = isSupervisor ? 'SUPERVISOR' : 'TÉCNICO';

    return new Promise((resolve) => {
        chrome.storage.sync.get(['catastroFormData'], async (result) => {
            const data = result.catastroFormData;
            if (!data || !data[nameField]) {
                console.log(`No registraste: ${type} al otro año sera`);
                resolve(false);
                return;
            }

            const name = data[nameField];
            const date = data[dateField] ? formatDate(data[dateField]) : '';

            await waitForElement('.ant-modal-title', modalTitle);
            await sleep(300);

            const searchButton = document.querySelector('.ant-modal-content:not([style*="display: none"]) button[type="button"] .anticon-search');
            if (searchButton) {
                searchButton.closest('button').click();
                await sleep(500);
            }

            await waitForElement('.ant-modal-title', 'LISTADO DEL PERSONAL');
            await sleep(300);

            const searchInput = document.querySelector('.ant-modal-content:not([style*="display: none"]) input#form_item_search');
            if (searchInput) {
                fastInject(searchInput, name);

                await sleep(200);

                const submitBtn = document.querySelector('.ant-modal-content:not([style*="display: none"]) button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();

                    await sleep(800);

                    const totalText = document.querySelector('.ant-modal-content:not([style*="display: none"]) p.text-sm span.text-black');
                    if (totalText && totalText.textContent.trim() === '1') {
                        const selectBtn = document.querySelector('.ant-modal-content:not([style*="display: none"]) .anticon-select');
                        if (selectBtn) {
                            selectBtn.closest('button').click();

                            await sleep(500);
                            await waitForElement('.ant-modal-title', modalTitle);
                            await sleep(300);

                            if (date) {
                                const dateInput = document.querySelector('.ant-modal-content:not([style*="display: none"]) input#form_item_fecharegistro');
                                if (dateInput) {
                                    dateInput.focus();
                                    await sleep(100);
                                    dateInput.click();
                                    await sleep(300);
                                    
                                    dateInput.value = '';
                                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                    nativeSetter.call(dateInput, '');
                                    
                                    for (let i = 0; i < date.length; i++) {
                                        const char = date[i];
                                        nativeSetter.call(dateInput, dateInput.value + char);
                                        dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                                        dateInput.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
                                        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        dateInput.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
                                        
                                        await sleep(30);
                                    }
                                    
                                    const tracker = dateInput._valueTracker;
                                    if (tracker) tracker.setValue('');

                                    await sleep(200);
                                    dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                                    dateInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                                    dateInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                                    await sleep(200);
                                    dateInput.blur();
                                    await sleep(300);
                                }
                            }

                            const saveButtons = Array.from(document.querySelectorAll('.ant-modal-content:not([style*="display: none"]) .ant-modal-footer button'));
                            const saveBtn = saveButtons.find(btn => btn.textContent.includes('Guardar'));
                            if (saveBtn) {
                                saveBtn.click();
                                await sleep(500);
                            }

                            resolve(true);
                            return;
                        }
                    } else {
                        console.log(`Hay ${totalText?.textContent || '0'} registros elige una simio`);
                    }
                }
            }

            resolve(false);
        });
    });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForElement = (selector, textContent = null, timeout = 10000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            const elements = document.querySelectorAll(selector);
            const element = textContent 
                ? Array.from(elements).find(el => el.textContent.includes(textContent))
                : elements[0];
            
            if (element) {
                clearInterval(checkInterval);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error(`Timeout esperando elemento: ${selector}`));
            }
        }, 100);
    });
};

document.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const parentDiv = target.closest('div[class*="flex justify-between"]');
    if (parentDiv) {
        const spanText = parentDiv.querySelector('span')?.textContent || '';
        
        if (spanText.includes('[95]') && spanText.includes('SUPERVISOR')) {
            setTimeout(async () => {
                const success = await fillSignatureModal('SUPERVISOR');
                if (success) {
                    console.log('Firma hecha y elio es pisado');
                } else {
                    console.log('Pipipipipi la firma de supervisor');
                }
            }, 500);
        } else if (spanText.includes('[96]') && spanText.includes('TÉCNICO')) {
            setTimeout(async () => {
                const success = await fillSignatureModal('TECNICO');
                if (success) {
                    console.log('Firma hecha y luis benito es kchudo y kbro');
                } else {
                    console.log('Pipipipipi la firma de técnico');
                }
            }, 500);
        }
    }
});

const runAllAutomations = () => {
    fillAllFields();
    setCatastralDefaults();
    makeSelectsSearchable();
};

let timeout = null;
const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(runAllAutomations, 150);
});

observer.observe(document.body, { childList: true, subtree: true });

setupTabAsEnter();

if (document.readyState === 'complete') {
    runAllAutomations();
} else {
    window.addEventListener('load', runAllAutomations);
}

setInterval(makeSelectsSearchable, 2000);