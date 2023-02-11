import fs, { Dirent } from 'fs'
import jsYaml from 'js-yaml'
import { AddTranslationFileConfig, FileTypes, Indentation, MultiDirectoryInstanceConfig } from '../config/config.js'
import { PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from '../errorCollector.js'

export interface FileMetadata {
    name: string
    parentPath: string
    fileType: FileTypes
}

export class FileService {
    private readonly errorCollector: ScanningErrorsCollector | undefined
    constructor(errorCollector?: ScanningErrorsCollector) {
        this.errorCollector = errorCollector
    }

    getSerializedFileMetadataFromDir(directoryPath: string): FileMetadata[] {
        const files = this.loadAllFromDirectory(directoryPath)
        let items: FileMetadata[] = []
        files.forEach((file) => {
            if (file.isDirectory() && !file.name.match(/^\./) && !file.name.match('node_modules')) {
                const subItems = this.getSerializedFileMetadataFromDir(`${directoryPath}/${file.name}`)
                items = items.concat(subItems)
            } else {
                const fileType = FileService.getSerializedFileType(file.name)
                if (fileType !== undefined) {
                    items.push({ name: file.name, parentPath: directoryPath, fileType })
                }
            }
        })
        return items
    }

    getSerializedFileAsObject(filePath: string): object | undefined {
        const fileType = FileService.getSerializedFileType(filePath)
        if (fileType !== undefined) {
            try {
                const file = fs.readFileSync(filePath, 'utf8')

                if (fileType === FileTypes.YAML) {
                    const loadedObject = jsYaml.load(file)
                    return this.parseRawLoadedFileIntoObject(loadedObject, filePath)
                } else if (fileType === FileTypes.JSON) {
                    const loadedObject = JSON.parse(file)
                    return this.parseRawLoadedFileIntoObject(loadedObject, filePath)
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

    mapInstanceFilesToObjectsInDir =
        <A>(
            directoryPath: string,
            fileType: FileTypes,
            shouldIncludeSubDirectories: boolean,
            expectedFilePrefix?: string
        ) =>
        (func: (fileName: string, obj: object) => A): A[] => {
            const files = this.loadAllFromDirectory(directoryPath)
            let items: A[] = []
            files.forEach((file) => {
                if (file.isDirectory() && shouldIncludeSubDirectories) {
                    const subItems = this.mapInstanceFilesToObjectsInDir<A>(
                        `${directoryPath}/${file.name}`,
                        fileType,
                        true
                    )(func)
                    items = items.concat(subItems)
                } else if (FileService.isFilePartOfInstance(file, fileType, expectedFilePrefix)) {
                    const obj = this.getSerializedFileAsObject(`${directoryPath}/${file.name}`)
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
            } else {
                console.log(error)
            }
            return []
        }
    }

    getFirstSerializedFilePathFromDir(directoryPath: string): string | undefined {
        const dirents = this.loadAllFromDirectory(directoryPath)
        let filePath: string | undefined = undefined

        for (let i = 0; i < dirents.length; i++) {
            const currentDirent = dirents[i]
            if (currentDirent.isDirectory()) {
                const subFilePath = this.getFirstSerializedFilePathFromDir(`${directoryPath}/${currentDirent.name}`)
                if (subFilePath) {
                    filePath = subFilePath
                    break
                }
            } else if (currentDirent.isFile()) {
                const currentDirentPath = `${directoryPath}/${currentDirent.name}`
                const fileType = FileService.getSerializedFileType(currentDirentPath)
                if (fileType !== undefined) {
                    filePath = currentDirentPath
                    break
                }
            }
        }

        return filePath
    }

    getIndentationFromSerializedFile(filePath: string): Indentation {
        const DEFAULT_INDENTATION = 2
        const fileType = FileService.getSerializedFileType(filePath)

        if (fileType === undefined) {
            return DEFAULT_INDENTATION
        }

        try {
            const file = fs.readFileSync(filePath, 'utf-8')
            const lines = file.split('\n')

            if (lines.length <= 1) {
                return DEFAULT_INDENTATION
            } else {
                let initialWhitespaceCounter = 0
                for (let i = 0; i < lines[1].length; i++) {
                    const currentChar = lines[1][i]
                    if (currentChar === ' ') {
                        initialWhitespaceCounter++
                    } else {
                        break
                    }
                }
                return initialWhitespaceCounter === 2 || initialWhitespaceCounter === 4
                    ? initialWhitespaceCounter
                    : DEFAULT_INDENTATION
            }
        } catch (err) {
            return DEFAULT_INDENTATION
        }
    }

    private parseRawLoadedFileIntoObject = (obj: unknown, filePath: string): object | undefined => {
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
        const fileType = FileService.getSerializedFileType(path)
        if (fileType === FileTypes.JSON) {
            const json = JSON.stringify(obj, undefined, indentation)
            fs.writeFileSync(path, json)
        } else if (fileType === FileTypes.YAML) {
            const yaml = jsYaml.dump(obj, { indent: indentation, sortKeys: true, quotingType: '"' })
            fs.writeFileSync(path, yaml)
        }
    }

    static getSerializedFileType = (fileNameOrPath: string): FileTypes | undefined => {
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
        const fileTypeOption = this.getSerializedFileType(fileName)
        if (fileTypeOption !== undefined && fileTypeOption === expectedFileType) {
            return true
        } else {
            return false
        }
    }

    static isFilePartOfInstance(file: Dirent, expectedFileType: FileTypes, expectedFilePrefix?: string): boolean {
        return (
            file.isFile() &&
            this.isFileTypeCorrect(file.name, expectedFileType) &&
            this.isFileAllowedByPrefixGate(file.name, expectedFilePrefix)
        )
    }

    deleteExcessFilesFromDirectories = (instance: MultiDirectoryInstanceConfig): string[] => {
        const dirs = this.loadAllFromDirectory(instance.rootDirectoryPath)

        const mainFileNames: string[] = []

        this.mapInstanceFilesToObjectsInDir(
            `${instance.rootDirectoryPath}/${instance.mainDirectoryName}`,
            instance.fileType,
            true
        )((fileName) => {
            mainFileNames.push(fileName)
        })

        const removedFileNames: string[] = []

        if (dirs !== undefined) {
            dirs.forEach((directory) => {
                if (directory.isDirectory() && directory.name !== instance.mainDirectoryName) {
                    const currentDirectoryPath = `${instance.rootDirectoryPath}/${directory.name}`
                    this.mapInstanceFilesToObjectsInDir(
                        currentDirectoryPath,
                        instance.fileType,
                        true
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
        const mainObj = this.getSerializedFileAsObject(
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
