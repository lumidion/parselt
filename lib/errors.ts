import { ScanningErrorsCollector } from './errorCollector.js'
import { logError, logSuccess } from './logger.js'

interface HandleErrorsParams {
    actionName: string
    errorCollector: ScanningErrorsCollector
    instanceName: string
    shouldPrintResultSummaryOnly?: boolean
}

const handleErrors = ({
    actionName,
    errorCollector,
    instanceName,
    shouldPrintResultSummaryOnly,
}: HandleErrorsParams) => {
    console.log('\n')
    logSuccess(`Starting ${actionName} for ${instanceName} instance`)
    const isPrintingSummaryOnly =
        shouldPrintResultSummaryOnly === undefined || shouldPrintResultSummaryOnly === false ? false : true
    errorCollector.printAll(isPrintingSummaryOnly)

    if (errorCollector.hasErrors()) {
        logError(`Found errors when ${actionName} files for ${instanceName} instance`)
    }
}

export const handleScanningErrors = (
    errorCollector: ScanningErrorsCollector,
    instanceName: string,
    shouldPrintResultSummaryOnly?: boolean
) => {
    handleErrors({ actionName: 'scanning', errorCollector, instanceName, shouldPrintResultSummaryOnly })
}

export const handleFormattingErrors = (
    errorCollector: ScanningErrorsCollector,
    instanceName: string,
    shouldPrintResultSummaryOnly?: boolean
) => {
    handleErrors({ actionName: 'formatting', errorCollector, instanceName, shouldPrintResultSummaryOnly })
}
