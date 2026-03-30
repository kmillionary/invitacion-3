const K_MAILER_URL = "https://k-mailer.azurewebsites.net/api/k-mailer";
const K_MAILER_API_KEY = "G8jzPA3AxDB6ZkMtAZdPtTenXeiLyPnt442tyq2KJbdpu3u8K8";
const MAIL_RECIPIENT = "kmillionary@gmail.com";

interface MailPayload {
  subject: string;
  text: string;
  html: string;
}

interface RewardReservedEmailInput {
  rewardName: string;
  rewardEmoji: string;
  price: number;
  coinsRemaining: number;
  reservedAt: string;
  lastOutcomeMessage: string;
}

interface SessionFinishedEmailInput {
  finishedAt: string;
  dateKey: string;
  metrics: Record<string, string>;
}

const sendMail = ({ subject, text, html }: MailPayload): Promise<void> => {
  return fetch(K_MAILER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: K_MAILER_API_KEY,
    },
    body: JSON.stringify({
      to: [MAIL_RECIPIENT],
      subject,
      text,
      html,
    }),
  })
    .then(() => undefined)
    .catch((error) => {
      console.error("No se pudo enviar correo:", error);
    });
};

const renderMetricRows = (metrics: Record<string, string>): string => {
  return Object.entries(metrics)
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 14px;font-size:14px;color:#6b3950;border-bottom:1px solid #f5d6df;"><strong>${label}</strong></td>
        <td style="padding:10px 14px;font-size:14px;color:#4a1f34;border-bottom:1px solid #f5d6df;">${value}</td>
      </tr>
    `.trim())
    .join("");
};

export const sendRewardReservedEmail = (input: RewardReservedEmailInput): Promise<void> => {
  const subject = `${input.rewardEmoji} Regalo reservado: ${input.rewardName}`;
  const text = [
    `Se reservó un regalo en la Ruleta del amor.`,
    `Regalo: ${input.rewardName}`,
    `Precio: ${input.price} monedas`,
    `Monedas restantes: ${input.coinsRemaining}`,
    `Fecha: ${input.reservedAt}`,
    `Mensaje del juego: ${input.lastOutcomeMessage}`,
  ].join("\n");

  const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:24px;background:#fff4f6;font-family:Arial,sans-serif;color:#4a1f34;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ffd3df;">
      <tr>
        <td style="padding:28px 24px;background:linear-gradient(135deg,#ffe6dc,#ffd9e8);">
          <h1 style="margin:0;font-size:28px;line-height:1.1;color:#c03262;">${input.rewardEmoji} Regalo reservado</h1>
          <p style="margin:10px 0 0;font-size:16px;color:#613449;">Ya se apartó un premio en la tienda romántica.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f9;border:1px solid #ffdbe8;border-radius:12px;">
            <tr><td style="padding:14px 16px;font-size:15px;"><strong>Regalo:</strong> ${input.rewardName}</td></tr>
            <tr><td style="padding:0 16px 14px;font-size:15px;"><strong>Precio:</strong> ${input.price} monedas</td></tr>
            <tr><td style="padding:0 16px 14px;font-size:15px;"><strong>Monedas restantes:</strong> ${input.coinsRemaining}</td></tr>
            <tr><td style="padding:0 16px 14px;font-size:15px;"><strong>Fecha:</strong> ${input.reservedAt}</td></tr>
          </table>
          <p style="margin:18px 0 0;font-size:14px;color:#8f5e75;">Mensaje del juego: <strong>${input.lastOutcomeMessage}</strong></p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return sendMail({ subject, text, html });
};

export const sendSessionFinishedEmail = (input: SessionFinishedEmailInput): Promise<void> => {
  const subject = `⏰ Sesion terminada - ${input.dateKey}`;
  const text = [
    `La sesion de la Ruleta del amor terminó por hoy.`,
    `Fecha de cierre: ${input.finishedAt}`,
    "",
    ...Object.entries(input.metrics).map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:24px;background:#fff4f6;font-family:Arial,sans-serif;color:#4a1f34;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ffd3df;">
      <tr>
        <td style="padding:28px 24px;background:linear-gradient(135deg,#ffe6dc,#ffd9e8);">
          <h1 style="margin:0;font-size:28px;line-height:1.1;color:#c03262;">⏰ Sesion terminada</h1>
          <p style="margin:10px 0 0;font-size:16px;color:#613449;">La partida del día ya cerró y aquí va el resumen más interesante.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:15px;color:#6b3950;"><strong>Cierre:</strong> ${input.finishedAt}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f9;border:1px solid #ffdbe8;border-radius:12px;overflow:hidden;">
            ${renderMetricRows(input.metrics)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return sendMail({ subject, text, html });
};
