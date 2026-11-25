import { Camera } from 'expo-camera';

export async function decodeQrFromImageUri(uri: string): Promise<string | null> {
  try {
    const results = await Camera.scanFromURLAsync(uri, ['qr']);
    if (results && results.length > 0 && results[0].data) {
      return results[0].data;
    }
    return null;
  } catch {
    return null;
  }
}
