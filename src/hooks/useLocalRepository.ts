import { useMemo } from 'react';
import { CSVRepository } from '../repositories/CSVRepository.ts';
import type { RegistrationRepository } from '../repositories/RegistrationRepository.ts';

export const useLocalRepository = (): RegistrationRepository => useMemo(() => new CSVRepository(), []);
