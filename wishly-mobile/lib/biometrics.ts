import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricsAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const available = await isBiometricsAvailable();
  if (!available) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Войти в Wishly',
    fallbackLabel: 'Ввести пароль',
    cancelLabel: 'Отмена',
    disableDeviceFallback: false,
  });
  return result.success;
}
