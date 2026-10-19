import { sendEmailViaBrevo } from './emailServiceBrevo.js';
export async function sendAssureEmail(to, subject, html) {
  return await sendEmailViaBrevo({ to, subject, htmlContent: html });
}
export default { sendAssureEmail };