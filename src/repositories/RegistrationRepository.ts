import type { RegistrationData } from '../types/registration.js';

export interface RegistrationRepository {
  findByEmail(email: string): Promise<boolean>;
  save(registrationData: RegistrationData): Promise<void>;
}
