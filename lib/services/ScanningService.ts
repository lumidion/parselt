import { MultiDirectoryInstanceConfig, SingleDirectoryInstanceConfig } from '../config/config'
import { IScanningError, ScanningErrorsCollector, ScanningErrorTypes } from '../errorCollector'
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
    compareDirectories(config: MultiDirectoryInstanceConfig): void {
        const dirs = this.fileService.loadAllFromDirectory(config.rootDirectoryPath, true)
        const mainFiles = this.fileService.loadAllFromDirectory(
            `${config.rootDirectoryPath}/${config.mainDirectoryName}`,
            true
        )
        const mainObj: any = {}

        if (dirs !== undefined && mainFiles !== undefined) {
            mainFiles.forEach((file) => {
                const childObj = this.fileService.getFileAsObject(
                    `${config.rootDirectoryPath}/${config.mainDirectoryName}/${file.name}`,
                    true
                )
                if (childObj !== undefined) {
                    mainObj[file.name] = childObj
                }
            })
            dirs.forEach((directory) => {
                if (directory.isDirectory() && directory.name !== config.mainDirectoryName) {
                    const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`
                    mainFiles.forEach((file) => {
                        if (FileService.shouldFileBeScanned(file, config.fileType)) {
                            const parsedFile = this.fileService.getFileAsObject(
                                `${currentDirectoryPath}/${file.name}`,
                                true
                            )
                            if (parsedFile) {
                                const mainFilePath = `${config.rootDirectoryPath}/${config.mainDirectoryName}/${file.name}`
                                const childFilePath = `${currentDirectoryPath}/${file.name}`
                                this.compareObjects({
                                    mainObject: mainObj[file.name],
                                    childObject: parsedFile,
                                    mainFilePath,
                                    childFilePath,
                                })
                            }
                        }
                    })
                }
            })
        }
    }

    compareFiles = (config: SingleDirectoryInstanceConfig): ScanningErrorsCollector => {
        const errorCollector = new ScanningErrorsCollector()

        const mainObj = this.fileService.getFileAsObject(`${config.rootDirectoryPath}/${config.mainFileName}`, true)

        const files = this.fileService.loadAllFromDirectory(config.rootDirectoryPath, true)
        if (mainObj !== undefined && files !== undefined) {
            const mainFilePath = `${config.rootDirectoryPath}/${config.mainFileName}`

            files.forEach((file) => {
                if (file.name === config.mainFileName) {
                    return
                } else if (!FileService.shouldFileBeScanned(file, config.fileType, config.filePrefix)) {
                    return
                } else {
                    const childFilePath = `${config.rootDirectoryPath}/${file.name}`
                    const childObj = this.fileService.getFileAsObject(`${config.rootDirectoryPath}/${file.name}`, true)

                    if (childObj !== undefined) {
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
                }
            })
        }

        return errorCollector
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
                    this.scanValue({
                        mainValueParentKey: mainObjectKey,
                        mainValue: mainObject[mainObjectKey],
                        childValue: childObject[mainObjectKey],
                        mainKeyPath: finalMainKeyPath,
                        childKeyPath: this.getKeyPathFromKeyAndPath(mainObjectKey, childKeyPath),
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
