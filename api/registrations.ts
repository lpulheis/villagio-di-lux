import type { VercelRequest, VercelResponse } from '@vercel/node';
import { RegistrationService } from '../src/services/registrationService.ts';
import type { RegistrationRepository } from '../src/repositories/RegistrationRepository.ts';
import type { RegistrationData } from '../src/types/registration.ts';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const repository = new InMemoryRegistrationRepository();
    const service = new RegistrationService(repository);
    await service.submit(req.body as RegistrationData);

    return res.status(201).json({ message: 'Cadastro registrado com sucesso.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar cadastro.';
    return res.status(400).json({ message });
  }
}
