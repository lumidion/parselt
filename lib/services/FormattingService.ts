import { Indentation, MultiDirectoryInstanceConfig, SingleDirectoryInstanceConfig } from '../config/config'
import { ScanningErrorsCollector } from '../errorCollector'
import { handleFormattingErrors } from '../errors'
import { getFileAsObject, loadAllFromDirectory, writeObjectToFile } from './FileService'
import { shouldFileBeScanned } from './logic'

export class FormattingService {
    private sortObjectKeysAlphabetically(obj: any): any {
        const newObj: any = {}
        const keys = Object.keys(obj).sort()
        keys.forEach((key) => {
            if (Array.isArray(obj[key])) {
                newObj[key] = obj[key]
            } else if (typeof obj[key] === 'object') {
                newObj[key] = this.sortObjectKeysAlphabetically(obj[key])
            } else {
                newObj[key] = obj[key]
            }
        })
        return newObj
    }

    private styleFile = (filePath: string, indentation: Indentation, errorCollector: ScanningErrorsCollector) => {
        const parsedFile = getFileAsObject({
            filePath,
            errorCollector,
        })
        const sortedObj = this.sortObjectKeysAlphabetically(parsedFile)
        writeObjectToFile({ obj: sortedObj, indentation, path: filePath })
    }

    styleFiles(config: SingleDirectoryInstanceConfig) {
        const errorCollector = new ScanningErrorsCollector()
        const files = loadAllFromDirectory(config.rootDirectoryPath, errorCollector)
        if (files !== undefined) {
            files.forEach((file) => {
                if (shouldFileBeScanned(file, config.fileType, config.filePrefix)) {
                    this.styleFile(`${config.rootDirectoryPath}/${file.name}`, config.indentation, errorCollector)
                }
            })
        }
        handleFormattingErrors(errorCollector, config.name, config.shouldPrintResultSummaryOnly)
    }

    styleDirectories(config: MultiDirectoryInstanceConfig) {
        const errorCollector = new ScanningErrorsCollector()
        const dirs = loadAllFromDirectory(config.rootDirectoryPath, errorCollector)

        if (dirs !== undefined) {
            dirs.forEach((directory) => {
                if (directory.isDirectory()) {
                    const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`
                    const files = loadAllFromDirectory(currentDirectoryPath, errorCollector)
                    if (files !== undefined) {
                        files.forEach((file) => {
                            if (shouldFileBeScanned(file, config.fileType)) {
                                this.styleFile(
                                    `${currentDirectoryPath}/${file.name}`,
                                    config.indentation,
                                    errorCollector
                                )
                            }
                        })
                    }
                }
            })
        }

        handleFormattingErrors(errorCollector, config.name, config.shouldPrintResultSummaryOnly)
    }
}
