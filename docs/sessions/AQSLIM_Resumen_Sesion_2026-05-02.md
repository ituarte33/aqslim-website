# AQSLIM Wellness Center — Resumen de Sesión
**Fecha:** 2 de mayo de 2026  
**Repositorio:** ituarte33/aqslim-website  
**Ruta destino:** docs/sessions/AQSLIM_Resumen_Sesion_2026-05-02.md

---

## ✅ Lo que hicimos hoy

### 1. Automatización WhatsApp Post-Consulta (Make + 2Chat)
Construimos el flujo completo en Make.com:

**Airtable (Watch Records) → Router → 2Chat (Send WhatsApp) → Airtable (Update Record)**

- **Trigger:** Dias desde Consulta = 2 AND WhatsApp PC Enviado = unchecked
- **Canal:** WhatsApp Business via 2Chat (número AQSLIM conectado ✅)
- **Mensaje:** personalizado con campos dinámicos — Nombre Cliente, Diferencia de peso (kg), Recomendaciones al Cliente
- **Rama activa:** Español / Bajó de peso (< -0.3 kg)
- **Schedule:** Lunes a Viernes, 12:00 PM UTC (= 9:00 AM Pacific Time)
- **Estado:** ✅ Activo y funcionando

### 2. Campos nuevos creados en Airtable (tabla Consultas)
| Campo | Tipo | Propósito |
|---|---|---|
| `Ultima Modificacion` | Last Modified Time | Trigger field para Make |
| `Telefono Whatsapp` | Formula | Formatea número con +1 para 2Chat |
| `WhatsApp PC Enviado` | Checkbox | Evita mensajes duplicados |

**Fórmula Telefono Whatsapp:**
```
"+1" & SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(ARRAYJOIN({Telefono Clientes}), "(", ""), ")", ""), "-", ""), " ", "")
```

### 3. Confirmación: Email Cuestionario de Síntomas ya estaba creado
- **Automation 1** en Airtable: envía email con link del cuestionario cuando se crea un registro nuevo (Cliente Nuevo, EN/ES) ✅

---

## 🔴 Pendiente para próximas sesiones

### A. Completar ramas del Router en Make
Agregar las 5 ramas faltantes:
- Español / Subió de peso (> 0.3 kg)
- Español / Mantuvo peso (≤ 0.3 kg)
- English / Bajó de peso
- English / Subió de peso
- English / Mantuvo peso

Cada rama necesita su módulo 2Chat con el mensaje correspondiente + Update Record al final.

### B. Integración Square → Form Nuevo Cliente
Pendiente desde el 30 de abril. Agregar el link del Form Nuevo Cliente (Airtable) al email de confirmación de Square Appointments.

Pasos: Square → Online booking → Booking confirmation message → agregar texto con link del form.

### C. Recordatorio de cita por WhatsApp
1 día antes de la cita — requiere campo de fecha de próxima cita en Airtable.

---

## Decisiones tomadas
- Usamos **Make.com** como middleware (no el webhook nativo de Airtable) para mayor flexibilidad con múltiples ramas
- El timezone del schedule se compensó manualmente: 12:00 PM UTC = 9:00 AM Pacific
- El formato de teléfono se resuelve con una fórmula en Airtable (no en Make) para reutilización
- Primera rama completada y testeada exitosamente antes de construir las demás

---

*Resumen generado por Claude — AQSLIM Wellness Center*
