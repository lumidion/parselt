import { ScanOutputLogTypes } from './config/config.js'
import { logError, logSuccess, logWarning } from './logger.js'

interface IKeyScanningError {
    mainFilePath: string
    childFilePath: string
    childKeyPath?: string
    mainKeyPath?: string
}

export enum ScanningErrorTypes {
    SAME_VALUE_TYPES = 'same_value_types',
    DIFFERENT_COLLECTION_TYPES = 'different_collection_types',
    GREATER_NUMBER_OF_CHILD_KEYS = 'greater_number_of_child_keys',
    EMPTY_VALUE = 'empty_value',
    KEY_NOT_FOUND = 'key_not_found',
    INVALID_KEY_ORDERING = 'invalid_key_ordering',
    COULD_NOT_LOAD_PATH = 'could_not_load_path',
    EXTRA_FILE_FOUND = 'extra_file_found',
}

export interface IGreaterNumberOfKeysError extends IKeyScanningError {
    type: ScanningErrorTypes.GREATER_NUMBER_OF_CHILD_KEYS
    keyNames: string[]
}

interface ITopLevelKeyScanningError extends IKeyScanningError {
    type: ScanningErrorTypes.DIFFERENT_COLLECTION_TYPES
}

interface IStandardKeyScanningError extends IKeyScanningError {
    type:
        | ScanningErrorTypes.EMPTY_VALUE
        | ScanningErrorTypes.KEY_NOT_FOUND
        | ScanningErrorTypes.INVALID_KEY_ORDERING
        | ScanningErrorTypes.SAME_VALUE_TYPES
    keyName: string
}

export enum PathTypes {
    FILE = 'file',
    DIRECTORY = 'directory',
}

interface IFileError {
    type: ScanningErrorTypes.COULD_NOT_LOAD_PATH | ScanningErrorTypes.EXTRA_FILE_FOUND
    path: string
    pathType: PathTypes
    msg?: string
}

export type IScanningError =
    | IGreaterNumberOfKeysError
    | ITopLevelKeyScanningError
    | IStandardKeyScanningError
    | IFileError

export class ScanningErrorsCollector {
    private readonly errors: IScanningError[]
    private readonly warnings: IScanningError[]
    constructor() {
        this.errors = []
        this.warnings = []
    }
    addError(error: IScanningError): void {
        this.errors.push(error)
    }

    addWarning(error: IScanningError): void {
        this.warnings.push(error)
    }

    getAllErrors(): IScanningError[] {
        return this.errors
    }

    getAllWarnings(): IScanningError[] {
        return this.warnings
    }

    hasErrors(): boolean {
        return this.errors.length > 0
    }

    printAll(outputLogType: ScanOutputLogTypes, instanceName: string): void {
        switch (outputLogType) {
            case ScanOutputLogTypes.SUMMARY:
                this.printStart(instanceName)
                this.printSummary()
                break
            case ScanOutputLogTypes.ALL:
                this.printStart(instanceName)
                this.printMessageForCollection(logWarning, this.warnings)
                this.printMessageForCollection(logError, this.errors)
                console.log('\n')
                this.printSummary()
                break
            case ScanOutputLogTypes.ERRORS:
                this.printStart(instanceName)
                this.printMessageForCollection(logError, this.errors)
                this.printErrorSummary()
                break
            case ScanOutputLogTypes.WARNINGS:
                this.printStart(instanceName)
                this.printMessageForCollection(logWarning, this.warnings)
                this.printWarningSummary()
                break
            case ScanOutputLogTypes.NONE:
                break
        }
    }

    private printStart(instanceName: string) {
        console.log('\n')
        logSuccess(`Starting scan for ${instanceName} instance`)
    }

    private printSummary() {
        this.printWarningSummary()
        this.printErrorSummary()
    }

    private printErrorSummary() {
        if (this.hasErrors()) {
            logError(`${this.errors.length} errors found in project`)
        } else {
            logSuccess('Success! No errors found')
        }
    }

    private printWarningSummary() {
        logWarning(`${this.warnings.length} warnings found in project`)
    }

    private isErrorFileType(error: IScanningError): error is IFileError {
        if (
            error.type !== ScanningErrorTypes.COULD_NOT_LOAD_PATH &&
            error.type !== ScanningErrorTypes.EXTRA_FILE_FOUND
        ) {
            return true
        } else {
            return false
        }
    }

    private printMessageForCollection(logger: (msg: string) => void, collection: IScanningError[]) {
        let currentFilePath = ''
        const logFileName = (filePath: string) => {
            currentFilePath = filePath
            logger(currentFilePath)
        }

        const wrapWithSpacing = (func: () => void) => {
            console.log('\n')
            func()
            console.log('\n')
        }
        collection.forEach((error) => {
            if (!this.isErrorFileType(error)) {
                if (currentFilePath !== error.childFilePath) {
                    wrapWithSpacing(() => {
                        logger('Main File Name:')
                        logFileName(error.mainFilePath)
                        logger('Child File Name:')
                        logFileName(error.childFilePath)
                    })
                }
            } else {
                console.log('\n')
            }

            const msg = this.getMessageForError(error)
            logger(msg)
        })
    }

    private getMessageForError(error: IScanningError): string {
        switch (error.type) {
            case ScanningErrorTypes.EMPTY_VALUE: {
                const finalChildKeyPath = error.childKeyPath
                    ? `Value is empty for key path, ${error.childKeyPath}, in file,`
                    : 'File is empty for path,'
                return `${finalChildKeyPath} ${error.childFilePath}.`
            }
            case ScanningErrorTypes.GREATER_NUMBER_OF_CHILD_KEYS: {
                const keysString = `Keys affected: ${error.keyNames.toString()}.`
                return error.childKeyPath
                    ? `Key path, ${error.childKeyPath}, in file, ${error.childFilePath}, has more sub-keys than key path, ${error.mainKeyPath}, in file, ${error.mainFilePath}. ${keysString}`
                    : `File, ${error.childFilePath} has more top-level keys than file, ${error.mainFilePath} - ${keysString}`
            }
            case ScanningErrorTypes.KEY_NOT_FOUND: {
                const keyPathStr = error.childKeyPath ? `in key path, ${error.childKeyPath},` : ''
                return `Key, ${error.keyName}, not found ${keyPathStr} in file, ${error.childFilePath}`
            }
            case ScanningErrorTypes.DIFFERENT_COLLECTION_TYPES: {
                return `Key path, ${error.mainKeyPath}, in file, ${error.mainFilePath}, and key path, ${error.childKeyPath}, in file, ${error.childFilePath}, have different value types.`
            }
            case ScanningErrorTypes.INVALID_KEY_ORDERING: {
                const keyPathStr = error.childKeyPath ? `key path, ${error.childKeyPath}` : ''
                return `Key, ${error.keyName}, was found out of alphabetical order in ${keyPathStr} in file, ${error.childFilePath}.`
            }
            case ScanningErrorTypes.COULD_NOT_LOAD_PATH: {
                return `Could not load ${error.pathType} for ${error.path}. Cause: ${
                    error.msg ? error.msg : 'File not found'
                }`
            }
            case ScanningErrorTypes.EXTRA_FILE_FOUND: {
                return `Found an unexpected file at: ${error.path}. No corresponding file found in the main language directory. Please either delete this file or create the corresponding file in the main language directory.`
            }
            case ScanningErrorTypes.SAME_VALUE_TYPES: {
                return `Key path, ${error.childKeyPath}, in file, ${error.childFilePath}, contained the same value as ${error.mainKeyPath}, in ${error.mainFilePath}`
            }
        }
    }
}
