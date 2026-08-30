/**
 * MÓDULO DE ASISTENCIA RÁPIDA POR CÓDIGO QR - SIGC
 * Generación de tokens para sesiones en tiempo real y registro instantáneo mediante escáner.
 */

const SIGC_QR = Object.freeze({
  HOJA_SESIONES: 'SESIONES_QR',
  DURACION_TOKEN_DEFECTO_MIN: 180 // 3 horas de vigencia por defecto
});

/**
 * Asegura la existencia de la hoja de sesiones QR.
 */
function sigcAsegurarHojaSesionesQR_() {
  const ss = sigcSpreadsheetCentral_();
  let hoja = ss.getSheetByName(SIGC_CONFIG.HOJAS.SESIONES_QR || 'SESIONES_QR');
  if (!hoja) {
    hoja = ss.insertSheet(SIGC_CONFIG.HOJAS.SESIONES_QR || 'SESIONES_QR');
    const encabezados = [
      'TOKEN', 'ID_ACTIVIDAD', 'NUMERO_SESION', 'FECHA_CREACION',
      'FECHA_EXPIRACION', 'ESTADO', 'CREADO_POR'
    ];
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, encabezados.length).setFontWeight('bold').setBackground('#173B57').setFontColor('#FFFFFF');
  }
  return hoja;
}

/**
 * Genera un token único y payload para proyectar el código QR de una sesión.
 */
function sigcGenerarTokenSesionQR(idActividad, numeroSesion, expiraMinutos) {
  if (!idActividad) throw new Error('Debe especificar el ID de la actividad.');
  const sesionNum = Number(numeroSesion) || 1;
  const minutos = Number(expiraMinutos) || SIGC_QR.DURACION_TOKEN_DEFECTO_MIN;
  
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + minutos * 60000);
  
  const token = 'SIGC-QR-' + Utilities.getUuid().slice(0, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
  
  const hoja = sigcAsegurarHojaSesionesQR_();
  hoja.appendRow([
    token,
    idActividad,
    sesionNum,
    Utilities.formatDate(ahora, SIGC_CONFIG.ZONA_HORARIA, 'yyyy-MM-dd HH:mm:ss'),
    Utilities.formatDate(expira, SIGC_CONFIG.ZONA_HORARIA, 'yyyy-MM-dd HH:mm:ss'),
    'ACTIVA',
    Session.getActiveUser().getEmail() || 'Usuario WebApp'
  ]);
  
  return {
    ok: true,
    token: token,
    idActividad: idActividad,
    numeroSesion: sesionNum,
    expira: Utilities.formatDate(expira, SIGC_CONFIG.ZONA_HORARIA, 'HH:mm:ss dd-MM-yyyy')
  };
}

/**
 * Registra la asistencia al escanear el QR o ingresar el documento.
 */
function sigcRegistrarAsistenciaQR(tokenSesion, documentoIdentidad) {
  if (!tokenSesion || !documentoIdentidad) {
    throw new Error('Token de sesión y documento de identidad son obligatorios.');
  }
  
  const ss = sigcSpreadsheetCentral_();
  const hojaSesiones = sigcAsegurarHojaSesionesQR_();
  const datosSesiones = hojaSesiones.getDataRange().getValues();
  if (datosSesiones.length < 2) throw new Error('No hay sesiones QR activas.');
  
  const encSesiones = datosSesiones[0].map(sigcNormalizarEncabezado);
  const idxToken = encSesiones.indexOf('TOKEN');
  const idxActividad = encSesiones.indexOf('ID_ACTIVIDAD');
  const idxSesion = encSesiones.indexOf('NUMERO_SESION');
  const idxExpira = encSesiones.indexOf('FECHA_EXPIRACION');
  const idxEstado = encSesiones.indexOf('ESTADO');
  
  let sesionValida = null;
  for (let i = 1; i < datosSesiones.length; i++) {
    if (datosSesiones[i][idxToken] === tokenSesion) {
      sesionValida = {
        idActividad: datosSesiones[i][idxActividad],
        numeroSesion: datosSesiones[i][idxSesion],
        expira: new Date(datosSesiones[i][idxExpira]),
        estado: datosSesiones[i][idxEstado]
      };
      break;
    }
  }
  
  if (!sesionValida) throw new Error('El código QR ingresado no es válido.');
  if (sesionValida.estado !== 'ACTIVA') throw new Error('Esta sesión de asistencia ya fue cerrada.');
  if (new Date() > sesionValida.expira) throw new Error('El código QR ha expirado.');
  
  // Buscar persona por Documento / RUT
  const personas = webLeerTabla_(ss, SIGC_CONFIG.HOJAS.PERSONAS);
  const docNormalizado = sigcNormalizarRut(documentoIdentidad) || sigcNormalizarTexto(documentoIdentidad);
  
  let personaEncontrada = null;
  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    const pDoc = sigcNormalizarRut(p.RUT || p.NUMERO_DOCUMENTO || '');
    if (pDoc && pDoc === docNormalizado) {
      personaEncontrada = p;
      break;
    }
  }
  
  if (!personaEncontrada) {
    throw new Error('No se encontró a la persona con documento: ' + documentoIdentidad + '. Verifique que esté registrada en el sistema.');
  }
  
  // Registrar asistencia en PARTICIPACIONES / ASISTENCIA_RAPIDA
  const participaciones = webLeerTabla_(ss, SIGC_CONFIG.HOJAS.PARTICIPACIONES);
  let participacion = null;
  for (let i = 0; i < participaciones.length; i++) {
    const part = participaciones[i];
    if (String(part.ID_ACTIVIDAD) === String(sesionValida.idActividad) &&
        String(part.ID_PERSONA) === String(personaEncontrada.ID_PERSONA)) {
      participacion = part;
      break;
    }
  }
  
  if (!participacion) {
    throw new Error('La persona ' + personaEncontrada.NOMBRE_COMPLETO + ' no está inscrita en esta actividad.');
  }
  
  // Actualizar asistencia
  const sesionesActuales = Number(participacion.SESIONES_ASISTIDAS) || 0;
  const nuevasSesiones = Math.max(sesionesActuales, Number(sesionValida.numeroSesion));
  
  webGuardarParticipacion({
    ID_PARTICIPACION: participacion.ID_PARTICIPACION,
    ID_ACTIVIDAD: participacion.ID_ACTIVIDAD,
    ID_PERSONA: participacion.ID_PERSONA,
    SESIONES_ASISTIDAS: nuevasSesiones,
    CONFIRMA_PARTICIPACION: 'Sí',
    ASISTENCIA_SESIONES: 'Sesión ' + sesionValida.numeroSesion + ' registrada por QR (' + Utilities.formatDate(new Date(), SIGC_CONFIG.ZONA_HORARIA, 'dd/MM HH:mm') + ')'
  });
  
  return {
    ok: true,
    mensaje: '¡Asistencia registrada con éxito!',
    persona: personaEncontrada.NOMBRE_COMPLETO,
    documento: docNormalizado,
    actividad: sesionValida.idActividad,
    sesion: sesionValida.numeroSesion,
    sesionesAsistidas: nuevasSesiones
  };
}
