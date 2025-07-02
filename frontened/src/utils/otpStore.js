const otpStore = new Map();

export const saveOTP = (identifier, otp, expiresInMinutes = 5) => {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  otpStore.set(identifier, { otp, expiresAt });
};

export const verifyOTP = (identifier, otp) => {
  const entry = otpStore.get(identifier);
  if (!entry || entry.expiresAt < Date.now()) {
    otpStore.delete(identifier);
    return false;
  }
  const isValid = entry.otp === otp;
  if (isValid) {
    otpStore.delete(identifier);
  }
  return isValid;
};