/* ==============================================
   tablero.js — MEDICOPOLIS
   Dados, fichas, propiedades, construcciones,
   estudiantes de enfermería, preguntas ECNT,
   tooltips educativos y lógica de turno.

   Fuentes verificadas: ver referencias APA 7 en
   "MEDICOPOLIS - Referencias.docx"
============================================== */

/* ── CARAS DE DADO (SVG con puntos, sin emojis) ── */
const DIE_PIPS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]],
};
function dieFaceSVG(n) {
  const pips = DIE_PIPS[n] || DIE_PIPS[1];
  const circles = pips.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#2C1506"/>`).join('');
  return `<svg viewBox="0 0 100 100" width="34" height="34"><rect x="4" y="4" width="92" height="92" rx="16" fill="#F4ECDC"/>${circles}</svg>`;
}

/* ══════════════════════════════════════════════
   DATOS EDUCATIVOS Y DE JUEGO POR CASILLA

   type:
   - 'special'  : SALIDA, Tarjeta Salud/Riesgo, UCI, Zona Libre, Seguro
   - 'property' : casilla de enfermedad/factor de riesgo → COMPRABLE,
                  genera renta al dueño, se puede construir por categoría
   - 'wellness' : casilla de conducta protectora → GANAS dinero al caer
                  (no se compra, es un bono de bienestar)
   - 'trivia'   : Pregunta ECNT, responde correctamente para ganar
   - 'build'    : Centro de Construcción
══════════════════════════════════════════════ */
const SQUARE_DATA = {
  0: {
    icon: '🏁', name: 'SALIDA', cat: 'Casilla Especial', type: 'special',
    action: 'earn', amount: '$200',
    edu: 'La prevención primaria en salud es como pasar por SALIDA: cada vuelta es una oportunidad de reforzar hábitos saludables. Las enfermedades no transmisibles (ECNT) son responsables del 74% de las muertes en el mundo (41 millones de personas al año), según la OMS.',
    game: 'Cada vez que pasas o caes en SALIDA, cobras $200 del banco. Es tu ingreso base por cada ronda completa.',
    stat: 'Las ECNT causan 41 millones de muertes al año — el 74% de todas las muertes globales (OMS, 2023).'
  },
  1: {
    icon: '🩺', name: 'Hipertensión Arterial', cat: 'Cardiología · C-1', type: 'property',
    price: 300, rent: 60,
    edu: 'La hipertensión arterial (HTA) se define como PAS ≥140 mmHg y/o PAD ≥90 mmHg. Es el principal factor de riesgo cardiovascular modificable y el factor metabólico al que más muertes se atribuyen a nivel mundial. Actúa dañando silenciosamente vasos sanguíneos, corazón, riñones y retina. El tratamiento incluye IECA, ARA II, calcioantagonistas y diuréticos tiazídicos.',
    game: 'Propiedad de Cardiología. Cómprala por $300 si está libre. Si tiene dueño, pagas renta (más alta si el dueño construyó Consultorio, Clínica u Hospital en el grupo Cardio).',
    stat: 'La presión arterial elevada es el factor de riesgo metabólico al que se atribuye el mayor número de muertes en el mundo (PAHO/WHO, 2024).'
  },
  2: {
    icon: '💚', name: 'Tarjeta Salud', cat: 'Casilla Especial', type: 'special',
    action: 'earn', amount: '$50–$100',
    edu: 'Las conductas protectoras de salud —actividad física, dieta mediterránea, no fumar, control de estrés— reducen el riesgo cardiovascular hasta un 30%. Cada hábito positivo suma en la vida real, igual que esta tarjeta suma dinero en el juego.',
    game: 'Toma la primera tarjeta del mazo Salud y cobra entre $50 y $100. Con algo de suerte, un/a estudiante de enfermería se une a tu equipo (+1 Estudiante).',
    stat: 'La adopción de hábitos saludables reduce significativamente la mortalidad por ECNT (OMS, 2023).'
  },
  3: {
    icon: '🥗', name: 'Alimentación Saludable', cat: 'Nutrición · N-1', type: 'wellness',
    earn: 40,
    edu: 'Una dieta saludable debe incluir: ≥5 porciones diarias de frutas y verduras, granos enteros, proteína magra y grasas insaturadas. La dieta mediterránea reduce en torno a un 30% el riesgo de eventos cardiovasculares mayores (estudio PREDIMED). En enfermería, la valoración nutricional (IMC, perímetro abdominal) es esencial en el ingreso hospitalario.',
    game: 'Casilla de Bienestar: no se compra, simplemente cobras $40 por adoptar este hábito protector cada vez que caes aquí.',
    stat: 'La dieta mediterránea reduce hasta un 30% el riesgo de eventos cardiovasculares mayores (Estruch et al., PREDIMED, NEJM).'
  },
  4: {
    icon: '⚖️', name: 'Obesidad', cat: 'Nutrición · N-2', type: 'property',
    price: 250, rent: 50,
    edu: 'La obesidad se clasifica por IMC: Sobrepeso 25-29.9 kg/m², Obesidad grado I 30-34.9, II 35-39.9, III ≥40. El perímetro abdominal >88 cm en mujeres y >102 cm en hombres indica riesgo cardiometabólico. Comorbilidades: DM2, HTA, dislipidemia, apnea del sueño. Tratamiento: cambio de estilo de vida, farmacológico, bariátrico.',
    game: 'Propiedad de Nutrición. Precio $250. Si el dueño construye en el grupo N, la renta aquí sube considerablemente.',
    stat: 'La obesidad en adultos casi se ha triplicado desde 1975 a nivel mundial (OMS, 2024).'
  },
  5: {
    icon: '❓', name: 'Pregunta ECNT #1', cat: 'Casilla de Pregunta · Prevención General', type: 'trivia',
    edu: 'Las casillas de pregunta ponen a prueba lo aprendido sobre enfermedades crónicas no transmisibles. Responder correctamente refuerza el conocimiento clínico real que usarás como profesional de enfermería.',
    game: 'Responde la pregunta de opción múltiple. Si aciertas, ganas dinero del banco. Si fallas, pagas una penalidad. Si tienes 3+ Estudiantes, puedes pedir ayuda para eliminar 2 opciones incorrectas.',
    stat: '¡Pon a prueba tus conocimientos sobre ECNT!'
  },
  6: {
    icon: '🩸', name: 'Diabetes Tipo 2', cat: 'Diabetes · D-1', type: 'property',
    price: 300, rent: 60,
    edu: 'La DM2 se caracteriza por resistencia a insulina e hiperglucemia crónica. Criterios diagnósticos: glucemia en ayunas ≥126 mg/dL, HbA1c ≥6.5%, o glucemia 2h post-PTOG ≥200 mg/dL. Las complicaciones son micro (retinopatía, nefropatía, neuropatía) y macrovasculares (IAM, ACV). El pilar del tratamiento es el cambio de estilo de vida más metformina.',
    game: 'Primera propiedad de Diabetes. Precio $300. Rentable a largo plazo si construyes en el grupo D.',
    stat: '589 millones de adultos (20-79 años) viven con diabetes en el mundo — 1 de cada 9 (IDF Diabetes Atlas, 11.ª ed., 2024).'
  },
  7: {
    icon: '💔', name: 'Infarto Agudo de Miocardio', cat: 'Cardiología · C-2', type: 'property',
    price: 750, rent: 150,
    edu: 'El IAM ocurre por oclusión de una arteria coronaria, generalmente por rotura de placa ateromatosa. La tríada diagnóstica: dolor precordial típico, cambios en ECG (elevación ST en STEMI) y elevación de troponinas. El protocolo de enfermería incluye: O₂ si SatO₂ <90%, AAS 300mg, monitorización continua, acceso IV y preparación para cateterismo.',
    game: 'Propiedad de alto valor en Cardiología. Precio $750. Muy rentable para el dueño si tiene construcciones.',
    stat: 'Las cardiopatías representan la mayor causa de muerte por ECNT: más de 19 millones de muertes al año (OMS, 2024).'
  },
  8: {
    icon: '⚠️', name: 'Tarjeta Riesgo', cat: 'Casilla Especial', type: 'special',
    action: 'pay', amount: '$50–$100',
    edu: 'Los factores de riesgo cardiovascular modificables incluyen: tabaquismo, HTA, dislipidemia, DM, obesidad, sedentarismo y dieta inadecuada. En enfermería, la educación en modificación de factores de riesgo es una intervención prioritaria.',
    game: 'Toma la primera tarjeta del mazo Riesgo y paga entre $50 y $100. Con 3 T.Riesgo en el mismo turno pierdes un turno adicional; con 5, vas directo a UCI (a menos que tengas 5+ Estudiantes para reducirlo).',
    stat: 'El tabaquismo, la inactividad física, el alcohol y la dieta inadecuada son los principales factores de riesgo conductuales de las ECNT (OMS, 2023).'
  },
  9: {
    icon: '🫁', name: 'EPOC', cat: 'Pulmonar · R-1', type: 'property',
    price: 450, rent: 90,
    edu: 'La Enfermedad Pulmonar Obstructiva Crónica se caracteriza por obstrucción irreversible del flujo aéreo (VEF1/CVF <0.70 post-broncodilatador). El tabaquismo causa más del 70% de los casos en países de altos ingresos. El manejo incluye abandono del tabaco, broncodilatadores, corticoides inhalados en estadios avanzados, rehabilitación pulmonar y oxígeno domiciliario.',
    game: 'Primera propiedad Pulmonar. Precio $450.',
    stat: 'La EPOC es la 3.ª causa de muerte a nivel mundial: 3.4 millones de muertes en 2023 (OMS).'
  },
  10: {
    icon: '🏗', name: 'Centro de Construcción', cat: 'Casilla Especial · Construcción', type: 'build',
    edu: 'La infraestructura sanitaria —consultorios, clínicas y hospitales— es clave para atender a la población con ECNT. Cada nivel de construcción representa mayor capacidad resolutiva y más estudiantes de enfermería en formación práctica.',
    game: 'Al caer aquí se abre el panel de Construcciones con un 15% de descuento por esta vez. Necesitas poseer TODAS las propiedades de una categoría para construir en ella. También puedes construir en cualquier momento de tu turno desde el botón "🏗 Construir" del panel lateral.',
    stat: 'Cada Consultorio, Clínica y Hospital que construyes forma Estudiantes de Enfermería que te dan beneficios durante la partida.'
  },
  11: {
    icon: '😮‍💨', name: 'Control y Manejo del Asma', cat: 'Pulmonar · R-2', type: 'wellness',
    earn: 55,
    edu: 'El asma es una enfermedad inflamatoria crónica de la vía aérea con hiperreactividad bronquial reversible. El tratamiento escalonado (GINA 2024) incluye corticoides inhalados como base del control, con SABA solo de rescate. Cuando el asma está bien controlada, el paciente no presenta síntomas diurnos ni nocturnos y mantiene su función pulmonar.',
    game: 'Casilla de Bienestar: cobras $55 por representar el control adecuado del asma mediante tratamiento inhalado correcto.',
    stat: 'El asma afecta a más de 260 millones de personas en el mundo (GINA, 2024).'
  },
  12: {
    icon: '📊', name: 'Automonitoreo y Control Glucémico', cat: 'Diabetes · D-2', type: 'wellness',
    earn: 45,
    edu: 'El automonitoreo de glucemia capilar y la HbA1c (objetivo <7% en la mayoría de pacientes) permiten ajustar el tratamiento y prevenir complicaciones. La educación en autocontrol es una intervención de enfermería de alto impacto en el manejo de la diabetes.',
    game: 'Casilla de Bienestar: cobras $45 por mantener un buen control metabólico y automonitoreo constante.',
    stat: 'Mantener la HbA1c cerca del objetivo terapéutico reduce significativamente el riesgo de complicaciones microvasculares (ADA, Standards of Care 2024).'
  },
  13: {
    icon: '💚', name: 'Tarjeta Salud', cat: 'Casilla Especial', type: 'special',
    action: 'earn', amount: '$50–$100',
    edu: 'La adherencia terapéutica es un determinante clave del control de las ECNT. Las intervenciones de enfermería para mejorar la adherencia incluyen: educación personalizada, simplificación del régimen y seguimiento.',
    game: 'Segunda Tarjeta Salud del tablero. Cobra $50-$100 y con suerte suma un Estudiante a tu equipo.',
    stat: 'Mejorar la adherencia terapéutica es una de las intervenciones más costo-efectivas en ECNT (OMS).'
  },
  14: {
    icon: '🔬', name: 'Detección Temprana del Cáncer', cat: 'Oncología · O-1', type: 'wellness',
    earn: 110,
    edu: 'La detección temprana del cáncer (cribado/screening) reduce la mortalidad al identificar la enfermedad en estadios tratables. Programas clave: mamografía (mujeres 50-74a), Papanicolaou/VPH, colonoscopia (>50a), PSA y TAC de baja dosis en fumadores. Aproximadamente entre un 30% y un 50% de los cánceres se podrían prevenir o detectar a tiempo evitando factores de riesgo conocidos.',
    game: 'Casilla de Bienestar de alto valor: cobras $110 por practicar la detección temprana.',
    stat: 'El diagnóstico en estadio temprano mejora drásticamente la supervivencia en la mayoría de los cánceres (OMS/IARC, 2024).'
  },
  15: {
    icon: '🛡️', name: 'Seguro Médico', cat: 'Casilla Especial · Beneficio', type: 'special',
    action: 'earn', amount: '$100',
    edu: 'Los sistemas de seguro médico son fundamentales para garantizar el acceso universal a la salud. La cobertura de medicamentos para ECNT reduce la mortalidad en poblaciones vulnerables. En Ecuador, el IESS y el MSP ofrecen cobertura para tratamiento de diabetes, HTA y cáncer.',
    game: 'Casilla especial de beneficio: cobras $100 del banco siempre que caigas aquí. No se puede comprar.',
    stat: 'El acceso a servicios de salud esenciales reduce la mortalidad prematura por ECNT (OMS, Cobertura Universal de Salud).'
  },
  16: {
    icon: '🏃', name: 'Actividad Física y Ejercicio', cat: 'Cardiología · C-3', type: 'wellness',
    earn: 70,
    edu: 'La OMS recomienda ≥150 min/semana de actividad física moderada o ≥75 min de intensa para adultos. El ejercicio aeróbico reduce la presión arterial, mejora el perfil lipídico y la sensibilidad a la insulina. En pacientes post-IAM, la rehabilitación cardíaca con ejercicio reduce significativamente la mortalidad.',
    game: 'Casilla de Bienestar: cobras $70 por cumplir con la actividad física recomendada.',
    stat: 'La inactividad física es uno de los principales factores de riesgo conductuales de mortalidad global (OMS, 2022).'
  },
  17: {
    icon: '🥑', name: 'Dieta Saludable (DASH)', cat: 'Nutrición · N-3', type: 'wellness',
    earn: 65,
    edu: 'La dieta DASH (Dietary Approaches to Stop Hypertension) reduce la presión arterial sistólica de forma clínicamente relevante. Es rica en frutas, verduras, lácteos bajos en grasa y granos integrales; baja en sodio, grasas saturadas y azúcares añadidos.',
    game: 'Casilla de Bienestar: cobras $65 por seguir un patrón alimentario cardiosaludable.',
    stat: 'La dieta DASH reduce la presión arterial sistólica de forma comparable a algunos fármacos antihipertensivos (NIH/NHLBI).'
  },
  18: {
    icon: '⚠️', name: 'Tarjeta Riesgo', cat: 'Casilla Especial', type: 'special',
    action: 'pay', amount: '$50–$100',
    edu: 'El estrés crónico activa el eje hipotalámico-hipofisario-adrenal elevando cortisol, lo que aumenta la PA, la glucemia y la inflamación sistémica. Técnicas de manejo: mindfulness, ejercicio y apoyo psicosocial son intervenciones de enfermería basadas en evidencia.',
    game: 'Segunda Tarjeta Riesgo del tablero. Paga $50-$100. Recuerda: 3 en un turno = pierdes turno; 5 = vas a UCI.',
    stat: 'El estrés crónico se asocia a mayor riesgo cardiovascular (American Heart Association, 2021).'
  },
  19: {
    icon: '💊', name: 'Tratamiento Oncológico', cat: 'Oncología · O-2', type: 'property',
    price: 1500, rent: 300,
    edu: 'El tratamiento del cáncer incluye cirugía, radioterapia, quimioterapia, terapia dirigida e inmunoterapia. El rol de enfermería oncológica incluye: administración segura de citostáticos, manejo de vías centrales, control de efectos adversos y cuidado paliativo.',
    game: 'La propiedad más cara del tablero ($1,500). Su alto costo refleja el precio real del tratamiento oncológico prolongado.',
    stat: 'El cáncer causa alrededor de 10 millones de muertes al año en el mundo (OMS, 2024).'
  },
  20: {
    icon: '🚨', name: 'UCI — Unidad de Cuidados Intensivos', cat: 'Casilla Especial', type: 'special',
    action: 'lose', amount: '2 TURNOS',
    edu: 'La UCI es la unidad de mayor complejidad hospitalaria. Los criterios de ingreso incluyen: fallo multiorgánico, shock séptico, IAM complicado, ACV hemorrágico, cetoacidosis diabética grave. El rol de enfermería en UCI incluye: monitorización continua, manejo de ventilación mecánica y prevención de infecciones asociadas a dispositivos.',
    game: 'La casilla más temida. Pierdes 2 turnos o pagas $150 para salir. Si tienes 5+ Estudiantes, puedes usarlos para reducir tu estadía a solo 1 turno.',
    stat: 'La mortalidad en UCI varía ampliamente según el diagnóstico y la calidad del cuidado brindado (Society of Critical Care Medicine).'
  },
  21: {
    icon: '🥕', name: 'Deficiencia de Micronutrientes', cat: 'Nutrición · N-4', type: 'property',
    price: 225, rent: 45,
    edu: 'Las vitaminas son micronutrientes esenciales. La deficiencia de vitamina D afecta a una proporción muy alta de la población mundial, especialmente en zonas de menor exposición solar y en el adulto mayor. La deficiencia de vitamina B12 causa anemia megaloblástica y neuropatía. En el adulto mayor, la suplementación con calcio+vitamina D reduce el riesgo de fracturas.',
    game: 'Propiedad de Nutrición. Precio $225. Representa el costo de tratar carencias nutricionales no corregidas a tiempo.',
    stat: 'La deficiencia de vitamina D es un problema de salud pública extendido a nivel global (NIH Office of Dietary Supplements, 2024).'
  },
  22: {
    icon: '🧬', name: 'Prevención del Cáncer', cat: 'Oncología · O-3', type: 'wellness',
    earn: 95,
    edu: 'La prevención primaria del cáncer aborda los factores de riesgo modificables: tabaquismo, alcohol, obesidad, infecciones (VPH, H. pylori), radiación UV. Las vacunas contra el VPH previenen la gran mayoría de los cánceres de cérvix relacionados con el virus.',
    game: 'Casilla de Bienestar: cobras $95 por adoptar conductas de prevención oncológica.',
    stat: 'Entre un 30% y un 50% de los casos de cáncer se podrían prevenir evitando factores de riesgo modificables (OMS/IARC).'
  },
  23: {
    icon: '❓', name: 'Pregunta ECNT #2', cat: 'Casilla de Pregunta · Diabetes', type: 'trivia',
    edu: 'Refuerza tus conocimientos sobre la epidemiología de la diabetes, una de las ECNT de mayor crecimiento a nivel mundial.',
    game: 'Responde la pregunta de opción múltiple. Acertar = ganas dinero. Fallar = pagas. Puedes usar Estudiantes para pedir ayuda.',
    stat: '¡Pon a prueba tus conocimientos sobre ECNT!'
  },
  24: {
    icon: '💉', name: 'Insulinoterapia', cat: 'Diabetes · D-3', type: 'property',
    price: 400, rent: 80,
    edu: 'La insulina es la hormona anabólica principal, producida por las células β del páncreas. Tipos: ultrarrápida, rápida, intermedia (NPH) y de acción prolongada. El esquema basal-bolo imita la secreción fisiológica. La hipoglucemia (<70 mg/dL) es la complicación aguda más frecuente; el protocolo de enfermería es la "regla 15-15".',
    game: 'Propiedad de Diabetes de precio medio. $400.',
    stat: 'Una proporción importante de las personas con diabetes tipo 2 requerirá insulina en algún momento de su evolución (ADA, 2024).'
  },
  25: {
    icon: '🫀', name: 'Control de Colesterol y Dieta Cardiosaludable', cat: 'Cardiología · C-4', type: 'wellness',
    earn: 90,
    edu: 'El control lipídico (LDL <100 mg/dL, o <70 mg/dL en muy alto riesgo) mediante dieta baja en grasas saturadas, ejercicio y, si es necesario, estatinas, reduce de forma importante el riesgo de eventos cardiovasculares. Las estatinas reducen la mortalidad cardiovascular y el riesgo de un primer infarto en pacientes de alto riesgo.',
    game: 'Casilla de Bienestar: cobras $90 por mantener tu perfil lipídico bajo control.',
    stat: 'El tratamiento con estatinas reduce sustancialmente el riesgo de un primer infarto en pacientes de alto riesgo (Cholesterol Treatment Trialists\' Collaboration, Lancet).'
  },
  26: {
    icon: '💚', name: 'Tarjeta Salud', cat: 'Casilla Especial', type: 'special',
    action: 'earn', amount: '$50–$100',
    edu: 'La educación terapéutica al paciente con ECNT es una intervención de alta evidencia. Incluye: automanejo, reconocimiento de signos de alarma, uso correcto de inhaladores, automonitorización glucémica y cuidado de los pies en el diabético.',
    game: 'Tercera Tarjeta Salud del tablero. Cobra $50-$100 y posiblemente ganes un Estudiante.',
    stat: 'La educación al paciente reduce las visitas a urgencias y las hospitalizaciones evitables (OMS).'
  },
  27: {
    icon: '🚭', name: 'Cesación del Tabaquismo', cat: 'Pulmonar · R-3', type: 'wellness',
    earn: 85,
    edu: 'Dejar de fumar es la intervención más costo-efectiva para reducir el riesgo de EPOC, cáncer de pulmón y enfermedad cardiovascular. El riesgo cardiovascular disminuye de forma importante al año de abstinencia. La vareniclina y el reemplazo de nicotina son tratamientos de primera línea con buena evidencia de eficacia.',
    game: 'Casilla de Bienestar: cobras $85 por dejar de fumar, una de las decisiones más protectoras que existen.',
    stat: 'El tabaco mata a más de 8 millones de personas al año en el mundo (OMS, 2023).'
  },
  28: {
    icon: '🔭', name: 'Diagnóstico Oncológico', cat: 'Oncología · O-4', type: 'property',
    price: 900, rent: 180,
    edu: 'El diagnóstico definitivo de cáncer requiere confirmación histopatológica mediante biopsia. El estadiaje TNM (Tumor, Nódulos, Metástasis) determina la extensión y el pronóstico. Las técnicas diagnósticas incluyen TAC, PET-TAC, RMN y biopsia líquida.',
    game: 'Propiedad de Oncología. Precio $900.',
    stat: 'El diagnóstico temprano y preciso mejora significativamente el pronóstico oncológico (OMS/IARC, 2024).'
  },
  29: {
    icon: '⚠️', name: 'Tarjeta Riesgo', cat: 'Casilla Especial', type: 'special',
    action: 'pay', amount: '$50–$100',
    edu: 'El consumo de alcohol aumenta el riesgo de cirrosis hepática, cardiomiopatía, pancreatitis crónica y varios tipos de cáncer. No existe un nivel de consumo "seguro" respecto al riesgo de cáncer. El cuestionario AUDIT ayuda a detectar consumo perjudicial.',
    game: 'Tercera Tarjeta Riesgo del tablero. Aplica la misma regla de acumulación.',
    stat: 'El uso nocivo del alcohol contribuye de forma relevante a la carga mundial de enfermedad (OMS, Global Status Report on Alcohol).'
  },
  30: {
    icon: '🛡', name: 'Zona Libre', cat: 'Casilla Especial', type: 'special',
    action: 'free', amount: 'DESCANSAS',
    edu: 'La Zona Libre representa la resiliencia en salud: la capacidad de recuperarse de situaciones adversas. En medicina preventiva equivale a los períodos de remisión o control estable de una ECNT.',
    game: 'Descansas sin pagar nada si caes exactamente aquí.',
    stat: 'La adherencia sostenida al tratamiento es lo que mantiene a un paciente crónico en su propia "zona libre" de complicaciones.'
  },
  31: {
    icon: '🧬', name: 'Prevención de la Resistencia a la Insulina', cat: 'Diabetes · D-4', type: 'wellness',
    earn: 70,
    edu: 'La resistencia a la insulina (RI) es el paso fisiopatológico previo a la DM2. Perder alrededor del 7% del peso corporal mediante dieta y ejercicio reduce marcadamente el riesgo de progresar a diabetes tipo 2 en personas con prediabetes, según el histórico Diabetes Prevention Program.',
    game: 'Casilla de Bienestar: cobras $70 por prevenir activamente la resistencia a la insulina con estilo de vida saludable.',
    stat: 'Una reducción de peso del 7% junto con actividad física redujo en un 58% la incidencia de diabetes tipo 2 en el estudio Diabetes Prevention Program (NEJM, 2002).'
  },
  32: {
    icon: '🍔', name: 'Alimentos Ultraprocesados', cat: 'Nutrición · N-5', type: 'property',
    price: 275, rent: 55,
    edu: 'La clasificación NOVA categoriza los alimentos por grado de procesamiento industrial. Los ultraprocesados contienen aditivos para maximizar palatabilidad y vida útil. Su consumo elevado se asocia a obesidad, DM2, HTA, dislipidemia y síndrome metabólico.',
    game: 'Propiedad de Nutrición. Precio $275.',
    stat: 'Una mayor proporción de ultraprocesados en la dieta se asocia consistentemente con mayor riesgo de obesidad y ECNT (OPS/OMS, 2023).'
  },
  33: {
    icon: '❓', name: 'Pregunta ECNT #3', cat: 'Casilla de Pregunta · Pulmonar', type: 'trivia',
    edu: 'Refuerza tus conocimientos sobre enfermedades respiratorias crónicas y su relación con el tabaquismo.',
    game: 'Responde correctamente para ganar dinero del banco. Si fallas, pagas una penalidad.',
    stat: '¡Pon a prueba tus conocimientos sobre ECNT!'
  },
  34: {
    icon: '🧠', name: 'Accidente Cerebrovascular (ACV)', cat: 'Cardiología · C-5', type: 'property',
    price: 900, rent: 180,
    edu: 'El ACV es la segunda causa de muerte y una de las principales causas de discapacidad en el mundo. Tipos: isquémico (~85%) y hemorrágico (~15%). La escala FAST (Face, Arms, Speech, Time) permite el reconocimiento precoz. En isquémico, la trombólisis IV está indicada dentro de las primeras horas del inicio de síntomas.',
    game: 'Propiedad más cara de Cardiología junto con el Infarto. Precio $900.',
    stat: 'El ACV es una de las principales causas de muerte y discapacidad a nivel mundial (OMS, World Stroke Organization, 2022).'
  },
  35: {
    icon: '💚', name: 'Tarjeta Salud', cat: 'Casilla Especial', type: 'special',
    action: 'earn', amount: '$50–$100',
    edu: 'La actividad física regular modifica favorablemente todos los factores de riesgo cardiovascular. El ejercicio de resistencia mejora la masa muscular y el metabolismo basal, fundamental en el manejo de la obesidad y la diabetes tipo 2.',
    game: 'Cuarta Tarjeta Salud del tablero. Cobra $50-$100 y posiblemente sumes un Estudiante.',
    stat: 'La actividad física regular reduce la mortalidad por cualquier causa (OMS, Guidelines on Physical Activity 2020).'
  },
  36: {
    icon: '🌡️', name: 'Fibrosis Pulmonar Idiopática', cat: 'Pulmonar · R-4', type: 'property',
    price: 900, rent: 180,
    edu: 'La fibrosis pulmonar idiopática (FPI) es una enfermedad progresiva e irreversible del parénquima pulmonar. La TC de alta resolución muestra patrón UIP. Los antifibróticos (pirfenidona, nintedanib) reducen la progresión. El trasplante pulmonar es la única opción curativa.',
    game: 'Propiedad Pulmonar más cara. Precio $900.',
    stat: 'La FPI tiene un pronóstico reservado, con una supervivencia media inferior a la de muchos tipos de cáncer (American Thoracic Society).'
  },
  37: {
    icon: '🧫', name: 'Biología Molecular del Cáncer y Terapias Dirigidas', cat: 'Oncología · O-5', type: 'property',
    price: 900, rent: 180,
    edu: 'El cáncer es una enfermedad genética adquirida. Los oncogenes (RAS, HER2, BRAF) aceleran la proliferación cuando se activan; los genes supresores de tumores (p53, BRCA1/2) la frenan cuando funcionan. Las terapias dirigidas (trastuzumab en HER2+, vemurafenib en BRAF V600E) atacan específicamente estas alteraciones con menor toxicidad que la quimioterapia convencional.',
    game: 'Última propiedad de Oncología. Precio $900. Junto con O-2 y O-4 forman el grupo más caro del tablero.',
    stat: 'Las terapias dirigidas han mejorado sustancialmente la supervivencia en varios cánceres con alteraciones moleculares específicas (National Cancer Institute).'
  },
  38: {
    icon: '⚠️', name: 'Tarjeta Riesgo', cat: 'Casilla Especial', type: 'special',
    action: 'pay', amount: '$50–$100',
    edu: 'La obesidad abdominal o visceral (perímetro >88cm en mujeres, >102cm en hombres) es metabólicamente más peligrosa que la subcutánea. El síndrome metabólico con obesidad central multiplica de forma importante el riesgo cardiovascular.',
    game: 'Cuarta Tarjeta Riesgo del tablero. Mismas reglas de acumulación: cuidado con llegar a 5.',
    stat: 'La obesidad central es un componente clave del síndrome metabólico y del riesgo cardiovascular (IDF Consensus, Federación Internacional de Diabetes).'
  },
  39: {
    icon: '💧', name: 'Hidratación y Función Renal', cat: 'Nutrición · N-6', type: 'wellness',
    earn: 50,
    edu: 'La ingesta adecuada de agua es esencial para la función renal, termorregulación y eliminación de toxinas. La deshidratación crónica es un factor de riesgo para litiasis renal e infección urinaria. La valoración del balance hídrico es una intervención básica de enfermería.',
    game: 'Última casilla antes de volver a SALIDA. Casilla de Bienestar: cobras $50 por mantener una buena hidratación.',
    stat: 'Una ingesta adecuada de líquidos se asocia a menor riesgo de litiasis renal recurrente (National Kidney Foundation).'
  }
};

