import { createScanConfigFromDirPath } from './test-utils/config'
import { scan } from '../lib/commands'
import { testFormatting } from './test-utils/testFormatting'
import { FileTypes, InstanceConfig } from '../lib/config/config'
import { setupEmptyDirsWithConfig, setupScanningTest } from './test-utils/setupAndTeardown'
import path from 'path'
import url from 'url'
import fs from 'fs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const scanWithErrorsFolderPath = path.join(__dirname, 'test-directories', 'scanning-tests', 'normal-scan-with-errors')
const mainNormalScanWithErrorsTemplate = JSON.parse(fs.readFileSync(path.join(scanWithErrorsFolderPath, 'mainTemplate.json'), 'utf8'))
const childNormalScanWithErrorsTemplate = JSON.parse(fs.readFileSync(path.join(scanWithErrorsFolderPath, 'childTemplate.json'), 'utf8'))


describe('Commands', () => {
    afterAll(() => {
        fs.rmSync('./test/tmp', { recursive: true, force: true })
    })
    describe('Scan Command', () => {
        it('when scanning empty directories should return appropriate errors', () => {
            setupEmptyDirsWithConfig('empty-dir-test')((config, testRootPath) => {
                fs.rmSync(`${testRootPath}/multi-json-dir/en`, { recursive: true, force: true })
                const result = scan({ instances: config.instances, shouldLogOutput: false })
                expect(result.errors).toStrictEqual([
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the json structure is correct.',
                        type: 'could_not_load_path',
                        path: `${testRootPath}/single-json-dir/en.json`,
                        pathType: 'file',
                    },
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the json structure is correct.',
                        type: 'could_not_load_path',
                        path: `${testRootPath}/single-json-dir-with-prefix/auth.en.json`,
                        pathType: 'file',
                    },
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                        type: 'could_not_load_path',
                        path: `${testRootPath}/single-yaml-dir/en.yaml`,
                        pathType: 'file',
                    },
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                        type: 'could_not_load_path',
                        path: `${testRootPath}/single-yaml-dir-with-prefix/auth.en.yaml`,
                        pathType: 'file',
                    },
                    {
                        msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
                        type: 'could_not_load_path',
                        path: `${testRootPath}/multi-json-dir/en`,
                        pathType: 'directory',
                    },
                    {
                        msg: 'No files found in directory. Please make sure that the path is correct and that the directory contains the right files.',
                        type: 'could_not_load_path',
                        path: `${testRootPath}/multi-yaml-dir/en`,
                        pathType: 'directory',
                    },
                ])
            })
        })
        it('when scanning broken files should return appropriate errors', () => {
            const config = createScanConfigFromDirPath('./test/test-directories/scanning-tests/broken-file-test')
            const result = scan({ instances: config.instances, shouldLogOutput: false })
            expect(result.errors).toStrictEqual([
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/single-json-dir/en.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/single-json-dir-with-prefix/auth.en.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/single-yaml-dir/en.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/single-yaml-dir-with-prefix/auth.en.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/multi-json-dir/en/general.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/multi-yaml-dir/en/general.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
            ])
        })
        describe('when scanning parsable files with errors', () => {
            setupScanningTest(
                'normal-scan-with-errors',
                mainNormalScanWithErrorsTemplate,
                childNormalScanWithErrorsTemplate
            )((config) => {
                const configsForTest: [string, InstanceConfig][] = config.instances.map((instance) => [
                    instance.name,
                    instance,
                ])
                it.each([...configsForTest])('should return relevant errors for %s test', (_, instance) => {
                    const result = scan({ instances: [instance], shouldLogOutput: false })

                    const mainFilePath = instance.isMultiDirectory
                        ? `${instance.rootDirectoryPath}/${instance.mainDirectoryName}/general.${instance.fileType}`
                        : `${instance.rootDirectoryPath}/${instance.mainFileName}`

                    const childFilePrefix =
                        !instance.isMultiDirectory && instance.filePrefix ? `${instance.filePrefix}.` : ''
                    const childFilePath = instance.isMultiDirectory
                        ? `${instance.rootDirectoryPath}/fr/general.${instance.fileType}`
                        : `${instance.rootDirectoryPath}/${childFilePrefix}fr.${instance.fileType}`
                    const expectedErrors = [
                        {
                            type: 'invalid_key_ordering',
                            mainKeyPath: 'GENERAL_SETTINGS.ARRAY_OF_NULL_KEY',
                            childKeyPath: 'GENERAL_SETTINGS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'ARRAY_OF_NULL_KEY',
                        },
                        {
                            type: 'invalid_key_ordering',
                            mainKeyPath: 'GENERAL_SETTINGS.ARRAY_OF_OBJECTS_KEY',
                            childKeyPath: 'GENERAL_SETTINGS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'ARRAY_OF_OBJECTS_KEY',
                        },
                        {
                            type: 'invalid_key_ordering',
                            mainKeyPath: 'GENERAL_SETTINGS.ARRAY_OF_STRINGS_KEY',
                            childKeyPath: 'GENERAL_SETTINGS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'ARRAY_OF_STRINGS_KEY',
                        },
                        {
                            type: 'invalid_key_ordering',
                            mainKeyPath: 'GENERAL_SETTINGS.FIRST_OUT_OF_ORDER_KEY',
                            childKeyPath: 'GENERAL_SETTINGS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'FIRST_OUT_OF_ORDER_KEY',
                        },
                        {
                            type: 'key_not_found',
                            mainKeyPath: 'GENERAL_SETTINGS.NOT_FOUND_SUB_KEYS.KEY_NOT_FOUND',
                            childKeyPath: 'GENERAL_SETTINGS.NOT_FOUND_SUB_KEYS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'KEY_NOT_FOUND',
                        },
                        {
                            type: 'invalid_key_ordering',
                            mainKeyPath: 'GENERAL_SETTINGS.NOT_FOUND_SUB_KEYS',
                            childKeyPath: 'GENERAL_SETTINGS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'NOT_FOUND_SUB_KEYS',
                        },
                        {
                            type: 'key_not_found',
                            mainKeyPath: 'GENERAL_SETTINGS.NOT_FOUND_TOP_KEY',
                            childKeyPath: 'GENERAL_SETTINGS',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'NOT_FOUND_TOP_KEY',
                        },
                        {
                            type: 'different_collection_types',
                            mainKeyPath: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_ARRAY',
                            childKeyPath: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_ARRAY',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                        },
                        {
                            type: 'empty_value',
                            mainKeyPath: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_NULL',
                            childKeyPath: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_NULL',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_NULL',
                        },
                        {
                            type: 'different_collection_types',
                            mainKeyPath: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_STRING',
                            childKeyPath: 'GENERAL_SETTINGS.WRONG_TYPE_OBJECT_STRING',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                        },
                    ]

                    const expectedWarnings = [
                        {
                            type: 'same_value_types',
                            mainKeyPath: 'GENERAL_SETTINGS.SAME_VALUE_KEY',
                            childKeyPath: 'GENERAL_SETTINGS.SAME_VALUE_KEY',
                            mainFilePath: `${mainFilePath}`,
                            childFilePath: `${childFilePath}`,
                            keyName: 'SAME_VALUE_KEY',
                        },
                    ]

                    expect(result.errors).toStrictEqual(expectedErrors)
                    expect(result.warnings).toStrictEqual(expectedWarnings)
                })
            })
        })
    })

    describe('Format Command', () => {
        describe('when yaml file contains an apostrophe and a template string in text', () => {
            test('should output correct text', () => {
                const formattingDir = './test/test-directories/formatting-tests/single-quotes'
                const testYaml = testFormatting(
                    {
                        name: 'test',
                        mainFileName: 'en.yaml',
                        isMultiDirectory: false,
                        rootDirectoryPath: `${formattingDir}/yaml`,
                        fileType: FileTypes.YAML,
                        indentation: 2,
                    },
                    'formatting-apostrophe-with-template-string'
                )

                expect(testYaml.trim()).toBe(
                    'single_quote_sample: "%{insertVariable} isn\'t something that can be parsed with single quotes"'
                )
            })
        })
    })
})
