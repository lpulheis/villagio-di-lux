import type { RegistrationData } from '../types/registration';

export interface RegistrationRepository {
  findByEmail(email: string): Promise<boolean>;
  save(registrationData: RegistrationData): Promise<void>;
}