/* ══════════════════════════════════════════════
   PREGUNTAS ECNT (casillas de trivia)
   Cada pregunta ya fue verificada contra fuentes
   reales (OMS, IDF, GINA). Ver referencias APA 7.
══════════════════════════════════════════════ */
const TRIVIA_QUESTIONS = {
  5: {
    q: '¿Qué porcentaje aproximado de todas las muertes en el mundo es causado por enfermedades crónicas no transmisibles (ECNT), según la OMS?',
    options: ['25%', '50%', '74%', '90%'],
    correct: 2,
    source: 'Organización Mundial de la Salud. (2023). Noncommunicable diseases [Fact sheet].',
    reward: 120, penalty: 60
  },
  23: {
    q: 'Según la Federación Internacional de Diabetes (IDF Diabetes Atlas, 11.ª edición, 2024), ¿cuántos adultos viven con diabetes en el mundo?',
    options: ['150 millones', '350 millones', '589 millones', '1,000 millones'],
    correct: 2,
    source: 'International Diabetes Federation. (2024). IDF Diabetes Atlas (11th ed.).',
    reward: 120, penalty: 60
  },
  33: {
    q: 'Según la OMS, ¿qué porcentaje de los casos de EPOC en países de altos ingresos es atribuible al tabaquismo?',
    options: ['10%', '30%', 'Más del 70%', '100%'],
    correct: 2,
    source: 'World Health Organization. (2025). Chronic obstructive pulmonary disease (COPD) [Fact sheet].',
    reward: 120, penalty: 60
  }
};

