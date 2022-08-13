import fs, { Dirent } from 'fs'
import jsYaml from 'js-yaml'
import { FileTypes, Indentation } from './config'
import { PathTypes, ScanningErrorsCollector, ScanningErrorTypes } from './errorCollector'

interface GetFileAsObjectParams {
    fileName: string
    directoryPath: string
    fileType: FileTypes
    errorCollector: ScanningErrorsCollector
}

export const getFileAsObject = ({
    fileName,
    directoryPath,
    fileType,
    errorCollector,
}: GetFileAsObjectParams): object | undefined => {
    const filePath = `${directoryPath}/${fileName}`
    try {
        const file = fs.readFileSync(filePath, 'utf8')
        if (fileType === FileTypes.YAML && (fileName.includes('.yml') || fileName.includes('.yaml'))) {
            const loadedObject = jsYaml.load(file)
            return parseFileIntoObject({ obj: loadedObject, filePath, fileType, errorCollector })
        } else if (fileType === FileTypes.JSON && fileName.includes('.json')) {
            const loadedObject = JSON.parse(file)
            return parseFileIntoObject({ obj: loadedObject, filePath, fileType, errorCollector })
        }
    } catch (error) {
        errorCollector.addError({
            type: ScanningErrorTypes.COULD_NOT_LOAD_PATH,
            path: filePath,
            pathType: PathTypes.FILE,
        })
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
        })
    }
}

interface ObjectParsingParams {
    obj: unknown
    errorCollector: ScanningErrorsCollector
    filePath: string
    fileType: FileTypes
}

const parseFileIntoObject = ({ obj, errorCollector, filePath, fileType }: ObjectParsingParams): object | undefined => {
    if (typeof obj === 'object' && obj !== null) {
        return obj
    } else {
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
    const yaml = jsYaml.dump(obj, { indent: indentation, sortKeys: true })
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
