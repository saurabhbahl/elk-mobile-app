import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStorage[key] || null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`[AsyncStorage] Fallback to memory for getItem(${key}):`, error);
      return memoryStorage[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        memoryStorage[key] = value;
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[AsyncStorage] Fallback to memory for setItem(${key}):`, error);
      memoryStorage[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        delete memoryStorage[key];
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[AsyncStorage] Fallback to memory for removeItem(${key}):`, error);
      delete memoryStorage[key];
    }
  }
};
