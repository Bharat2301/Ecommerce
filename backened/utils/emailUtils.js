const { Resend } = require('resend');
const { logger } = require('./logger');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'no-reply@yourdomain.com',
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h2>Welcome to Our E-commerce Platform!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  } catch (error) {
    logger.error('Failed to send verification email', {
      message: error.message,
      stack: error.stack,
      email,
    });
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendVerificationEmail };
