import { FileTypes, ParseltConfig } from '../../lib/config/config'
import { ConfigService } from '../../lib/services/ConfigService'
import { FileService } from '../../lib/services/FileService'
import { UserInputService } from '../../lib/services/UserInputService'
import { jest } from '@jest/globals'

describe('ConfigService', () => {
    describe('#getParseltConfigForRoot', () => {
        const rootProjectPath = '/home/user/userName/project'
        const relativeRootProjectPath = './src/i18n/locales'
        const fullLangDirPath = `${rootProjectPath}/src/i18n/locales`
        const configFromUserInput: ParseltConfig = {
            instances: [
                {
                    name: 'testInstance',
                    isMultiDirectory: true,
                    mainDirectoryName: 'en',
                    indentation: 2,
                    fileType: FileTypes.JSON,
                    rootDirectoryPath: relativeRootProjectPath,
                },
            ],
        }

        it('should get config from user input when no files are found', async () => {
            const fileService = new FileService()
            jest.spyOn(fileService, 'getSerializedFileMetadataFromDir').mockImplementationOnce(() => [])

            const userInputService = new UserInputService()

            jest.spyOn(userInputService, 'promptForConfig').mockImplementationOnce(async () =>
                Promise.resolve(configFromUserInput)
            )
            const configService = new ConfigService(fileService, userInputService)

            const result = await configService.getParseltConfigForRoot('root')
            expect(result).toStrictEqual(configFromUserInput)
        })

        it('should get config from user input when no files with appropriate language code are found', async () => {
            const fileService = new FileService()
            jest.spyOn(fileService, 'getSerializedFileMetadataFromDir').mockImplementationOnce(() => [
                {
                    name: 'general.json',
                    parentPath: `${fullLangDirPath}/sampleLanguageName`,
                    fileType: FileTypes.JSON,
                },
            ])

            const userInputService = new UserInputService()

            jest.spyOn(userInputService, 'promptForConfig').mockImplementationOnce(async () =>
                Promise.resolve(configFromUserInput)
            )
            const configService = new ConfigService(fileService, userInputService)

            const result = await configService.getParseltConfigForRoot('root')
            expect(result).toStrictEqual(configFromUserInput)
        })

        it('should get config for files in multidirectory with subdirectories', async () => {
            const fileService = new FileService()
            
            jest.spyOn(fileService, 'getSerializedFileMetadataFromDir').mockImplementationOnce(() => [
                {
                    name: 'general.json',
                    parentPath: `${fullLangDirPath}/en`,
                    fileType: FileTypes.JSON,
                },
                {
                    name: 'account.json',
                    parentPath: `${fullLangDirPath}/en/settings`,
                    fileType: FileTypes.JSON,
                },
                {
                    name: 'general.json',
                    parentPath: `${fullLangDirPath}/fr`,
                    fileType: FileTypes.JSON,
                },
                {
                    name: 'utils.json',
                    parentPath: `${fullLangDirPath}/utils`,
                    fileType: FileTypes.JSON,
                },
            ])

            const userInputService = new UserInputService()

            jest.spyOn(userInputService, 'promptForMainLanguageFromCodes').mockImplementationOnce(async () => {
                return Promise.resolve('en')
            })

            jest.spyOn(userInputService, 'promptForConfigInstanceNames').mockImplementationOnce(async (config) => {
                return Promise.resolve(config)
            })

            jest.spyOn(fileService, 'getFirstSerializedFilePathFromDir').mockImplementationOnce(() => `${fullLangDirPath}/en/general.json`)
            jest.spyOn(fileService, 'getIndentationFromSerializedFile').mockImplementation(() => 4)
            const configService = new ConfigService(fileService, userInputService)

            const result = await configService.getParseltConfigForRoot(rootProjectPath)
            const expectedResult: ParseltConfig = {
                instances: [{
                    name: 'main',
                    isMultiDirectory: true,
                    mainDirectoryName: 'en',
                    indentation: 4,
                    fileType: FileTypes.JSON,
                    rootDirectoryPath: relativeRootProjectPath
                }]
            }
            expect(result).toStrictEqual(expectedResult)
        })

        it('should get multiple configs for files in single directory when some have prefixes', async () => {
            const fileService = new FileService()
            jest.spyOn(fileService, 'getSerializedFileMetadataFromDir').mockImplementationOnce(() => [
                {
                    name: 'en.yaml',
                    parentPath: `${fullLangDirPath}`,
                    fileType: FileTypes.YAML,
                },
                {
                    name: 'fr.yaml',
                    parentPath: `${fullLangDirPath}`,
                    fileType: FileTypes.YAML,
                },
                {
                    name: 'auth.en.yaml',
                    parentPath: `${fullLangDirPath}`,
                    fileType: FileTypes.YAML,
                },
                {
                    name: 'auth.fr.yaml',
                    parentPath: `${fullLangDirPath}`,
                    fileType: FileTypes.YAML,
                },
            ])

            const userInputService = new UserInputService()

            jest.spyOn(userInputService, 'promptForMainLanguageFromCodes').mockImplementationOnce(async () => {
                return Promise.resolve('fr')
            })

            jest.spyOn(userInputService, 'promptForConfigInstanceNames').mockImplementationOnce(async (config) => {
                return Promise.resolve(config)
            })

            jest.spyOn(fileService, 'getFirstSerializedFilePathFromDir').mockImplementation(() => `${fullLangDirPath}/someFileUsefulForIndentation.yaml`)
            jest.spyOn(fileService, 'getIndentationFromSerializedFile').mockImplementation(() => 4)
            const configService = new ConfigService(fileService, userInputService)

            const result = await configService.getParseltConfigForRoot(rootProjectPath)
            const expectedResult: ParseltConfig = {
                instances: [{
                    name: 'main',
                    isMultiDirectory: false,
                    mainFileName: 'fr.yaml',
                    indentation: 4,
                    fileType: FileTypes.YAML,
                    rootDirectoryPath: relativeRootProjectPath
                },
                {
                    name: 'instance_1',
                    isMultiDirectory: false,
                    mainFileName: 'auth.fr.yaml',
                    filePrefix: 'auth',
                    indentation: 4,
                    fileType: FileTypes.YAML,
                    rootDirectoryPath: relativeRootProjectPath
                }]
            }
            expect(result).toStrictEqual(expectedResult)
        })

        it('should get a config that skips the first key in the file when the first key is a language code', async () => {
            const fileService = new FileService()
            jest.spyOn(fileService, 'getSerializedFileMetadataFromDir').mockImplementationOnce(() => [
                {
                    name: 'de.yaml',
                    parentPath: `${fullLangDirPath}`,
                    fileType: FileTypes.YAML,
                },
                {
                    name: 'es.yaml',
                    parentPath: `${fullLangDirPath}`,
                    fileType: FileTypes.YAML,
                },
            ])

            const userInputService = new UserInputService()

            jest.spyOn(userInputService, 'promptForMainLanguageFromCodes').mockImplementationOnce(async () => {
                return Promise.resolve('es')
            })

            jest.spyOn(userInputService, 'promptForConfigInstanceNames').mockImplementationOnce(async (config) => {
                return Promise.resolve(config)
            })

            jest.spyOn(fileService, 'getFirstSerializedFilePathFromDir').mockImplementation(() => `${fullLangDirPath}/es.yaml`)
            jest.spyOn(fileService, 'getIndentationFromSerializedFile').mockImplementation(() => 4)
            jest.spyOn(fileService, 'getSerializedFileAsObject').mockImplementation(() => {
                return {
                    de: {sample: 'sample'}
                }
             })
            const configService = new ConfigService(fileService, userInputService)

            const result = await configService.getParseltConfigForRoot(rootProjectPath)
            const expectedResult: ParseltConfig = {
                instances: [{
                    name: 'main',
                    isMultiDirectory: false,
                    mainFileName: 'es.yaml',
                    indentation: 4,
                    fileType: FileTypes.YAML,
                    shouldCheckFirstKey: false,
                    rootDirectoryPath: relativeRootProjectPath
                }]
            }
            expect(result).toStrictEqual(expectedResult)
        })
    })
})
