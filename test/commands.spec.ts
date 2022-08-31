import { createConfig } from './test-utils/config'
import { scan } from '../lib/commands'
import { testFormatting } from './test-utils/testFormatting'
import { FileTypes } from '../lib/config/config'

describe('Commands', () => {
    describe('Scan Command', () => {
        it('when scanning empty directories should return appropriate errors', () => {
            const config = createConfig('empty-dir-test')
            const result = scan({ instances: config.instances, shouldLogOutput: false })

            expect(result.errors).toStrictEqual([
                {
                    msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the json structure is correct.',
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-json-dir/en.json',
                    pathType: 'file',
                },
                {
                    msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the json structure is correct.',
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-json-dir-with-prefix/auth.en.json',
                    pathType: 'file',
                },
                {
                    msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-yaml-dir/en.yaml',
                    pathType: 'file',
                },
                {
                    msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-yaml-dir-with-prefix/auth.en.yaml',
                    pathType: 'file',
                },
                {
                    msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/multi-json-dir/en',
                    pathType: 'directory',
                },
                {
                    msg: 'Could not load files from directory. Please make sure that the directory exists and try again.',
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/multi-yaml-dir/en',
                    pathType: 'directory',
                },
            ])
        })
        it('when scanning broken files should return appropriate errors', () => {
            const config = createConfig('broken-file-test')
            const result = scan({ instances: config.instances, shouldLogOutput: false })
            expect(result.errors).toStrictEqual([
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/single-json-dir/en.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/single-json-dir-with-prefix/auth.en.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/single-yaml-dir/en.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/single-yaml-dir-with-prefix/auth.en.yaml',
                    pathType: 'file',
                    msg: 'File could not be parsed for scanning. Please make sure that the file exists and that the yaml structure is correct.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/multi-json-dir/fr/general.json',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/multi-yaml-dir/en/general.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/broken-file-test/multi-yaml-dir/fr/general.yaml',
                    pathType: 'file',
                    msg: 'File was found with invalid content and could not be parsed for scanning. Either it has null content or the file structure is incorrect.',
                },
            ])
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
