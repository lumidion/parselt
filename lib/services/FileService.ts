import fs, { Dirent } from 'fs'
import jsYaml from 'js-yaml'
import { FileTypes, Indentation, MultiDirectoryInstanceConfig } from '../config/config'
import { PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from '../errorCollector'

interface GetFileAsObjectParams {
    filePath: string
    errorCollector?: ScanningErrorsCollector
}

export const getFileAsObject = ({ filePath, errorCollector }: GetFileAsObjectParams): object | undefined => {
    const fileType = getFileTypeForFile(filePath)
    if (fileType !== undefined) {
        try {
            const file = fs.readFileSync(filePath, 'utf8')

            if (fileType === FileTypes.YAML) {
                const loadedObject = jsYaml.load(file)
                return parseFileIntoObject({ obj: loadedObject, filePath, fileType, errorCollector })
            } else if (fileType === FileTypes.JSON) {
                const loadedObject = JSON.parse(file)
                return parseFileIntoObject({ obj: loadedObject, filePath, fileType, errorCollector })
            }
        } catch (error) {
            if (errorCollector) {
                errorCollector.addError({
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

export const loadAllFromDirectory = (
    directoryPath: string,
    errorCollector?: ScanningErrorsCollector
): Dirent[] | undefined => {
    try {
        return fs.readdirSync(directoryPath, { withFileTypes: true })
    } catch (error) {
        if (errorCollector) {
            errorCollector.addError({
                type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
                path: directoryPath,
                pathType: PathTypes.DIRECTORY,
                msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
            })
        }
    }
}

interface ObjectParsingParams {
    obj: unknown
    errorCollector?: ScanningErrorsCollector
    filePath: string
    fileType: FileTypes
}

const parseFileIntoObject = ({ obj, errorCollector, filePath, fileType }: ObjectParsingParams): object | undefined => {
    if (typeof obj === 'object' && obj !== null) {
        return obj
    } else if (errorCollector) {
        errorCollector.addError({
            type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
            path: filePath,
            pathType: PathTypes.FILE,
            msg: `File was found with invalid content and could not be parsed for scanning. Either it has null content or the ${fileType} structure is incorrect.`,
        })
    }
}

interface WriteObjectParams {
    obj: any
    indentation: Indentation
    path: string
}

const writeObjectToYaml = ({ obj, path, indentation }: WriteObjectParams) => {
    const yaml = jsYaml.dump(obj, { indent: indentation, sortKeys: true, quotingType: '"' })
    fs.writeFileSync(path, yaml)
}

const writeObjectToJson = ({ obj, path, indentation }: WriteObjectParams) => {
    const json = JSON.stringify(obj, undefined, indentation)
    fs.writeFileSync(path, json)
}

export const writeObjectToFile = ({ obj, path, indentation }: WriteObjectParams) => {
    const fileType = getFileTypeForFile(path)
    if (fileType === FileTypes.JSON) {
        writeObjectToJson({ obj, path, indentation })
    } else if (fileType === FileTypes.YAML) {
        writeObjectToYaml({ obj, path, indentation })
    }
}

export const getFileTypeForFile = (fileNameOrPath: string): FileTypes | undefined => {
    if (fileNameOrPath.includes('.json')) {
        return FileTypes.JSON
    } else if (fileNameOrPath.includes('.yml') || fileNameOrPath.includes('.yaml')) {
        return FileTypes.YAML
    } else return undefined
}

export const deleteExcessFilesFromDirectories = (rootDirectoryPath: string, mainDirectoryName: string): string[] => {
    const dirs = loadAllFromDirectory(rootDirectoryPath)
    const mainFiles = loadAllFromDirectory(`${rootDirectoryPath}/${mainDirectoryName}`)
    const mainFileNames: string[] = []
    mainFiles?.forEach((mainFile) => {
        const fileTypeOption = getFileTypeForFile(mainFile.name)
        if (fileTypeOption) {
            mainFileNames.push(mainFile.name)
        }
    })

    const removedFileNames: string[] = []
    if (dirs !== undefined) {
        dirs.forEach((directory) => {
            if (directory.isDirectory() && directory.name !== mainDirectoryName) {
                const currentDirectoryPath = `${rootDirectoryPath}/${directory.name}`
                const childFiles = loadAllFromDirectory(currentDirectoryPath)
                if (childFiles) {
                    childFiles.forEach((file) => {
                        const fileTypeOption = getFileTypeForFile(file.name)
                        if (fileTypeOption && !mainFileNames.includes(file.name)) {
                            const filePathToDelete = `${currentDirectoryPath}/${file.name}`
                            fs.rmSync(`${currentDirectoryPath}/${file.name}`)
                            removedFileNames.push(filePathToDelete)
                        }
                    })
                }
            }
        })
    }
    return removedFileNames
}

interface CreateFileFromTemplateParams {
    config: MultiDirectoryInstanceConfig
    templateFileName: string
    directories?: string[]
    errorCollector: ScanningErrorsCollector
}

export const createFileFromTemplate = ({
    config,
    templateFileName,
    directories,
    errorCollector,
}: CreateFileFromTemplateParams) => {
    const mainObj = getFileAsObject({
        filePath: `${config.rootDirectoryPath}/${config.mainDirectoryName}/${templateFileName}`,
        errorCollector,
    })

    if (directories && directories.length > 0) {
        directories.forEach((directory) => {
            writeObjectToFile({
                obj: mainObj,
                path: `${config.rootDirectoryPath}/${directory}/${templateFileName}`,
                indentation: config.indentation,
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
                })
            }
        })
    }
}
