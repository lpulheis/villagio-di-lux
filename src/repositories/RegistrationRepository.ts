import type { RegistrationData } from '../types/registration.ts';

export interface RegistrationRepository {
  findByEmail(email: string): Promise<boolean>;
  save(registrationData: RegistrationData): Promise<void>;
}
