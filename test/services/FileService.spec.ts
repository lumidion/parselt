import { FileTypes } from '../../lib/config/config'
import { FileService } from '../../lib/services/FileService'
const fileServiceTestDir = `${process.cwd()}/test/test-directories/service-tests/file-service`

describe('FileService', () => {
    describe('#getIndentationFromSerializedFile', () => {
        const testDirectory = `${fileServiceTestDir}/getIndentation`
        const fileService = new FileService()

        it('should return 2 when indentation is 2', () => {
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/Indentation_2.json`)
            expect(result).toBe(2)
        })

        it('should return 4 when indentation is 4', () => {
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/Indentation_4.json`)
            expect(result).toBe(4)
        })

        it('should return 2 when indentation is a number other than 2 or 4', () => {
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/OneLine.json`)
            expect(result).toBe(2)
        })

        it('should return 2 when file does not exist', () => {
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/NonExistentFile.json`)
            expect(result).toBe(2)
        })
    })

    describe('#getSerializedFileMetadataFromDir', () => {
        const testDirectory = `${fileServiceTestDir}/getFileMetadata`
        const fileService = new FileService()

        it('should return metadata for json files', () => {
            const path = `${testDirectory}/simpleJson`
            const result = fileService.getSerializedFileMetadataFromDir(path)

            expect(result.length).toBe(1)
            expect(result[0].name).toBe('en.json')
            expect(result[0].fileType).toBe(FileTypes.JSON)
            expect(result[0].parentPath).toBe(path)
        })

        it('should return metadata for both extensions of yaml files', () => {
            const path = `${testDirectory}/simpleYaml`
            const result = fileService.getSerializedFileMetadataFromDir(path)

            expect(result.length).toBe(2)
            expect(result[0].name).toBe('en.yaml')
            expect(result[0].fileType).toBe(FileTypes.YAML)
            expect(result[0].parentPath).toBe(path)

            expect(result[1].name).toBe('fr.yml')
            expect(result[1].fileType).toBe(FileTypes.YAML)
            expect(result[1].parentPath).toBe(path)
        })

        it('should return metadata for all files in a multidir setup', () => {
            const path = `${testDirectory}/multidirectory`
            const result = fileService.getSerializedFileMetadataFromDir(path)

            expect(result.length).toBe(2)
            expect(result[0].name).toBe('customer.json')
            expect(result[0].fileType).toBe(FileTypes.JSON)
            expect(result[0].parentPath).toBe(`${path}/feedback`)

            expect(result[1].name).toBe('general.json')
            expect(result[1].fileType).toBe(FileTypes.JSON)
            expect(result[1].parentPath).toBe(path)
        })

        it('should skip ignored folders', () => {
            const path = `${testDirectory}/ignoredFolders`
            const result = fileService.getSerializedFileMetadataFromDir(path)
            expect(result.length).toBe(0)
        })
    })

    describe('#getSerializedFileType', () => {
        const testFileType = (path: string, expectedResult: FileTypes | undefined) => {
            const result = FileService.getSerializedFileType(path)
            expect(result).toBe(expectedResult)
        }
        it('should parse json file with json type', () => {
            testFileType('en.json', FileTypes.JSON)
        })
        it('should parse yaml file with yaml type', () => {
            testFileType('en.yaml', FileTypes.YAML)
        })
        it('should parse yml file with yaml type', () => {
            testFileType('en.yml', FileTypes.YAML)
        })
        it('should parse non-serialized file with undefined', () => {
            testFileType('index.js', undefined)
        })
    })
})
