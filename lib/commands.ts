import { IScanResult, ScanningService } from './services/ScanningService'
import { AddTranslationFileConfig, FormatConfig, ScanConfig } from './config/config'
import { FileService } from './services/FileService'
import {
    IGreaterNumberOfKeysError,
    IScanningError,
    ScanningErrorsCollector,
    ScanningErrorTypes,
} from './errorCollector'
import { handleFormattingErrors, handleScanningErrors } from './errors'
import { KeyModifierService } from './services/KeyModifierService'
import { logTable } from './logger'
import { FormattingService } from './services/FormattingService'

export const format = (config: FormatConfig) => {
    config.instances.forEach((instanceConfig) => {
        const errorCollector = new ScanningErrorsCollector()
        const fileService = new FileService(errorCollector)
        const formattingService = new FormattingService(fileService)
        const scanningService = new ScanningService(errorCollector, fileService)
        const keyModifierService = new KeyModifierService(fileService)
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

                const removedFileNames = fileService.deleteExcessFilesFromDirectories(
                    instanceConfig.rootDirectoryPath,
                    instanceConfig.mainDirectoryName,
                    instanceConfig.fileType
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
            }
        }
        if (config.shouldLogOutput) {
            handleFormattingErrors(errorCollector, instanceConfig.name, instanceConfig.shouldPrintResultSummaryOnly)
        }
    })
}

export const scan = (config: ScanConfig): IScanResult => {
    let errors: IScanningError[] = []
    let warnings: IScanningError[] = []
    config.instances.forEach((instanceConfig) => {
        const errorCollector = new ScanningErrorsCollector()
        const fileService = new FileService(errorCollector)
        const scanningService = new ScanningService(errorCollector, fileService)
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
    const fileService = new FileService(errorCollector)
    fileService.createFileFromTemplate(config)
}
