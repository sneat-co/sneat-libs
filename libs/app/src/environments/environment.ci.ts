import { IEnvironmentConfig } from '../lib/environment-config';
import { emulatorEnvironmentConfig } from './environment.base';

const useEmulators = true;

export const environmentConfig: IEnvironmentConfig = {
  ...emulatorEnvironmentConfig,
  useEmulators,
};
