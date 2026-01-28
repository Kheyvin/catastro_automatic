# 📑 Catastro Automatic - Con Sistema de Licencias

Esta extensión basada en Chromium está diseñada para optimizar y automatizar el llenado de fichas en plataformas de **Registro Catastral** basadas en **React** y **Ant Design**. Incluye un sistema de validación de licencias para control de acceso.

---

## 🔐 Sistema de Licencias

### Características del Sistema

- **Validación Online**: Verifica la licencia contra un servidor API REST
- **Cache Local**: Guarda la licencia válida localmente para evitar consultas innecesarias
- **Verificación Periódica**: Consulta el servidor cada 24 horas para renovar la validación
- **Manejo de Expiración**: Detecta licencias expiradas y muestra mensajes apropiados
- **Soporte Offline**: Funciona con la licencia guardada cuando no hay conexión

---

## 🚀 Características Principales

### 1. Interfaz de Control (Popup)
- **Persistencia**: Los datos se guardan en `chrome.storage.local`
- **Indicador de Licencia**: Muestra días restantes de la licencia activa
- **Gestión de Datos**: Botones para guardar, limpiar, exportar e importar

### 2. Verificación de Licencia
- **Al abrir el popup**: Verifica la licencia antes de mostrar el contenido
- **En content scripts**: Verifica antes de ejecutar cualquier automatización
- **Mensajes claros**: Muestra información sobre el estado de la licencia

### 3. Inyección de Datos
- **Bypass de React**: Usa setters nativos para compatibilidad con React
- **Mapeo Inteligente**: Identifica campos por selectores o etiquetas

---

## 📁 Estructura del Proyecto

```
catastro-extension/
├── manifest.json              # Configuración de la extensión
├── popup.html                 # HTML del popup principal
├── popup.js                   # Lógica del popup con verificación de licencia
├── popup.css                  # Estilos del popup
├── popup-content.html         # Contenido del popup (cargado dinámicamente)
├── license.html               # Página de activación de licencia
├── license-config.js          # Configuración de la API de licencias
├── license-manager.js         # Lógica de gestión de licencias
├── license-ui.js              # UI para la página de licencias
├── content-individual.js      # Script para ficha individual
├── content-cotitularidad.js   # Script para cotitularidad
└── bb.png                     # Ícono de la extensión
```

---

## 🛠 Instalación

1. **Descargar el proyecto**: Asegúrese de tener todos los archivos en una carpeta

2. **Abrir Extensiones**: En Chrome, vaya a `chrome://extensions/`

3. **Modo Desarrollador**: Active el interruptor de **"Modo de desarrollador"**

4. **Cargar carpeta**: Haga clic en **"Cargar descomprimida"** y seleccione la carpeta

---

## 🔄 Flujo de Trabajo

1. **Activación de Licencia**: El usuario ingresa su código de licencia
2. **Verificación**: El sistema valida contra el servidor API
3. **Almacenamiento**: La licencia válida se guarda localmente
4. **Uso Normal**: La extensión funciona normalmente hasta que expire

### Estados de Licencia

| Estado | Comportamiento |
|--------|----------------|
| **Sin licencia** | Muestra pantalla de activación |
| **Licencia válida** | Funciona normalmente |
| **Licencia expirada** | Bloquea funcionalidad, pide renovación |
| **Sin conexión** | Usa licencia guardada localmente |

---

## ⚙️ Especificaciones Técnicas

### Campos Soportados
- `principales`: sector, manzana, lote
- `ubicacion`: código vía, código HU, N° municipal, manzana, lote, sub-lote
- `descripcion`: zonificación, áreas, linderos
- `inscripcion`: número, asiento, fecha
- `final`: observaciones, supervisor, técnico

### Almacenamiento
- `licenseCode`: Código de licencia activo
- `licenseData`: Datos de la licencia (expiración, estado)
- `lastLicenseCheck`: Última verificación online
- `fichaCatastralData`: Datos del formulario

---

## 📞 Soporte

Si tiene problemas con la licencia, contacte al número de soporte configurado:
- **WhatsApp**: [992517309](https://wa.me/51992517309)

---

## 📄 Licencia

MIT License - Copyright (c) 2026 KDA
