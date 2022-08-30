import fs from 'fs'
import {
    FileTypes,
    FormatConfig,
    InstanceConfig,
    MultiDirectoryInstanceConfig,
    ParseltConfig,
    ScanConfig,
    SingleDirectoryInstanceConfig,
} from './config'

import Ajv from 'ajv'
import { JSONSchemaType } from 'ajv'

const ajv = new Ajv()

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
    additionalProperties: false,
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
    additionalProperties: false,
}
const singleDirectoryValidator = ajv.compile(singleDirectorySchema)
const multiDirectoryValidator = ajv.compile(multiDirectorySchema)

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
        } catch (error) {
            throw new Error(
                'Could not load config file in root directory. Please create config file (parselt.json) and try again'
            )
        }
    }

    private filterInstancesByInstanceName(instanceName: string | undefined, config: ParseltConfig): InstanceConfig[] {
        const finalInstances = instanceName
            ? config.instances.filter((instance) => instance.name === instanceName)
            : config.instances
        if (finalInstances.length === 0) {
            const instanceNames = config.instances.map((instance) => instance.name)
            throw new Error(`${instanceName} invalid. Valid instance names from config: ${instanceNames.join(', ')}`)
        } else {
            return finalInstances
        }
    }

    // initializeCommandWithInstanceName =
    //     (instanceName: unknown, shouldRemoveExtras: boolean) =>
    //     (func: (config: ParseltConfig, shouldRemoveExtras: boolean, instanceName?: string) => void) => {
    //         try {
    //             const config = loadConfig()
    //             if (instanceName !== undefined) {
    //                 if (typeof instanceName === 'string' && isInstanceNameValid(instanceName, config)) {
    //                     func(config, shouldRemoveExtras, instanceName)
    //                 } else {
    //                     throw new Error(
    //                         'Instance name is invalid. Please choose an instance name that corresponds with an instance in the config'
    //                     )
    //                 }
    //             } else {
    //                 func(config, shouldRemoveExtras)
    //             }
    //         } catch (error: any) {
    //             if (error?.message) {
    //                 logError(error.message)
    //             } else {
    //                 logError('Could not perform command')
    //             }
    //         }
    //     }

    loadFormatConfig(argv: any): FormatConfig {
        const mainConfig = this.loadConfigFromFile(this.configPath)
        const finalConfig: FormatConfig = {
            instances: this.filterInstancesByInstanceName(argv?.instanceName, mainConfig),
            shouldLogOutput: argv?.shouldLogOutput ? argv?.shouldLogOuput : true,
            shouldRemoveExtras: argv?.removeExtras ? argv.removeExtras : false,
        }
        return finalConfig
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
