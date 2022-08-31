import { IScanResult, ScanningService } from './services/ScanningService'
import { AddTranslationFileConfig, FormatConfig, ScanConfig } from './config/config'
import { createFileFromTemplate } from './services/FileService'
import {
    IGreaterNumberOfKeysError,
    IScanningError,
    ScanningErrorsCollector,
    ScanningErrorTypes,
} from './errorCollector'
import { handleScanningErrors } from './errors'
import { KeyModifierService } from './services/KeyModifierService'
import { logTable } from './logger'
import { deleteExcessFilesFromDirectories } from './services/FileService'
import { FormattingService } from './services/FormattingService'

const keyModifierService = new KeyModifierService()

export const format = (config: FormatConfig) => {
    const errorCollector = new ScanningErrorsCollector()
    const formattingService = new FormattingService()
    const scanningService = new ScanningService(errorCollector)
    config.instances.forEach((instanceConfig) => {
        if (instanceConfig.isMultiDirectory === true) {
            formattingService.styleDirectories(instanceConfig)

            if (config.shouldRemoveExtras) {
                scanningService.compareDirectories(instanceConfig)
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
            formattingService.styleFiles(instanceConfig)

            if (config.shouldRemoveExtras) {
                scanningService.compareFiles(instanceConfig)
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
    const errorCollector = new ScanningErrorsCollector()
    const scanningService = new ScanningService(errorCollector)
    let errors: IScanningError[] = []
    let warnings: IScanningError[] = []
    config.instances.forEach((instanceConfig) => {
        if (instanceConfig.isMultiDirectory) {
            scanningService.compareDirectories(instanceConfig)
            if (config.shouldLogOutput) {
                handleScanningErrors(errorCollector, instanceConfig.name, instanceConfig.shouldPrintResultSummaryOnly)
            }

            errors = errors.concat(errorCollector.getAllErrors())
            warnings = warnings.concat(errorCollector.getAllWarnings())
        } else {
            scanningService.compareFiles(instanceConfig)
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

export const addTranslationFile = (config: AddTranslationFileConfig) => {
    const errorCollector = new ScanningErrorsCollector()
    createFileFromTemplate({
        config: config.instance,
        templateFileName: config.fileName,
        directories: config.directories,
        errorCollector,
    })
}
