# 📑 Catastro_automatic

Esta extensión basada en Chromium está diseñada para optimizar y automatizar el llenado de fichas en plataformas de **Registro Catastral** basadas en **React** y **Ant Design**. Combina una interfaz de usuario (Popup) para la gestión de datos y un motor de inyección inteligente en segundo plano.

---

## 🚀 Características Principales

### 1. Interfaz de Control (Popup)
La extensión cuenta con un panel flotante que permite al usuario pre-cargar la información antes de iniciar el proceso de registro:
* **Persistencia:** Los datos se guardan en `chrome.storage.sync`, lo que permite que la información no se pierda al cerrar el navegador o cambiar de pestaña.
* **Gestión de Memoria:** Botón **"Guardar"** para confirmar datos y **"Limpiar"** para vaciar tanto el formulario del popup como la memoria de la extensión.

### 2. Inyección de Datos
* **Bypass de React:** Utiliza setters nativos para asegurar que los cambios se reflejen en el estado interno de React, evitando que los datos se pierdan al guardar la ficha.
* **Mapeo Inteligente:** Identifica campos mediante selectores de ID directos o mediante etiquetas (`<legend>`).

### 3. Valores por Defecto Automáticos (Auto-Set)
Independientemente de lo ingresado en el popup, la extensión establece valores estándar en campos específicos si estos se encuentran vacíos:

| Campo | Referencia | Valor por Defecto |
| :--- | :--- | :--- |
| **Zonificación** | Etiqueta [44] | `R3` |
| **Edifica** | `#form_item_codigoedifica` | `01` |
| **Entrada** | `#form_item_codigoentrada` | `01` |
| **Piso** | `#form_item_codigopiso` | `01` |
| **Unidad** | `#form_item_codigounidad` | `001` |

---

## 🔄 Flujo de Trabajo

1. **Entrada de Datos:** El usuario abre el popup de la extensión e ingresa los datos de la ficha (Vía, Manzana, Lote, Personal, etc.).
2. **Almacenamiento:** Al hacer clic en **"Guardar"**, la información se almacena de forma segura en el navegador.
3. **Detección Dinámica:** El script de contenido detecta la apertura del formulario catastral y empieza a volcar los datos almacenados.
4. **Firma Automática:** Al hacer clic en los botones de edición de Supervisor o Técnico, la extensión busca automáticamente al personal en la base de datos y completa la fecha.

---

## 🛠 Instalación

Siga estos pasos para cargar la extensión:

1. **Descargar el proyecto:** Asegúrese de tener la carpeta con los siguientes archivos:
   - `manifest.json` (Configuración)
   - `content.js` (Lógica de inyección)
   - `popup.html` (Interfaz de usuario)
   - `popup.js` (Lógica del popup)
2. **Abrir Extensiones:** En Chrome, vaya a `chrome://extensions/`.
3. **Modo Desarrollador:** Active el interruptor de **"Modo de desarrollador"**.
4. **Cargar carpeta:** Haga clic en **"Cargar descomprimida"** y seleccione la carpeta del proyecto.

---

## ⚙️ Especificaciones Técnicas

### Campos Soportados en el Popup
La extensión está configurada para gestionar los siguientes identificadores:
* `numberMunicipal`
* `numberManzana`, `numberLote`, `numberSubLote`
* `observations`
* `supervisorName`, `supervisorDate`
* `technicianName`, `technicianDate`

### Campos aun no Soportados en el Popup
* `codeVia`, `codeHu`

### Optimización de UX
* **Tab as Enter:** Mejora la navegación por teclado simulando una confirmación de campo al usar Tabulador.
* **Selects Buscables:** Desbloquea los menús de Ant Design para permitir filtrado rápido mediante teclado.