/* ══════════════════════════════════════════════
   CLASIFICACIÓN DE CASILLAS (derivada de SQUARE_DATA)
══════════════════════════════════════════════ */
const PROPERTY_SQ = Object.keys(SQUARE_DATA).map(Number).filter(k => SQUARE_DATA[k].type === 'property');
const WELLNESS_SQ = Object.keys(SQUARE_DATA).map(Number).filter(k => SQUARE_DATA[k].type === 'wellness');
const TRIVIA_SQ   = Object.keys(SQUARE_DATA).map(Number).filter(k => SQUARE_DATA[k].type === 'trivia');
const BUILD_SQ    = Object.keys(SQUARE_DATA).map(Number).filter(k => SQUARE_DATA[k].type === 'build');

const SALUD_SQ  = [2, 13, 26, 35];
const RIESGO_SQ = [8, 18, 29, 38];
const EARN_FIXED = { 15: 100 };

/* Grupos de categoría (solo casillas comprables) */
const GROUPS = {
  cardio:   { label: 'Cardiología',  color: '#FF9090', squares: [1, 7, 34] },
  nutri:    { label: 'Nutrición',    color: '#90E898', squares: [4, 21, 32] },
  diabetes: { label: 'Diabetes',     color: '#F8E898', squares: [6, 24] },
  pulmonar: { label: 'Pulmonar',     color: '#A8D8F8', squares: [9, 36] },
  onco:     { label: 'Oncología',    color: '#D8B8F0', squares: [19, 28, 37] },
};
// mapa inverso: casilla → clave de grupo
const GROUP_OF = {};
Object.entries(GROUPS).forEach(([key, g]) => g.squares.forEach(sq => { GROUP_OF[sq] = key; }));

