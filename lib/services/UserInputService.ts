import inquirer, { QuestionCollection } from 'inquirer'
import { InstanceConfig, ParseltConfig } from '../config/config.js'

export class UserInputService {
    public async promptForConfigInstanceNames(config: ParseltConfig): Promise<ParseltConfig> {
        const prompts: QuestionCollection<any> = config.instances.map((instance) => {
            const prefixString =
                !instance.isMultiDirectory && instance.filePrefix ? ` (prefix: ${instance.filePrefix})` : ''
            return {
                type: 'input',
                name: instance.name,
                message: `What name would you like for the translation group in this folder? \n${instance.rootDirectoryPath}${prefixString}: `,
                default: instance.name,
            }
        })

        const instanceNamesPromptResponse = await inquirer.prompt(prompts)

        const finalInstances: InstanceConfig[] = config.instances.map((instance) => {
            return { ...instance, name: instanceNamesPromptResponse[instance.name] }
        })

        return {
            instances: finalInstances,
        }
    }

    async promptForConfig(): Promise<ParseltConfig> {
        const initialResponse = await inquirer.prompt([
            {
                type: 'input',
                name: 'rootDirectoryPath',
                message: 'What is the relative path to your translation directory (e.g. "./src/i18n/locales")?',
            },
            {
                type: 'input',
                name: 'name',
                message: 'What name would you like for the translation group in this folder?',
                default: 'main',
            },
            {
                type: 'list',
                name: 'fileType',
                message: 'What type of files does this group contain?',
                choices: ['json', 'yaml'],
                default: 'json',
            },
            {
                type: 'list',
                name: 'indentation',
                message: 'What indentation would you like for these files?',
                choices: [2, 4],
                default: 2,
            },
            {
                type: 'confirm',
                name: 'isMultiDirectory',
                message:
                    'Does your translation directory contain subdirectories? \n (e.g. ./src/i18n/locales contains de/setup.json and en/setup.json)',
            },
        ])

        const { name, rootDirectoryPath, indentation, fileType, isMultiDirectory } = initialResponse

        if (isMultiDirectory === true) {
            const { mainDirectoryName } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'mainDirectoryName',
                    message:
                        'What is the main translation directory name? \n (e.g. if your main language is english, then in ./src/i18n/locales/en/setup.json, this would be "en")',
                },
            ])
            return {
                instances: [
                    {
                        name,
                        rootDirectoryPath,
                        indentation,
                        fileType,
                        isMultiDirectory: true,
                        mainDirectoryName: mainDirectoryName,
                    },
                ],
            }
        } else {
            const { mainFileName } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'mainFileName',
                    message:
                        'What is the main file name? \n (e.g. if your main language is english, then in ./src/i18n/locales/en.json, this would be "en.json")',
                },
            ])
            return {
                instances: [
                    {
                        name,
                        rootDirectoryPath,
                        indentation,
                        fileType,
                        isMultiDirectory: false,
                        mainFileName,
                    },
                ],
            }
        }
    }

    async promptForMainLanguageFromCodes(languageCodes: string[]): Promise<string> {
        const response = await inquirer.prompt([
            {
                type: 'list',
                name: 'mainLanguage',
                message: 'What is your main language?',
                choices: languageCodes,
            },
        ])

        return response.mainLanguage
    }
}
