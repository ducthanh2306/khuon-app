import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const VAULT_IMG_DIR = 'vault-images';

export async function persistVaultImage(
  sourceUri: string,
  sourceWidth?: number
): Promise<string> {
  const actions: ImageManipulator.Action[] =
    sourceWidth && sourceWidth > 1600 ? [{ resize: { width: 1600 } }] : [];

  const processed = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: 0.86,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  try {
    const dir = new Directory(Paths.document, VAULT_IMG_DIR);
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
    const name = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const targetFile = new File(dir, name);
    const srcFile = new File(processed.uri);
    srcFile.copy(targetFile);
    return targetFile.uri;
  } catch {
    return processed.uri;
  }
}

export async function persistBase64VaultImage(base64Png: string): Promise<string> {
  const dataUri = base64Png.startsWith('data:')
    ? base64Png
    : `data:image/png;base64,${base64Png}`;
  const cleanBase64 = dataUri.replace(/^data:image\/\w+;base64,/, '');

  try {
    const dir = new Directory(Paths.document, VAULT_IMG_DIR);
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
    const name = `qr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;
    const targetFile = new File(dir, name);
    targetFile.create({ overwrite: true });
    targetFile.write(cleanBase64, { encoding: 'base64' });
    return targetFile.uri;
  } catch {
    return dataUri;
  }
}

export async function deleteVaultImage(uri?: string): Promise<void> {
  if (!uri || !uri.includes(VAULT_IMG_DIR)) return;
  try {
    const f = new File(uri);
    if (f.exists) {
      f.delete();
    }
  } catch {
    // Ignore cleanup errors
  }
}
