import { FileService } from '../../lib/services/FileService'
const testDirectory = '../test-directories/service-tests/file-service/getIndentation'

describe('FileService', () => {
    describe('#getIndentationFromSerializedFile', () => {
        it('should return 2 when indentation is 2', () => {
            const fileService = new FileService()
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/Indentation_2.json`)
            expect(result).toBe(2)
        })

        it('should return 4 when indentation is 4', () => {
            const fileService = new FileService()
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/Indentation_4.json`)
            expect(result).toBe(2)
        })

        it('should return 2 when indentation is a number other than 2 or 4', () => {
            const fileService = new FileService()
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/OneLine.json`)
            expect(result).toBe(2)
        })

        it('should return 2 when file does not exist', () => {
            const fileService = new FileService()
            const result = fileService.getIndentationFromSerializedFile(`${testDirectory}/NonExistentFile.json`)
            expect(result).toBe(2)
        })
    })
})
