import { sendEmailViaBrevo } from '../services/emailServiceBrevo.js';
export const transporter = {
  sendMail: async (options) => {
    return await sendEmailViaBrevo({
      to: options.to,
      subject: options.subject,
      htmlContent: options.html || options.text,
      textContent: options.text
    });
  }
};
export default transporter;