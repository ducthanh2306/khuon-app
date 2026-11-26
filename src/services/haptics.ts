import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export async function hapticTap(weight: 'light' | 'medium' = 'light'): Promise<void> {
  if (!hapticsEnabled || Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(
      weight === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
  } catch {
    // Ignore on devices without haptic motor
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!hapticsEnabled || Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignore on unsupported devices
  }
}
