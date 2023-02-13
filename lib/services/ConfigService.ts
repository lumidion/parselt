import { FileTypes, InstanceConfig, ParseltConfig } from '../config/config.js'
import { FileMetadata, FileService } from './FileService.js'
import { allLanguageCodes, priorityLangs } from './languageCodes.js'
import { UserInputService } from './UserInputService.js'

interface ScannedFile {
    languageCode: string
    parentPath: string
    name: string
}

interface RawInstance {
    languagesCodesFound: string[]
    instancePath: string
    fileType: FileTypes
    files: ScannedFile[]
    isMultiDirectory: boolean
    filePrefix?: string
}

interface ConfigMetadata {
    uniqueLanguageCodes: string[]
    instances: RawInstance[]
}

interface LanguageCodeRegex {
    languageCode: string
    regex: RegExp
    indicatesFilePrefix?: boolean
}

export class ConfigService {
    constructor(private fileService: FileService, private userInputService: UserInputService) {}

    private getUniqueLanguageCodesFromInstances(instances: RawInstance[]): string[] {
        const currentPriorityLangs: string[] = []
        const allUniqueLanguageCodes = instances
            .flatMap((instance) => instance.languagesCodesFound)
            .filter((value, index, self) => {
                const isPriority = priorityLangs.indexOf(value) > -1
                if (isPriority && currentPriorityLangs.indexOf(value) === -1) {
                    currentPriorityLangs.push(value)
                }
                return self.indexOf(value) === index && !isPriority
            })
            .sort()

        return currentPriorityLangs.sort().concat(allUniqueLanguageCodes)
    }

    private getPrefixFromFileName(fileName: string, languageCode: string): string | undefined {
        const extensionRegex = /\.(?:.(?!\.))+$/
        const languageCodeRegex = new RegExp(`${languageCode}\\.`)

        const prefix = fileName
            .replace(extensionRegex, '')
            .concat('.')
            .replace(languageCodeRegex, '')
            .replace(/\.$/, '') //extension is removed by referring to last period before the end. This period is added back on and the language code is removed with the period following it. If there is still something left, that is the prefix and the period needs to be removed again.

        return prefix !== '' ? prefix : undefined
    }

    private scanConfigMetadataFromFiles(files: FileMetadata[]): ConfigMetadata {
        const dirRegexes: LanguageCodeRegex[] = []
        const fileRegexes: LanguageCodeRegex[] = []

        allLanguageCodes.forEach((languageCode) => {
            dirRegexes.push({ regex: new RegExp(`.*\\/${languageCode}\\/`), languageCode }) // subdirectory
            dirRegexes.push({ regex: new RegExp(`.*\\/${languageCode}$`), languageCode }) // last directory
            fileRegexes.push({ regex: new RegExp(`^${languageCode}\\.`), languageCode, indicatesFilePrefix: false }) // file without prefix
            fileRegexes.push({ regex: new RegExp(`\\.${languageCode}\\.`), languageCode, indicatesFilePrefix: true }) // TODO: this is to support prefixes, but we don't currently support this completely.
        })

        const instanceStore: Record<string, RawInstance> = {}
        const instancePaths: string[] = []

        const updateLanguageCodes = (languageCode: string, directoryPath: string): void => {
            if (!instanceStore[directoryPath].languagesCodesFound.includes(languageCode)) {
                instanceStore[directoryPath].languagesCodesFound.push(languageCode)
            }
        }

        files.forEach((file) => {
            let isDirectoryFound = false
            for (let i = 0; i < dirRegexes.length; i++) {
                const directoryMatch = file.parentPath.match(dirRegexes[i].regex)
                if (directoryMatch) {
                    const currentLanguageCode = dirRegexes[i].languageCode

                    const parentOfDirectory = directoryMatch[0]
                        .replace(new RegExp(`/${currentLanguageCode}/.*$`), '')
                        .replace(new RegExp(`/${currentLanguageCode}$`), '')

                    if (!instancePaths.includes(parentOfDirectory)) {
                        instancePaths.push(parentOfDirectory)

                        instanceStore[parentOfDirectory] = {
                            languagesCodesFound: [currentLanguageCode],
                            instancePath: parentOfDirectory,
                            fileType: file.fileType,
                            files: [
                                { name: file.name, languageCode: currentLanguageCode, parentPath: file.parentPath },
                            ],
                            isMultiDirectory: true,
                        }
                    } else {
                        updateLanguageCodes(currentLanguageCode, parentOfDirectory)
                        instanceStore[parentOfDirectory].files.push({
                            name: file.name,
                            languageCode: currentLanguageCode,
                            parentPath: file.parentPath,
                        })
                    }

                    // TODO - add directory problems (such as that yaml and json are mixed). Add also in file name matcher below

                    isDirectoryFound = true
                    break
                }
            }

            if (!isDirectoryFound) {
                for (let i = 0; i < fileRegexes.length; i++) {
                    if (file.name.match(fileRegexes[i].regex)) {
                        const currentLanguageCode = fileRegexes[i].languageCode
                        const filePrefix = this.getPrefixFromFileName(file.name, currentLanguageCode)

                        const directoryPath = file.parentPath.replace(new RegExp(`/${file.name}`), '')
                        const instanceKey = filePrefix ? `${directoryPath}-${filePrefix}` : directoryPath

                        if (!instancePaths.includes(instanceKey)) {
                            instancePaths.push(instanceKey)

                            instanceStore[instanceKey] = {
                                languagesCodesFound: [currentLanguageCode],
                                instancePath: directoryPath,
                                fileType: file.fileType,
                                files: [
                                    { name: file.name, languageCode: currentLanguageCode, parentPath: file.parentPath },
                                ],
                                isMultiDirectory: false,
                                ...(filePrefix ? { filePrefix } : {}),
                            }
                        } else {
                            updateLanguageCodes(currentLanguageCode, instanceKey)
                            instanceStore[instanceKey].files.push({
                                name: file.name,
                                languageCode: currentLanguageCode,
                                parentPath: file.parentPath,
                            })
                        }

                        break
                    }
                }
            }
        })

        const instances = Object.values(instanceStore)

        return {
            uniqueLanguageCodes: this.getUniqueLanguageCodesFromInstances(instances),
            instances,
        }
    }

