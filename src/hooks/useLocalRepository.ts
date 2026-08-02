import { useMemo } from 'react';
import { CSVRepository } from '../repositories/CSVRepository.js';
import type { RegistrationRepository } from '../repositories/RegistrationRepository.js';

export const useLocalRepository = (): RegistrationRepository => useMemo(() => new CSVRepository(), []);
