import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

const KEY = 'pn.biometricLock.v1';

export async function isBiometricLockEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setBiometricLockEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}

export async function canUseBiometric(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const has = await LocalAuthentication.hasHardwareAsync();
  if (!has) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/** Prompt Face ID / fingerprint. Returns true if unlocked or lock disabled. */
export async function unlockWithBiometric(): Promise<boolean> {
  if (!(await isBiometricLockEnabled())) return true;
  if (!(await canUseBiometric())) return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Padel Nerdz',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
