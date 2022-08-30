import fs, { Dirent } from 'fs'
import jsYaml from 'js-yaml'
import { FileTypes, Indentation } from './config/config'
import { PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from './errorCollector'

interface GetFileAsObjectParams {
    filePath: string
    fileType: FileTypes
    errorCollector?: ScanningErrorsCollector
}

export const getFileAsObject = ({ filePath, fileType, errorCollector }: GetFileAsObjectParams): object | undefined => {
    try {
        const file = fs.readFileSync(filePath, 'utf8')
        if (fileType === FileTypes.YAML && (filePath.includes('.yml') || filePath.includes('.yaml'))) {
            const loadedObject = jsYaml.load(file)
            return parseFileIntoObject({ obj: loadedObject, filePath, fileType, errorCollector })
        } else if (fileType === FileTypes.JSON && filePath.includes('.json')) {
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
}

export const loadAllFromDirectory = (
    directoryPath: string,
    errorCollector: ScanningErrorsCollector
): Dirent[] | undefined => {
    try {
        return fs.readdirSync(directoryPath, { withFileTypes: true })
    } catch (error) {
        errorCollector.addError({
            type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
            path: directoryPath,
            pathType: PathTypes.DIRECTORY,
            msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
        })
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

export const writeObjectToYaml = ({ obj, path, indentation }: WriteObjectParams) => {
    const yaml = jsYaml.dump(obj, { indent: indentation, sortKeys: true, quotingType: '"' })
    fs.writeFileSync(path, yaml)
}

export const writeObjectToJson = ({ obj, path, indentation }: WriteObjectParams) => {
    const json = JSON.stringify(obj, undefined, indentation)
    fs.writeFileSync(path, json)
}

interface WriteObjectToFileParams extends WriteObjectParams {
    fileType: FileTypes
}

export const writeObjectToFile = ({ obj, path, indentation, fileType }: WriteObjectToFileParams) => {
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
