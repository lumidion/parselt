import { styleDirectories, styleFiles, compareDirectories, compareFiles, IScanResult } from './service'
import { FormatConfig, MultiDirectoryInstanceConfig, ScanConfig } from './config/config'
import { loadNewFileTemplate } from './loader'
import {
    IGreaterNumberOfKeysError,
    IScanningError,
    ScanningErrorsCollector,
    ScanningErrorTypes,
} from './errorCollector'
import { handleScanningErrors } from './errors'
import { KeyModifierService } from './key-modifier'
import { logTable } from './logger'
import { deleteExcessFilesFromDirectories } from './fileUtils'

const keyModifierService = new KeyModifierService()

export const format = (config: FormatConfig) => {
    config.instances.forEach((instanceConfig) => {
        if (instanceConfig.isMultiDirectory === true) {
            styleDirectories(instanceConfig)

            const errorCollector = compareDirectories(instanceConfig)
            if (config.shouldRemoveExtras) {
                const errors = errorCollector.getAllErrors()
                const greaterNumberErrors = errors.filter(
                    (error): error is IGreaterNumberOfKeysError =>
                        error.type === ScanningErrorTypes.GREATER_NUMBER_OF_CHILD_KEYS
                )

                const removedErrors = keyModifierService.removeGreaterNumberErrors(
                    greaterNumberErrors,
                    instanceConfig.indentation
                )

                const keys = Object.keys(removedErrors)

                if (keys.length > 0) {
                    const log = keys.map((key) => {
                        let numberOfErrors = 0
                        removedErrors[key].forEach((error) => (numberOfErrors += error.keyNames.length))
                        return {
                            'File Path': key,
                            'Number of Keys Removed': numberOfErrors,
                        }
                    })
                    logTable(log)
                }

                const removedFileNames = deleteExcessFilesFromDirectories(
                    instanceConfig.rootDirectoryPath,
                    instanceConfig.mainDirectoryName
                )

                if (removedFileNames.length > 0) {
                    const removedFileLog = removedFileNames.map((fileName) => {
                        return { 'Removed File Name': fileName }
                    })

                    logTable(removedFileLog)
                }
            }
        } else {
            styleFiles(instanceConfig)
            const errorCollector = compareFiles(instanceConfig)
            if (config.shouldRemoveExtras) {
                const errors = errorCollector.getAllErrors()
                const greaterNumberErrors = errors.filter(
                    (error): error is IGreaterNumberOfKeysError =>
                        error.type === ScanningErrorTypes.GREATER_NUMBER_OF_CHILD_KEYS
                )

                keyModifierService.removeGreaterNumberErrors(greaterNumberErrors, instanceConfig.indentation)
            }
        }
    })
}

export const scan = (config: ScanConfig): IScanResult => {
    let errors: IScanningError[] = []
    let warnings: IScanningError[] = []
    config.instances.forEach((instanceConfig) => {
        if (instanceConfig.isMultiDirectory) {
            const errorCollector = compareDirectories(instanceConfig)
            if (config.shouldLogOutput) {
                handleScanningErrors(errorCollector, instanceConfig.name, instanceConfig.shouldPrintResultSummaryOnly)
            }

            errors = errors.concat(errorCollector.getAllErrors())
            warnings = warnings.concat(errorCollector.getAllWarnings())
        } else {
            const errorCollector = compareFiles(instanceConfig)
            if (config.shouldLogOutput) {
                handleScanningErrors(errorCollector, instanceConfig.name, instanceConfig.shouldPrintResultSummaryOnly)
            }

            errors = errors.concat(errorCollector.getAllErrors())
            warnings = warnings.concat(errorCollector.getAllWarnings())
        }
    })

    return {
        errors,
        warnings,
    }
}

export const addFileFromTemplate = (config: MultiDirectoryInstanceConfig, fileName: string, directories?: string[]) => {
    const errorCollector = new ScanningErrorsCollector()
    loadNewFileTemplate({ config, templateFileName: fileName, directories, errorCollector })
}
