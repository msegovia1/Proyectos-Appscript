/**
 * MÓDULO DE CERTIFICADOS Y DIPLOMAS SIGC
 * Generación masiva y personalizada de diplomas en PDF a partir de Google Docs/Slides.
 */

const SIGC_CERTIFICADOS = Object.freeze({
  HOJA_CONFIG: 'CONFIG_CERTIFICADOS',
  TAGS_SOPORTADOS: [
    '{{NOMBRE}}', '{{DOCUMENTO}}', '{{RUT}}', '{{ACTIVIDAD}}',
    '{{PROGRAMA}}', '{{AREA}}', '{{FECHA_INICIO}}', '{{FECHA_TERMINO}}',
    '{{HORAS}}', '{{FECHA_EMISION}}', '{{CODIGO_VERIFICACION}}'
  ]
});

/**
 * Prepara la hoja de configuración de certificados si no existe.
 */
function sigcAsegurarHojaCertificados_() {
  const ss = sigcSpreadsheetCentral_();
  let hoja = ss.getSheetByName(SIGC_CONFIG.HOJAS.CERTIFICADOS || 'CONFIG_CERTIFICADOS');
  if (!hoja) {
    hoja = ss.insertSheet(SIGC_CONFIG.HOJAS.CERTIFICADOS || 'CONFIG_CERTIFICADOS');
    const encabezados = [
      'ID_ACTIVIDAD', 'TEMPLATE_DOC_ID', 'DRIVE_FOLDER_ID',
      'ASUNTO_CORREO', 'CUERPO_CORREO', 'HORAS_DEFAULT', 'FIRMANTE_NOMBRE', 'FIRMANTE_CARGO'
    ];
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, encabezados.length).setFontWeight('bold').setBackground('#173B57').setFontColor('#FFFFFF');
  }
  return hoja;
}

/**
 * Obtiene la configuración de certificados para una actividad.
 */
function sigcObtenerConfigCertificado(idActividad) {
  try {
    const hoja = sigcAsegurarHojaCertificados_();
    const datos = hoja.getDataRange().getValues();
    if (datos.length < 2) return null;
    const encabezados = datos[0].map(sigcNormalizarEncabezado);
    const idxActividad = encabezados.indexOf('ID_ACTIVIDAD');
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][idxActividad]).trim() === String(idActividad).trim()) {
        const config = {};
        encabezados.forEach(function(h, idx) {
          config[h] = datos[i][idx];
        });
        return config;
      }
    }
  } catch (e) {
    console.error('Error al obtener config de certificados: ' + e.message);
  }
  return null;
}

/**
 * Guarda o actualiza la configuración de certificados para una actividad.
 */
function sigcGuardarConfigCertificado(idActividad, config) {
  const hoja = sigcAsegurarHojaCertificados_();
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0].map(sigcNormalizarEncabezado);
  const idxActividad = encabezados.indexOf('ID_ACTIVIDAD');
  
  let filaEncontrada = -1;
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][idxActividad]).trim() === String(idActividad).trim()) {
      filaEncontrada = i + 1;
      break;
    }
  }
  
  const filaValores = [
    idActividad,
    config.TEMPLATE_DOC_ID || '',
    config.DRIVE_FOLDER_ID || '',
    config.ASUNTO_CORREO || 'Tu certificado de capacitación - Municipalidad de Santiago',
    config.CUERPO_CORREO || 'Estimada/o {{NOMBRE}},\n\nAdjuntamos tu certificado de participación y aprobación en la actividad {{ACTIVIDAD}}.\n\nSaludos cordiales,\nEquipo de Capacitaciones.',
    config.HORAS_DEFAULT || '16',
    config.FIRMANTE_NOMBRE || '',
    config.FIRMANTE_CARGO || ''
  ];
  
  if (filaEncontrada > 0) {
    hoja.getRange(filaEncontrada, 1, 1, filaValores.length).setValues([filaValores]);
  } else {
    hoja.appendRow(filaValores);
  }
  return { ok: true, mensaje: 'Configuración de certificado guardada exitosamente.' };
}

/**
 * Genera certificados en PDF para una lista de participantes seleccionados.
 */
