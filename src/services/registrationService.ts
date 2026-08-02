import { normalizeEmail } from '../utils/email';
import type { RegistrationData } from '../types/registration';
import type { RegistrationRepository } from '../repositories/RegistrationRepository';

export class RegistrationService {
  constructor(private repository: RegistrationRepository) {}

  async submit(registrationData: RegistrationData): Promise<void> {
    const duplicate = await this.findDuplicate(registrationData);

    if (duplicate) {
      throw new Error(duplicate);
    }

    await this.repository.save(registrationData);
  }

  private async findDuplicate(registrationData: RegistrationData): Promise<string | null> {
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();

    for (const resident of registrationData.residents) {
      const email = normalizeEmail(resident.email);
      const normalizedName = resident.name.trim().toLowerCase().replace(/\s+/g, ' ');

      if (seenEmails.has(email)) {
        return `O e-mail ${email} está repetido entre os moradores.`;
      }
      seenEmails.add(email);

      if (seenNames.has(normalizedName)) {
        return `O nome ${resident.name} está repetido entre os moradores.`;
      }
      seenNames.add(normalizedName);

      const alreadyRegistered = await this.repository.findByEmail(email);
      if (alreadyRegistered) {
        return `O e-mail ${email} já possui um cadastro realizado.`;
      }
    }

    return null;
  }
}
