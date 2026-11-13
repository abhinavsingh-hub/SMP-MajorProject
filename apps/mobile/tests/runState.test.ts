jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    readFile: jest.fn(),
    exists: jest.fn(async () => true),
    DocumentDirectoryPath: '/documents',
    readDir: jest.fn(async () => []),
  },
}));

import RNFS from 'react-native-fs';
import { readRunState } from '../src/evidence/runState';

describe('readRunState', () => {
  it('ignores corrupted run state without throwing', async () => {
    (RNFS.readFile as jest.Mock).mockResolvedValueOnce('{broken');
    await expect(readRunState('/cases/CASE-1')).resolves.toBeNull();
  });
});