function sigcGenerarCertificadosLote(idActividad, idsParticipantes, configCustom) {
  if (!idActividad) throw new Error('Debe especificar un ID de actividad.');
  if (!idsParticipantes || !idsParticipantes.length) throw new Error('Debe seleccionar al menos un participante.');
  
  const config = configCustom || sigcObtenerConfigCertificado(idActividad);
  if (!config || !config.TEMPLATE_DOC_ID) {
    throw new Error('No hay una plantilla de Google Docs configurada. Por favor proporcione un ID de plantilla.');
  }
  
  const templateId = String(config.TEMPLATE_DOC_ID).trim();
  const folderId = config.DRIVE_FOLDER_ID ? String(config.DRIVE_FOLDER_ID).trim() : null;
  
  const templateFile = DriveApp.getFileById(templateId);
  const targetFolder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  
  const ss = sigcSpreadsheetCentral_();
  const tablaPersonas = webLeerTabla_(ss, SIGC_CONFIG.HOJAS.PERSONAS);
  const tablaActividades = webLeerTabla_(ss, SIGC_CONFIG.HOJAS.ACTIVIDADES);
  const tablaParticipaciones = webLeerTabla_(ss, SIGC_CONFIG.HOJAS.PARTICIPACIONES);
  
  const personasPorId = webIndexar_(tablaPersonas, 'ID_PERSONA');
  const actividad = webIndexar_(tablaActividades, 'ID_ACTIVIDAD')[idActividad] || {};
  const participacionesPorId = webIndexar_(tablaParticipaciones, 'ID_PARTICIPACION');
  
  const resultados = [];
  const fechaHoy = Utilities.formatDate(new Date(), SIGC_CONFIG.ZONA_HORARIA, 'dd/MM/yyyy');
  
  idsParticipantes.forEach(function(idPart) {
    const part = participacionesPorId[idPart];
    if (!part) return;
    const persona = personasPorId[part.ID_PERSONA] || {};
    const nombreCompleto = persona.NOMBRE_COMPLETO || persona.NOMBRES || 'Participante';
    const docIdentidad = persona.NUMERO_DOCUMENTO || persona.RUT || '';
    const codigoVerif = 'CERT-' + idActividad + '-' + (part.ID_PERSONA || idPart);
    
    try {
      // 1. Clonar plantilla
      const copiaDoc = templateFile.makeCopy('Certificado - ' + nombreCompleto, targetFolder);
      const copiaId = copiaDoc.getId();
      const doc = DocumentApp.openById(copiaId);
      const body = doc.getBody();
      
      // 2. Reemplazar variables
      body.replaceText('\\{\\{NOMBRE\\}\\}', nombreCompleto);
      body.replaceText('\\{\\{DOCUMENTO\\}\\}', docIdentidad);
      body.replaceText('\\{\\{RUT\\}\\}', docIdentidad);
      body.replaceText('\\{\\{ACTIVIDAD\\}\\}', actividad.NOMBRE_ACTIVIDAD || '');
      body.replaceText('\\{\\{PROGRAMA\\}\\}', actividad.PROGRAMA || '');
      body.replaceText('\\{\\{AREA\\}\\}', actividad.AREA_TEMATICA || '');
      body.replaceText('\\{\\{FECHA_INICIO\\}\\}', actividad.FECHA_INICIO || '');
      body.replaceText('\\{\\{FECHA_TERMINO\\}\\}', actividad.FECHA_TERMINO || '');
      body.replaceText('\\{\\{HORAS\\}\\}', String(config.HORAS_DEFAULT || actividad.HORAS_TOTALES || '16'));
      body.replaceText('\\{\\{FECHA_EMISION\\}\\}', fechaHoy);
      body.replaceText('\\{\\{CODIGO_VERIFICACION\\}\\}', codigoVerif);
      
      doc.saveAndClose();
      
      // 3. Convertir a PDF
      const pdfBlob = copiaDoc.getAs(MimeType.PDF).setName('Certificado_' + docIdentidad + '_' + (actividad.NOMBRE_ACTIVIDAD || 'Capacitacion') + '.pdf');
      const pdfFile = targetFolder.createFile(pdfBlob);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // 4. Eliminar el documento temporal de Google Docs
      copiaDoc.setTrashed(true);
      
      resultados.push({
        ok: true,
        idParticipacion: idPart,
        nombre: nombreCompleto,
        documento: docIdentidad,
        correo: persona.CORREO || '',
        urlDescarga: pdfFile.getDownloadUrl(),
        urlVisualizacion: pdfFile.getUrl(),
        fileId: pdfFile.getId()
      });
    } catch (err) {
      resultados.push({
        ok: false,
        idParticipacion: idPart,
        nombre: nombreCompleto,
        error: err.message
      });
    }
  });
  
  return {
    ok: true,
    totalProcesados: resultados.length,
    exitosos: resultados.filter(function(r) { return r.ok; }).length,
    resultados: resultados
  };
}

/**
 * Envía por correo electrónico los certificados generados a los participantes.
 */
function sigcEnviarCertificadosEmail(idActividad, certificadosGenerados, plantillaCorreo) {
  if (!certificadosGenerados || !certificadosGenerados.length) {
    throw new Error('No hay certificados para enviar.');
  }
  
  let enviados = 0;
  let errores = 0;
  
  certificadosGenerados.forEach(function(item) {
    if (!item.ok || !item.correo || !item.fileId) return;
    try {
      const pdfFile = DriveApp.getFileById(item.fileId);
      const asunto = (plantillaCorreo.asunto || 'Certificado de Capacitación')
        .replace(/\{\{NOMBRE\}\}/g, item.nombre)
        .replace(/\{\{ACTIVIDAD\}\}/g, plantillaCorreo.actividad || '');
        
      const cuerpo = (plantillaCorreo.cuerpo || 'Adjuntamos su certificado.')
        .replace(/\{\{NOMBRE\}\}/g, item.nombre)
        .replace(/\{\{ACTIVIDAD\}\}/g, plantillaCorreo.actividad || '');
        
      GmailApp.sendEmail(item.correo, asunto, cuerpo, {
        attachments: [pdfFile.getAs(MimeType.PDF)],
        name: 'Sistema de Capacitaciones'
      });
      enviados++;
    } catch (e) {
      console.error('Error enviando correo a ' + item.correo + ': ' + e.message);
      errores++;
    }
  });
  
  return {
    ok: true,
    enviados: enviados,
    errores: errores,
    mensaje: 'Se enviaron ' + enviados + ' correos correctamente (' + errores + ' fallos).'
  };
}
