import * as ImageManipulator from 'expo-image-manipulator';

export async function persistVaultImage(
  sourceUri: string,
  sourceWidth?: number
): Promise<string> {
  const actions: ImageManipulator.Action[] =
    sourceWidth && sourceWidth > 1000 ? [{ resize: { width: 1000 } }] : [];

  const processed = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: 0.78,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (processed.base64) {
    return `data:image/jpeg;base64,${processed.base64}`;
  }
  return processed.uri;
}

export async function persistBase64VaultImage(base64Png: string): Promise<string> {
  return base64Png.startsWith('data:')
    ? base64Png
    : `data:image/png;base64,${base64Png}`;
}

export async function deleteVaultImage(_uri?: string): Promise<void> {
  // No file deletion required on web data URIs
}
