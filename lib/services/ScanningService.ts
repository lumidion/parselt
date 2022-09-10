import { MultiDirectoryInstanceConfig, SingleDirectoryInstanceConfig } from '../config/config'
import { IScanningError, PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from '../errorCollector'
import { FileService } from './FileService'

export interface IScanResult {
    errors: IScanningError[]
    warnings: IScanningError[]
}

interface ScanValueParams {
    mainValueParentKey: string
    mainValue: any
    childValue: any
    mainKeyPath: string
    childKeyPath: string
    mainFilePath: string
    childFilePath: string
}

interface CompareObjectsParams {
    mainObject: any
    childObject: any
    mainKeyPath?: string
    childKeyPath?: string
    mainFilePath: string
    childFilePath: string
}

export class ScanningService {
    private readonly errorCollector: ScanningErrorsCollector
    private readonly fileService: FileService
    constructor(errorCollector: ScanningErrorsCollector, fileService: FileService) {
        this.fileService = fileService
        this.errorCollector = errorCollector
    }

    private checkForMissingFilesInChild(
        rootDirectoryPath: string,
        mainFileNames: string[],
        childFileNames: string[]
    ): void {
        if (mainFileNames.length !== childFileNames.length) {
            mainFileNames.forEach((name) => {
                if (!childFileNames.includes(name)) {
                    this.errorCollector.addError({
                        type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                        path: `${rootDirectoryPath}/${name}`,
                        pathType: PathTypes.FILE,
                        msg: `File could not be parsed for scanning. Please make sure that the file exists and that the file structure is correct.`,
                    })
                }
            })
        }
    }

    compareDirectories(config: MultiDirectoryInstanceConfig): void {
        const dirs = this.fileService.loadAllFromDirectory(config.rootDirectoryPath)

        const mainObj: any = {}

        this.fileService.mapFileObjectsInDirectory<string>(
            `${config.rootDirectoryPath}/${config.mainDirectoryName}`,
            config.fileType,
            false
        )((fileName, childObj) => {
            mainObj[fileName] = childObj
            return fileName
        })

        if (Object.keys(mainObj).length > 0) {
            dirs.forEach((directory) => {
                if (directory.isDirectory() && directory.name !== config.mainDirectoryName) {
                    const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`

                    const correspondingScannedFiles: string[] = []
                    this.fileService.mapFileObjectsInDirectory(
                        currentDirectoryPath,
                        config.fileType,
                        false
                    )((fileName, childObj) => {
                        const childFilePath = `${currentDirectoryPath}/${fileName}`
                        if (mainObj[fileName] !== undefined) {
                            const mainFilePath = `${config.rootDirectoryPath}/${config.mainDirectoryName}/${fileName}`
                            this.compareObjects({
                                mainObject: mainObj[fileName],
                                childObject: childObj,
                                mainFilePath,
                                childFilePath,
                            })
                            correspondingScannedFiles.push(fileName)
                        } else {
                            this.errorCollector.addError({
                                type: ScanningErrorTypes.EXTRA_FILE_FOUND,
                                path: childFilePath,
                                pathType: PathTypes.FILE,
                            })
                        }
                    })
                    const mainFileNames = Object.keys(mainObj)
                    this.checkForMissingFilesInChild(currentDirectoryPath, mainFileNames, correspondingScannedFiles)
                }
            })
        }
    }

    compareFiles = (config: SingleDirectoryInstanceConfig): void => {
        const mainObj = this.fileService.getFileAsObject(`${config.rootDirectoryPath}/${config.mainFileName}`)

        if (mainObj !== undefined) {
            const mainFilePath = `${config.rootDirectoryPath}/${config.mainFileName}`
            this.fileService.mapFileObjectsInDirectory(
                config.rootDirectoryPath,
                config.fileType,
                false,
                config.filePrefix
            )((fileName, childObj) => {
                if (fileName === config.mainFileName) {
                    return
                } else {
                    const childFilePath = `${config.rootDirectoryPath}/${fileName}`
                    if (config.shouldCheckFirstKey === true || config.shouldCheckFirstKey === undefined) {
                        this.compareObjects({
                            mainObject: mainObj,
                            childObject: childObj,
                            mainFilePath,
                            childFilePath,
                        })
                    } else {
                        const subMainObject = Object.values(mainObj)[0]
                        const subChildObject = Object.values(childObj)[0]
                        this.compareObjects({
                            mainObject: subMainObject,
                            childObject: subChildObject,
                            mainKeyPath: Object.keys(mainObj)[0],
                            childKeyPath: Object.keys(childObj)[0],
                            mainFilePath,
                            childFilePath,
                        })
                    }
                }
            })
        }
    }

    private scanValue({
        mainValueParentKey,
        mainValue,
        childValue,
        mainKeyPath,
        childKeyPath,
        mainFilePath,
        childFilePath,
    }: ScanValueParams) {
        if (typeof mainValue === 'object') {
            this.compareObjects({
                mainObject: mainValue,
                childObject: childValue,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
            })
        } else if (mainValue === null || '') {
            this.errorCollector.addError({
                type: ScanningErrorTypes.EMPTY_VALUE,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
                keyName: mainValueParentKey,
            })
        } else if (mainValue === childValue) {
            this.errorCollector.addWarning({
                type: ScanningErrorTypes.SAME_VALUE_TYPES,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
                keyName: mainValueParentKey,
            })
        }
    }

    private getKeyPathFromKeyAndPath = (key: string, path: string | undefined) => {
        return path ? `${path}.${key}` : key
    }

    private compareObjects = ({
        mainObject,
        childObject,
        mainKeyPath,
        childKeyPath,
        mainFilePath,
        childFilePath,
    }: CompareObjectsParams): void => {
        if (Array.isArray(mainObject) && Array.isArray(childObject)) {
            return
        } else if (Array.isArray(mainObject) !== Array.isArray(childObject)) {
            this.errorCollector.addError({
                type: ScanningErrorTypes.DIFFERENT_COLLECTION_TYPES,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
            })
        } else if (childObject === null) {
            this.errorCollector.addError({
                type: ScanningErrorTypes.EMPTY_VALUE,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
                keyName: childKeyPath ? childKeyPath : '',
            })
        } else if (mainObject === null) {
            return
        } else if (typeof mainObject === 'object' && typeof childObject === 'object') {
            const mainObjectKeys = Object.keys(mainObject)
            const childObjectKeys = Object.keys(childObject)

            let shouldReportAlphabeticalOrderErrors = true

            if (childObjectKeys.length > mainObjectKeys.length) {
                const missingKeys: string[] = []
                childObjectKeys.forEach((key) => {
                    if (mainObjectKeys.indexOf(key) === -1) {
                        missingKeys.push(key)
                    }
                })
                this.errorCollector.addError({
                    type: ScanningErrorTypes.GREATER_NUMBER_OF_CHILD_KEYS,
                    mainKeyPath,
                    childKeyPath,
                    mainFilePath,
                    childFilePath,
                    keyNames: missingKeys,
                })

                shouldReportAlphabeticalOrderErrors = false
            }

            for (let i = 0; i < mainObjectKeys.length; i++) {
                const mainObjectKey = mainObjectKeys[i]
                const childObjectKey = childObjectKeys[i]

                const finalMainKeyPath = this.getKeyPathFromKeyAndPath(mainObjectKey, mainKeyPath)

                if (mainObjectKey === childObjectKey) {
                    this.scanValue({
                        mainValueParentKey: mainObjectKey,
                        mainValue: mainObject[mainObjectKey],
                        childValue: childObject[childObjectKey],
                        mainKeyPath: finalMainKeyPath,
                        childKeyPath: this.getKeyPathFromKeyAndPath(childObjectKey, childKeyPath),
                        mainFilePath,
                        childFilePath,
                    })
                } else if (childObject[mainObjectKey] === undefined) {
                    this.errorCollector.addError({
                        type: ScanningErrorTypes.KEY_NOT_FOUND,
                        mainKeyPath: finalMainKeyPath,
                        childKeyPath: childKeyPath,
                        mainFilePath,
                        childFilePath,
                        keyName: mainObjectKey,
                    })
                    shouldReportAlphabeticalOrderErrors = false
                } else if (childObject[mainObjectKey] !== undefined) {
                    const finalChildKeyPath = this.getKeyPathFromKeyAndPath(mainObjectKey, childKeyPath)
                    this.scanValue({
                        mainValueParentKey: mainObjectKey,
                        mainValue: mainObject[mainObjectKey],
                        childValue: childObject[mainObjectKey],
                        mainKeyPath: finalMainKeyPath,
                        childKeyPath: finalChildKeyPath,
                        mainFilePath,
                        childFilePath,
                    })
                    if (shouldReportAlphabeticalOrderErrors) {
                        this.errorCollector.addError({
                            type: ScanningErrorTypes.INVALID_KEY_ORDERING,
                            mainKeyPath: finalMainKeyPath,
                            childKeyPath: childKeyPath,
                            mainFilePath,
                            childFilePath,
                            keyName: mainObjectKey,
                        })
                    }
                }
            }
        } else {
            this.errorCollector.addError({
                type: ScanningErrorTypes.DIFFERENT_COLLECTION_TYPES, //this is probably wrong - collection types aren't different here. It's just that the object isn't an object or an array
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
            })
        }
    }
}
