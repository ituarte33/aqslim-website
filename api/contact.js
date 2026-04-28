const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, service, message } = req.body ?? {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  await resend.emails.send({
    from: 'AQSLIM Website <contact@aqslim.com>',
    to: 'contact@aqslim.com',
    replyTo: email,
    subject: `Nueva consulta de ${name}`,
    html: `
      <h2 style="color:#4A5C40;">Nueva solicitud de contacto — AQSLIM</h2>
      <table style="font-family:sans-serif;font-size:14px;line-height:1.8;">
        <tr><td><strong>Nombre:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Teléfono:</strong></td><td>${phone || '—'}</td></tr>
        <tr><td><strong>Servicio:</strong></td><td>${service || '—'}</td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:14px;margin-top:16px;"><strong>Mensaje:</strong><br>${message || '—'}</p>
    `,
  });

  res.status(200).json({ ok: true });
};
