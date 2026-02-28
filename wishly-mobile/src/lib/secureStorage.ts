import EncryptedStorage from 'react-native-encrypted-storage';

export const SecureStorage = {
  getItem: async (key: string) => {
    try {
      return await EncryptedStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await EncryptedStorage.setItem(key, value);
    } catch (error) {
      if (__DEV__) console.warn('SecureStorage.setItem error', error);
    }
  },
  deleteItem: async (key: string) => {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (error) {
      // Игнорируем ошибку: библиотека ругается, если ключа и так не было в хранилище,
      // что для нас означает успешное удаление.
    }
  },
};
