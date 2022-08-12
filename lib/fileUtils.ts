import fs from 'fs'
import jsYaml from 'js-yaml'
import { FileTypes, Indentation } from './config'
import { ScanningErrorsCollector, ScanningErrorTypes } from './errorCollector'

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
}: GetFileAsObjectParams): unknown | undefined => {
    const filePath = `${directoryPath}/${fileName}`
    try {
        const file = fs.readFileSync(filePath, 'utf8')
        if (fileType === FileTypes.YAML && (fileName.includes('.yml') || fileName.includes('.yaml'))) {
            return jsYaml.load(file)
        } else if (fileType === FileTypes.JSON && fileName.includes('.json')) {
            return JSON.parse(file)
        }
    } catch (error) {
        errorCollector.addError({
            type: ScanningErrorTypes.COULD_NOT_LOAD_FILE,
            filePath,
            msg: JSON.stringify(error),
        })
        return undefined
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
