import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getMimeType } from './exportDetector';

/**
 * Writes content to a file with the given filename and opens the native share sheet.
 */
export async function exportFile(content: string, filename: string): Promise<void> {
  try {
    const uri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(uri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error('Le fichier n\'a pas ete cree');
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Export', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: getMimeType(filename),
      dialogTitle: filename,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    Alert.alert('Erreur d\'export', message);
  }
}
