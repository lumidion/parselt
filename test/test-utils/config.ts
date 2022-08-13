import { FileTypes, ParseltConfig } from '../../lib/config'

export const createConfig = (dirName: string): ParseltConfig => {
    const dirPath = `./test/test-directories/${dirName}`
    return {
        instances: [
            {
                name: 'single-json-dir',
                mainFileName: 'en.json',
                isMultiDirectory: false,
                rootDirectoryPath: `${dirPath}/single-json-dir`,
                fileType: FileTypes.JSON,
                indentation: 2,
            },
            {
                name: 'single-json-dir-with-prefix',
                mainFileName: 'auth.en.json',
                isMultiDirectory: false,
                rootDirectoryPath: `${dirPath}/single-json-dir-with-prefix`,
                fileType: FileTypes.JSON,
                filePrefix: 'auth',
                indentation: 2,
            },
            {
                name: 'single-yaml-dir',
                mainFileName: 'en.yaml',
                isMultiDirectory: false,
                rootDirectoryPath: `${dirPath}/single-yaml-dir`,
                fileType: FileTypes.YAML,
                indentation: 2,
            },
            {
                name: 'single-yaml-dir-with-prefix',
                mainFileName: 'auth.en.yaml',
                isMultiDirectory: false,
                rootDirectoryPath: `${dirPath}/single-yaml-dir-with-prefix`,
                fileType: FileTypes.YAML,
                filePrefix: 'auth',
                indentation: 2,
            },
            {
                name: 'multi-json-dir',
                mainDirectoryName: 'en',
                isMultiDirectory: true,
                rootDirectoryPath: `${dirPath}/multi-json-dir`,
                fileType: FileTypes.JSON,
                indentation: 2,
            },
            {
                name: 'multi-yaml-dir',
                mainDirectoryName: 'en',
                isMultiDirectory: true,
                rootDirectoryPath: `${dirPath}/multi-yaml-dir`,
                fileType: FileTypes.YAML,
                indentation: 2,
            },
        ],
    }
}
