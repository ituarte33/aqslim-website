from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

OUTPUT = "/sessions/clever-affectionate-pascal/mnt/outputs/AQSLIM_Resumen_Sesion_28abril.pdf"

doc = SimpleDocTemplate(OUTPUT, pagesize=letter,
                        rightMargin=0.75*inch, leftMargin=0.75*inch,
                        topMargin=0.75*inch, bottomMargin=0.75*inch)

styles = getSampleStyleSheet()

title_style = ParagraphStyle('Title2', parent=styles['Title'],
    fontSize=18, textColor=colors.HexColor('#1a6b4a'), spaceAfter=6)
h1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontSize=13, textColor=colors.HexColor('#1a6b4a'), spaceBefore=14, spaceAfter=4)
h2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontSize=11, textColor=colors.HexColor('#2d8c5e'), spaceBefore=10, spaceAfter=3)
body = ParagraphStyle('Body2', parent=styles['Normal'],
    fontSize=10, leading=15, spaceAfter=4)
bullet = ParagraphStyle('Bullet', parent=styles['Normal'],
    fontSize=10, leading=15, leftIndent=20, spaceAfter=3)
check = ParagraphStyle('Check', parent=styles['Normal'],
    fontSize=10, leading=15, leftIndent=20, spaceAfter=3, textColor=colors.HexColor('#1a6b4a'))
pending = ParagraphStyle('Pending', parent=styles['Normal'],
    fontSize=10, leading=15, leftIndent=20, spaceAfter=3, textColor=colors.HexColor('#b05a00'))
subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'],
    fontSize=11, textColor=colors.gray, spaceAfter=16)

story = []

story.append(Paragraph("AQSLIM Wellness Center", title_style))
story.append(Paragraph("Resumen de Sesion — 28 de Abril, 2026", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1a6b4a')))
story.append(Spacer(1, 12))

# LO QUE HICIMOS HOY
story.append(Paragraph("Lo que hicimos hoy", h1))

story.append(Paragraph("1. Automation: Email Post-Consulta", h2))
story.append(Paragraph("Creamos la nueva automation <b>Email Post-Consulta</b> en Airtable con:", body))
story.append(Paragraph("✅  Trigger: <b>When record matches conditions</b> (tabla Consultas)", check))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Dias desde Consulta = 2", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Email Post-Consulta Enviado is unchecked", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Diferencia vs Semana Anterior (kg) is not empty", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Email Cliente is not empty", bullet))

story.append(Paragraph("2. Conditional A — Bajo de peso (Diferencia &lt; -0.3)", h2))
story.append(Paragraph("✅  Creado el bloque condicional externo: <b>Diferencia vs Semana Anterior (kg) &lt; -0.3</b>", check))
story.append(Paragraph("✅  Sub-condicion: <b>If Idioma Preferido = English</b>", check))
story.append(Paragraph("✅  Email EN configurado (rama English / bajo de peso):", check))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• To: Email Cliente (campo dinamico)", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Subject: <i>Your Progress Update - Great job!</i>", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Body con chips: ID Cliente, Diferencia vs Semana Anterior, Recomendaciones al Cliente", bullet))

story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cccccc')))
story.append(Spacer(1, 8))

# LO QUE FALTA
story.append(Paragraph("Lo que falta — Retomar aqui", h1))

story.append(Paragraph("Conditional A (Bajo de peso) — falta rama Otherwise", h2))
story.append(Paragraph("⏳  Agregar rama <b>Otherwise</b> dentro del Conditional A:", pending))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Click en '+ Add condition' dentro del bloque Conditional A", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Agregar 'Send an email' con el template en Espanol:", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Subject: <i>Tu Progreso — Excelente trabajo!</i>", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Body: Hola [ID Cliente], Registramos una reduccion de [Diferencia] kg desde tu ultima consulta...", bullet))

story.append(Paragraph("Conditional B — Subio de peso (Diferencia &gt; 0.3)", h2))
story.append(Paragraph("⏳  Crear nuevo bloque condicional al mismo nivel que Conditional A:", pending))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Condicion: Diferencia vs Semana Anterior (kg) &gt; 0.3", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Rama English → Send email: <i>Your Progress Update — Keep going!</i>", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Rama Otherwise (Espanol) → Send email: <i>Tu Progreso — Sigamos adelante</i>", bullet))

