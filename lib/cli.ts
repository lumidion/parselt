import yargs, { Arguments } from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as packageJson from '../package.json'
import { addFileFromTemplate, format, scan } from './commands'
import { loadConfig, ParseltConfig } from './config'
import { logError } from './logger'

const isInstanceNameValid = (instanceName: string, config: ParseltConfig): boolean => {
    const instances = config.instances.filter((instance) => instance.name === instanceName)

    if (instances.length === 1) {
        return true
    } else return false
}

const initializeCommandWithInstanceName =
    (instanceName: unknown) => (func: (config: ParseltConfig, instanceName?: string) => void) => {
        try {
            const config = loadConfig()
            if (instanceName !== undefined) {
                if (typeof instanceName === 'string' && isInstanceNameValid(instanceName, config)) {
                    func(config, instanceName)
                } else {
                    throw new Error(
                        'Instance name is invalid. Please choose an instance name that corresponds with an instance in the config'
                    )
                }
            } else {
                func(config)
            }
        } catch (error: any) {
            if (error?.message) {
                logError(error.message)
            } else {
                logError('Could not perform command')
            }
        }
    }

const isArrayOfStrings = (arr: any[]): boolean => {
    arr.forEach((el) => {
        if (typeof el !== 'string') {
            return false
        }
    })
    return true
}

const init = () => {
    yargs(hideBin(process.argv))
        .usage('Usage: $0 <command> --instance-name')
        .version(packageJson.version)
        .command('add', 'Add translations', (yargs: any) => {
            return yargs.command(
                'file',
                'Add translations file',
                (yargs: any) => {
                    return yargs
                        .option('file-name', {
                            describe: 'File name for the file that should be added',
                            type: 'string',
                            requiresArg: true,
                        })
                        .option('instance-name', {
                            describe: 'Instance name to which the formatting should pertain',
                            type: 'string',
                            requiresArg: true,
                        })
                        .option('directories', {
                            describe:
                                'Directories to which the file should be added (if option is not set, file will be added to all directories',
                            type: 'string',
                        }).argv
                },
                (argv: Arguments) => {
                    initializeCommandWithInstanceName(argv.instanceName)((config, name) => {
                        if (name !== undefined) {
                            config.instances.forEach((instanceConfig) => {
                                if (instanceConfig.name === name) {
                                    if (instanceConfig.isMultiDirectory) {
                                        if (argv.fileName !== undefined && typeof argv.fileName === 'string') {
                                            if (argv.directories === undefined) {
                                                addFileFromTemplate(instanceConfig, argv.fileName)
                                            } else if (
                                                argv.directories !== undefined &&
                                                Array.isArray(argv.directories) &&
                                                isArrayOfStrings(argv.directories)
                                            ) {
                                                addFileFromTemplate(instanceConfig, argv.fileName, argv.directories)
                                            } else {
                                                logError('--directories option must be an array of strings')
                                            }
                                        } else {
                                            logError('--file-name option must be set')
                                        }
                                    } else {
                                        logError(
                                            'This command can only be called for a multi directory instance. Please select another instance and try again.'
                                        )
                                    }
                                }
                            })
                        } else {
                            logError('--instance-name must be set')
                        }
                    })
                }
            )
        })
        .command(
            'format',
            'Format translation files so that keys are in alphabetical order',
            (yargs) => {
                return yargs.options('instance-name', {
                    describe: 'Instance name to which the formatting should pertain',
                    type: 'string',
                })
            },
            (argv: Arguments) => {
                initializeCommandWithInstanceName(argv.instanceName)(format)
            }
        )
        .command(
            'scan',
            'Scan translation files for errors and warnings',
            (yargs) => {
                return yargs.options('instance-name', {
                    describe: 'Instance name to which the scan should pertain',
                    type: 'string',
                })
            },
            (argv: Arguments) => {
                initializeCommandWithInstanceName(argv.instanceName)(scan)
            }
        )
        .demandCommand()
        .help().argv
}

init()
