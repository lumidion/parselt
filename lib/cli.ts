import yargs, { Arguments } from 'yargs'
import { hideBin } from 'yargs/helpers'
import process from 'process'

import { format, init, scan } from './commands.js'
import { ConfigLoader } from './config/ConfigLoader.js'
import { logError } from './logger.js'
import { getPackageVersionOrThrow } from './utils.js'

const configLoader = new ConfigLoader()

const wrapPromiseWithErrorHandling = <A>(func: () => Promise<A>) => {
    func().catch((err) => {
        if (typeof err === 'string') {
            logError(`\n${err}`)
        } else if (typeof err?.message === 'string') {
            logError(`\n${err.message}`)
        } else {
            console.log(err)
            logError(
                '\nAn uncaught error caused this application to fail. Please feel free to create an issue with the parselt team describing the exact problem and context here: https://github.com/lumidion/parselt/issues'
            )
        }
    })
}

const initCli = () => {
    const packageVersion = getPackageVersionOrThrow()
    yargs(hideBin(process.argv))
        .usage('Usage: $0 <command> --instance-name')
        .version(packageVersion)
        // .command('add', 'Add translations', (yargs: any) => { //TODO re-add when testing is complete and this is stable.
        //     return yargs.command(
        //         'file',
        //         'Add translations file',
        //         (yargs: any) => {
        //             return yargs
        //                 .option('file-name', {
        //                     describe: 'File name for the file that should be added',
        //                     type: 'string',
        //                     requiresArg: true,
        //                 })
        //                 .option('instance-name', {
        //                     describe: 'Instance name to which the formatting should pertain',
        //                     type: 'string',
        //                     requiresArg: true,
        //                 })
        //                 .option('directories', {
        //                     describe:
        //                         'Directories to which the file should be added (if option is not set, file will be added to all directories',
        //                     type: 'string',
        //                 }).argv
        //         },
        //         (argv: Arguments) => {
        //             const config = configLoader.loadAddTranslationFileConfig(argv)
        //             addTranslationFile(config)
        //         }
        //     )
        // })
        .command(
            'init',
            'Init setup of parselt in the project. Outputs a parselt.json file at the root of the project',
            {},
            async () => {
                wrapPromiseWithErrorHandling(async () => {
                    await init()
                })
            }
        )
        .command(
            'format',
            'Format translation files so that keys are in alphabetical order',
            (yargs) => {
                return yargs
                    .option('remove-extras', {
                        describe: "Should keys that don't correspond to the main language be removed",
                        type: 'boolean',
                    })
                    .option('instance-name', {
                        describe: 'Instance name to which the formatting should pertain',
                        type: 'string',
                    })
            },
            (argv: Arguments) => {
                const config = configLoader.loadFormatConfig(argv)
                format(config)
            }
        )
        .command(
            'scan',
            'Scan translation files for errors and warnings',
            (yargs) => {
                return yargs
                    .option('instance-name', {
                        describe: 'Instance name to which the scan should pertain',
                        type: 'string',
                    })
                    .option('errors', {
                        describe: 'Whether the service should only log errors',
                        type: 'boolean',
                    })
                    .option('warnings', {
                        describe: 'Whether the service should only log warnings',
                        type: 'boolean',
                    })
                    .option('summary', {
                        describe: 'Whether the service should only log a summary of both errors and warnings',
                        type: 'boolean',
                    })
            },
            (argv: Arguments) => {
                const config = configLoader.loadScanConfig(argv)
                scan(config)
            }
        )
        .demandCommand()
        .help().argv
}

initCli()
