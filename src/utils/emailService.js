import { sendEmailViaBrevo } from '../services/emailServiceBrevo.js';
export async function sendEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }
export async function sendOTPEmail(to, otp) { return await sendEmailViaBrevo({ to, subject: "Votre code OTP", htmlContent: `<p>Votre code est : <b>${otp}</b></p>` }); }
export async function sendDeclarationEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }
export async function sendModificationEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }
export async function sendStatusUpdateEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }
export default { sendEmail, sendOTPEmail, sendDeclarationEmail, sendModificationEmail, sendStatusUpdateEmail };