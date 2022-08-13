import fs from 'fs'

import { FileTypes, Indentation, MultiDirectoryInstanceConfig, SingleDirectoryInstanceConfig } from './config'
import { IScanningError, ScanningErrorsCollector, ScanningErrorTypes } from './errorCollector'
import { handleFormattingErrors } from './errors'
import { getFileAsObject, loadAllFromDirectory, writeObjectToJson, writeObjectToYaml } from './fileUtils'

const shouldFileBeExcludedBasedOnPrefix = (filePrefix: string | undefined, fileName: string): boolean => {
    if (filePrefix !== undefined && !fileName.includes(filePrefix)) {
        return true
    } else if (filePrefix === undefined && fileName.split('.').length > 2) {
        return true
    } else return false
}

interface StyleFileParams {
    fileName: string
    directoryPath: string
    fileType: FileTypes
    errorCollector: ScanningErrorsCollector
    indentation: Indentation
}

const styleFile = ({ fileName, directoryPath, fileType, errorCollector, indentation }: StyleFileParams) => {
    if (fileName.includes('.json') && fileType === FileTypes.JSON) {
        const parsedFile = getFileAsObject({
            fileName,
            directoryPath,
            fileType,
            errorCollector,
        })
        const sortedObj = sortObjectKeysAlphabetically(parsedFile)
        writeObjectToJson({ obj: sortedObj, indentation, path: `${directoryPath}/${fileName}` })
    } else if (fileName.includes('.yml') || (fileName.includes('.yaml') && fileType === FileTypes.YAML)) {
        const parsedFile = getFileAsObject({
            fileName,
            directoryPath,
            fileType,
            errorCollector,
        })

        writeObjectToYaml({ obj: parsedFile, indentation, path: `${directoryPath}/${fileName}` })
    }
}

export const styleFiles = (config: SingleDirectoryInstanceConfig) => {
    const errorCollector = new ScanningErrorsCollector()
    const files = loadAllFromDirectory(config.rootDirectoryPath, errorCollector)
    if (files !== undefined) {
        files.forEach((file) => {
            if (file.isFile() && !shouldFileBeExcludedBasedOnPrefix(config.filePrefix, file.name)) {
                styleFile({
                    fileName: file.name,
                    directoryPath: config.rootDirectoryPath,
                    fileType: config.fileType,
                    errorCollector,
                    indentation: config.indentation,
                })
            }
        })
    }

    handleFormattingErrors(errorCollector, config.name, config.shouldPrintResultSummaryOnly)
}

