function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

function validateName(name) {
  const regex = /^[a-zA-Z\s]{2,50}$/;
  return regex.test(name);
}

function validatePhone(phone) {
  const regex = /^\d{10}$/;
  return regex.test(phone);
}

function validatePincode(pincode) {
  const regex = /^\d{6}$/;
  return regex.test(pincode);
}

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validatePincode,
};