    private async getMainLangOrThrow(configMetadata: ConfigMetadata): Promise<string> {
        const mainLanguage = await this.userInputService.promptForMainLanguageFromCodes(
            configMetadata.uniqueLanguageCodes
        )
        const instancesWithoutMainLanguage: { path: string; codes: string[] }[] = configMetadata.instances
            .filter((instance) => instance.languagesCodesFound.indexOf(mainLanguage) === -1)
            .map((instance) => {
                return {
                    path: instance.instancePath,
                    codes: instance.languagesCodesFound,
                }
            })

        if (instancesWithoutMainLanguage.length > 0) {
            const errorPathMessages = instancesWithoutMainLanguage
                .map((instance) => `Path: ${instance.path}. Available languages: ${instance.codes.join(', ')}`)
                .join('\n')
            throw new Error(
                `The following directories do not contain the selected main language: ${mainLanguage}. \nPlease verify that the correct language is present in these paths and try again:\n\n${errorPathMessages}`
            )
        }

        return mainLanguage
    }

    async getParseltConfigForRoot(rootPath: string): Promise<ParseltConfig> {
        const filesMetadata = this.fileService.getSerializedFileMetadataFromDir(rootPath)
        const configMetadata = this.scanConfigMetadataFromFiles(filesMetadata)

        if (configMetadata.instances.length > 0) {
            const mainLanguage = await this.getMainLangOrThrow(configMetadata)
            const config = this.getParseltConfigFromRawData(configMetadata.instances, mainLanguage, rootPath)
            return config.instances.length === 1
                ? await Promise.resolve(config)
                : await this.userInputService.promptForConfigInstanceNames(config)
        } else {
            return this.userInputService.promptForConfig()
        }
    }

    private shouldFirstKeyBeCheckedForFile(filePath: string): boolean {
        const fileObj = this.fileService.getSerializedFileAsObject(filePath)
        const keys = fileObj ? Object.keys(fileObj) : []

        if (keys.length === 1) {
            return allLanguageCodes.indexOf(keys[0]) === -1
        } else return true
    }

    private getParseltConfigFromRawData(
        rawInstances: RawInstance[],
        mainLanguageCode: string,
        currentWorkingDirectory: string
    ): ParseltConfig {
        const instances: InstanceConfig[] = rawInstances.map((instance, index) => {
            const relativeInstancePath = instance.instancePath.replace(`${currentWorkingDirectory}`, '.')
            const instanceName = index === 0 ? 'main' : `instance_${index.toString()}`

            if (instance.isMultiDirectory) {
                const firstSerializedFilePath = this.fileService.getFirstSerializedFilePathFromDir(
                    `${instance.instancePath}/${mainLanguageCode}`
                )
                const indentation = firstSerializedFilePath
                    ? this.fileService.getIndentationFromSerializedFile(firstSerializedFilePath)
                    : 2

                return {
                    name: instanceName,
                    rootDirectoryPath: relativeInstancePath,
                    indentation,
                    fileType: instance.fileType,
                    isMultiDirectory: true,
                    mainDirectoryName: mainLanguageCode,
                }
            } else {
                const mainFileName = instance.files.filter((file) => file.languageCode === mainLanguageCode)[0].name
                const mainFilePath = `${relativeInstancePath}/${mainFileName}`
                const indentation = this.fileService.getIndentationFromSerializedFile(mainFilePath)
                const shouldCheckFirstKey = this.shouldFirstKeyBeCheckedForFile(mainFilePath)

                return {
                    name: instanceName,
                    rootDirectoryPath: relativeInstancePath,
                    indentation,
                    fileType: instance.fileType,
                    isMultiDirectory: false,
                    mainFileName,
                    ...(shouldCheckFirstKey ? {} : { shouldCheckFirstKey: false }),
                    ...(instance.filePrefix ? { filePrefix: instance.filePrefix } : {}),
                }
            }
        })

        return {
            instances,
        }
    }
}
