const nodemailer = require("nodemailer");

const env = require("./env");
const logger = require("./logger");

const isConfigured = Boolean(env.email.smtpHost && env.email.smtpUser);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: env.email.smtpHost,
      port: env.email.smtpPort,
      secure: env.email.smtpPort === 465,
      auth: {
        user: env.email.smtpUser,
        pass: env.email.smtpPass,
      },
    })
  : null;

const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    logger.warn(
      { to, subject },
      "SMTP is not configured; skipping email send",
    );
    return;
  }

  await transporter.sendMail({ from: env.email.from, to, subject, html });
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Verify your Jotter email",
    html: `<p>Hi ${user.name},</p><p>Confirm your email address to finish setting up Jotter:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Reset your Jotter password",
    html: `<p>Hi ${user.name},</p><p>Use the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