// Costos de construcción por grupo y estudiantes que otorgan
const BUILD_COST = { consultorio: 150, clinica: 400, hospital: 900 };
const BUILD_STUDENTS = { consultorio: 2, clinica: 5, hospital: 12 };
const LEVEL_NAMES = ['—', 'Consultorio 🏢', 'Clínica 🏥', 'Hospital 🏨'];
const LEVEL_MULT  = [1, 2, 3, 5];

/* ══════════════════════════════════════════════
   MAPA DE CASILLAS (centros en SVG 900×900)
══════════════════════════════════════════════ */
const SQUARES = [
  { cx: 843, cy: 843 }, // 0 SALIDA
  { cx: 750, cy: 843 }, { cx: 675, cy: 843 }, { cx: 600, cy: 843 },
  { cx: 525, cy: 843 }, { cx: 450, cy: 843 }, { cx: 375, cy: 843 },
  { cx: 300, cy: 843 }, { cx: 225, cy: 843 }, { cx: 150, cy: 843 },
  { cx: 57,  cy: 843 }, // 10 CONSTRUCCIÓN
  { cx: 57,  cy: 750 }, { cx: 57,  cy: 675 }, { cx: 57,  cy: 600 },
  { cx: 57,  cy: 525 }, { cx: 57,  cy: 450 }, { cx: 57,  cy: 375 },
  { cx: 57,  cy: 300 }, { cx: 57,  cy: 225 }, { cx: 57,  cy: 150 },
  { cx: 57,  cy: 57  }, // 20 UCI
  { cx: 150, cy: 57  }, { cx: 225, cy: 57  }, { cx: 300, cy: 57  },
  { cx: 375, cy: 57  }, { cx: 450, cy: 57  }, { cx: 525, cy: 57  },
  { cx: 600, cy: 57  }, { cx: 675, cy: 57  }, { cx: 750, cy: 57  },
  { cx: 843, cy: 57  }, // 30 ZONA LIBRE
  { cx: 843, cy: 150 }, { cx: 843, cy: 225 }, { cx: 843, cy: 300 },
  { cx: 843, cy: 375 }, { cx: 843, cy: 450 }, { cx: 843, cy: 525 },
  { cx: 843, cy: 600 }, { cx: 843, cy: 675 }, { cx: 843, cy: 750 },
];

