import yargs, { Arguments } from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as packageJson from '../package.json'
import { addTranslationFile, format, scan } from './commands'
import { ConfigLoader } from './config/ConfigLoader'

const configLoader = new ConfigLoader()

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
                    const config = configLoader.loadAddTranslationFileConfig(argv)
                    addTranslationFile(config)
                }
            )
        })
        .command(
            'format',
            'Format translation files so that keys are in alphabetical order',
            (yargs) => {
                return yargs
                    .option('remove-extra', {
                        describe: 'File name for the file that should be added',
                        type: 'string',
                        requiresArg: true,
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
                return yargs.options('instance-name', {
                    describe: 'Instance name to which the scan should pertain',
                    type: 'string',
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

init()
