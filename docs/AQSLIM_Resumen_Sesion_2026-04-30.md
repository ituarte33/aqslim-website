# AQSLIM Wellness Center — Resumen de Sesión
**Fecha:** 30 de abril de 2026  
**Repositorio:** ituarte33/aqslim-website

---

## ✅ Lo que hicimos hoy

### 1. Integración Square → Form Nuevo Cliente (Airtable)
- Encontramos la sección **Communication settings** en Square (Settings → Communications)
- Configuramos el mensaje **Email** de "Business accepted appointment" con texto personalizado y link al form de Airtable:  
  `https://airtable.com/appuUHRs26ATXnZjf/pagfgQJ99hvjMtW1J/form`
- Configuramos el mensaje **SMS** de confirmación con el mismo link en formato corto
- Ambos mensajes incluyen variables dinámicas de Square (`{{client.first_name}}`, `{{reservation.date_start_minimal}}`, etc.)

### 2. Flujo del paciente — ahora completo
```
Paciente agenda en Square
       ↓
Recibe Email + SMS con link al form
       ↓
Llena Form Nuevo Cliente (Airtable)
       ↓
Acepta disclaimer legal ✅
       ↓
Redirige automáticamente a Cuestionario de Síntomas
       ↓
Llega a su cita con todo listo
```

### 3. Link de booking de Square
`https://book.squareup.com/appointments/46af1166-2cd2-4127-b94f-531a768d54c9/location/8PN49DRQ1C6TC/services`

### 4. Automatización WhatsApp post-consulta — Make.com + 2Chat
- Creamos cuenta en **Make.com** (plan Free, 1,000 créditos/mes)
- Creamos cuenta en **2Chat.io** (trial 7 días, luego $9/mes)
- Conectamos WhatsApp Business de AQSLIM (+1 619 392 0797) a 2Chat via QR code
- Creamos escenario en Make: **Airtable Watch Records → Router → 2Chat Send Message**
- Agregamos campo **"Telefono Clientes"** (Lookup) en tabla Consultas de Airtable
- Configuramos Ruta 1 (bajó de peso) con mensaje personalizado en español

---

## 📋 Decisiones tomadas

- **Mantener Square** para calendario y pagos — construir uno propio sería mucho trabajo
- Usar **2Chat** en lugar de WhatsApp Business Cloud de Meta (más fácil, no requiere Meta Business Manager)
- Usar **Make.com** como puente entre Airtable y 2Chat
- Máximo **12 mensajes por hora** para evitar bans de WhatsApp
- Conectado en **iPhone** de Romulo (mover a Mac Studio cuando sea posible)

---

## 🔴 Pendiente — próxima sesión

### Continuar en Make.com (escenario guardado)
1. Configurar **filtro Ruta 1** — solo cuando Diferencia < -0.3 (bajó de peso)
2. Crear **Ruta 2** — subió de peso (Diferencia > 0.3) — ES y EN
3. Crear **Ruta 3** — peso estable (entre -0.3 y 0.3) — ES y EN
4. Activar el escenario y hacer **prueba real**
5. Verificar que el número del paciente llegue en formato internacional (+1...)

### Otras pendientes
- [ ] Recordatorio de cita (1 día antes) — desde Square o Make
- [ ] Seguimiento de clientes inactivos
- [ ] Agregar botón "Agenda tu cita" en website con link de Square
- [ ] Pedir a pacientes que guarden el número de AQSLIM en sus contactos
- [ ] Regenerar API Key de 2Chat por seguridad

---

## 🔧 Credenciales y links importantes
- **Make.com:** us2.make.com/organization/7489791
- **2Chat:** app.2chat.io
- **Escenario Make:** us2.make.com/2229186/scenarios/4922760/edit
- **Form Nuevo Cliente:** https://airtable.com/appuUHRs26ATXnZjf/pagfgQJ99hvjMtW1J/form
- **Square Booking:** https://book.squareup.com/appointments/46af1166-2cd2-4127-b94f-531a768d54c9/location/8PN49DRQ1C6TC/services

---

*Documento generado por Claude — AQSLIM Wellness Center*
