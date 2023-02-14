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

export enum ScanOutputLogTypes {
    ALL = 'all',
    ERRORS = 'errors',
    NONE = 'none',
    SUMMARY = 'summary',
    WARNINGS = 'warnings',
}

export interface ScanConfig {
    /**
     * Core parselt config, generally parsed from the main config file
     */
    rootConfig: ParseltConfig

    /**
     * Which output a command should log, such as summaries of errors or warnings.
     * May be helpful to set to false in certain cases for scripting
     * @default ScanOutputLogTypes.ALL
     */
    outputLogType: ScanOutputLogTypes
}

export interface FormatConfig {
    /**
     * Core parselt config, generally parsed from the main config file
     */
    rootConfig: ParseltConfig
    /**
     * Should the format command remove any extra keys found in the child files
     * For instance if the main file is {"key1": 1} and the child file is {"key1": 1, "key2": 2}, key2 will be removed from the child file
     * @default false
     */
    shouldRemoveExtras?: boolean

    /**
     * Whether the command should log any output, such as summaries of errors or warnings.
     * May be helpful to set to false in certain cases for scripting
     * @default true
     */
    shouldLogOutput: boolean
}

export interface AddTranslationFileConfig {
    instance: MultiDirectoryInstanceConfig
    fileName: string
    directories?: string[]
}
