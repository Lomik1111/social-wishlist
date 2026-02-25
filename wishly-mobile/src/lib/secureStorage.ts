import EncryptedStorage from 'react-native-encrypted-storage';

export const SecureStorage = {
  getItem: async (key: string) => {
    try {
      return await EncryptedStorage.getItem(key);
    } catch (error) {
      console.error('SecureStorage.getItem error', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await EncryptedStorage.setItem(key, value);
    } catch (error) {
      console.error('SecureStorage.setItem error', error);
    }
  },
  deleteItem: async (key: string) => {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (error) {
      console.error('SecureStorage.deleteItem error', error);
    }
  },
};
