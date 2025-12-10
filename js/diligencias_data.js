// js/diligencias_data.js
// Plantillas NEUTRAS: sin nombres, sin país, sin género, sin “cuyos datos…”.

window.DILIGENCIAS_GRUPOS = [
  {
    title: "INICIO / TRASPASO / REMISIÓN",
    colapsado: true,
    items: [
      {
        id: "aceptacion",
        corto: "Aceptación",
        texto: `DILIGENCIA DE ACEPTACIÓN.- Se extiende la presente para hacer constar que siendo las [hora] horas del día [fecha], se hace cargo de las mismas el funcionario del Grupo de Tramitación de Detenidos titular del carné profesional arriba referenciado, para su continuación y demás trámites. CONSTE Y CERTIFICO.`
      },
      {
        id: "traspaso",
        corto: "Traspaso",
        texto: `DILIGENCIA DE TRASPASO.- Se extiende la presente para hacer constar que siendo las [hora] horas del día [fecha] y en este estado las presentes son traspasadas al Turno de Guardia entrante para su continuación y demás trámites. CONSTE Y CERTIFICO.`
      },
      {
        id: "inicial_pl",
        corto: "Diligencia inicial Policía Local",
        texto: `DILIGENCIA INICIAL.- Se extiende la presente siendo las [hora] horas del día [fecha], cuando se personan en estas dependencias los funcionarios actuantes, quienes presentan a la persona detenida e interesan la tramitación de las presentes, quedando constancia de lo actuado en el atestado/acta que se adjunta. CONSTE Y CERTIFICO.`
      },
      {
        id: "remision",
        corto: "Remisión",
        texto: `DILIGENCIA DE REMISIÓN.-`
      }
    ]
  },

  {
    title: "BÁSICAS DETENIDO",
    colapsado: true,
    items: [
      {
        id: "info_derechos",
        corto: "Información de derechos",
        texto: `DILIGENCIA DE INFORMACIÓN DE DERECHOS.- Se extiende la presente para hacer constar que el Sr. Instructor dispone que se informe nuevamente a el/los detenido/s del motivo de su detención y de los derechos que le/s asisten conforme al artículo 520 de la Ley de Enjuiciamiento Criminal, todo lo cual se cumplimenta en acta/s aparte que se adjunta/n a las presentes. CONSTE Y CERTIFICO.`
      },
      {
        id: "cumplimentacion_derechos",
        corto: "Derechos",
        texto: `DILIGENCIA DE CUMPLIMENTACIÓN DE DERECHOS DEL DETENIDO.- Se extiende para hacer constar que, dando cumplimiento a lo manifestado por el/la detenido/a en relación a los derechos que le asisten, se participa que el/la mismo/a:
CONSTE Y CERTIFICO.`
      },
      {
        id: "comunicacion_colegio",
        corto: "Comunicación Colegio Abogados",
        texto: `DILIGENCIA DE COMUNICACIÓN AL COLEGIO DE ABOGADOS.- Se extiende la presente para hacer constar que el Sr. Instructor dispone que se comunique al Ilustre Colegio de Abogados la detención correspondiente. CONSTE Y CERTIFICO.`
      },
      {
        id: "comunicacion_consulado",
        corto: "Consulado",
        texto: `DILIGENCIA DE COMUNICACIÓN AL CONSULADO.- Se extiende la presente para hacer constar que, a tenor de lo actuado y por deseo expreso en sus derechos, esta Instrucción procede a comunicar al Consulado que corresponda la detención de la persona afectada. CONSTE Y CERTIFICO.`
      },
      {
        id: "resena",
        corto: "Reseña",
        texto: `DILIGENCIA DE RESEÑA.- Se extiende la presente para hacer constar que, el Sr. Instructor dispone se proceda a tomar las impresiones dactilares a el/los detenido/s, lo que se efectúa en el formulario establecido al efecto. CONSTE Y CERTIFICO.`
      },
      {
        id: "ingreso_calabozos",
        corto: "Ingreso en calabozos",
        texto: `DILIGENCIA DE INGRESO EN CALABOZOS.- Se extiende la presente para hacer constar que el Sr. Instructor dispone que el/los detenido/s sea/n ingresado/s en los calabozos de estas dependencias a la espera de los trámites oportunos. CONSTE Y CERTIFICO.`
      }
    ]
  },

  {
    title: "DETENIDO - CONTINUACIÓN",
    colapsado: true,
    items: [
      {
        id: "personacion_letrado",
        corto: "Toma de declaración",
        texto: `DILIGENCIA DE TOMA DE DECLARACIÓN.- Se extiende la presente para hacer constar que, una vez personado en estas dependencias policiales el letrado del turno de oficio, perteneciente al Ilustre Colegio de Abogados, esta Instrucción dispone que se proceda a oír en declaración a el/los detenido/s sobre los hechos que motivan las presentes actuaciones, quedando constancia en acta/s que se adjunta/n al cuerpo del atestado. CONSTE Y CERTIFICO.`
      },
      {
        id: "situacion_administrativa",
        corto: "S. Administrativa",
        texto: `DILIGENCIA DE SITUACIÓN ADMINISTRATIVA.- Se extiende la presente para hacer constar que, consultada la Brigada Local de Extranjería y Fronteras, se obtiene como resultado que la persona reseñada se encuentra en España en <mark class="pickHL">situación Irregular</mark>, adjuntándose informe al cuerpo del presente atestado. CONSTE Y CERTIFICO.`
      },
      {
        id: "antecedentes",
        corto: "Antecedentes",
        texto: `DILIGENCIA DE INFORME SOBRE COMPROBACIÓN DE ANTECEDENTES POLICIALES.- Se extiende la presente para hacer constar que, consultados los servicios informáticos de la Dirección General de la Policía, con el fin de comprobar los antecedentes de la persona reseñada, da como resultado que <mark class="pickHL">no le constan</mark> antecedentes por este Cuerpo. CONSTE Y CERTIFICO.`
      },
      {
        id: "puesta_libertad",
        corto: "Puesta en libertad",
        texto: `DILIGENCIA DE PUESTA EN LIBERTAD.- Se extiende la presente para hacer constar que, en relación con los hechos que han motivado la detención de la persona reseñada, y atendiendo a las circunstancias que concurren, el Sr. Instructor dispone que el/la mismo/a sea PUESTO/A EN LIBERTAD, no sin antes ser informado/a de la obligación de presentarse en el Juzgado competente en la fecha y hora señaladas, trámite que se efectúa mediante citación formal cuya copia se adjunta al cuerpo del presente atestado. CONSTE Y CERTIFICO.`
      },
      {
        id: "habeas_corpus",
        corto: "Habeas Corpus",
        texto: `DILIGENCIA DE SOLICITUD DE HABEAS CORPUS.- Se extiende la presente para hacer constar que la persona detenida solicita acogerse al procedimiento de “Habeas Corpus” al considerar que su detención no se ajusta a derecho, por lo que esta Instrucción dispone que se paralicen las presentes actuaciones, se le facilite la cumplimentación del formulario correspondiente y se pongan inmediatamente los hechos en conocimiento del Juzgado de Instrucción en funciones de guardia. CONSTE Y CERTIFICO.`
      }
    ]
  },

  {
    title: "PERJUDICADOS / TESTIGOS",
    colapsado: true,
    items: [
        {
        id: "toma_y_ofrecimiento",
        corto: "Toma y ofrecimiento",
        texto: `DILIGENCIA DE TOMA DE DECLARACIÓN Y OFRECIMIENTO DE ACCIONES.- Se extiende para hacer constar, que encontrándose en estas Dependencias [EL_LA_LLAMADO] [NOMBRE_FILIACION] el Señor Instructor dispone se proceda a su toma de declaración voluntaria en relación a los hechos que motivan las presentes, siendo posteriormente [INFORMADO_A] de los Derechos que le asisten como Perjudicado/a u Ofendido/a, según el artículo 109 y 110 de la Ley de Enjuiciamiento Criminal, en Acta por separado que se adjunta a las presentes.
- Igualmente, se procede a la citación formal para <mark class="pickHL">JRD/JIDL</mark>, fijado para celebrarse el día [fecha del procedimiento] a las [hora del procedimiento] horas en el [juzgado seleccionado], extendiéndose cédula de citación al efecto, cuya copia se adjunta al cuerpo del atestado. CONSTE Y CERTIFICO.`
      }
    ]
  },
  {
    title: "JUICIO RÁPIDO",
    colapsado: true,
    items: [
      {
  id: "senalamiento_jrd",
  corto: "Señalamiento JRD",
  texto: `DILIGENCIA DE SEÑALAMIENTO JRD.- Se extiende la presente para hacer constar que el Sr. Instructor dispone que las presentes se tramiten por el procedimiento de JRD, quedando fijado para celebrarse el día [fecha del procedimiento] a las [hora del procedimiento] horas en el [juzgado seleccionado]. CONSTE Y CERTIFICO.`
},
  {
  id: "citacion_jrd",
  corto: "Citación JRD",
  texto: `DILIGENCIA DE CITACIÓN JRD.- Se extiende la presente para hacer constar que, esta Instrucción procede a citar al/la llamado/a [NOMBRE_FILIACION], al objeto de comparecer el próximo día [fecha del procedimiento], a las [hora del procedimiento] horas, en el [juzgado seleccionado], en calidad de [CONDICION_FILIACION] de los hechos que motivan las presentes. CONSTE Y CERTIFICO.`
},
{
  id: "citacion_tlf_jrd",
  corto: "Citación TLF JRD",
  texto: `DILIGENCIA DE CITACIÓN TELEFÓNICA JRD.- Se extiende la presente para hacer constar que esta Instrucción contacta telefónicamente con [NOMBRE_FILIACION], con el objeto de ser citad@ para asistir a la celebración de J.R.D. en el [juzgado seleccionado], el día [fecha del procedimiento] a las [hora del procedimiento] horas, en calidad de [CONDICION_FILIACION] de los hechos que motivan las presentes. CONSTE Y CERTIFICO.`
},
{
  id: "senalamiento_jidl",
  corto: "Señalamiento JIDL",
  texto: `DILIGENCIA DE SEÑALAMIENTO JIDL.- Se extiende la presente para hacer constar que el Sr. Instructor dispone que las presentes se tramiten por el procedimiento de JIDL, quedando fijado para celebrarse el día [fecha del procedimiento] a las [hora del procedimiento] horas en el [juzgado seleccionado]. CONSTE Y CERTIFICO.`
},
    
{
  id: "citacion_jidl",
  corto: "Citación JIDL",
  texto: `DILIGENCIA DE CITACIÓN JIDL.- Se extiende la presente para hacer constar que, esta Instrucción procede a citar al/la llamado/a [NOMBRE_FILIACION], al objeto de comparecer el próximo día [fecha del procedimiento], a las [hora del procedimiento] horas, en el [juzgado seleccionado], en calidad de [CONDICION_FILIACION] de los hechos que motivan las presentes. CONSTE Y CERTIFICO.`
},

{
  id: "citacion_tlf_jidl",
  corto: "Citación TLF JIDL",
  texto: `DILIGENCIA DE CITACIÓN TELEFÓNICA JIDL.- Se extiende la presente para hacer constar que esta Instrucción contacta telefónicamente con [NOMBRE_FILIACION], con el objeto de ser citad@ para asistir a la celebración de J.I.D.L. en el [juzgado seleccionado], el día [fecha del procedimiento] a las [hora del procedimiento] horas, en calidad de [CONDICION_FILIACION] de los hechos que motivan las presentes. CONSTE Y CERTIFICO.`
}
    ]
  },

  {
    title: "VIOGEN",
    colapsado: true,
    items: [
      {
        id: "personacion_victima",
        corto: "Personación sin denuncia",
        texto: `DILIGENCIA DE PERSONACIÓN, INFORMACIÓN DE DERECHOS Y CITACIÓN (VÍCTIMA).- Se extiende para hacer constar que se persona en estas dependencias la encartada como víctima, la llamada [NOMBRE_FILIACION].
-- Que la misma manifiesta su intención de no interponer denuncia, siendo informada de los derechos que le asisten como víctima conforme a la L.O. 1/2004, así como citada para comparecer en sede judicial el día [fecha del procedimiento] a las [hora del procedimiento] horas en el [juzgado]. CONSTE Y CERTIFICO.`
      },
      {
        id: "vpr",
        corto: "VPR",
        texto: `DILIGENCIA DE VALORACIÓN POLICIAL DE RIESGO (VPR).- Se extiende para hacer constar que esta Instrucción procede a consultar el Sistema de Seguimiento Integral en los casos de Violencia de Género, realizando la Valoración Policial del Riesgo a la Víctima, resultando un Nivel de <mark class="pickHL">NO APRECIADO</mark>. Se adjunta Informe de VPR a las presentes. CONSTE Y CERTIFICO.`
      },
      {
        id: "consultas_anteriores",
        corto: "Consultas previas",
        texto: `DILIGENCIA DE CONSULTA DE DENUNCIAS/HECHOS ANTERIORES.- Se extiende para hacer constar que, el señor Instructor dispone que, se proceda a consultar la Base de Datos Policial SIDENPOL, con el fin de reseñar si existen denuncias anteriores de esta misma índole, en las que figuren la denunciante y/o el denunciado, resultando que <mark class="pickHL">NO LES CONSTAN</mark>  denuncias anteriores. CONSTE Y CERTIFICO.`
      },
      {
        id: "consulta_armas",
        corto: "Consulta armas",
        texto: `DILIGENCIA DE CONSULTA DE ARMAS.- Se extiende la presente para hacer constar que el señor Instructor dispone que sean consultadas las bases de datos de la Dirección General de la Policía para saber si a ambos detenidos en las presentes les constan armas a su nombre, obteniendo como resultado de dicha búsqueda que <mark class="pickHL">NO CONSTAN</mark> armas a nombre del detenido. CONSTE Y CERTIFICO.`
      },
      {
        id: "siraj",
        corto: "SIRAJ",
        texto: `DILIGENCIA DE CONSULTA AL SISTEMA DE REGISTROS ADMINISTRATIVOS DE APOYO A LA ADMINISTRACIÓN DE JUSTICIA (SIRAJ).- Se extiende para hacer constar que, consultada la Base de Datos del Sistema de Registros Administrativos de Apoyo a la Administración de Justicia (SIRAJ), en relación con la DENUNCIANTE y DENUNCIADO, <mark class="pickHL">NO CONSTANDO</mark>  registro alguno. CONSTE Y CERTIFICO.`
      }
    ]
  },

  {
    name: "DROGAS",
    collapsed: true,
    items: [
      {
        id: "valoracion_sustancia",
        corto: "Valoración de sustancia",
        texto: `DILIGENCIA DE VALORACIÓN DE SUSTANCIA.- Se extiende para hacer constar que esta Instrucción dispone se consulte el último Boletín UDYCO por el que se establece el Precio y Purezas Medias de las Drogas en el Mercado Ilícito, a fin de valorar las sustancias intervenidas.CONSTE Y CERTIFICO.`
      },
      {
        id: "entrega_estupefaciente",
        corto: "Entrega estupefaciente",
        texto: `DILIGENCIA DE ENTREGA DE SUSTANCIA ESTUPEFACIENTE AL GRUPO ESPECIALIZADO.- Se extiende la presente para hacer constar que esta Instrucción dispone que la sustancia estupefaciente intervenida en las presentes, sea entregada al Grupo de Estupefacientes perteneciente a la Brigada Local de Policía Judicial de esta comisaría para que ésta sea remitida al Área de Sanidad y consumo de la Subdelegación de Gobierno de Santa Cruz de Tenerife para su estudio cuantitativo y cualitativo, emitiéndose posteriormente informe dirigido al Juzgado de Instrucción competente.
-- Acto que se materializa mediante Acta de Entrega adjuntando copia al cuerpo de las presentes. 
-- La cantidad de dinero intervenida queda custodiada por este Grupo de Tramitación de Detenidos, a la espera de que la Autoridad Judicial asigne cuenta consignataria para el ingreso de la misma.  CONSTE Y CERTIFICO.`
      }
    ]
  },

  {
    title: "ADN",
    colapsado: true,
    items: [
      {
        id: "consentimiento_adn_si",
        corto: "ADN: Positiva",
        texto: `DILIGENCIA CONSENTIMIENTO TOMA DE MUESTRA PERFIL GENÉTICO (ADN).- Se extiende la presente para hacer constar que, durante la diligencia de declaración y en presencia de letrado, esta Instrucción dispuso solicitar consentimiento informado del detenido para la toma de muestras de perfil genético. Que, una vez informado, ACCEDIÓ a dicha toma, lo cual queda reflejado en el correspondiente formulario/acta de toma de muestras biológicas, que se adjunta al cuerpo de las presentes. CONSTE Y CERTIFICO.`
      },
      {
        id: "muestra_indubitada_no",
        corto: "ADN: Negativa",
        texto: `DILIGENCIA DE TOMA DE MUESTRA BIOLÓGICA INDUBITADA DE ADN.- Se extiende para hacer constar que, por parte de esta Instrucción y en presencia de su letrado/a, se solicitó consentimiento a la persona detenida para la recogida de muestras biológicas de carácter indubitado, conforme a la normativa aplicable. Informado de derechos y finalidad, manifestó su negativa y SE NEGÓ A DAR SU CONSENTIMIENTO para la toma de muestras biológicas. CONSTE Y CERTIFICO.`
      },
      {
        id: "toma_forzosa",
        corto: "ADN: Forzosa",
        texto: `DILIGENCIA SOLICITUD DE TOMA FORZOSA DE MUESTRA BIOLÓGICA.- Se extiende la presente para hacer constar que, por parte de esta Instrucción, se solicita la autorización judicial para la extracción forzosa de la muestra biológica de la persona detenida y la finalidad de su inclusión, si procede, en la base de datos policial al tratarse de un delito contemplado en la normativa aplicable. Se adjunta oficio al cuerpo de las presentes. CONSTE Y CERTIFICO.`
      }
    ]
  }
];
