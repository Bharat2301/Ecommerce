const { z } = require('zod');
const {
  validateEmail,
  validatePassword,
  validateName,
} = require('./validation');

const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((email) => validateEmail(email), {
      message: 'Invalid email format',
    }),
  password: z
    .string()
    .min(1, 'Password is required')
    .refine((password) => validatePassword(password), {
      message:
        'Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character',
    }),
  name: z
    .string()
    .min(1, 'Name is required')
    .refine((name) => validateName(name), {
      message:
        'Name must be 2-50 characters long and contain only letters and spaces',
    }),
  securityQuestions: z
    .array(
      z.object({
        question: z.string().min(1, 'Security question is required'),
        answer: z.string().min(1, 'Security answer is required'),
      })
    )
    .optional(),
});

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((email) => validateEmail(email), {
      message: 'Invalid email format',
    }),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((email) => validateEmail(email), {
      message: 'Invalid email format',
    }),
  otp: z.string().min(1, 'OTP is required'),
  newPassword: z
    .string()
    .min(1, 'New password is required')
    .refine((password) => validatePassword(password), {
      message:
        'New password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character',
    }),
});

const requestOtpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((email) => validateEmail(email), {
      message: 'Invalid email format',
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  requestOtpSchema,
};
