import { IScanResult, ScanningService } from './services/ScanningService.js'
import { FormatConfig, ParseltConfig, ScanConfig } from './config/config.js'
import { FileService } from './services/FileService.js'
import {
    IGreaterNumberOfKeysError,
    IScanningError,
    ScanningErrorsCollector,
    ScanningErrorTypes,
} from './errorCollector.js'
import { handleFormattingErrors, handleScanningErrors } from './errors.js'
import { KeyModifierService } from './services/KeyModifierService.js'
import { logSuccess, logTable } from './logger.js'
import { FormattingService } from './services/FormattingService.js'
import { ConfigService } from './services/ConfigService.js'
import path from 'path'
import { UserInputService } from './services/UserInputService.js'

/**
 *
 * @param config: FormatConfig
 * @description: This formats all specified files in the project, reordering keys that are out of alphabetical order, and (if the user specifies) also removing extra keys that are no longer used in the main language.
 * @returns void
 */
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

/**
 *
 * @param config: ScanConfig
 * @description: This scans all specified translation files for errors and generates a set of errors and warnings in the scan result.
 * @returns IScanResult
 */
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

/**
 *
 * @param ParseltConfig: [initialConfig] - Config is either provided by the user via api or will be generated from a scan of the project. If the user provides no input and the project scan generates no results, this function will prompt the user in the console for the config options.
 * @description: This initializes a parselt configuration in the project
 */
export const init = async (): Promise<ParseltConfig> => {
    const currentWorkingDirectory = process.cwd()
    const fileService = new FileService()
    const userInputService = new UserInputService()

    const configService = new ConfigService(fileService, userInputService)

    const config = await configService.getParseltConfigForRoot(currentWorkingDirectory)
    fileService.writeObjectToFile(config, path.join(currentWorkingDirectory, 'parselt.json'), 2)

    logSuccess(`\nSuccessfully created parselt config file here: ./parselt.json`)
    return config
}

// export const addTranslationFile = (config: AddTranslationFileConfig) => {
//     const errorCollector = new ScanningErrorsCollector()
//     const fileService = new FileService(errorCollector)
//     fileService.createFileFromTemplate(config)
// }
