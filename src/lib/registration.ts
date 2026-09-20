// Independent installations may opt in. The hosted preview stays closed by default.
export function publicRegistrationEnabled() {
  return process.env.PULSE_ALLOW_PUBLIC_REGISTRATION === 'true';
}

export function mayCreateGoogleAccount(existingUser: boolean, verifiedEmail: boolean) {
  return verifiedEmail && (existingUser || publicRegistrationEnabled());
}
