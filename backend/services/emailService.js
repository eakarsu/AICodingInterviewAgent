// Email service using Nodemailer — gracefully skips if unconfigured
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT) || 587,
      secure: parseInt(EMAIL_PORT) === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    return transporter;
  } catch (err) {
    console.warn('[EmailService] Failed to create transporter:', err.message);
    return null;
  }
}

async function sendMail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[EmailService] Skipping email to ${to} — email not configured. Subject: ${subject}`);
    return { skipped: true };
  }

  try {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const info = await t.sendMail({ from, to, subject, html });
    console.log(`[EmailService] Sent email to ${to}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send interview scheduled confirmation
 */
async function sendInterviewScheduled({ candidateEmail, candidateName, interviewId, difficulty, scheduledAt }) {
  const subject = 'Your Coding Interview Has Been Scheduled';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Interview Scheduled</h2>
      <p>Dear ${candidateName || 'Candidate'},</p>
      <p>Your coding interview has been scheduled successfully.</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Interview ID:</td><td style="padding: 8px;">#${interviewId}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Difficulty:</td><td style="padding: 8px;">${difficulty || 'medium'}</td></tr>
        ${scheduledAt ? `<tr><td style="padding: 8px; font-weight: bold;">Scheduled At:</td><td style="padding: 8px;">${new Date(scheduledAt).toLocaleString()}</td></tr>` : ''}
      </table>
      <p style="margin-top: 24px;">Please be prepared to write code in your preferred programming language. Good luck!</p>
      <p style="color: #6b7280; font-size: 14px;">AI Coding Interview Agent</p>
    </div>
  `;
  return sendMail(candidateEmail, subject, html);
}

/**
 * Send interview results notification
 */
async function sendInterviewResults({ candidateEmail, candidateName, interviewId, score, feedback, recommendation }) {
  const subject = 'Your Coding Interview Results';
  const scoreColor = score >= 8 ? '#16a34a' : score >= 6 ? '#d97706' : '#dc2626';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Interview Results</h2>
      <p>Dear ${candidateName || 'Candidate'},</p>
      <p>Your coding interview #${interviewId} has been evaluated. Here are your results:</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">Overall Score: <span style="color: ${scoreColor};">${score !== null && score !== undefined ? score.toFixed(1) : 'N/A'} / 10</span></h3>
        ${recommendation ? `<p style="margin: 0;"><strong>Recommendation:</strong> ${recommendation}</p>` : ''}
      </div>
      ${feedback ? `<div style="margin: 16px 0;"><h4>Feedback:</h4><p style="white-space: pre-wrap;">${feedback}</p></div>` : ''}
      <p style="color: #6b7280; font-size: 14px;">AI Coding Interview Agent</p>
    </div>
  `;
  return sendMail(candidateEmail, subject, html);
}

module.exports = { sendInterviewScheduled, sendInterviewResults };
