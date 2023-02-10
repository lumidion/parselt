import { Indentation } from '../config/config.js'
import { IGreaterNumberOfKeysError } from '../errorCollector.js'
import * as lodash from 'lodash'
import { FileService } from './FileService.js'

type SortedErrors = Record<string, IGreaterNumberOfKeysError[]>

export class KeyModifierService {
    private readonly fileService: FileService
    constructor(fileService: FileService) {
        this.fileService = fileService
    }
    addValueToObjectFromKey(keyString: string, value: string, obj: any) {
        const keys = keyString.split('.')
        const newObject = lodash.cloneDeep(obj)
        let ref = newObject

        keys.forEach((key, index) => {
            if (index === keys.length - 1) {
                ref[key] = value
            } else if (keys.includes(key)) {
                ref = ref[key]
            } else {
                ref[key] = {}
                ref = ref[key]
            }
        })

        return newObject
    }

    deleteKeyFromObject(keyString: string, obj: any) {
        const keys = keyString.split('.')
        const newObject = lodash.cloneDeep(obj)
        let ref = newObject

        keys.every((key, index) => {
            if (index === keys.length - 1) {
                delete ref[key]
                return true
            } else if (keys.includes(key)) {
                ref = ref[key]
                return true
            } else {
                return false
            }
        })

        return newObject
    }

    removeGreaterNumberErrors(errors: IGreaterNumberOfKeysError[], indentation: Indentation): SortedErrors {
        const sortedErrors = this.sortGreaterNumberErrorsByFile(errors)
        const sortedErrorFileNameKeys = Object.keys(sortedErrors)
        sortedErrorFileNameKeys.forEach((fileNameKey) => {
            this.removeGreaterNumberErrorsForFile(sortedErrors[fileNameKey], fileNameKey, indentation)
        })
        return sortedErrors
    }

    private generateCompleteKeyPaths = (endKeys: string[], parentKeyPath: string | undefined) => {
        if (parentKeyPath !== undefined) {
            return endKeys.map((key) => {
                return `${parentKeyPath}.${key}`
            })
        } else {
            return endKeys
        }
    }

    private sortGreaterNumberErrorsByFile(errors: IGreaterNumberOfKeysError[]): SortedErrors {
        const sortedErrors: SortedErrors = {}
        errors.forEach((error) => {
            if (sortedErrors[error.childFilePath]) {
                const currentErrors = sortedErrors[error.childFilePath]
                currentErrors.push(error)
                sortedErrors[error.childFilePath] = currentErrors
            } else {
                sortedErrors[error.childFilePath] = [error]
            }
        })
        return sortedErrors
    }

    private removeGreaterNumberErrorsForFile(
        errors: IGreaterNumberOfKeysError[],
        filePath: string,
        indentation: Indentation
    ) {
        const fileTypeOption = FileService.getSerializedFileType(filePath)
        if (fileTypeOption) {
            const file = this.fileService.getSerializedFileAsObject(filePath)
            let newObject: any = lodash.cloneDeep(file)
            if (file) {
                errors.forEach((error) => {
                    const keysToDelete = this.generateCompleteKeyPaths(error.keyNames, error.childKeyPath)

                    keysToDelete.forEach((keyToDelete) => {
                        newObject = this.deleteKeyFromObject(keyToDelete, newObject)
                    })
                })
            } else {
                throw new Error(`Couldn't load file for path: ${filePath}`)
            }
            this.fileService.writeObjectToFile(newObject, filePath, indentation)
        } else {
            throw new Error(`File type unsupported for path: ${filePath}`)
        }
    }
}
