// Generates a 6-digit OTP
export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validates OTP format (6 digits)
export function validateOtp(otp) {
  const regex = /^\d{6}$/;
  return regex.test(otp);
}

// Formats time remaining for OTP expiration (e.g., "04:59")
export function formatOtpTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}