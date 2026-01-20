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

// Mapeos para selectores de construcciones
const MAPEO_58 = {
    '0': '00 - NINGUNO',
    '1': '01 - CONCRETO',
    '2': '02 - LADRILLO',
    '3': '03 - ADOBE(QUINCHA MADERA)'
};

const MAPEO_59 = {
    '0': '00 - NINGUNO',
    '1': '01 - MUY BUENO',
    '2': '02 - BUENO',
    '3': '03 - REGULAR',
    '4': '04 - MALO'
};

const MAPEO_60 = {
    '0': '00 - NINGUNO',
    '1': '01 - TERMINADO',
    '2': '02 - EN CONSTRUCCION',
    '3': '03 - INCONCLUSA',
    '4': '04 - EN RUINAS'
};

const MAPEO_LETRAS = {
    '0': '00 - NINGUNO',
    'A': 'A', 'a': 'A',
    'B': 'B', 'b': 'B',
    'C': 'C', 'c': 'C',
    'D': 'D', 'd': 'D',
    'E': 'E', 'e': 'E',
    'F': 'F', 'f': 'F',
    'G': 'G', 'g': 'G',
    'H': 'H', 'h': 'H',
    'I': 'I', 'i': 'I'
};

const MAPEO_69 = {
    '0': '00 - NINGUNO',
    '1': '01 - EN RETIRO MUNICIPAL',
    '2': '02 - EN JARDIN DE AISLAMIENTO',
    '3': '03 - EN VIA PUBLICA',
    '4': '04 - EN LOTE COLINDANTE',
    '5': '05 - ALTURA NO REGLAMENTARIA',
    '6': '06 - EN PARQUE',
    '7': '07 - EN BIEN COMÚN'
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

// Función para seleccionar SECTOR, MANZANA, LOTE con scroll
const selectUbicacionField = async (fieldId, value) => {
    if (!value) return;
    
    console.log(`\n🔄 Seleccionando ${fieldId}: ${value}`);
    
    const selectInput = document.querySelector(`input#${fieldId}`);
    if (!selectInput) {
        console.error(`No se encontró el campo ${fieldId}`);
        return;
    }
    
    const selectContainer = selectInput.closest('.ant-select');
    if (!selectContainer) {
        console.error(`No se encontró el contenedor del select para ${fieldId}`);
        return;
    }
    
    const selector = selectContainer.querySelector('.ant-select-selector');
    if (selector) {
        console.log(`Abriendo dropdown de ${fieldId}...`);
        selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        await sleep(50);
        selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        await sleep(50);
        selector.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await sleep(300);
        
        try {
            const dropdown = await waitForDropdownVisible();
            await sleep(200);
            
            let targetOption = await scrollDropdownToFindOption(dropdown, value);
            
            if (targetOption) {
                console.log(`Opción encontrada: ${value}, haciendo clic...`);
                
                targetOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await sleep(50);
                targetOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                await sleep(50);
                targetOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                await sleep(50);
                targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                
                await sleep(300);
                console.log(`Selección completada: ${fieldId} = ${value}`);
            } else {
                console.error(`No se encontró la opción ${value} en ${fieldId}`);
            }
        } catch (error) {
            console.error(`Error al seleccionar ${fieldId}:`, error);
        }
    }
};

const fillUbicacionCatastral = async () => {
    console.log('\nLlenando Ubicación Catastral...');
    
    chrome.storage.sync.get(['catastroFormData'], async (result) => {
        const data = result.catastroFormData;
        if (!data) return;
        
        // SECTOR
        if (data.sectorValue) {
            await selectUbicacionField('form_item_sector', data.sectorValue);
            await sleep(500);
        }
        
        // MANZANA
        if (data.manzanaValue) {
            await selectUbicacionField('form_item_manzana', data.manzanaValue);
            await sleep(500);
        }
        
        // LOTE
        if (data.loteValue) {
            await selectUbicacionField('form_item_lote', data.loteValue);
            await sleep(500);
        }
        
        console.log('Ubicación Catastral completada');
    });
};

// Función mejorada para seleccionar TIPO PARTIDA REGISTRAL
const selectTipoPartidaRegistral = async () => {
    console.log('\nSeleccionando TIPO PARTIDA REGISTRAL...');
    
    const fieldsets = document.querySelectorAll('fieldset');
    let targetFieldset = null;
    
    for (let fieldset of fieldsets) {
        const legend = fieldset.querySelector('legend');
        if (legend && legend.textContent.includes('[79]') && legend.textContent.includes('TIPO PARTIDA REGISTRAL')) {
            targetFieldset = fieldset;
            break;
        }
    }
    
    if (!targetFieldset) {
        console.error('No se encontró el fieldset de TIPO PARTIDA REGISTRAL');
        return;
    }
    
    const selectContainer = targetFieldset.querySelector('.ant-select');
    if (!selectContainer) {
        console.error('No se encontró el selector en el fieldset');
        return;
    }
    
    const selectedItem = selectContainer.querySelector('.ant-select-selection-item');
    if (selectedItem && selectedItem.textContent.includes('03 - PARTIDA ELECTRONICA')) {
        console.log('ℹEl valor ya está seleccionado');
        return;
    }
    
    const selector = selectContainer.querySelector('.ant-select-selector');
    if (selector) {
        console.log('Abriendo dropdown...');
        selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        await sleep(50);
        selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        await sleep(50);
        selector.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await sleep(300);
        
        try {
            const dropdown = await waitForDropdownVisible();
            await sleep(200);
            
            const options = dropdown.querySelectorAll('.ant-select-item-option');
            const targetOption = Array.from(options).find(opt => {
                const content = opt.querySelector('.ant-select-item-option-content');
                return content && content.textContent.trim() === '03 - PARTIDA ELECTRONICA';
            });
            
            if (targetOption) {
                console.log('Opción encontrada: 03 - PARTIDA ELECTRONICA');
                
                targetOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await sleep(50);
                targetOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                await sleep(50);
                targetOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                await sleep(50);
                targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                
                await sleep(300);
                console.log('Tipo Partida Registral seleccionado');
            } else {
                console.error('No se encontró la opción 03 - PARTIDA ELECTRONICA');
            }
        } catch (error) {
            console.error('Error al seleccionar Tipo Partida:', error);
        }
    }
};

const fillNumeroInscripcion = async (numero) => {
    if (!numero) return;
    
    console.log(`\nLlenando NÚMERO [80]: ${numero}`);
    
    const fieldsets = document.querySelectorAll('fieldset');
    let targetInput = null;
    
    for (let fieldset of fieldsets) {
        const legend = fieldset.querySelector('legend');
        if (legend && legend.textContent.includes('[80]') && legend.textContent.includes('NÚMERO')) {
            targetInput = fieldset.querySelector('input[type="text"]');
            break;
        }
    }
    
    if (targetInput) {
        fastInject(targetInput, numero);
        await sleep(200);
        console.log('Número de inscripción llenado');
    } else {
        console.error('No se encontró el campo NÚMERO [80]');
    }
};

const fillFechaInscripcion = async (fecha) => {
    if (!fecha) return;
    
    console.log(`\n📅 Llenando FECHA INSCRIPCIÓN [83]: ${fecha}`);
    
    const fieldsets = document.querySelectorAll('fieldset');
    let targetInput = null;
    
    for (let fieldset of fieldsets) {
        const legend = fieldset.querySelector('legend');
        if (legend && legend.textContent.includes('[83]') && legend.textContent.includes('FECHA INSCRIPCIÓN PREDIO')) {
            targetInput = fieldset.querySelector('.ant-picker-input input');
            break;
        }
    }
    
    if (targetInput) {
        targetInput.focus();
        await sleep(100);
        targetInput.click();
        await sleep(300);
        
        targetInput.value = '';
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(targetInput, '');
        
        for (let i = 0; i < fecha.length; i++) {
            const char = fecha[i];
            nativeSetter.call(targetInput, targetInput.value + char);
            targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            targetInput.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            targetInput.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            
            await sleep(30);
        }
        
        await sleep(200);
        
        targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        targetInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        targetInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        
        await sleep(200);
        targetInput.blur();
        await sleep(300);
        
        console.log('Fecha de inscripción llenada');
    } else {
        console.error('No se encontró el campo FECHA INSCRIPCIÓN [83]');
    }
};

const fillInscripcionPredio = async () => {
    console.log('\n📋 Llenando Inscripción del Predio Catastral...');
    
    chrome.storage.sync.get(['catastroFormData'], async (result) => {
        const data = result.catastroFormData;
        if (!data) return;
        
        // Seleccionar TIPO PARTIDA REGISTRAL
        await selectTipoPartidaRegistral();
        await sleep(500);
        
        // Llenar NÚMERO [80]
        if (data.inscripcionNumero) {
            await fillNumeroInscripcion(data.inscripcionNumero);
            await sleep(300);
        }
        
        // Llenar FECHA [83]
        if (data.inscripcionFecha) {
            await fillFechaInscripcion(data.inscripcionFecha);
            await sleep(300);
        }
        
        console.log('Inscripción del Predio completada');
    });
};

const observePageSections = () => {
    const checkAndFillSections = () => {
        const sectorInput = document.querySelector('input#form_item_sector');
        if (sectorInput && !sectorInput.dataset.filled) {
            sectorInput.dataset.filled = 'true';
            console.log('Sección de Ubicación Catastral detectada');
            setTimeout(() => fillUbicacionCatastral(), 500);
        }
        
        const allH1 = document.querySelectorAll('h1');
        let inscripcionSection = null;
        
        for (let h1 of allH1) {
            if (h1.textContent.includes('11.- INSCRIPCIÓN DEL PREDIO CATASTRAL')) {
                inscripcionSection = h1;
                break;
            }
        }
        
        if (inscripcionSection) {
            const collapseItem = inscripcionSection.closest('.ant-collapse-item');
            if (collapseItem && collapseItem.classList.contains('ant-collapse-item-active')) {
                const allFieldsets = document.querySelectorAll('fieldset');
                let tipoPartidaFieldset = null;
                
                for (let fieldset of allFieldsets) {
                    const legend = fieldset.querySelector('legend');
                    if (legend && legend.textContent.includes('[79]')) {
                        tipoPartidaFieldset = fieldset;
                        break;
                    }
                }
                
                if (tipoPartidaFieldset && !tipoPartidaFieldset.dataset.filled) {
                    tipoPartidaFieldset.dataset.filled = 'true';
                    console.log('🔍 Sección de Inscripción detectada y activa');
                    setTimeout(() => fillInscripcionPredio(), 500);
                }
            }
        }
    };
    
    checkAndFillSections();
    
    const observer = new MutationObserver(() => {
        checkAndFillSections();
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
};

if (document.readyState === 'complete') {
    observePageSections();
} else {
    window.addEventListener('load', observePageSections);
}

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

    const asientoInputs = findAllInputsByLabel({ label: '[82]', keyword: 'ASIENTO' });
    asientoInputs.forEach(input => {
        if (input && (input.value === "" || input.value === null)) {
            fastInject(input, '00001');
        }
    });

    //setAntSelect('[79]', 'TIPO', '03 - PARTIDA ELECTRONICA');
};

// const setAntSelect = (label, keyword, targetText) => {
//     const fieldsets = document.querySelectorAll('fieldset');
//     const labelClean = cleanText(label);
//     const keywordClean = cleanText(keyword);

//     fieldsets.forEach(fieldset => {
//         const legend = fieldset.querySelector('legend');
//         if (!legend) return;
        
//         const legendTextClean = cleanText(legend.innerText);
//         if (legendTextClean.includes(labelClean) && legendTextClean.includes(keywordClean)) {
//             const selectContainer = fieldset.querySelector('.ant-select');
//             if (!selectContainer) return;

//             const selectedSpan = selectContainer.querySelector('.ant-select-selection-item');
//             if (selectedSpan && selectedSpan.textContent.includes(targetText)) {
//                 return;
//             }

//             const selector = selectContainer.querySelector('.ant-select-selector');
//             if (selector) {
//                 selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
//                 selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
//                 selector.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

//                 setTimeout(() => {
//                     const dropdown = document.querySelector('.rc-virtual-list-holder');
//                     if (dropdown) {
//                         const options = dropdown.querySelectorAll('.ant-select-item-option');
//                         const targetOption = Array.from(options).find(opt => 
//                             opt.textContent.trim() === targetText
//                         );
                        
//                         if (targetOption) {
//                             targetOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
//                             targetOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
//                             targetOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
//                             targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
//                         }
//                     }
//                 }, 300);
//             }
//         }
//     });
// };

const fillAllFields = () => {
    chrome.storage.sync.get(['catastroFormData'], (result) => {
        const data = result.catastroFormData;
        if (!data) return;

        Object.keys(FIELD_MAP).forEach(key => {
            const config = FIELD_MAP[key];
            let value = data[key];
            if (!value) return;

            if (config.isDate) value = formatDate(value);

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
            else if (config.selector) {
                const el = document.querySelector(config.selector);
                fastInject(el, value);
            } 
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

const expandConstruccionesSection = async () => {
    console.log('🔍 Buscando sección de construcciones...');
    
    const collapseHeaders = document.querySelectorAll('.ant-collapse-header');
    
    for (let header of collapseHeaders) {
        const headerText = header.querySelector('.ant-collapse-header-text');
        if (headerText && headerText.textContent.includes('08.- CONSTRUCCIONES')) {
            console.log('Sección de construcciones encontrada');
            
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            
            if (!isExpanded) {
                console.log('Desplegando sección...');
                header.click();
                await sleep(500);
                console.log('Sección desplegada');
            } else {
                console.log('ℹLa sección ya estaba desplegada');
            }
            
            return true;
        }
    }
    
    console.error('No se encontró la sección de construcciones');
    return false;
};

// Nueva función para hacer click en el botón NUEVO de construcciones
const clickNuevoButton = async () => {
    console.log('Buscando botón NUEVO...');
    
    const buttons = document.querySelectorAll('.ant-btn');
    
    for (let button of buttons) {
        if (button.textContent.includes('NUEVO') && button.closest('.ant-table-title')) {
            console.log('Botón NUEVO encontrado, haciendo click...');
            button.click();
            await sleep(800);
            console.log('Modal de construcción debería estar abierto');
            return true;
        }
    }
    
    console.error('No se encontró el botón NUEVO');
    return false;
};

const waitForDropdownVisible = async (timeout = 5000) => {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
            const dropdowns = document.querySelectorAll('.ant-select-dropdown');
            const visibleDropdown = Array.from(dropdowns).find(dropdown => {
                const style = window.getComputedStyle(dropdown);
                return style.display !== 'none';
            });
            
            if (visibleDropdown) {
                clearInterval(checkInterval);
                console.log('Dropdown visible encontrado');
                resolve(visibleDropdown);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Timeout: Dropdown no se hizo visible'));
            }
        }, 50);
    });
};

const scrollDropdownToFindOption = async (dropdown, targetValue, maxScrollAttempts = 10) => {
    const holder = dropdown.querySelector('.rc-virtual-list-holder');
    
    if (!holder) {
        console.error('No se encontró .rc-virtual-list-holder');
        return null;
    }
    
    console.log(`Buscando opción: "${targetValue}"`);
    
    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
        const options = dropdown.querySelectorAll('.ant-select-item-option');
        
        console.log(`Intento ${attempt + 1}: ${options.length} opciones visibles`);
        
        for (let opt of options) {
            const content = opt.querySelector('.ant-select-item-option-content');
            if (content) {
                const optionText = content.textContent.trim();
                if (optionText === targetValue) {
                    console.log(`Opción encontrada: "${targetValue}"`);
                    return opt;
                }
            }
        }
        
        console.log(`Haciendo scroll (intento ${attempt + 1})...`);
        
        const currentScroll = holder.scrollTop;
        const scrollAmount = 50;
        
        holder.scrollTop = currentScroll + scrollAmount;
        
        holder.dispatchEvent(new Event('scroll', { bubbles: true }));
        
        await sleep(150); // Esperar a que se rendericen nuevas opciones

        if (holder.scrollTop === currentScroll) {
            console.log('Llegamos al final del scroll');
            break;
        }
    }
    
    console.error(`No se encontró la opción después de ${maxScrollAttempts} intentos`);
    return null;
};

// Función actualizada para seleccionar en un dropdown de Ant Design con scroll
const selectInAntDropdown = async (value) => {
    try {
        console.log(`\nEsperando dropdown visible para seleccionar: ${value}`);
        
        const dropdown = await waitForDropdownVisible();
        await sleep(200);
        
        let options = dropdown.querySelectorAll('.ant-select-item-option');
        console.log(`Opciones inicialmente visibles: ${options.length}`);
        
        let targetOption = Array.from(options).find(opt => {
            const content = opt.querySelector('.ant-select-item-option-content');
            if (content) {
                return content.textContent.trim() === value;
            }
            return false;
        });
        
        if (!targetOption) {
            console.log('Opción no visible, buscando con scroll...');
            targetOption = await scrollDropdownToFindOption(dropdown, value);
        }
        
        if (targetOption) {
            console.log(`Opción encontrada: ${value}, haciendo clic...`);
            
            if (targetOption.classList.contains('ant-select-item-option-disabled')) {
                console.warn(`⚠️ La opción "${value}" está deshabilitada, saltando...`);
                return false;
            }
            
            targetOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await sleep(50);
            targetOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            await sleep(50);
            targetOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            await sleep(50);
            targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            
            await sleep(100);
            console.log(`Selección completada: ${value}`);
            return true;
        }
        
        console.error(`No se encontró la opción: ${value}`);
        return false;
        
    } catch (error) {
        console.error('Error al seleccionar en dropdown:', error);
        return false;
    }
};

// Test alternativo: Solo si el scroll no funciona ademas aun tiene errores
const selectByTyping = async (selectElement, letter) => {
    console.log(`Intentando seleccionar por teclado: ${letter}`);
    
    const searchInput = selectElement.querySelector('.ant-select-selection-search-input');
    if (!searchInput) {
        console.error('No se encontró input de búsqueda');
        return false;
    }
    
    searchInput.focus();
    await sleep(100);
    
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(searchInput, letter);
    
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: letter, bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keypress', { key: letter, bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: letter, bubbles: true }));
    
    await sleep(200);
    
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    await sleep(100);
    
    return true;
};

const clickSelectAndWait = async (selectElement, value = null) => {
    if (!selectElement) {
        console.error('Elemento selector no encontrado');
        return false;
    }
    
    const selector = selectElement.querySelector('.ant-select-selector');
    if (!selector) {
        console.error('No se encontró .ant-select-selector');
        return false;
    }
    
    console.log('🖱️ Haciendo clic en selector...');
    
    selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await sleep(50);
    selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    await sleep(50);
    selector.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    
    await sleep(100);
    
    if (value && value.length === 1 && value !== '0' && /[A-Ia-i]/.test(value)) {
        console.log('Es una letra, usando método de teclado como respaldo');
    }
    
    return true;
};

// Función mejorada para llenar el modal de construcción con soporte de scroll
const fillConstruccionModal = async (rowData) => {
    console.log('📝 Llenando modal con datos:', rowData);
    
    await waitForElement('.ant-modal-content:not([style*="display: none"])');
    await sleep(200);
    
    const modal = document.querySelector('.ant-modal-content:not([style*="display: none"])');
    if (!modal) {
        console.error('No se encontró el modal abierto');
        return false;
    }
    
    // 56 - N° PISO
    if (rowData.n) {
        const input56 = modal.querySelector('input[type="text"]');
        if (input56) {
            console.log(`Campo 56 (N° PISO): ${rowData.n}`);
            fastInject(input56, rowData.n);
            await sleep(100);
        }
    }
    
    // 57 - MES
    if (rowData.mes) {
        console.log(`\nProcesando MES: ${rowData.mes}`);
        const selects = modal.querySelectorAll('.ant-select');
        const mesSelect = selects[0];
        
        if (mesSelect) {
            await clickSelectAndWait(mesSelect);
            const mesValue = rowData.mes.padStart(2, '0');
            await selectInAntDropdown(mesValue);
        }
    }
    
    // 57 - AÑO
    if (rowData.anio) {
        const anioInput = modal.querySelector('input[type="number"]');
        if (anioInput) {
            console.log(`\nCampo 57 (AÑO): ${rowData.anio}`);
            fastInject(anioInput, rowData.anio);
            await sleep(100);
        }
    }
    
    // 58 - MATERIAL ESTRUCTURAL PREDOMINANTE
    if (rowData.c58 && MAPEO_58[rowData.c58]) {
        console.log(`\nProcesando 58: ${MAPEO_58[rowData.c58]}`);
        const selects = modal.querySelectorAll('.ant-select');
        const select58 = selects[1];
        
        if (select58) {
            await clickSelectAndWait(select58);
            await selectInAntDropdown(MAPEO_58[rowData.c58]);
        }
    }
    
    // 59 - ESTADO CONSERVACIÓN
    if (rowData.c59 && MAPEO_59[rowData.c59]) {
        console.log(`\nProcesando 59: ${MAPEO_59[rowData.c59]}`);
        const selects = modal.querySelectorAll('.ant-select');
        const select59 = selects[2];
        
        if (select59) {
            await clickSelectAndWait(select59);
            await selectInAntDropdown(MAPEO_59[rowData.c59]);
        }
    }
    
    // 60 - ESTADO CONSTRUCCIÓN
    if (rowData.c60 && MAPEO_60[rowData.c60]) {
        console.log(`\nProcesando 60: ${MAPEO_60[rowData.c60]}`);
        const selects = modal.querySelectorAll('.ant-select');
        const select60 = selects[3];
        
        if (select60) {
            await clickSelectAndWait(select60);
            await selectInAntDropdown(MAPEO_60[rowData.c60]);
        }
    }
    
    // 61-67 - CATEGORÍAS (LETRAS) con scroll
    const categoriasFields = ['c61', 'c62', 'c63', 'c64', 'c65', 'c66', 'c67'];
    const categoriasNames = ['61-MUROS', '62-TECHOS', '63-PISOS', '64-PUERTAS', '65-REVEST', '66-BAÑOS', '67-INST.ELEC'];
    const selectsOffset = 4;
    
    for (let i = 0; i < categoriasFields.length; i++) {
        const field = categoriasFields[i];
        const fieldName = categoriasNames[i];
        const value = rowData[field];
        
        if (value && MAPEO_LETRAS[value]) {
            console.log(`\n🔄 Procesando ${fieldName}: "${value}" → "${MAPEO_LETRAS[value]}"`);
            const selects = modal.querySelectorAll('.ant-select');
            const selectField = selects[selectsOffset + i];
            
            if (selectField) {
                await clickSelectAndWait(selectField, value);
                
                const success = await selectInAntDropdown(MAPEO_LETRAS[value]);
                
                if (!success && value !== '0' && /[A-Ia-i]/.test(value)) {
                    console.log(`⚠️ Selección por dropdown falló, intentando por teclado...`);
                    await selectByTyping(selectField, value.toUpperCase());
                }
            }
        }
    }
    
    // 68 - AREA VERIFICADA
    if (rowData.c68) {
        const inputs = modal.querySelectorAll('input[type="number"]');
        const input68 = inputs[inputs.length - 1];
        if (input68) {
            console.log(`\nCampo 68 (AREA VERIFICADA): ${rowData.c68}`);
            fastInject(input68, rowData.c68);
            await sleep(100);
        }
    }
    
    // 69 - UBI. CONSTRUC. ANTI. (opcional)
    if (rowData.c69 && rowData.c69 !== '' && MAPEO_69[rowData.c69]) {
        console.log(`\nProcesando 69: ${MAPEO_69[rowData.c69]}`);
        const selects = modal.querySelectorAll('.ant-select');
        const select69 = selects[selects.length - 1];
        
        if (select69) {
            await clickSelectAndWait(select69);
            await selectInAntDropdown(MAPEO_69[rowData.c69]);
        }
    }
    
    await sleep(300);
    
    console.log('\nGuardando modal...');
    const saveButtons = Array.from(modal.querySelectorAll('.ant-modal-footer button'));
    const saveBtn = saveButtons.find(btn => btn.textContent.includes('Guardar'));
    
    if (saveBtn) {
        saveBtn.click();
        await sleep(800);
        console.log('Modal guardado');
        return true;
    }
    
    console.error('No se encontró el botón Guardar');
    return false;
};

// Función principal para ejecutar construcciones
const executeConstrucciones = async (construccionesData) => {
    console.log('Iniciando proceso de construcciones...');
    console.log('Datos a procesar:', construccionesData);
    
    // Paso 1: Desplegar sección
    const expanded = await expandConstruccionesSection();
    if (!expanded) {
        console.error('No se pudo desplegar la sección de construcciones');
        return;
    }
    
    // Paso 2: Iterar por cada fila
    for (let i = 0; i < construccionesData.length; i++) {
        const rowData = construccionesData[i];
        console.log(`\nProcesando fila ${i + 1}/${construccionesData.length}`);
        
        // Hacer click en NUEVO
        const clicked = await clickNuevoButton();
        if (!clicked) {
            console.error(`No se pudo abrir el modal para la fila ${i + 1}`);
            continue;
        }
        
        // Llenar el modal
        const filled = await fillConstruccionModal(rowData);
        if (!filled) {
            console.error(`Error al llenar el modal para la fila ${i + 1}`);
            continue;
        }
        
        console.log(`Fila ${i + 1} procesada exitosamente`);
    }

    console.log('\nProceso de construcciones completado');
};

// Listener para mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'executeConstrucciones') {
        console.log('Mensaje recibido del popup');
        executeConstrucciones(request.data);
        sendResponse({ success: true });
    }
    return true;
});

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