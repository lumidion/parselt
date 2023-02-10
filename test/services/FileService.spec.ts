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

    describe("#getSerializedFileMetadataFromDir", () => {
        const testDirectory = `${fileServiceTestDir}/getFileMetadata`
        const fileService = new FileService()

        it("should return metadata for json files", () => {
            const result = fileService.getSerializedFileMetadataFromDir(`${testDirectory}/simpleJson`)
            console.log(`${testDirectory}/simpleJson`)
            const shortenedParentPath = result[0].parentPath.replace(process.cwd(), "")

            expect(result.length).toBe(1)
            expect(result[0].name).toBe('en.json')
            expect(result[0].fileType).toBe(FileTypes.JSON)
            expect(shortenedParentPath).toBe("/test/test-directories/service-tests/file-service/getFileMetadata/simpleJson")
        })
    })
})