story.append(Paragraph("Conditional C — Peso estable (-0.3 a 0.3)", h2))
story.append(Paragraph("⏳  Crear tercer bloque condicional:", pending))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Condicion: Diferencia entre -0.3 y 0.3 (usar 'is between' si disponible, o dos condiciones)", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Rama English → Send email: <i>Your Progress Update — Staying on track!</i>", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Rama Otherwise (Espanol) → Send email: <i>Tu Progreso — Manteniendote en curso</i>", bullet))

story.append(Paragraph("Accion final — Anti-duplicate", h2))
story.append(Paragraph("⏳  Al final de todos los conditionals, agregar:", pending))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Accion: <b>Update record</b> → campo <b>Email Post-Consulta Enviado</b> = TRUE (checked)", bullet))
story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• Esto evita que el email se envie dos veces si el record se edita", bullet))

story.append(Paragraph("Test y activacion", h2))
story.append(Paragraph("⏳  Probar la automation con Luis Fernando (Diferencia debe ser != 0)", pending))
story.append(Paragraph("⏳  Dar click en <b>Update</b> (o Save) y activar el toggle <b>ON</b>", pending))

story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cccccc')))
story.append(Spacer(1, 8))

story.append(Paragraph("Templates de email pendientes (Espanol)", h1))

story.append(Paragraph("Email Bajo de peso — ES:", h2))
story.append(Paragraph("<b>Subject:</b> Tu Progreso — Excelente trabajo! 🌟", body))
story.append(Paragraph("<b>Body:</b>", body))
story.append(Paragraph("Hola [ID Cliente],", bullet))
story.append(Paragraph("Queremos compartirte una gran noticia de tu ultima consulta.", bullet))
story.append(Paragraph("Registramos una reduccion de [Diferencia vs Semana Anterior] kg desde tu visita anterior. Cada paso cuenta, y estas avanzando hacia tu meta. 💪", bullet))
story.append(Paragraph("[Recomendaciones al Cliente]", bullet))
story.append(Paragraph("Estamos orgullosos de tu compromiso y esperamos verte en tu proxima cita.", bullet))
story.append(Paragraph("Con carino, Tu equipo AQSLIM Wellness", bullet))

story.append(Paragraph("Email Subio de peso — EN:", h2))
story.append(Paragraph("<b>Subject:</b> Your Progress Update — Keep going! 💙", body))
story.append(Paragraph("<b>Body:</b> Hi [ID Cliente], We noticed a slight increase of [Diferencia] kg since your last visit. Remember, every journey has its ups and downs — what matters is that you're here and committed. [Recomendaciones al Cliente] We believe in you and look forward to supporting you at your next appointment. Warm regards, Your AQSLIM Wellness Team", bullet))

story.append(Paragraph("Email Subio de peso — ES:", h2))
story.append(Paragraph("<b>Subject:</b> Tu Progreso — Sigamos adelante 💙", body))
story.append(Paragraph("<b>Body:</b> Hola [ID Cliente], Notamos un ligero incremento de [Diferencia] kg desde tu ultima consulta. Recuerda que cada proceso tiene sus altibajos — lo importante es que sigues aqui y comprometida. [Recomendaciones al Cliente] Creemos en ti y esperamos apoyarte en tu proxima cita. Con carino, Tu equipo AQSLIM Wellness", bullet))

story.append(Paragraph("Email Peso estable — EN:", h2))
story.append(Paragraph("<b>Subject:</b> Your Progress Update — Staying on track! ⚖️", body))
story.append(Paragraph("<b>Body:</b> Hi [ID Cliente], Your weight has remained stable since your last visit. Consistency is key — maintaining your current habits is an important part of reaching your goal. [Recomendaciones al Cliente] Keep up the great work, and we look forward to seeing you at your next appointment. Warm regards, Your AQSLIM Wellness Team", bullet))

story.append(Paragraph("Email Peso estable — ES:", h2))
story.append(Paragraph("<b>Subject:</b> Tu Progreso — Manteniendote en curso ⚖️", body))
story.append(Paragraph("<b>Body:</b> Hola [ID Cliente], Tu peso se ha mantenido estable desde tu ultima consulta. La consistencia es clave — mantener tus habitos actuales es una parte importante para alcanzar tu meta. [Recomendaciones al Cliente] Sigue adelante, y esperamos verte en tu proxima cita. Con carino, Tu equipo AQSLIM Wellness", bullet))

doc.build(story)
print("PDF generado correctamente.")