export const styleDirectories = (config: MultiDirectoryInstanceConfig) => {
    const errorCollector = new ScanningErrorsCollector()
    const dirs = loadAllFromDirectory(config.rootDirectoryPath, errorCollector)

    if (dirs !== undefined) {
        dirs.forEach((directory) => {
            if (directory.isDirectory()) {
                const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`
                const files = loadAllFromDirectory(currentDirectoryPath, errorCollector)
                if (files !== undefined) {
                    files.forEach((file) => {
                        if (file.isFile()) {
                            styleFile({
                                fileName: file.name,
                                directoryPath: currentDirectoryPath,
                                fileType: config.fileType,
                                errorCollector,
                                indentation: config.indentation,
                            })
                        }
                    })
                }
            }
        })
    }

    handleFormattingErrors(errorCollector, config.name, config.shouldPrintResultSummaryOnly)
}

const sortObjectKeysAlphabetically = (obj: any): any => {
    const newObj: any = {}
    const keys = Object.keys(obj).sort()
    keys.forEach((key) => {
        if (Array.isArray(obj[key])) {
            newObj[key] = obj[key]
        } else if (typeof obj[key] === 'object') {
            newObj[key] = sortObjectKeysAlphabetically(obj[key])
        } else {
            newObj[key] = obj[key]
        }
    })
    return newObj
}

export interface IScanResult {
    errors: IScanningError[]
    warnings: IScanningError[]
}

export const compareDirectories = (config: MultiDirectoryInstanceConfig): ScanningErrorsCollector => {
    const errorCollector = new ScanningErrorsCollector()
    const dirs = loadAllFromDirectory(config.rootDirectoryPath, errorCollector)
    const mainFiles = loadAllFromDirectory(`${config.rootDirectoryPath}/${config.mainDirectoryName}`, errorCollector)
    const mainObj: any = {}

    if (dirs !== undefined && mainFiles !== undefined) {
        mainFiles.forEach((file) => {
            if (file.name.includes('.json') || file.name.includes('.yml') || file.name.includes('.yaml')) {
                mainObj[file.name] = getFileAsObject({
                    fileName: file.name,
                    directoryPath: `${config.rootDirectoryPath}/${config.mainDirectoryName}`,
                    fileType: config.fileType,
                    errorCollector,
                })
            }
        })
        dirs.forEach((directory) => {
            if (directory.isDirectory() && directory.name !== config.mainDirectoryName) {
                const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`
                mainFiles.forEach((file) => {
                    if (file.name.includes('.json') || file.name.includes('.yml') || file.name.includes('.yaml')) {
                        const parsedFile = getFileAsObject({
                            fileName: file.name,
                            directoryPath: currentDirectoryPath,
                            fileType: config.fileType,
                            errorCollector,
                        })
                        if (parsedFile) {
                            const mainFilePath = `${config.rootDirectoryPath}/${config.mainDirectoryName}/${file.name}`
                            const childFilePath = `${currentDirectoryPath}/${file.name}`
                            // const fileKey = parseFileKeyFromName(file.name)
                            compareObjects({
                                mainObject: mainObj[file.name],
                                childObject: parsedFile,
                                mainFilePath,
                                childFilePath,
                                errorCollector,
                            })
                        }
                    }
                })
            }
        })
    }

    return errorCollector
}

export const compareFiles = (config: SingleDirectoryInstanceConfig): ScanningErrorsCollector => {
    const errorCollector = new ScanningErrorsCollector()

    const mainObj = getFileAsObject({
        fileName: config.mainFileName,
        directoryPath: config.rootDirectoryPath,
        fileType: config.fileType,
        errorCollector,
    })

    const files = loadAllFromDirectory(config.rootDirectoryPath, errorCollector)
    if (mainObj !== undefined && files !== undefined) {
        const mainFilePath = `${config.rootDirectoryPath}/${config.mainFileName}`

        files.forEach((file) => {
            if (file.name === config.mainFileName) {
                return
            } else if (shouldFileBeExcludedBasedOnPrefix(config.filePrefix, file.name)) {
                return
            } else {
                const childFilePath = `${config.rootDirectoryPath}/${file.name}`
                const childObj = getFileAsObject({
                    fileName: file.name,
                    directoryPath: config.rootDirectoryPath,
                    fileType: config.fileType,
                    errorCollector,
                })

                if (childObj !== undefined) {
                    if (config.shouldCheckFirstKey === true || config.shouldCheckFirstKey === undefined) {
                        compareObjects({
                            mainObject: mainObj,
                            childObject: childObj,
                            errorCollector,
                            mainFilePath,
                            childFilePath,
                        })
                    } else {
                        const subMainObject = Object.values(mainObj)[0]
                        const subChildObject = Object.values(childObj)[0]
                        compareObjects({
                            mainObject: subMainObject,
                            childObject: subChildObject,
                            mainKeyPath: Object.keys(mainObj)[0],
                            childKeyPath: Object.keys(childObj)[0],
                            mainFilePath,
                            childFilePath,
                            errorCollector,
                        })
                    }
                }
            }
        })
    }

    return errorCollector
}

interface ScanValueParams {
    mainValueParentKey: string
    mainValue: any
    childValue: any
    mainKeyPath: string
    childKeyPath: string
    mainFilePath: string
    childFilePath: string
    errorCollector: ScanningErrorsCollector
}

