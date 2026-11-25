export const validateLogin = (values) => {
  const errors = {};
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Email is invalid';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  return errors;
};

export const validateRegister = (values) => {
  const errors = validateLogin(values);
  if (!values.name) {
    errors.name = 'Full name is required';
  }
  return errors;
};

/**
 * Normalizes auth/OAuth errors and detects pending administrator approval state.
 */
export const parseAuthFormError = (err, fallbackMessage = 'Authentication failed') => {
  const msg = err?.message || '';
  const lower = msg.toLowerCase();
  const isPending =
    err?.code === 'PENDING_APPROVAL' ||
    lower.includes('pending') ||
    lower.includes('verification is pending') ||
    lower.includes('administrator approval');

  return {
    form: msg || fallbackMessage,
    isPending,
  };
};
