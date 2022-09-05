import { Indentation, MultiDirectoryInstanceConfig, SingleDirectoryInstanceConfig } from '../config/config'
import { ScanningErrorsCollector } from '../errorCollector'
import { handleFormattingErrors } from '../errors'
import { FileService } from './FileService'

export class FormattingService {
    private readonly fileService: FileService
    constructor(fileService: FileService) {
        this.fileService = fileService
    }
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

    private styleFile = (filePath: string, indentation: Indentation) => {
        const parsedFile = this.fileService.getFileAsObject(filePath)
        const sortedObj = this.sortObjectKeysAlphabetically(parsedFile)
        this.fileService.writeObjectToFile(sortedObj, filePath, indentation)
    }

    styleFiles(config: SingleDirectoryInstanceConfig) {
        const files = this.fileService.loadAllFromDirectory(config.rootDirectoryPath)

        files.forEach((file) => {
            if (FileService.shouldFileBeScanned(file, config.fileType, config.filePrefix)) {
                this.styleFile(`${config.rootDirectoryPath}/${file.name}`, config.indentation)
            }
        })
    }

    styleDirectories(config: MultiDirectoryInstanceConfig) {
        const dirs = this.fileService.loadAllFromDirectory(config.rootDirectoryPath)

        dirs.forEach((directory) => {
            if (directory.isDirectory()) {
                const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`
                const files = this.fileService.loadAllFromDirectory(currentDirectoryPath)
                files.forEach((file) => {
                    if (FileService.shouldFileBeScanned(file, config.fileType)) {
                        this.styleFile(`${currentDirectoryPath}/${file.name}`, config.indentation)
                    }
                })
            }
        })
    }
}
