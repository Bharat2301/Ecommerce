const prisma = require('../prisma/client');

// Generates a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validates OTP format (6 digits)
function validateOtp(email, otp) {
  return prisma.oTP.findFirst({
    where: {
      email,
      otp,
      expiresAt: { gte: new Date() },
    },
  }).then((result) => !!result);
}

// Saves OTP to the database
async function saveOTP(email, otp, expiresInMinutes = 5) {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await prisma.oTP.create({
    data: { email, otp, expiresAt },
  });
}

module.exports = {
  generateOtp,
  validateOtp,
  saveOTP,
};
