import Share from 'react-native-share';

export async function shareCase(zipPath: string): Promise<void> {
  await Share.open({
    title: 'Share verified case archive',
    url: `file://${zipPath}`,
    type: 'application/zip',
    failOnCancel: false,
  });
}
