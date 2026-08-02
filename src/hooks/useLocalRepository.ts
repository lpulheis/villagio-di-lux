import { useMemo } from 'react';
import { CSVRepository } from '../repositories/CSVRepository';
import type { RegistrationRepository } from '../repositories/RegistrationRepository';

export const useLocalRepository = (): RegistrationRepository => useMemo(() => new CSVRepository(), []);
