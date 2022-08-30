import { deleteKeyFromObject } from './add-translations'
import { FileTypes, Indentation } from './config/config'
import { IGreaterNumberOfKeysError, ScanningErrorsCollector } from './errorCollector'
import { getFileAsObject, getFileTypeForFile, writeObjectToFile } from './fileUtils'
import * as lodash from 'lodash'

interface RemoveKeysInFileParams {
    filePath: string
    fileType: FileTypes
    indentation: Indentation
    keysToDelete: string[]
    errorCollector: ScanningErrorsCollector
}

export const removeKeysFromFile = ({
    filePath,
    fileType,
    errorCollector,
    keysToDelete,
    indentation,
}: RemoveKeysInFileParams) => {
    const file = getFileAsObject({ filePath, fileType, errorCollector })
    let newObject: any = lodash.cloneDeep(file)

    if (file) {
        keysToDelete.forEach((keyToDelete) => {
            newObject = deleteKeyFromObject(keyToDelete, newObject)
        })
    } else {
        throw new Error(`Couldn't load file - ${filePath}`)
    }

    writeObjectToFile({ obj: newObject, path: filePath, fileType, indentation })
}

type SortedErrors = Record<string, IGreaterNumberOfKeysError[]>

const generateCompleteKeyPaths = (endKeys: string[], parentKeyPath: string | undefined) => {
    if (parentKeyPath !== undefined) {
        return endKeys.map((key) => {
            return `${parentKeyPath}.${key}`
        })
    } else {
        return endKeys
    }
}

export class KeyModifierService {
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
        const fileTypeOption = getFileTypeForFile(filePath)
        if (fileTypeOption) {
            const file = getFileAsObject({ filePath, fileType: fileTypeOption })
            let newObject: any = lodash.cloneDeep(file)
            if (file) {
                errors.forEach((error) => {
                    const keysToDelete = generateCompleteKeyPaths(error.keyNames, error.childKeyPath)

                    keysToDelete.forEach((keyToDelete) => {
                        newObject = deleteKeyFromObject(keyToDelete, newObject)
                    })
                })
            } else {
                throw new Error(`Couldn't load file for path: ${filePath}`)
            }
            writeObjectToFile({ obj: newObject, path: filePath, fileType: fileTypeOption, indentation })
        } else {
            throw new Error(`File type unsupported for path: ${filePath}`)
        }
    }
    removeGreaterNumberErrors(errors: IGreaterNumberOfKeysError[], indentation: Indentation): SortedErrors {
        const sortedErrors = this.sortGreaterNumberErrorsByFile(errors)
        const sortedErrorFileNameKeys = Object.keys(sortedErrors)
        sortedErrorFileNameKeys.forEach((fileNameKey) => {
            this.removeGreaterNumberErrorsForFile(sortedErrors[fileNameKey], fileNameKey, indentation)
        })
        return sortedErrors
    }
}
