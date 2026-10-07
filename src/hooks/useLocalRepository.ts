import { useMemo } from 'react';
import type { RegistrationRepository } from '../repositories/RegistrationRepository.ts';
import type { RegistrationData } from '../types/registration.ts';

class InMemoryRegistrationRepository implements RegistrationRepository {
  private readonly emails = new Set<string>();

  async findByEmail(email: string): Promise<boolean> {
    return this.emails.has(email.trim().toLowerCase());
  }

  async save(registrationData: RegistrationData): Promise<void> {
    for (const resident of registrationData.residents) {
      this.emails.add(resident.email.trim().toLowerCase());
    }
  }
}

export const useLocalRepository = (): RegistrationRepository => useMemo(() => new InMemoryRegistrationRepository(), []);
