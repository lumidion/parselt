import fs from 'fs'
import {
    AddTranslationFileConfig,
    FileTypes,
    FormatConfig,
    InstanceConfig,
    MultiDirectoryInstanceConfig,
    ParseltConfig,
    ScanConfig,
    SingleDirectoryInstanceConfig,
} from './config.js'

import { JSONSchemaType } from 'ajv'

import _Ajv from 'ajv'

const Ajv = _Ajv as unknown as typeof _Ajv.default // TODO: Investigate whether to remove all Ajv and replace with type guards. This current workaround is necessary to support ESM, as Ajv imports json modules in a way that isn't supported by ESM

const ajv = new Ajv({ removeAdditional: true })

const singleDirectorySchema: JSONSchemaType<SingleDirectoryInstanceConfig> = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        rootDirectoryPath: { type: 'string' },
        shouldCheckFirstKey: { type: 'boolean', nullable: true },
        shouldPrintResultSummaryOnly: { type: 'boolean', nullable: true },
        fileType: { type: 'string', enum: Object.values(FileTypes) },
        indentation: { type: 'number' },
        isMultiDirectory: { type: 'boolean' },
        mainFileName: { type: 'string' },
        filePrefix: { type: 'string', nullable: true },
    },
    required: ['name', 'rootDirectoryPath', 'fileType', 'indentation', 'isMultiDirectory', 'mainFileName'],
    additionalProperties: true,
}

const multiDirectorySchema: JSONSchemaType<MultiDirectoryInstanceConfig> = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        rootDirectoryPath: { type: 'string' },
        mainDirectoryName: { type: 'string' },
        shouldCheckFirstKey: { type: 'boolean', nullable: true },
        shouldPrintResultSummaryOnly: { type: 'boolean', nullable: true },
        fileType: { type: 'string', enum: Object.values(FileTypes) },
        indentation: { type: 'number' },
        isMultiDirectory: { type: 'boolean' },
    },
    required: ['name', 'rootDirectoryPath', 'fileType', 'indentation', 'isMultiDirectory', 'mainDirectoryName'],
    additionalProperties: true,
}
const singleDirectoryValidator = ajv.compile(singleDirectorySchema)
const multiDirectoryValidator = ajv.compile(multiDirectorySchema)

const parseDirectoriesOption = (directories: unknown): string[] | undefined => {
    if (directories !== undefined) {
        if (Array.isArray(directories)) {
            directories.forEach((dir) => {
                if (typeof dir !== 'string') {
                    throw new Error(`Invalid input for directory: ${dir}. --directories must be an array of strings`)
                }
            })
        } else {
            throw new Error(
                `Invalid input for directories. Type of input was not an array. --directories must be an array of strings.`
            )
        }
    } else {
        return undefined
    }
}

export class ConfigLoader {
    private readonly configPath: string
    constructor(configPath?: string) {
        this.configPath = configPath ? configPath : `${process.cwd()}/parselt.json`
    }
    private loadConfigFromFile(configPath: string): ParseltConfig {
        try {
            const configFile = fs.readFileSync(configPath, 'utf8')
            const json = JSON.parse(configFile)
            if (json?.instances && Array.isArray(json?.instances)) {
                json.instances.forEach((instance: any) => {
                    if (instance?.isMultiDirectory !== undefined) {
                        if (!singleDirectoryValidator(instance) && !multiDirectoryValidator(instance)) {
                            throw new Error(
                                `Could not load config. Could not parse instance as single or multi directory. Single directory errors ${singleDirectoryValidator.errors?.toString}. Multi-directory errors ${singleDirectoryValidator.errors?.toString}`
                            )
                        }
                    } else {
                        throw new Error(`Could not load config. Instance did not contain key: isMultiDirectory.`)
                    }
                })
                return json as ParseltConfig //typecasting isn't great here. Find a different way to do it.
            } else {
                throw new Error(`Could not load config. 'Instances' key had a malformed structure.`)
            }
        } catch (error: any) {
            if (error?.message) {
                error.message = `Could not load config file in root directory. Please make sure that the config file (parselt.json) is properly created and try again. \n ${error.message}`
                throw error
            } else {
                throw error
            }
        }
    }

    private filterInstancesByInstanceName(instanceName: string | undefined, config: ParseltConfig): InstanceConfig[] {
        if (instanceName !== undefined) {
            const finalInstances = instanceName
                ? config.instances.filter((instance) => instance.name === instanceName)
                : config.instances
            if (finalInstances.length === 0) {
                const instanceNames = config.instances.map((instance) => instance.name)
                throw new Error(
                    `${instanceName} invalid. Valid instance names from config: ${instanceNames.join(', ')}`
                )
            } else {
                return finalInstances
            }
        } else {
            return config.instances
        }
    }

    loadFormatConfig(argv: any): FormatConfig {
        const mainConfig = this.loadConfigFromFile(this.configPath)
        const finalConfig: FormatConfig = {
            instances: this.filterInstancesByInstanceName(argv?.instanceName, mainConfig),
            shouldLogOutput: argv?.shouldLogOutput ? argv?.shouldLogOuput : true,
            shouldRemoveExtras: argv?.removeExtras ? argv.removeExtras : false,
        }
        return finalConfig
    }

    loadAddTranslationFileConfig(argv: any): AddTranslationFileConfig {
        const mainConfig = this.loadConfigFromFile(this.configPath)
        const instance = this.filterInstancesByInstanceName(argv?.instanceName, mainConfig)[0]
        if (instance.isMultiDirectory === true) {
            const finalConfig: AddTranslationFileConfig = {
                instance,
                fileName: argv?.fileName,
                directories: parseDirectoriesOption(argv?.directories),
            }
            return finalConfig
        } else {
            throw new Error(`Instance with instance name, ${instance.name}, must be a multidirectory instance`)
        }
    }

    loadScanConfig(argv: any): ScanConfig {
        const mainConfig = this.loadConfigFromFile(this.configPath)
        const finalConfig: ScanConfig = {
            instances: this.filterInstancesByInstanceName(argv?.instanceName, mainConfig),
            shouldLogOutput: argv?.shouldLogOutput ? argv?.shouldLogOuput : true,
        }
        return finalConfig
    }
}