const TOTAL = SQUARES.length; // 40

/* ── JUGADORES: soporta de 2 a 6 (elegido en el overlay de inicio) ── */
const MAX_PLAYERS = 6;
let numPlayers = 3; // valor por defecto hasta que se elija en el overlay
const zeros6 = () => [0, 0, 0, 0, 0, 0];

/* ── ESTADO DEL JUEGO ── */
const state = {
  turn:      0,
  positions: zeros6(),
  money:     [1500, 1500, 1500, 1500, 1500, 1500],
  owners:    {},                 // { casilla: playerIdx }
  props:     zeros6(),           // nº de propiedades que posee cada jugador
  students:  zeros6(),           // Estudiantes de Enfermería por jugador
  groupLevel: {                  // nivel de construcción (0-3) por grupo y jugador
    cardio:   zeros6(),
    nutri:    zeros6(),
    diabetes: zeros6(),
    pulmonar: zeros6(),
    onco:     zeros6(),
  },
  tSaludTurn:  zeros6(),
  tRiesgoTurn: zeros6(),   // riesgo ACUMULADO (ya no se reinicia cada turno)
  skipTurns:   zeros6(),   // turnos que perderá el jugador por riesgo acumulado
  rolling:      false,
  uciTurns:    zeros6(),
  bankrupt:    [false, false, false, false, false, false],
  doublesStreak: zeros6(),
  gameOver:    false,
  awaitingInput: false,          // bloquea nextTurn mientras hay un modal abierto
  pendingSq:   null,
  buildDiscount: false,
};

let NAMES   = ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Jugador 5', 'Jugador 6'];
let TOKENS  = [
  'assets/images/players/avatar-1.svg', 'assets/images/players/avatar-2.svg',
  'assets/images/players/avatar-3.svg', 'assets/images/players/avatar-4.svg',
  'assets/images/players/avatar-5.svg', 'assets/images/players/avatar-6.svg',
];
const COLORS  = ['#C0392B', '#1A5276', '#1E8449', '#7D3C98', '#CA6F1E', '#148F77'];
const OFFSETS = [
  { dx: -12, dy:  12 }, { dx:  12, dy: -12 }, { dx:  14, dy:  14 },
  { dx: -12, dy:  -2 }, { dx:  14, dy:  -2 }, { dx:  -18, dy:  -18 },
];

/* ══════════════════════════════════════════════
   INICIO DE PARTIDA — elegir nº de jugadores
══════════════════════════════════════════════ */
function applyPlayerCount(n) {
  numPlayers = n;
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const active = i < n;
    const card = $('p' + i + 'card');
    if (card) card.style.display = active ? '' : 'none';
    const pawn  = $('pawn' + i);
    const pawnT = $('pawn' + i + 't');
    if (pawn)  pawn.style.display  = active ? '' : 'none';
    if (pawnT) pawnT.style.display = active ? '' : 'none';
  }
}

function startGame(n) {
  gameStarted = true;
  applyPlayerCount(n);
  $('setupOverlay').classList.add('hidden');
  loadLoginPlayer();
  initPawns();
  updateTurnUI();
  updateMoneyUI();
  addLog(`🎮 ¡Juego iniciado con ${n} jugadores! Turno: ${NAMES[0]}`);
  addLog(`💡 Pasa el cursor sobre cada casilla para ver información educativa`, 'good');
  addLog(`🏗 Usa el botón "Construir" o cae en el Centro de Construcción para edificar`, 'good');
  saveGameState();
}

function chooseNewGame(n) {
  clearGameState();
  startGame(n);
}

/* ══════════════════════════════════════════════
   PARTIDA GUARDADA (localStorage)
   Permite continuar donde quedaste si recargas o
   cierras el navegador por accidente.
══════════════════════════════════════════════ */
const SAVE_KEY = 'medicopolisSave';
let gameStarted = false; // evita que el auto-guardado pise una partida guardada antes de elegir

