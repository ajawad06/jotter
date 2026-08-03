const { expect } = require("chai");
const nodemailer = require("nodemailer");

const EMAIL_MODULE = require.resolve("../src/config/email");
const ENV_MODULE = require.resolve("../src/config/env");

describe("Email config", () => {
  let originalCreateTransport;
  let sentMails;

  const loadEmailModule = () => {
    delete require.cache[ENV_MODULE];
    delete require.cache[EMAIL_MODULE];

    return require("../src/config/email");
  };

  beforeEach(() => {
    sentMails = [];

    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";

    originalCreateTransport = nodemailer.createTransport;

    nodemailer.createTransport = () => ({
      sendMail: async (options) => {
        sentMails.push(options);
        return { messageId: "test" };
      },
    });
  });

  afterEach(() => {
    nodemailer.createTransport = originalCreateTransport;

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    delete require.cache[ENV_MODULE];
    delete require.cache[EMAIL_MODULE];
  });

  it("sends a verification email with a verify link", async () => {
    const email = loadEmailModule();

    await email.sendVerificationEmail(
      { name: "Abdullah", email: "a@example.com" },
      "verify-token",
    );

    expect(sentMails).to.have.length(1);
    expect(sentMails[0].to).to.equal("a@example.com");
    expect(sentMails[0].subject).to.match(/verify/i);
    expect(sentMails[0].html).to.include("verify-email?token=verify-token");
  });

  it("sends a password reset email with a reset link", async () => {
    const email = loadEmailModule();

    await email.sendPasswordResetEmail(
      { name: "Abdullah", email: "a@example.com" },
      "reset-token",
    );

    expect(sentMails).to.have.length(1);
    expect(sentMails[0].subject).to.match(/reset/i);
    expect(sentMails[0].html).to.include("reset-password?token=reset-token");
  });

  it("skips sending and does not throw when SMTP is not configured", async () => {
    // Force the "not configured" branch: createTransport returns null-equivalent
    // by making isConfigured false is impossible here (env is set), so instead
    // simulate no transporter by returning null from createTransport.
    nodemailer.createTransport = () => null;
    const email = loadEmailModule();

    // Should resolve without attempting to send.
    await email.sendVerificationEmail(
      { name: "Nobody", email: "nobody@example.com" },
      "token",
    );

    expect(sentMails).to.have.length(0);
  });
});
