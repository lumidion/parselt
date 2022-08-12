import fs from 'fs'
import Ajv from 'ajv'
import { JSONSchemaType } from 'ajv'

const ajv = new Ajv()

export enum FileTypes {
    JSON = 'json',
    YAML = 'yaml',
}

export type Indentation = 2 | 4

interface CoreInstanceConfig {
    /**
     * The name with which the user can reference the config.
     */
    name: string

    /**
     * The root directory path containing either the translations themselves or the directories that contain the translations.
     * Many times, the last folder will be named "locale". Please specify the local path from your config file.
     * @example './app/i18n/locale'
     */
    rootDirectoryPath: string
    /**
     * Some projects start the same file with a different key across different languages
     * (E.g. the english settings.json file contains, {"en": "some_content"} and the french settings.json file contains {"fr": "some_content"})
     * If this is the case, set the shouldCheckFirstKey to false, as otherwise the check will fail.
     *
     * @default true
     */

    shouldCheckFirstKey?: boolean

    /**
     * If you only want the metrics on the number of errors and warnings that the project generates, set this flag to 'true'
     *
     * @default false
     */

    shouldPrintResultSummaryOnly?: boolean

    /**
     * The kind of the file that the translations use. Only json or yaml types are supported and they are not supported when mixed (e.g. en.json and fr.yaml will throw an error)
     */
    fileType: FileTypes

    /**
     * Indentation in spaces to use when printing json or yaml.
     * @example 2
     */
    indentation: Indentation
}

export interface MultiDirectoryInstanceConfig extends CoreInstanceConfig {
    /**
     * Does the project contain multiple directories (e.g. an "en" directory for all english languages and an "fr" directory for all french translations),
     * or does it combine all translations in a single directory (e.g. locale/en.json, locale/fr.json, etc.)
     */
    isMultiDirectory: true

    /**
     * The main directory name that will serve as the standard against which all other directories will be checked.
     * This should be the primary language that you use and are most sure that you will update.
     * @example "en"
     */
    mainDirectoryName: string
}

export interface SingleDirectoryInstanceConfig extends CoreInstanceConfig {
    /**
     * Does the project contain multiple directories (e.g. an "en" directory for all english languages and an "fr" directory for all french translations),
     * or does it combine all translations in a single directory (e.g. locales/en.json, locales/fr.json, etc.)
     */
    isMultiDirectory: false

    /**
     * The main file name that will serve as the standard against which all other file will be checked.
     * This should be the primary language that you use and are most sure that you will update. Be sure to supply the whole file name.
     * @example "en.json"
     */
    mainFileName: string

    /**
     * Sometimes projects split different kinds of translations by a prefix. For instance, auth.en.json contains only the auth translations and en.json contains all the rest.
     * If this describes your use case, simply supply the file prefix to ensure that these auth translations are checked against one another.
     * If this parameter is undefined, only files in the directory that do not have a prefix will be checked.
     * @example "auth"
     */
    filePrefix?: string
}

export type InstanceConfig = SingleDirectoryInstanceConfig | MultiDirectoryInstanceConfig

export interface ParseltConfig {
    instances: InstanceConfig[]
}

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

export const loadConfig = (): ParseltConfig => {
    try {
        const configFile = fs.readFileSync(`${process.cwd()}/parselt.json`, 'utf8')
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