const scanValue = ({
    mainValueParentKey,
    mainValue,
    childValue,
    mainKeyPath,
    childKeyPath,
    mainFilePath,
    childFilePath,
    errorCollector,
}: ScanValueParams) => {
    if (typeof mainValue === 'object') {
        if (
            !compareObjects({
                mainObject: mainValue,
                childObject: childValue,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
                errorCollector,
            })
        ) {
            errorCollector.addError({
                //pretty sure that this is wrong too. Need to standardize what compareObjects is returning
                type: ScanningErrorTypes.DIFFERENT_COLLECTION_TYPES,
                mainKeyPath,
                childKeyPath,
                mainFilePath,
                childFilePath,
            })
        }
    } else if (mainValue === null || '') {
        errorCollector.addError({
            type: ScanningErrorTypes.EMPTY_VALUE,
            mainKeyPath,
            childKeyPath,
            mainFilePath,
            childFilePath,
            keyName: mainValueParentKey,
        })
    } else if (mainValue === childValue) {
        errorCollector.addWarning({
            type: ScanningErrorTypes.SAME_VALUE_TYPES,
            mainKeyPath,
            childKeyPath,
            mainFilePath,
            childFilePath,
            keyName: mainValueParentKey,
        })
    }
}

const getKeyPathFromKeyAndPath = (key: string, path: string | undefined) => {
    return path ? `${path}.${key}` : key
}

interface CompareObjectsParams {
    mainObject: any
    childObject: any
    mainKeyPath?: string
    childKeyPath?: string
    mainFilePath: string
    childFilePath: string
    errorCollector: ScanningErrorsCollector
}

export const compareObjects = ({
    mainObject,
    childObject,
    mainKeyPath,
    childKeyPath,
    mainFilePath,
    childFilePath,
    errorCollector,
}: CompareObjectsParams): ScanningErrorsCollector => {
    if (Array.isArray(mainObject) && Array.isArray(childObject)) {
        return errorCollector
    } else if (Array.isArray(mainObject) !== Array.isArray(childObject)) {
        errorCollector.addError({
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
            errorCollector.addError({
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

            const finalMainKeyPath = getKeyPathFromKeyAndPath(mainObjectKey, mainKeyPath)

            if (mainObjectKey === childObjectKey) {
                scanValue({
                    mainValueParentKey: mainObjectKey,
                    mainValue: mainObject[mainObjectKey],
                    childValue: childObject[childObjectKey],
                    mainKeyPath: finalMainKeyPath,
                    childKeyPath: getKeyPathFromKeyAndPath(childObjectKey, childKeyPath),
                    mainFilePath,
                    childFilePath,
                    errorCollector,
                })
            } else if (childObject[mainObjectKey] === undefined) {
                errorCollector.addError({
                    type: ScanningErrorTypes.KEY_NOT_FOUND,
                    mainKeyPath: finalMainKeyPath,
                    childKeyPath: childKeyPath,
                    mainFilePath,
                    childFilePath,
                    keyName: mainObjectKey,
                })
                shouldReportAlphabeticalOrderErrors = false
            } else if (childObject[mainObjectKey] !== undefined) {
                scanValue({
                    mainValueParentKey: mainObjectKey,
                    mainValue: mainObject[mainObjectKey],
                    childValue: childObject[mainObjectKey],
                    mainKeyPath: finalMainKeyPath,
                    childKeyPath: getKeyPathFromKeyAndPath(mainObjectKey, childKeyPath),
                    mainFilePath,
                    childFilePath,
                    errorCollector,
                })
                if (shouldReportAlphabeticalOrderErrors) {
                    errorCollector.addError({
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
        errorCollector.addError({
            type: ScanningErrorTypes.DIFFERENT_COLLECTION_TYPES, //this is probably wrong - collection types aren't different here. It's just that the object isn't an object or an array
            mainKeyPath,
            childKeyPath,
            mainFilePath,
            childFilePath,
        })
    }

    return errorCollector
}
