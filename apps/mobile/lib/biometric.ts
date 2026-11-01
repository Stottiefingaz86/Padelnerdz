import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform } from 'react-native';

const KEY = 'pn.biometricLock.v1';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'none';

export type UnlockResult = {
  success: boolean;
  /** Human-readable reason when success is false */
  error?: string;
};

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

/** Clear lock without biometrics — escape hatch when Face ID is broken. */
export async function clearBiometricLock(): Promise<void> {
  await AsyncStorage.setItem(KEY, '0');
}

/** Which biometric hardware types this device supports. */
export async function getBiometricKind(): Promise<BiometricKind> {
  if (Platform.OS === 'web') return 'none';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
  } catch {
    /* ignore */
  }
  return 'none';
}

export function biometricLabel(kind: BiometricKind): string {
  if (Platform.OS === 'ios' && kind === 'face') return 'Face ID';
  if (Platform.OS === 'ios' && kind === 'fingerprint') return 'Touch ID';
  if (kind === 'face') return 'Face unlock';
  if (kind === 'fingerprint') return 'Fingerprint';
  if (kind === 'iris') return 'Iris unlock';
  return 'Biometrics';
}

export async function canUseBiometric(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const has = await LocalAuthentication.hasHardwareAsync();
    if (!has) return false;
    const kind = await getBiometricKind();
    if (kind === 'none') return false;
    return LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

function waitForAppActive(timeoutMs = 4000): Promise<void> {
  if (Platform.OS === 'web' || AppState.currentState === 'active') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      sub.remove();
      resolve();
    }, timeoutMs);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        clearTimeout(t);
        sub.remove();
        resolve();
      }
    });
  });
}

type AuthAttempt = LocalAuthentication.LocalAuthenticationResult & {
  warning?: string;
};

function authError(result: AuthAttempt): string | undefined {
  if (result.success) return undefined;
  return String(result.error ?? '');
}

/**
 * Launch the system Face ID / biometrics sheet.
 * Always calls authenticateAsync — never soft-skip (that looked like a dead button).
 */
async function presentBiometricPrompt(input: {
  promptMessage: string;
  /** true = Face ID only (no passcode sheet). false = Face ID first, passcode fallback. */
  biometricsOnly: boolean;
}): Promise<AuthAttempt> {
  await waitForAppActive();
  // Let the branded lock screen paint before the system sheet
  await new Promise((r) => setTimeout(r, 160));

  return LocalAuthentication.authenticateAsync({
    promptMessage: input.promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: input.biometricsOnly,
    // Empty string hides the "Enter Password" button when biometrics-only.
    ...(input.biometricsOnly ? { fallbackLabel: '' } : { fallbackLabel: 'Use passcode' }),
  }) as Promise<AuthAttempt>;
}

function mapAuthFailure(result: AuthAttempt, label: string): UnlockResult {
  const reason = authError(result);
  const warning = result.warning;

  if (reason === 'missing_usage_description' || warning?.includes('NSFaceIDUsageDescription')) {
    return {
      success: false,
      error:
        'This app install is missing Face ID permission. Rebuild the iOS app (EAS/dev client) so Face ID can launch.',
    };
  }
  if (reason === 'user_cancel' || reason === 'system_cancel' || reason === 'app_cancel') {
    return { success: false, error: 'Cancelled — tap Unlock to try Face ID again' };
  }
  if (reason === 'not_enrolled') {
    return {
      success: false,
      error: `No ${label} enrolled. Add it in iPhone Settings, or unlock with passcode.`,
    };
  }
  if (reason === 'not_available') {
    return {
      success: false,
      error: `${label} isn’t available right now. Try passcode, or turn off app lock.`,
    };
  }
  if (reason === 'lockout') {
    return {
      success: false,
      error: `${label} is locked out. Use device passcode.`,
    };
  }
  if (reason === 'passcode_not_set') {
    return {
      success: false,
      error: 'Set a device passcode in iPhone Settings to use app lock.',
    };
  }
  return {
    success: false,
    error: reason
      ? `Face ID didn’t start (${reason}). Tap Unlock to retry.`
      : `Couldn’t start ${label}. Tap Unlock to retry.`,
  };
}

/**
 * Confirm biometrics when turning app lock on.
 */
export async function confirmBiometricEnrollment(): Promise<boolean> {
  if (!(await canUseBiometric())) return false;
  const kind = await getBiometricKind();
  const result = await presentBiometricPrompt({
    promptMessage: `Enable ${biometricLabel(kind)} for Padel Nerdz`,
    biometricsOnly: true,
  });
  if (result.success) return true;
  // If biometrics-only failed due to missing plist, try once with passcode policy
  // so enrolment isn’t a brick on old binaries.
  if (authError(result) === 'missing_usage_description') {
    const retry = await presentBiometricPrompt({
      promptMessage: `Enable ${biometricLabel(kind)} for Padel Nerdz`,
      biometricsOnly: false,
    });
    return retry.success;
  }
  return false;
}

/**
 * Prompt Face ID by default. Optionally allow device passcode as fallback.
 */
export async function unlockWithBiometric(options?: {
  allowDeviceFallback?: boolean;
}): Promise<UnlockResult> {
  if (!(await isBiometricLockEnabled())) {
    return { success: true };
  }

  const kind = await getBiometricKind();
  const label = biometricLabel(kind);
  const allowFallback = options?.allowDeviceFallback === true;

  try {
    const result = await presentBiometricPrompt({
      promptMessage: `Unlock Padel Nerdz`,
      biometricsOnly: !allowFallback,
    });

    if (result.success) return { success: true };

    // Old native binary without NSFaceIDUsageDescription: biometrics-only returns
    // immediately with no UI. Retry with passcode policy so the user isn't stuck.
    if (
      !allowFallback &&
      (authError(result) === 'missing_usage_description' ||
        result.warning?.includes('NSFaceIDUsageDescription'))
    ) {
      const retry = await presentBiometricPrompt({
        promptMessage: `Unlock Padel Nerdz`,
        biometricsOnly: false,
      });
      if (retry.success) return { success: true };
      return mapAuthFailure(retry, label);
    }

    return mapAuthFailure(result, label);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Authentication failed';
    return {
      success: false,
      error: `${msg}. If this keeps happening, rebuild the iOS app with Face ID permission.`,
    };
  }
}
