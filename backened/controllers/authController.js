const { Response } = require('express');
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const sanitizeHtml = require('sanitize-html');
const { validateEmail, validatePassword, validateName } = require('../utils/validation');
const { validateOtp, generateOtp, saveOTP } = require('../utils/otpUtils');
const { ValidationError, AuthenticationError, NotFoundError, AppError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');
const { sendVerificationEmail } = require('../utils/emailUtils');
const rateLimit = require('express-rate-limit');

// Validate environment variables
const requiredEnvVars = ['JWT_SECRET', 'OTP_EXPIRY_MINUTES', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing environment variable: ${envVar}`);
    throw new Error(`Missing environment variable: ${envVar}`);
  }
}

const userRegistrationSchema = z.object({
  email: z.string().refine(validateEmail, { message: 'Invalid email format' }),
  password: z.string().refine(validatePassword, {
    message: 'Password must be at least 8 characters, including uppercase, lowercase, number, and special character',
  }),
  name: z.string().refine(validateName, { message: 'Name must be 2-50 characters, letters only' }),
  securityQuestions: z
    .array(
      z.object({
        question: z.string().min(1, { message: 'Security question is required' }),
        answer: z.string().min(1, { message: 'Security answer is required' }),
      })
    )
    .length(2, { message: 'Exactly two security questions are required' }),
});

const loginSchema = z.object({
  email: z.string().refine(validateEmail, { message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const resetPasswordSchema = z.object({
  email: z.string().refine(validateEmail, { message: 'Invalid email format' }),
  otp: z.string().length(6, { message: 'OTP must be 6 digits' }),
  newPassword: z.string().refine(validatePassword, {
    message: 'Password must be at least 8 characters, including uppercase, lowercase, number, and special character',
  }),
});

const requestOtpSchema = z.object({
  email: z.string().refine(validateEmail, { message: 'Invalid email format' }),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: 'Verification token is required' }),
});

// Sanitize inputs to prevent XSS
const sanitizeInput = (input) => sanitizeHtml(input, {
  allowedTags: [],
  allowedAttributes: {},
});

const register = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { email, password, name, securityQuestions } = userRegistrationSchema.parse({
      ...req.body,
      email: sanitizeInput(req.body.email),
      name: sanitizeInput(req.body.name),
      securityQuestions: req.body.securityQuestions?.map((q) => ({
        question: sanitizeInput(q.question),
        answer: sanitizeInput(q.answer),
      })),
    });

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      logger.warn(`[${requestId}] Email already registered`, { email });
      throw new ValidationError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
        isVerified: false,
        verificationToken,
        securityQuestions: {
          create: securityQuestions.map(({ question, answer }) => ({
            question,
            answer,
          })),
        },
      },
      select: { id: true, email: true, role: true, name: true },
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    logger.info(`[${requestId}] User registered successfully`, { email, userId: user.id });
    return res.status(201).json({
      success: true,
      data: { user: { id: user.id, email: user.email, role: user.role, name: user.name } },
      message: 'Registration successful. Please verify your email.',
      requestId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Register error`, {
      message: error.message,
      stack: error.stack,
      email: req.body.email,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

// Add rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { success: false, error: 'Too many attempts. Please try again later.' }
});

// Add password complexity validation
const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const login = async (req, res) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Login attempt`, { email: req.body.email });
    const { email, password } = loginSchema.parse({
      ...req.body,
      email: sanitizeInput(req.body.email),
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, name: true, password: true, isVerified: true },
    });
    if (!user) {
      logger.warn(`[${requestId}] User not found`, { email });
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isVerified) {
      logger.warn(`[${requestId}] Email not verified`, { email });
      throw new AuthenticationError('Please verify your email before logging in');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`[${requestId}] Invalid password`, { email });
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set HTTP-only cookies for both tokens
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    logger.info(`[${requestId}] Login successful`, { email, userId: user.id });
    return res.json({
      success: true,
      data: { user: { id: user.id, email: user.email, role: user.role, name: user.name } },
      requestId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Login error`, {
      message: error.message,
      stack: error.stack,
      email: req.body.email,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

const logout = async (req, res) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] Logout attempt`, { email: req.user?.email });
    const accessToken = req.cookies.accessToken;
    if (accessToken) {
      // Blacklist the access token
      await prisma.blacklistedToken.create({
        data: {
          token: accessToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Match access token expiry (1 hour)
        },
      });
    }

    // Clear both cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    logger.info(`[${requestId}] Logout successful`, { email: req.user?.email });
    return res.json({ success: true, message: 'Logged out successfully', requestId });
  } catch (error) {
    logger.error(`[${requestId}] Logout error`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    throw new AppError('Failed to logout', 500);
  }
};

const resetPassword = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { email, otp, newPassword } = resetPasswordSchema.parse({
      ...req.body,
      email: sanitizeInput(req.body.email),
    });

    const isValidOtp = await validateOtp(email, otp);
    if (!isValidOtp) {
      logger.warn(`[${requestId}] Invalid or expired OTP`, { email });
      throw new ValidationError('Invalid or expired OTP');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      logger.warn(`[${requestId}] User not found`, { email });
      throw new NotFoundError('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      }),
      prisma.oTP.deleteMany({ where: { email } }),
    ]);

    logger.info(`[${requestId}] Password reset successful`, { email });
    return res.json({ success: true, message: 'Password reset successful', requestId });
  } catch (error) {
    logger.error(`[${requestId}] Reset password error`, {
      message: error.message,
      stack: error.stack,
      email: req.body.email,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

const requestResetOtp = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { email } = requestOtpSchema.parse({
      ...req.body,
      email: sanitizeInput(req.body.email),
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      logger.warn(`[${requestId}] User not found`, { email });
      throw new NotFoundError('User not found');
    }

    const otp = await generateOtp();
    const otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
    await saveOTP(email, otp, otpExpiryMinutes);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: email,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is ${otp}. It expires in ${otpExpiryMinutes} minutes.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
      }

      logger.info(`[${requestId}] OTP sent`, { email });
    } catch (emailError) {
      logger.error(`[${requestId}] Failed to send OTP email`, {
        message: emailError.message,
        email,
      });
      throw new AppError('Failed to send OTP email', 500);
    }

    return res.json({ success: true, message: 'OTP sent to email', requestId });
  } catch (error) {
    logger.error(`[${requestId}] Request reset OTP error`, {
      message: error.message,
      email: req.body.email,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

const verifyEmail = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { token } = verifyEmailSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      logger.warn(`[${requestId}] Invalid or expired verification token`, { token });
      throw new ValidationError('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    logger.info(`[${requestId}] Email verified successfully`, { email: user.email });
    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: { user: { id: user.id, email: user.email, role: user.role, name: user.name } },
      requestId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Verify email error`, {
      message: error.message,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

// Add account lockout after failed attempts
const loginAttemptTracker = new Map();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkLoginAttempts(email) {
  const tracker = loginAttemptTracker.get(email);
  if (!tracker) return true;

  if (Date.now() - tracker.lastAttempt > LOCKOUT_DURATION) {
    loginAttemptTracker.delete(email);
    return true;
  }

  return tracker.attempts < MAX_LOGIN_ATTEMPTS;
}

module.exports = {
  register,
  login,
  logout,
  resetPassword,
  requestResetOtp,
  verifyEmail,
  authLimiter,
  loginAttemptTracker,
  checkLoginAttempts,
};