function saveGameState() {
  if (!gameStarted) return;
  try {
    const payload = { numPlayers, NAMES, state, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    // localStorage puede fallar en modo privado — el juego sigue funcionando igual
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearGameState() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function resumeGame() {
  const saved = loadGameState();
  if (!saved) return;
  gameStarted = true;

  numPlayers = saved.numPlayers;
  NAMES = saved.NAMES;
  Object.assign(state, saved.state);

  applyPlayerCount(numPlayers);
  $('setupOverlay').classList.add('hidden');
  for (let i = 0; i < numPlayers; i++) {
    const nameEl = document.querySelector(`#p${i}card .player-name`);
    if (nameEl) nameEl.textContent = NAMES[i];
  }
  refreshAllOwnedVisuals();
  initPawns();
  updateTurnUI();
  updateMoneyUI();
  const savedDate = new Date(saved.savedAt || Date.now());
  addLog(`💾 Partida restaurada (guardada ${savedDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}) — Turno: ${NAMES[state.turn]}`, 'good');
  syncUciButton();
}

function startNewGame() {
  clearGameState();
  location.reload();
}

function confirmResetGame() {
  if (confirm('¿Reiniciar la partida? Se perderá todo el progreso actual.')) {
    startNewGame();
  }
}

/* Marca visualmente las propiedades que ya tienen dueño al restaurar una partida */
function refreshAllOwnedVisuals() {
  Object.keys(state.owners).forEach(sq => {
    markSquareOwned(sq, state.owners[sq]);
  });
  for (let i = 0; i < numPlayers; i++) {
    if (state.bankrupt[i]) {
      const card = $('p' + i + 'card');
      if (card) card.classList.add('bankrupt');
    }
  }
}

function markSquareOwned(sq, playerIdx) {
  const g = document.getElementById('sq' + sq);
  if (!g) return;
  const rect = g.querySelector('rect');
  if (!rect) return;
  rect.setAttribute('stroke', COLORS[playerIdx]);
  rect.setAttribute('stroke-width', '4');
  rect.classList.add('owned-square');
}

function unmarkSquareOwned(sq) {
  const g = document.getElementById('sq' + sq);
  if (!g) return;
  const rect = g.querySelector('rect');
  if (!rect) return;
  rect.removeAttribute('stroke');
  rect.removeAttribute('stroke-width');
  rect.classList.remove('owned-square');
}

/* ══════════════════════════════════════════════
   CONEXIÓN CON EL LOGIN
   Si el jugador inició sesión o se registró en
   login.html, tomamos su nombre y ficha elegida
   como Jugador 1.
══════════════════════════════════════════════ */
function loadLoginPlayer() {
  try {
    const raw = localStorage.getItem('medicopolisPlayer');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.name) {
      NAMES[0] = data.name;
      document.querySelector('#p0card .player-name').textContent = data.name;
    }
    // Nota: el token del login (emoji) ya no aplica — el jugador usa el
    // avatar vectorial de su color asignado (ver TOKENS/COLORS).
  } catch (e) {
    // Si no hay datos válidos, seguimos con los valores por defecto
  }
}

/* ── UTILIDADES DOM ── */
function $(id) { return document.getElementById(id); }

function addLog(text, cls = '') {
  const log = $('gameLog');
  const p   = document.createElement('p');
  p.className = 'log-entry ' + cls;
  p.textContent = text;
  log.prepend(p);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

function updateMoneyUI() {
  for (let i = 0; i < numPlayers; i++) {
    $('p' + i + 'money').textContent = '$' + Math.max(0, state.money[i]).toLocaleString();
    $('p' + i + 'props').textContent = `Props: ${state.props[i]} · 🎓 ${state.students[i]}`;
  }
  saveGameState();
}

function updateBuildUI() {
  const p = state.turn;
  $('bConsult0').textContent = groupSummary(p);
  $('tSalud0').textContent   = state.tSaludTurn[p];
  $('tRiesgo0').textContent  = state.tRiesgoTurn[p];
}

function groupSummary(p) {
  return Object.keys(GROUPS).map(k => {
    const lvl = state.groupLevel[k][p];
    return `${GROUPS[k].label.slice(0,3)}:${lvl}`;
  }).join('  ');
}

function updateTurnUI() {
  for (let i = 0; i < numPlayers; i++) {
    const card = $('p' + i + 'card');
    const ind  = $('p' + i + 'turn');
    if (i === state.turn) {
      card.classList.add('active-turn');
      ind.classList.remove('hidden');
    } else {
      card.classList.remove('active-turn');
      ind.classList.add('hidden');
    }
  }
  updateBuildUI();
  syncUciButton();
  saveGameState();
}

/* ── POSICIÓN SVG DE UNA FICHA ── */
function getPawnPos(playerIdx) {
  const sq  = SQUARES[state.positions[playerIdx]];
  const off = OFFSETS[playerIdx];
  return { cx: sq.cx + off.dx, cy: sq.cy + off.dy };
}

/* ── MOVER FICHA EN EL SVG ── */
function movePawnSvg(playerIdx) {
  const pos    = getPawnPos(playerIdx);
  const circle = $('pawn' + playerIdx);
  const icon   = $('pawn' + playerIdx + 't'); // <use> de 19x19, se centra restando 9.5
  circle.classList.remove('pawn-moving');
  icon.classList.remove('pawn-moving');
  void circle.offsetWidth;
  circle.classList.add('pawn-moving');
  icon.classList.add('pawn-moving');
  circle.setAttribute('cx', pos.cx);
  circle.setAttribute('cy', pos.cy);
  icon.setAttribute('x', pos.cx - 9.5);
  icon.setAttribute('y', pos.cy - 9.5);
  setTimeout(() => {
    circle.classList.remove('pawn-moving');
    icon.classList.remove('pawn-moving');
  }, 450);
}

function initPawns() {
  for (let i = 0; i < numPlayers; i++) {
    movePawnSvg(i);
  }
}

function animateDie(elId, finalValue) {
  const el = $(elId);
  let count = 0;
  el.classList.add('rolling');
  const iv = setInterval(() => {
    el.innerHTML = dieFaceSVG(1 + Math.floor(Math.random() * 6));
    count++;
    if (count >= 10) {
      clearInterval(iv);
      el.innerHTML = dieFaceSVG(finalValue);
      el.classList.remove('rolling');
    }
  }, 55);
}

/* ══════════════════════════════════════════════
   PROPIEDADES, RENTA Y ESTUDIANTES
══════════════════════════════════════════════ */
function playerOwnsGroup(playerIdx, groupKey) {
  return GROUPS[groupKey].squares.every(sq => state.owners[sq] === playerIdx);
}

function getGroupMultiplier(ownerIdx, groupKey) {
  const lvl = state.groupLevel[groupKey][ownerIdx];
  return LEVEL_MULT[lvl];
}

// Descuento por Estudiantes de Enfermería: 5% por cada 5 estudiantes, máx 40%
function studentDiscount(playerIdx) {
  return Math.min(40, Math.floor(state.students[playerIdx] / 5) * 5);
}

function addStudents(playerIdx, n) {
  state.students[playerIdx] += n;
  addLog(`🎓 ${NAMES[playerIdx]} suma ${n} Estudiante(s) de Enfermería (total: ${state.students[playerIdx]})`, 'good');
}

/* ── LÓGICA DE CASILLA ── */
function resolveSquare(playerIdx, sq) {
  const p = playerIdx;
  const n = NAMES[p];
  const d = SQUARE_DATA[sq];
  state.awaitingInput = false;

  // Pasar por SALIDA ya se maneja en rollDice

  if (sq === 20) {
    const usedStudents = state.students[p] >= 5;
    if (usedStudents) {
      state.students[p] -= 5;
      state.uciTurns[p] = 1;
      addLog(`🚨 ${n} cae en UCI, pero usa 5 🎓 Estudiantes para reducir su estadía a 1 turno`, 'alert');
    } else {
      state.uciTurns[p] = 2;
      addLog(`🚨 ${n} cae en UCI — pierde 2 turnos o paga $150`, 'alert');
    }
    return;
  }
  if (sq === 30) { addLog(`🛡 ${n} descansa en Zona Libre`, 'good'); return; }

  // Centro de Construcción
  if (BUILD_SQ.includes(sq)) {
    addLog(`🏗 ${n} cae en el Centro de Construcción — ¡construcciones con 15% de descuento!`, 'build');
    state.awaitingInput = true;
    openBuildModal(true);
    return;
  }

  // Pregunta ECNT
  if (TRIVIA_SQ.includes(sq)) {
    addLog(`❓ ${n} cae en una Pregunta ECNT`, 'highlight');
    state.awaitingInput = true;
    openTriviaModal(sq);
    return;
  }

  // Tarjeta Salud
  if (SALUD_SQ.includes(sq)) {
    const bonus = [50, 75, 100][Math.floor(Math.random() * 3)];
    state.money[p] += bonus;
    state.tSaludTurn[p]++;
    addLog(`💚 ${n} saca Tarjeta Salud — cobra $${bonus}`, 'good');
    if (Math.random() < 0.3) addStudents(p, 1);
    if (state.tRiesgoTurn[p] > 0) {
      state.tRiesgoTurn[p]--;
      addLog(`🌿 El hábito saludable de ${n} reduce su riesgo acumulado (ahora: ${state.tRiesgoTurn[p]})`, 'good');
    }
    updateBuildUI();
    updateMoneyUI();
    return;
  }

  // Tarjeta Riesgo
  if (RIESGO_SQ.includes(sq)) {
    const fine = [50, 75, 100][Math.floor(Math.random() * 3)];
    state.money[p] -= fine;
    state.tRiesgoTurn[p]++;
    addLog(`⚠️ ${n} saca Tarjeta Riesgo — paga $${fine} (riesgo acumulado: ${state.tRiesgoTurn[p]})`, 'alert');
    checkRiesgoProgress(p);
    updateMoneyUI();
    checkBankruptcy(p);
    return;
  }

  // Cobro fijo (Seguro)
  if (EARN_FIXED[sq] !== undefined) {
    state.money[p] += EARN_FIXED[sq];
    addLog(`💰 ${n} cae en Seguro Médico — cobra $${EARN_FIXED[sq]}`, 'good');
    updateMoneyUI();
    return;
  }

  // Casilla de Bienestar (gana dinero, no se compra)
  if (WELLNESS_SQ.includes(sq)) {
    const amt = d.earn;
    state.money[p] += amt;
    addLog(`🌿 ${n} cae en ${d.name} — hábito protector: cobra $${amt}`, 'good');
    updateMoneyUI();
    return;
  }

  // Propiedad (enfermedad / factor de riesgo)
  if (PROPERTY_SQ.includes(sq)) {
    const owner = state.owners[sq];

    if (owner === undefined) {
      // Libre: ofrecer compra
      addLog(`🏷 ${n} cae en ${d.name} (libre) — puede comprarla por $${d.price}`, 'highlight');
      state.awaitingInput = true;
      openBuyModal(sq);
      return;
    }

    if (owner === p) {
      addLog(`🏠 ${n} cae en su propia propiedad: ${d.name}. No paga renta.`, '');
      return;
    }

    // Pagar renta al dueño
    const groupKey = GROUP_OF[sq];
    const mult = getGroupMultiplier(owner, groupKey);
    let rent = Math.round(d.rent * mult);
    const disc = studentDiscount(p);
    if (disc > 0) rent = Math.round(rent * (1 - disc / 100));

    state.money[p] -= rent;
    state.money[owner] += rent;
    const multTxt = mult > 1 ? ` (base $${d.rent} ×${mult} por ${LEVEL_NAMES[state.groupLevel[groupKey][owner]]})` : '';
    const discTxt = disc > 0 ? ` [−${disc}% por Estudiantes]` : '';
    addLog(`🏠 ${n} cae en ${d.name} de ${NAMES[owner]} — paga $${rent}${multTxt}${discTxt}`, 'highlight');
    updateMoneyUI();
    checkBankruptcy(p);
    return;
  }

  addLog(`📍 ${n} avanza a casilla ${sq}`);
}

/* ══════════════════════════════════════════════
   MODAL: COMPRAR PROPIEDAD
══════════════════════════════════════════════ */
function openBuyModal(sq) {
  state.pendingSq = sq;
  const d = SQUARE_DATA[sq];
  const p = state.turn;
  $('buyTitle').textContent = `${d.icon} ${d.name}`;
  $('buyCat').textContent   = d.cat;
  $('buyDesc').textContent  = d.edu.length > 220 ? d.edu.slice(0, 220) + '…' : d.edu;
  $('buyPrice').textContent = `$${d.price}`;
  $('buyMoney').textContent = `Tu dinero: $${Math.max(0, state.money[p]).toLocaleString()}`;
  const btn = $('buyConfirmBtn');
  btn.disabled = state.money[p] < d.price;
  $('buyModal').classList.remove('hidden');
}

function confirmBuy() {
  const sq = state.pendingSq;
  const d  = SQUARE_DATA[sq];
  const p  = state.turn;
  if (state.money[p] < d.price) return;
  state.money[p] -= d.price;
  state.owners[sq] = p;
  state.props[p]++;
  markSquareOwned(sq, p);
  addLog(`✅ ${NAMES[p]} compra ${d.name} por $${d.price}`, 'good');
  updateMoneyUI();
  closeBuyModal();
}

function declineBuy() {
  const sq = state.pendingSq;
  addLog(`🚫 ${NAMES[state.turn]} decide no comprar ${SQUARE_DATA[sq].name}. Sigue disponible para el banco.`, '');
  closeBuyModal();
}

function closeBuyModal() {
  $('buyModal').classList.add('hidden');
  state.pendingSq = null;
  state.awaitingInput = false;
  nextTurn();
}

/* ══════════════════════════════════════════════
   MODAL: PREGUNTA ECNT
══════════════════════════════════════════════ */
let triviaAnswered = false;

function openTriviaModal(sq) {
  state.pendingSq = sq;
  triviaAnswered = false;
  const t = TRIVIA_QUESTIONS[sq];
  $('triviaQ').textContent = t.q;
  const optsWrap = $('triviaOpts');
  optsWrap.innerHTML = '';
  t.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'trivia-opt';
    b.textContent = opt;
    b.onclick = () => answerTrivia(i);
    optsWrap.appendChild(b);
  });
  $('triviaResult').textContent = '';
  $('triviaResult').className = 'trivia-result';
  $('triviaHelpBtn').style.display = state.students[state.turn] >= 3 ? 'inline-block' : 'none';
  $('triviaCloseBtn').classList.add('hidden');
  $('triviaModal').classList.remove('hidden');
}

function useStudentHelp() {
  const sq = state.pendingSq;
  const t = TRIVIA_QUESTIONS[sq];
  if (state.students[state.turn] < 3 || triviaAnswered) return;
  state.students[state.turn] -= 3;
  updateMoneyUI();
  const opts = $('triviaOpts').children;
  let hidden = 0;
  for (let i = 0; i < opts.length; i++) {
    if (i !== t.correct && hidden < 2) {
      opts[i].disabled = true;
      opts[i].classList.add('trivia-eliminated');
      hidden++;
    }
  }
  $('triviaHelpBtn').style.display = 'none';
  addLog(`🎓 ${NAMES[state.turn]} usa 3 Estudiantes para pedir ayuda en la pregunta`, '');
}

function answerTrivia(idx) {
  if (triviaAnswered) return;
  triviaAnswered = true;
  const sq = state.pendingSq;
  const t = TRIVIA_QUESTIONS[sq];
  const p = state.turn;
  const opts = $('triviaOpts').children;
  for (let i = 0; i < opts.length; i++) opts[i].disabled = true;
  opts[t.correct].classList.add('trivia-correct');

  const result = $('triviaResult');
  if (idx === t.correct) {
    state.money[p] += t.reward;
    result.textContent = `✅ ¡Correcto! Ganas $${t.reward}. Fuente: ${t.source}`;
    result.className = 'trivia-result good';
    addLog(`❓ ${NAMES[p]} responde correctamente — gana $${t.reward}`, 'good');
  } else {
    opts[idx].classList.add('trivia-wrong');
    state.money[p] -= t.penalty;
    result.textContent = `❌ Incorrecto. Pagas $${t.penalty}. Respuesta correcta: "${t.options[t.correct]}". Fuente: ${t.source}`;
    result.className = 'trivia-result bad';
    addLog(`❓ ${NAMES[p]} responde mal — paga $${t.penalty}`, 'alert');
  }
  updateMoneyUI();
  checkBankruptcy(p);
  $('triviaHelpBtn').style.display = 'none';
  $('triviaCloseBtn').classList.remove('hidden');
}

function closeTriviaModal() {
  $('triviaModal').classList.add('hidden');
  state.pendingSq = null;
  state.awaitingInput = false;
  nextTurn();
}

/* ══════════════════════════════════════════════
   MODAL: CONSTRUCCIONES
══════════════════════════════════════════════ */
function openBuildModal(fromSquare = false) {
  state.buildDiscount = fromSquare;
  renderBuildModal();
  $('buildModal').classList.remove('hidden');
}

function renderBuildModal() {
  const p = state.turn;
  const wrap = $('buildGroups');
  wrap.innerHTML = '';
  const discountNote = state.buildDiscount ? ' <span class="build-discount-tag">−15% hoy</span>' : '';

  Object.entries(GROUPS).forEach(([key, g]) => {
    const owns = playerOwnsGroup(p, key);
    const lvl  = state.groupLevel[key][p];
    const nextLvl = lvl + 1;
    const row = document.createElement('div');
    row.className = 'build-group-row';

    let costHtml = '';
    if (lvl >= 3) {
      costHtml = `<span class="build-maxed">🏨 Nivel máximo alcanzado</span>`;
    } else {
      const levelKey = ['consultorio','clinica','hospital'][lvl];
      let cost = BUILD_COST[levelKey];
      if (state.buildDiscount) cost = Math.round(cost * 0.85);
      const canAfford = owns && state.money[p] >= cost;
      costHtml = `
        <button class="build-btn" ${canAfford ? '' : 'disabled'} onclick="buildLevel('${key}')">
          Construir ${LEVEL_NAMES[nextLvl]} — $${cost}
        </button>
        ${!owns ? '<span class="build-locked">🔒 Necesitas poseer las ' + g.squares.length + ' propiedades del grupo</span>' : ''}
      `;
    }

    row.innerHTML = `
      <div class="build-group-head">
        <span class="build-group-name" style="color:${g.color}">${g.label}${discountNote}</span>
        <span class="build-group-level">${LEVEL_NAMES[lvl]}</span>
      </div>
      <div class="build-group-actions">${costHtml}</div>
    `;
    wrap.appendChild(row);
  });

  $('buildStudentsInfo').textContent = `🎓 Estudiantes de ${NAMES[p]}: ${state.students[p]}`;
}

function buildLevel(groupKey) {
  const p = state.turn;
  if (!playerOwnsGroup(p, groupKey)) return;
  const lvl = state.groupLevel[groupKey][p];
  if (lvl >= 3) return;
  const levelKey = ['consultorio','clinica','hospital'][lvl];
  let cost = BUILD_COST[levelKey];
  if (state.buildDiscount) cost = Math.round(cost * 0.85);
  if (state.money[p] < cost) return;

  state.money[p] -= cost;
  state.groupLevel[groupKey][p]++;
  addStudents(p, BUILD_STUDENTS[levelKey]);
  addLog(`🏗 ${NAMES[p]} construye ${LEVEL_NAMES[lvl + 1]} en ${GROUPS[groupKey].label} por $${cost}`, 'build');
  updateMoneyUI();
  updateBuildUI();
  renderBuildModal();
}

function closeBuildModal() {
  $('buildModal').classList.add('hidden');
  state.buildDiscount = false;
  if (state.awaitingInput) {
    state.awaitingInput = false;
    nextTurn();
  }
}

/* ══════════════════════════════════════════════
   TARJETA RIESGO: penalidades acumuladas
══════════════════════════════════════════════ */
function checkRiesgoProgress(playerIdx) {
  const riesgo = state.tRiesgoTurn[playerIdx];

  if (riesgo === 3) {
    state.skipTurns[playerIdx] += 1;
    addLog(`💀 ${NAMES[playerIdx]} acumula 3 puntos de riesgo — pierde su próximo turno`, 'alert');
  }
  if (riesgo >= 5) {
    state.tRiesgoTurn[playerIdx] = 0;
    state.positions[playerIdx] = 20;
    const usedStudents = state.students[playerIdx] >= 5;
    if (usedStudents) {
      state.students[playerIdx] -= 5;
      state.uciTurns[playerIdx] = 1;
      addLog(`🚨 ¡${NAMES[playerIdx]} acumula 5 puntos de riesgo — va a UCI, pero usa Estudiantes y solo pierde 1 turno!`, 'alert');
    } else {
      state.uciTurns[playerIdx] = 2;
      addLog(`🚨 ¡${NAMES[playerIdx]} acumula 5 puntos de riesgo — va DIRECTO a UCI!`, 'alert');
    }
    movePawnSvg(playerIdx);
  }
  updateBuildUI();
}

/* ── TIRAR DADOS ── */
function rollDice() {
  if (state.rolling || state.awaitingInput) return;

  // Turno perdido por riesgo acumulado
  if (state.skipTurns[state.turn] > 0) {
    state.skipTurns[state.turn]--;
    addLog(`💤 ${NAMES[state.turn]} pierde este turno por su riesgo acumulado`, 'alert');
    nextTurn();
    return;
  }

  // Verificar si está en UCI
  if (state.uciTurns[state.turn] > 0) {
    state.uciTurns[state.turn]--;
    addLog(`🚨 ${NAMES[state.turn]} sigue en UCI (turnos restantes: ${state.uciTurns[state.turn]})`, 'alert');
    nextTurn();
    return;
  }

  state.rolling = true;
  const btn = $('rollBtn');
  btn.disabled = true;

  const d1    = Math.floor(Math.random() * 6) + 1;
  const d2    = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2;

  animateDie('die1', d1);
  animateDie('die2', d2);

  const result = $('diceResult');
  result.className   = 'dice-result';
  result.textContent = '🎲 Tirando…';

  setTimeout(() => {
    result.className   = 'dice-result big';
    result.textContent = `${NAMES[state.turn]} saca ${d1} + ${d2} = ${total}`;

    const prev = state.positions[state.turn];
    state.positions[state.turn] = (prev + total) % TOTAL;

    // Pasó por SALIDA
    if (state.positions[state.turn] < prev && state.positions[state.turn] !== 0) {
      state.money[state.turn] += 200;
      addLog(`🏁 ${NAMES[state.turn]} pasa por SALIDA — cobra $200`, 'good');
    }

    movePawnSvg(state.turn);
    resolveSquare(state.turn, state.positions[state.turn]);
    updateMoneyUI();

    if (!state.awaitingInput) {
      if (d1 === d2 && !state.bankrupt[state.turn] && !state.gameOver) {
        state.doublesStreak[state.turn]++;
        if (state.doublesStreak[state.turn] >= 3) {
          state.doublesStreak[state.turn] = 0;
          state.uciTurns[state.turn] = 2;
          addLog(`🚨 ${NAMES[state.turn]} saca dobles 3 veces seguidas — ¡va directo a UCI!`, 'alert');
          nextTurn();
        } else {
          addLog(`🎲 ¡${NAMES[state.turn]} sacó dobles (${d1}-${d1})! Vuelve a tirar.`, 'highlight');
          state.rolling = false;
          $('rollBtn').disabled = false;
        }
      } else {
        state.doublesStreak[state.turn] = 0;
        nextTurn();
      }
    } else {
      // El turno continuará cuando se cierre el modal correspondiente
      state.rolling = false;
    }
  }, 680);
}

function nextTurn() {
  // Limpiar tarjetas del turno anterior
  const prev = state.turn;
  state.tSaludTurn[prev]  = 0;

  if (state.gameOver) return;

  // Avanza al siguiente jugador vivo (salta a los que están en bancarrota)
  let next = state.turn;
  for (let i = 0; i < numPlayers; i++) {
    next = (next + 1) % numPlayers;
    if (!state.bankrupt[next]) break;
  }
  state.turn = next;
  updateTurnUI();
  addLog(`🎯 Turno de ${NAMES[state.turn]}`);

  state.rolling = false;
  const btn = $('rollBtn');
  btn.disabled = false;
}

/* ══════════════════════════════════════════════
   BANCARROTA Y CONDICIÓN DE VICTORIA
══════════════════════════════════════════════ */
function checkBankruptcy(p) {
  if (state.bankrupt[p] || state.money[p] >= 0) return;
  state.bankrupt[p] = true;
  state.money[p] = 0;

  // Libera todas sus propiedades: vuelven al banco, sin dueño
  Object.keys(state.owners).forEach(sq => {
    if (state.owners[sq] === p) {
      delete state.owners[sq];
      unmarkSquareOwned(sq);
    }
  });
  state.props[p] = 0;
  Object.keys(state.groupLevel).forEach(k => { state.groupLevel[k][p] = 0; });

  const card = $('p' + p + 'card');
  if (card) card.classList.add('bankrupt');

  addLog(`💀 ${NAMES[p]} entra en BANCARROTA y queda fuera de la partida — sus propiedades vuelven al banco`, 'alert');
  updateMoneyUI();
  checkWinCondition();
}

function checkWinCondition() {
  const alive = [];
  for (let i = 0; i < numPlayers; i++) if (!state.bankrupt[i]) alive.push(i);
  if (alive.length <= 1 && !state.gameOver) {
    state.gameOver = true;
    const winnerName = alive.length === 1 ? NAMES[alive[0]] : 'Nadie (empate)';
    addLog(`🏆 ¡Partida terminada! Gana ${winnerName}`, 'highlight');
    $('rollBtn').disabled = true;
    const uciBtn = $('uciPayBtn');
    if (uciBtn) uciBtn.style.display = 'none';
    $('winTitle').textContent = alive.length === 1 ? `¡Gana ${winnerName}!` : '¡Partida terminada!';
    $('winSub').textContent = alive.length === 1
      ? `${winnerName} fue el último jugador en pie. ¡Felicidades!`
      : 'Todos los jugadores restantes quedaron en bancarrota a la vez.';
    $('winModal').classList.remove('hidden');
  }
}

/* ══════════════════════════════════════════════
   UCI: pagar $150 para salir de inmediato
══════════════════════════════════════════════ */
function payUCI() {
  const p = state.turn;
  if (state.uciTurns[p] <= 0 || state.money[p] < 150 || state.gameOver) return;
  state.money[p] -= 150;
  state.uciTurns[p] = 0;
  addLog(`💳 ${NAMES[p]} paga $150 y sale de inmediato de UCI`, 'good');
  updateMoneyUI();
  checkBankruptcy(p);
  syncUciButton();
}

function syncUciButton() {
  const btn = $('uciPayBtn');
  if (!btn) return;
  const p = state.turn;
  const inUci = state.uciTurns[p] > 0;
  btn.style.display = inUci && !state.gameOver ? '' : 'none';
  btn.disabled = !(inUci && state.money[p] >= 150);
  const label = inUci
    ? `Pagar $150 y salir de UCI (te quedan ${state.uciTurns[p]} turno${state.uciTurns[p] === 1 ? '' : 's'})`
    : 'Pagar $150 y salir de UCI';
  btn.innerHTML = '<svg class="icon"><use href="assets/images/icons/icons.svg#ic-coins"/></svg> ' + label;
}

/* ══════════════════════════════════════════════
   TOOLTIP EDUCATIVO
══════════════════════════════════════════════ */
const tooltip = document.getElementById('squareTip');

function buildTooltip(sq) {
  const d = SQUARE_DATA[sq];
  if (!d) return '';

  let actionLabel = '';
  let actionCls = 'free';

  if (d.type === 'property') {
    const owner = state.owners[sq];
    actionLabel = owner === undefined ? `COMPRAR $${d.price}` : `RENTA $${d.rent}+ → ${NAMES[owner]}`;
    actionCls = owner === undefined ? 'earn' : 'pay';
  } else if (d.type === 'wellness') {
    actionLabel = `GANAS $${d.earn}`;
    actionCls = 'earn';
  } else if (d.type === 'trivia') {
    actionLabel = 'RESPONDE Y GANA';
    actionCls = 'free';
  } else if (d.type === 'build') {
    actionLabel = 'CONSTRUIR (−15%)';
    actionCls = 'free';
  } else {
    actionLabel = {
      pay:  `PAGAS ${d.amount}`,
      earn: `COBRAS ${d.amount}`,
      free: d.amount,
      lose: `PIERDES ${d.amount}`,
    }[d.action];
    actionCls = d.action;
  }

  return `
    <div class="tip-header">
      <span class="tip-icon">${d.icon}</span>
      <div>
        <div class="tip-name">${d.name}</div>
        <div class="tip-cat">${d.cat}</div>
      </div>
    </div>
    <span class="tip-action ${actionCls}">${actionLabel}</span>
    <div class="tip-edu">${d.edu}</div>
    <div class="tip-game">⚙️ <strong>En el juego:</strong> ${d.game}</div>
    ${d.stat ? `<div class="tip-stat">📊 <span><strong>Dato clave:</strong> ${d.stat}</span></div>` : ''}
  `;
}

function positionTooltip(e) {
  const tip = tooltip;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const tw  = tip.offsetWidth  || 320;
  const th  = tip.offsetHeight || 280;

  let x = e.clientX + 18;
  let y = e.clientY + 12;

  if (x + tw > vw - 10) x = e.clientX - tw - 14;
  if (y + th > vh - 10) y = e.clientY - th - 10;

  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

document.querySelectorAll('.sq-hover').forEach(el => {
  const sq = parseInt(el.dataset.sq, 10);

  el.addEventListener('mouseenter', (e) => {
    tooltip.innerHTML = buildTooltip(sq);
    if (tooltip.innerHTML.trim()) {
      tooltip.classList.add('visible');
      positionTooltip(e);
    }
  });

  el.addEventListener('mousemove', positionTooltip);

  el.addEventListener('mouseleave', () => {
    tooltip.classList.remove('visible');
  });
});

/* ── INIT ──
   El juego arranca cuando el jugador elige el nº de
   participantes en el overlay (ver startGame() más arriba).
   Aquí solo dejamos el tablero listo visualmente. */
applyPlayerCount(numPlayers);
$('die1').innerHTML = dieFaceSVG(1);
$('die2').innerHTML = dieFaceSVG(1);
updateTurnUI();
updateMoneyUI();

/* Si hay una partida guardada de una sesión anterior, ofrece continuarla */
(function checkForSavedGame() {
  const saved = loadGameState();
  if (!saved || !saved.state) return;
  const aliveCount = saved.NAMES.slice(0, saved.numPlayers).filter((_, i) => !saved.state.bankrupt[i]).length;
  if (saved.state.gameOver || aliveCount <= 1) { clearGameState(); return; }
  $('resumeBlock').classList.remove('hidden');
  const when = new Date(saved.savedAt || Date.now());
  $('resumeInfo').textContent =
    `${saved.numPlayers} jugadores · Turno de ${saved.NAMES[saved.state.turn]} · guardada ${when.toLocaleDateString('es-EC')} ${when.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`;
})();