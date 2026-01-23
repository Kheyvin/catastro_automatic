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
//Ponganle condon que ya se me acabaron las ideas para la de cotitularidad :v