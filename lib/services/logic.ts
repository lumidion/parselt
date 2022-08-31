import { Dirent } from 'fs'
import { FileTypes } from '../config/config'
import { getFileTypeForFile } from './FileService'

const isFileAllowedByPrefixGate = (fileName: string, expectedFilePrefix: string | undefined): boolean => {
    if (expectedFilePrefix !== undefined && !fileName.includes(expectedFilePrefix)) {
        return false
    } else if (expectedFilePrefix === undefined && fileName.split('.').length > 2) {
        return false
    } else return true
}

const isFileTypeCorrect = (fileName: string, expectedFileType: FileTypes): boolean => {
    const fileTypeOption = getFileTypeForFile(fileName)
    if (fileTypeOption !== undefined && fileTypeOption === expectedFileType) {
        return true
    } else {
        return false
    }
}

export const shouldFileBeScanned = (file: Dirent, expectedFileType: FileTypes, expectedFilePrefix?: string) => {
    return (
        file.isFile() &&
        isFileTypeCorrect(file.name, expectedFileType) &&
        isFileAllowedByPrefixGate(file.name, expectedFilePrefix)
    )
}
