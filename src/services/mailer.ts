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
  source?: string;
}

interface GameMetricsEmailInput {
  endedAt: string;
  lastOutcomeMessage: string;
  metrics: Record<string, unknown>;
}

const escapeHtml = (value: unknown): string => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatMetricValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Sin datos";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  return String(value ?? "Sin datos");
};

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

export const sendRewardReservedEmail = (input: RewardReservedEmailInput): Promise<void> => {
  const subject = `${input.rewardEmoji} Regalo reservado: ${input.rewardName}`;
  const text = [
    `Se reservó un regalo en la Ruleta del amor.`,
    `Regalo: ${input.rewardName}`,
    `Precio: ${input.price} monedas`,
    `Monedas restantes: ${input.coinsRemaining}`,
    `Fecha: ${input.reservedAt}`,
    `Origen: ${input.source ?? "Compra en tienda"}`,
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
            <tr><td style="padding:0 16px 14px;font-size:15px;"><strong>Origen:</strong> ${input.source ?? "Compra en tienda"}</td></tr>
          </table>
          <p style="margin:18px 0 0;font-size:14px;color:#8f5e75;">Mensaje del juego: <strong>${input.lastOutcomeMessage}</strong></p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return sendMail({ subject, text, html });
};

export const sendBatteryDepletedMetricsEmail = (input: GameMetricsEmailInput): Promise<void> => {
  const subject = `🔋 Bateria agotada: resumen de partida`;
  const metricLines = Object.entries(input.metrics).map(([key, value]) => `${key}: ${formatMetricValue(value)}`);
  const text = [
    "La bateria del juego se agotó.",
    `Fecha: ${input.endedAt}`,
    `Mensaje final: ${input.lastOutcomeMessage}`,
    "",
    "Metricas:",
    ...metricLines,
  ].join("\n");

  const metricsHtml = Object.entries(input.metrics)
    .map(([key, value]) => (
      `<tr><td style="padding:10px 16px;font-size:14px;border-top:1px solid #ffdbe8;"><strong>${escapeHtml(key)}</strong></td><td style="padding:10px 16px;font-size:14px;border-top:1px solid #ffdbe8;">${escapeHtml(formatMetricValue(value))}</td></tr>`
    ))
    .join("");

  const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:24px;background:#fff4f6;font-family:Arial,sans-serif;color:#4a1f34;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ffd3df;">
      <tr>
        <td style="padding:28px 24px;background:linear-gradient(135deg,#ffe6dc,#ffd9e8);">
          <h1 style="margin:0;font-size:28px;line-height:1.1;color:#c03262;">🔋 Bateria agotada</h1>
          <p style="margin:10px 0 0;font-size:16px;color:#613449;">Se envio el resumen de la sesion al finalizar la energia disponible.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 12px;font-size:15px;"><strong>Fecha:</strong> ${escapeHtml(input.endedAt)}</p>
          <p style="margin:0 0 20px;font-size:15px;"><strong>Mensaje final:</strong> ${escapeHtml(input.lastOutcomeMessage)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f9;border:1px solid #ffdbe8;border-radius:12px;overflow:hidden;">
            ${metricsHtml}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  return sendMail({ subject, text, html });
};
