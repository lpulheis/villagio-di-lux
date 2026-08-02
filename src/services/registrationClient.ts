import type { RegistrationData } from '../types/registration.js';

export const submitRegistration = async (registrationData: RegistrationData) => {
  const response = await fetch('/api/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? 'Erro ao enviar cadastro.');
  }
};
