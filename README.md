# SIGC - Sistema Integrado de Gestión de Capacitaciones y Emprendimiento
**Versión 3.7.0** • Municipalidad de Santiago

Sistema Web y Backend integral desarrollado sobre **Google Apps Script** y **Google Sheets** para la gestión, seguimiento, evaluación y certificación de capacitaciones, cursos y programas comunitarios.

---

## 🚀 Novedades de la Versión 3.7.0

1. **Arquitectura 100% Modular:**
   - Separación del monolito `Index.html` en vistas independientes (`ViewDashboard`, `ViewPersonas`, `ViewActividades`, etc.), estilos centralizados (`Styles.html`) y controladores (`JsUI`, `JsCertificados`, `JsAsistenciaQR`, `JsApp`).
2. **Emisión Automática de Diplomas y Certificados en PDF:**
   - Generación masiva y personalizada de certificados a partir de plantillas en Google Docs (`{{NOMBRE}}`, `{{RUT}}`, `{{ACTIVIDAD}}`, `{{HORAS}}`, `{{FECHA}}`).
   - Almacenamiento directo en Google Drive y envío automático por correo electrónico a los participantes aprobados.
3. **Control de Asistencia Rápida por Código QR:**
   - Proyección de códigos QR dinámicos por sesión con tiempo de expiración.
   - Escáner en tiempo real con cámara de celular/webcam y registro manual por código de barras o RUT.
4. **Diseño Responsivo y Notificaciones Modernas:**
   - Menú lateral tipo *Drawer* colapsable en dispositivos móviles y tablets.
   - Sistema de notificaciones flotantes (*Toasts*) y modales accesibles.
5. **Configuración Segura y Dinámica:**
   - Soporte para `PropertiesService`: configure el `SPREADSHEET_ID` desde el modal de ajustes de la aplicación web sin exponer IDs en GitHub.
6. **Soporte para Google Clasp:**
   - Archivos `.clasp.json` y `.claspignore` listos para sincronizar desde la terminal.

---

## 📁 Estructura del Proyecto

```text
Proyectos-Appscript/
├── appsscript.json             # Manifiesto y permisos de Apps Script
├── .clasp.json                 # Configuración de Clasp para despliegue
├── .claspignore               # Exclusiones de sincronización
├── package.json               # Atajos de npm para Clasp
├── README.md                  # Documentación del sistema
│
├── Backend (.gs):
│   ├── Config.gs              # Configuración central y PropertiesService
│   ├── Utils.gs               # Normalización de RUTs, nombres y validaciones
│   ├── WebApp.gs              # Endpoints API, doGet y orquestador
│   ├── Codigo.gs              # Menús de Google Sheets y disparadores
│   ├── Certificados.gs        # Generación de PDFs y envío de correos
│   ├── AsistenciaQR.gs        # Gestión de tokens y escaneo QR
│   ├── Importaciones.gs       # Importador universal por lotes
│   ├── ImportadorHistorico.gs # Compatibilidad histórica
│   └── MigracionV3.gs         # Utilidades de migración estructural
│
└── Frontend (.html):
    ├── Index.html             # Shell principal y contenedor
    ├── Styles.html            # CSS moderno y responsive
    ├── ModalConfig.html       # Modal de configuración de planilla
    │
    ├── Vistas (Partials):
    │   ├── ViewDashboard.html      # KPIs y gráficos interactivos
    │   ├── ViewPersonas.html       # Registro consolidado de participantes
    │   ├── ViewActividades.html    # Talleres, cursos y estados
    │   ├── ViewParticipaciones.html# Inscritos y resultados
    │   ├── ViewGestion.html        # Asistencia rápida y nóminas
    │   ├── ViewCertificados.html   # Generador de Diplomas PDF
    │   ├── ViewAsistenciaQR.html   # Escáner y proyección QR
    │   ├── ViewDemanda.html        # Análisis de demanda e intereses
    │   ├── ViewReportes.html       # Reportes y estadísticas
    │   ├── ViewComunicaciones.html # Correos masivos y plantillas
    │   ├── ViewFormularios.html    # Conexión con Google Forms
    │   ├── ViewImportaciones.html  # Importador universal
    │   └── ViewRegistros.html      # Formularios de ingreso rápido
    │
    └── Scripts de Cliente:
        ├── JsUI.html               # Toasts, Modales y Drawer móvil
        ├── JsCertificados.html     # Lógica de emisión de diplomas
        ├── JsAsistenciaQR.html     # Lógica de lectura y generación QR
        └── JsApp.html              # Controlador general y enrutador
```

---

## 🛠️ Instalación y Despliegue

### Opción A: Despliegue con Google Clasp (Recomendada)
1. Instala Clasp si no lo tienes:
   ```bash
   npm install -g @google/clasp
   clasp login
   ```
2. Configura tu `scriptId` en `.clasp.json` (obtenido en la configuración de tu proyecto en script.google.com).
3. Sube los archivos a Google Apps Script:
   ```bash
   clasp push
   ```
4. Abre el proyecto en tu navegador:
   ```bash
   clasp open
   ```

---

### Opción B: Subida mediante Extensión de Navegador o GitHub
1. Si usas la extensión *Google Apps Script GitHub Assistant*, abre tu editor en Apps Script.
2. Selecciona tu repositorio y haz clic en **Pull** para traer todos los archivos `.gs` y `.html`.

---

## ⚙️ Configuración Inicial

1. **Vincular Hoja de Cálculo:**
   - Abre la aplicación Web desplegada.
   - Haz clic en el botón superior **⚙️ Configurar**.
   - Pega el ID de tu Google Sheet y haz clic en **Guardar Cambios**.
2. **Estructurar la Planilla:**
   - En la hoja de cálculo de Google, ve al menú **Sistema Capacitación > 1. Preparar sistema**.
   - Acepta los permisos de Google.

---

## 📄 Licencia
Municipalidad de Santiago • 2026
