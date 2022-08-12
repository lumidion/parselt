import { MultiDirectoryInstanceConfig } from './config'
import { ScanningErrorsCollector } from './errorCollector'
import { getFileAsObject, writeObjectToFile } from './fileUtils'
import fs from 'fs'

interface LoadNewFileTemplateParams {
    config: MultiDirectoryInstanceConfig
    templateFileName: string
    directories?: string[]
    errorCollector: ScanningErrorsCollector
}

export const loadNewFileTemplate = ({
    config,
    templateFileName,
    directories,
    errorCollector,
}: LoadNewFileTemplateParams) => {
    const mainObj = getFileAsObject({
        fileName: templateFileName,
        directoryPath: `${config.rootDirectoryPath}/${config.mainDirectoryName}`,
        fileType: config.fileType,
        errorCollector,
    })

    if (directories && directories.length > 0) {
        directories.forEach((directory) => {
            writeObjectToFile({
                obj: mainObj,
                path: `${config.rootDirectoryPath}/${directory}/${templateFileName}`,
                indentation: config.indentation,
                fileType: config.fileType,
            })
        })
    } else {
        const dirs = fs.readdirSync(config.rootDirectoryPath, { withFileTypes: true })
        dirs.forEach((directory) => {
            if (directory.isDirectory()) {
                writeObjectToFile({
                    obj: mainObj,
                    path: `${config.rootDirectoryPath}/${directory.name}/${templateFileName}`,
                    indentation: config.indentation,
                    fileType: config.fileType,
                })
            }
        })
    }
}
