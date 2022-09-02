import fs, { Dirent } from 'fs'
import jsYaml from 'js-yaml'
import { AddTranslationFileConfig, FileTypes, Indentation } from '../config/config'
import { PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from '../errorCollector'

export class FileService {
    private readonly errorCollector: ScanningErrorsCollector
    constructor(errorCollector: ScanningErrorsCollector) {
        this.errorCollector = errorCollector
    }

    getFileAsObject(filePath: string, shouldRecordErrors: boolean): object | undefined {
        const fileType = FileService.getFileTypeForFile(filePath)
        if (fileType !== undefined) {
            try {
                const file = fs.readFileSync(filePath, 'utf8')

                if (fileType === FileTypes.YAML) {
                    const loadedObject = jsYaml.load(file)
                    return this.parseFileIntoObject(loadedObject, filePath, shouldRecordErrors)
                } else if (fileType === FileTypes.JSON) {
                    const loadedObject = JSON.parse(file)
                    return this.parseFileIntoObject(loadedObject, filePath, shouldRecordErrors)
                }
            } catch (error) {
                if (shouldRecordErrors) {
                    this.errorCollector.addError({
                        type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                        path: filePath,
                        pathType: PathTypes.FILE,
                        msg: `File could not be parsed for scanning. Please make sure that the file exists and that the ${fileType} structure is correct.`,
                    })
                }
                return undefined
            }
        } else {
            return undefined
        }
    }

    loadAllFromDirectory = (directoryPath: string, shouldCollectErrors: boolean): Dirent[] => {
        try {
            const dirents = fs.readdirSync(directoryPath, { withFileTypes: true })
            if (dirents.length === 0 && shouldCollectErrors) {
                this.errorCollector.addError({
                    type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                    path: directoryPath,
                    pathType: PathTypes.DIRECTORY,
                    msg: 'No files found in directory. Please make sure that the path is correct and that the directory contains the right files.',
                })
            }
            return []
        } catch (error) {
            if (shouldCollectErrors) {
                this.errorCollector.addError({
                    type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                    path: directoryPath,
                    pathType: PathTypes.DIRECTORY,
                    msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
                })
            }
            return []
        }
    }

    private parseFileIntoObject = (obj: unknown, filePath: string, shouldRecordErrors: boolean): object | undefined => {
        if (typeof obj === 'object' && obj !== null) {
            return obj
        } else if (shouldRecordErrors) {
            this.errorCollector.addError({
                type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                path: filePath,
                pathType: PathTypes.FILE,
                msg: `File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.`,
            })
        }
    }

    writeObjectToFile(obj: any, path: string, indentation: Indentation) {
        const fileType = FileService.getFileTypeForFile(path)
        if (fileType === FileTypes.JSON) {
            const json = JSON.stringify(obj, undefined, indentation)
            fs.writeFileSync(path, json)
        } else if (fileType === FileTypes.YAML) {
            const yaml = jsYaml.dump(obj, { indent: indentation, sortKeys: true, quotingType: '"' })
            fs.writeFileSync(path, yaml)
        }
    }

    static getFileTypeForFile = (fileNameOrPath: string): FileTypes | undefined => {
        if (fileNameOrPath.includes('.json')) {
            return FileTypes.JSON
        } else if (fileNameOrPath.includes('.yml') || fileNameOrPath.includes('.yaml')) {
            return FileTypes.YAML
        } else return undefined
    }

    private static isFileAllowedByPrefixGate(fileName: string, expectedFilePrefix: string | undefined): boolean {
        if (expectedFilePrefix !== undefined && !fileName.includes(expectedFilePrefix)) {
            return false
        } else if (expectedFilePrefix === undefined && fileName.split('.').length > 2) {
            return false
        } else return true
    }

    private static isFileTypeCorrect(fileName: string, expectedFileType: FileTypes): boolean {
        const fileTypeOption = this.getFileTypeForFile(fileName)
        if (fileTypeOption !== undefined && fileTypeOption === expectedFileType) {
            return true
        } else {
            return false
        }
    }

    static shouldFileBeScanned(file: Dirent, expectedFileType: FileTypes, expectedFilePrefix?: string) {
        return (
            file.isFile() &&
            this.isFileTypeCorrect(file.name, expectedFileType) &&
            this.isFileAllowedByPrefixGate(file.name, expectedFilePrefix)
        )
    }

    deleteExcessFilesFromDirectories = (rootDirectoryPath: string, mainDirectoryName: string): string[] => {
        const dirs = this.loadAllFromDirectory(rootDirectoryPath, false)
        const mainFiles = this.loadAllFromDirectory(`${rootDirectoryPath}/${mainDirectoryName}`, false)
        const mainFileNames: string[] = []
        mainFiles.forEach((mainFile) => {
            const fileTypeOption = FileService.getFileTypeForFile(mainFile.name)
            if (fileTypeOption) {
                mainFileNames.push(mainFile.name)
            }
        })

        const removedFileNames: string[] = []
        //TODO: create error messages for all cases where template file or directory cannot be loaded
        if (dirs !== undefined) {
            dirs.forEach((directory) => {
                if (directory.isDirectory() && directory.name !== mainDirectoryName) {
                    const currentDirectoryPath = `${rootDirectoryPath}/${directory.name}`
                    const childFiles = this.loadAllFromDirectory(currentDirectoryPath, false)
                    childFiles.forEach((file) => {
                        const fileTypeOption = FileService.getFileTypeForFile(file.name)
                        if (fileTypeOption && !mainFileNames.includes(file.name)) {
                            const filePathToDelete = `${currentDirectoryPath}/${file.name}`
                            fs.rmSync(`${currentDirectoryPath}/${file.name}`)
                            removedFileNames.push(filePathToDelete)
                        }
                    })
                }
            })
        }
        return removedFileNames
    }

    createFileFromTemplate(config: AddTranslationFileConfig) {
        const mainObj = this.getFileAsObject(
            `${config.instance.rootDirectoryPath}/${config.instance.mainDirectoryName}/${config.fileName}`,
            false
        )

        if (mainObj !== undefined) {
            if (config.directories && config.directories.length > 0) {
                config.directories.forEach((directory) => {
                    this.writeObjectToFile(
                        mainObj,
                        `${config.instance.rootDirectoryPath}/${directory}/${config.fileName}`,
                        config.instance.indentation
                    )
                })
            } else {
                const dirs = fs.readdirSync(config.instance.rootDirectoryPath, { withFileTypes: true })
                dirs.forEach((directory) => {
                    if (directory.isDirectory()) {
                        this.writeObjectToFile(
                            mainObj,
                            `${config.instance.rootDirectoryPath}/${directory.name}/${config.fileName}`,
                            config.instance.indentation
                        )
                    }
                })
            }
        } else {
            throw new Error(
                `Template file with name, ${config.fileName}, failed to load. Please make sure that this a properly formatted json or yaml file and try again.`
            )
        }
    }
}
