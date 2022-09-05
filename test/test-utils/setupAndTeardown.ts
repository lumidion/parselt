import { FileTypes, Indentation, ParseltConfig } from '../../lib/config/config'
import { FileService } from '../../lib/services/FileService'
import fs from 'fs'
import jsYaml from 'js-yaml'
import { createScanConfigFromDirName } from './config'
import * as uuid from 'uuid'

const writeObjectToFile = (obj: any, path: string, indentation: Indentation) => {
    const fileType = FileService.getFileTypeForFile(path)
    if (fileType === FileTypes.JSON) {
        const json = JSON.stringify(obj, undefined, indentation)
        fs.writeFileSync(path, json)
    } else if (fileType === FileTypes.YAML) {
        const yaml = jsYaml.dump(obj, { indent: indentation, sortKeys: false, quotingType: '"' })
        fs.writeFileSync(path, yaml)
    }
}

export const setupEmptyDirsWithConfig =
    (testName: string) =>
    (func: (config: ParseltConfig) => void): void => {
        const testId = uuid.v4()
        const rootDirName = `${testName}-${testId.slice(0, 7)}`
        const config = createScanConfigFromDirName(rootDirName)

        fs.mkdirSync(`./test/tmp/${rootDirName}`, { recursive: true })

        config.instances.forEach((instance) => {
            fs.mkdirSync(instance.rootDirectoryPath)
            if (instance.isMultiDirectory) {
                fs.mkdirSync(`${instance.rootDirectoryPath}/en`)
                fs.mkdirSync(`${instance.rootDirectoryPath}/fr`)
            }
        })
        try {
            func(config)
        } finally {
            fs.rmSync(`./test/tmp/${rootDirName}`, { recursive: true, force: true })
        }
    }

export const setupScanningTest =
    (testName: string, mainObj: any, childObj: any) => (func: (config: ParseltConfig) => void) => {
        setupEmptyDirsWithConfig(testName)((config) => {
            config.instances.forEach((instance) => {
                const writeToFile = (obj: any, endPath: string) => {
                    const finalPath = `${instance.rootDirectoryPath}/${endPath}`
                    writeObjectToFile(obj, finalPath, instance.indentation)
                }
                const writeMainToFile = (endPath: string) => {
                    writeToFile(mainObj, endPath)
                }
                const writeChildToFile = (endPath: string) => {
                    writeToFile(childObj, endPath)
                }
                if (instance.isMultiDirectory) {
                    if (instance.fileType === FileTypes.JSON) {
                        writeMainToFile('en/general.json')
                        writeChildToFile('fr/general.json')
                    } else {
                        writeMainToFile('en/general.yaml')
                        writeChildToFile('fr/general.yaml')
                    }
                } else {
                    if (instance.filePrefix) {
                        if (instance.fileType === FileTypes.JSON) {
                            writeMainToFile('auth.en.json')
                            writeChildToFile('auth.fr.json')
                            writeMainToFile('en.json')
                            writeChildToFile('fr.json')
                        } else {
                            writeMainToFile('auth.en.yaml')
                            writeChildToFile('auth.fr.yaml')
                            writeMainToFile('en.yaml')
                            writeChildToFile('fr.yaml')
                        }
                    } else {
                        if (instance.fileType === FileTypes.JSON) {
                            writeMainToFile('en.json')
                            writeChildToFile('fr.json')
                        } else {
                            writeMainToFile('en.yaml')
                            writeChildToFile('fr.yaml')
                        }
                    }
                }
            })
            func(config)
        })
    }
