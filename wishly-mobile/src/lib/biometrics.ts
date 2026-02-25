import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export async function isBiometricsAvailable(): Promise<boolean> {
  const { available } = await rnBiometrics.isSensorAvailable();
  return available;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Подтвердите личность',
      cancelButtonText: 'Отмена',
    });
    return success;
  } catch {
    return false;
  }
}
