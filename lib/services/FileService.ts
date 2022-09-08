import fs, { Dirent } from 'fs'
import jsYaml from 'js-yaml'
import { AddTranslationFileConfig, FileTypes, Indentation } from '../config/config'
import { PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from '../errorCollector'

export class FileService {
    private readonly errorCollector: ScanningErrorsCollector | undefined
    constructor(errorCollector?: ScanningErrorsCollector) {
        this.errorCollector = errorCollector
    }

    getFileAsObject(filePath: string): object | undefined {
        const fileType = FileService.getFileTypeForFile(filePath)
        if (fileType !== undefined) {
            try {
                const file = fs.readFileSync(filePath, 'utf8')

                if (fileType === FileTypes.YAML) {
                    const loadedObject = jsYaml.load(file)
                    return this.parseFileIntoObject(loadedObject, filePath)
                } else if (fileType === FileTypes.JSON) {
                    const loadedObject = JSON.parse(file)
                    return this.parseFileIntoObject(loadedObject, filePath)
                }
            } catch (error) {
                if (this.errorCollector) {
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

    mapFileObjectsInDirectory =
        <A>(
            directoryPath: string,
            fileType: FileTypes,
            shouldIncludeSubDirectories: boolean,
            expectedFilePrefix?: string
        ) =>
        (func: (fileName: string, obj: object) => A): A[] => {
            const files = this.loadAllFromDirectory(directoryPath)
            const items: A[] = []
            files.forEach((file) => {
                if (file.isDirectory() && shouldIncludeSubDirectories) {
                    const subItems = this.mapFileObjectsInDirectory<A>(
                        `${directoryPath}/${file.name}`,
                        fileType,
                        true
                    )(func)
                    items.concat(subItems)
                } else if (FileService.shouldFileBeScanned(file, fileType, expectedFilePrefix)) {
                    const obj = this.getFileAsObject(`${directoryPath}/${file.name}`)
                    if (obj !== undefined) {
                        const item = func(file.name, obj)
                        items.push(item)
                    }
                }
            })

            return items
        }

    loadAllFromDirectory(directoryPath: string): Dirent[] {
        try {
            const dirents = fs.readdirSync(directoryPath, { withFileTypes: true })
            if (dirents.length === 0 && this.errorCollector) {
                this.errorCollector.addError({
                    type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                    path: directoryPath,
                    pathType: PathTypes.DIRECTORY,
                    msg: 'No files found in directory. Please make sure that the path is correct and that the directory contains the right files.',
                })
            }
            return dirents
        } catch (error) {
            if (this.errorCollector) {
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

    private parseFileIntoObject = (obj: unknown, filePath: string): object | undefined => {
        if (typeof obj === 'object' && obj !== null) {
            return obj
        } else if (this.errorCollector) {
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

    deleteExcessFilesFromDirectories = (
        rootDirectoryPath: string,
        mainDirectoryName: string,
        fileType: FileTypes,
        expectedFilePrefix?: string
    ): string[] => {
        const dirs = this.loadAllFromDirectory(rootDirectoryPath)

        const mainFileNames: string[] = []

        this.mapFileObjectsInDirectory(
            `${rootDirectoryPath}/${mainDirectoryName}`,
            fileType,
            false,
            expectedFilePrefix
        )((fileName) => {
            mainFileNames.push(fileName)
        })

        const removedFileNames: string[] = []

        if (dirs !== undefined) {
            dirs.forEach((directory) => {
                if (directory.isDirectory() && directory.name !== mainDirectoryName) {
                    const currentDirectoryPath = `${rootDirectoryPath}/${directory.name}`
                    this.mapFileObjectsInDirectory(
                        currentDirectoryPath,
                        fileType,
                        false,
                        expectedFilePrefix
                    )((fileName) => {
                        if (!mainFileNames.includes(fileName)) {
                            const filePathToDelete = `${currentDirectoryPath}/${fileName}`
                            fs.rmSync(filePathToDelete)
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
            `${config.instance.rootDirectoryPath}/${config.instance.mainDirectoryName}/${config.fileName}`
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
