import { styleDirectories, styleFiles, compareDirectories, compareFiles, IScanResult } from './service'
import { InstanceConfig, MultiDirectoryInstanceConfig, ParseltConfig } from './config'
import { loadNewFileTemplate } from './loader'
import { IScanningError, ScanningErrorsCollector } from './errorCollector'
import { handleScanningErrors } from './errors'

export const format = (config: ParseltConfig, instanceName?: string) => {
    config.instances.forEach((instanceConfig) => {
        gateByInstanceName(
            instanceConfig,
            instanceName
        )(() => {
            if (instanceConfig.isMultiDirectory === true) {
                styleDirectories(instanceConfig)
            } else {
                styleFiles(instanceConfig)
            }
        })
    })
}

export const scan = (config: ParseltConfig, instanceName?: string): IScanResult => {
    let errors: IScanningError[] = []
    let warnings: IScanningError[] = []
    config.instances.forEach((instanceConfig) => {
        gateByInstanceName(
            instanceConfig,
            instanceName
        )(() => {
            if (instanceConfig.isMultiDirectory) {
                const errorCollector = compareDirectories(instanceConfig)
                handleScanningErrors(errorCollector, instanceConfig.name, instanceConfig.shouldPrintResultSummaryOnly)
                const errorings = errorCollector.getAllErrors()
                errors = errors.concat(errorings)
                warnings = warnings.concat(errorCollector.getAllWarnings())
            } else {
                const errorCollector = compareFiles(instanceConfig)
                handleScanningErrors(errorCollector, instanceConfig.name, instanceConfig.shouldPrintResultSummaryOnly)
                errors = errors.concat(errorCollector.getAllErrors())
                warnings = warnings.concat(errorCollector.getAllWarnings())
            }
        })
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

const gateByInstanceName = (config: InstanceConfig, instanceName?: string) => (func: () => void) => {
    if (instanceName && config.name) {
        if (config.name === instanceName) {
            func()
        }
    } else {
        func()
    }
}
