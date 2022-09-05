import { createScanConfigFromDirName, createScanConfigFromDirPath } from './test-utils/config'
import { scan } from '../lib/commands'
import { testFormatting } from './test-utils/testFormatting'
import { FileTypes, InstanceConfig } from '../lib/config/config'
import { setupEmptyDirsWithConfig, setupScanningTest } from './test-utils/setupAndTeardown'
import mainNormalScanWithErrorsTemplate from './test-directories/scanning-tests/normal-scan-with-errors/mainTemplate.json'
import childNormalScanWithErrorsTemplate from './test-directories/scanning-tests/normal-scan-with-errors/childTemplate.json'
import fs from 'fs'

describe('Commands', () => {
    afterAll(() => {
        fs.rmdirSync('./test/tmp')
    })
    describe('Scan Command', () => {
        it('when scanning empty directories should return appropriate errors', () => {
            const config = createScanConfigFromDirPath('./test/test-directories/scanning-tests/empty-dir-test')
            setupEmptyDirsWithConfig('empty-dir-test')((config) => {
                const result = scan({ instances: config.instances, shouldLogOutput: false })
                const dirPath = config.instances[0].rootDirectoryPath.replace('/single-json-dir', '')
                expect(result.errors).toStrictEqual([
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the json structure is correct.',
                        type: 'could_not_load_path',
                        path: `${dirPath}/single-json-dir/en.json`,
                        pathType: 'file',
                    },
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the json structure is correct.',
                        type: 'could_not_load_path',
                        path: `${dirPath}/single-json-dir-with-prefix/auth.en.json`,
                        pathType: 'file',
                    },
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                        type: 'could_not_load_path',
                        path: `${dirPath}/single-yaml-dir/en.yaml`,
                        pathType: 'file',
                    },
                    {
                        msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                        type: 'could_not_load_path',
                        path: `${dirPath}/single-yaml-dir-with-prefix/auth.en.yaml`,
                        pathType: 'file',
                    },
                    {
                        msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
                        type: 'could_not_load_path',
                        path: `${dirPath}/multi-json-dir/en`,
                        pathType: 'directory',
                    },
                    {
                        msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
                        type: 'could_not_load_path',
                        path: `${dirPath}/multi-yaml-dir/en`,
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
                    msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/multi-json-dir/fr/general.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/multi-yaml-dir/en/general.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/scanning-tests/broken-file-test/multi-yaml-dir/fr/general.yaml',
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
                    console.log(result)
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
                    true
                )

                expect(testYaml.trim()).toBe(
                    'single_quote_sample: "%{insertVariable} isn\'t something that can be parsed with single quotes"'
                )
            })
        })
    })
})
