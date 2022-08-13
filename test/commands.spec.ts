import { createConfig } from './test-utils/config'
import { scan } from '../lib/commands'

describe('Commands', () => {
    describe('Scan Command', () => {
        it('when scanning empty directories should return appropriate errors', () => {
            const config = createConfig('empty-dir-test')
            const result = scan(config, false)

            expect(result.errors).toStrictEqual([
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-json-dir/en.json',
                    pathType: 'file',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-json-dir-with-prefix/auth.en.json',
                    pathType: 'file',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-yaml-dir/en.yaml',
                    pathType: 'file',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/single-yaml-dir-with-prefix/auth.en.yaml',
                    pathType: 'file',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/multi-json-dir/en',
                    pathType: 'directory',
                },
                {
                    type: 'could_not_load_path',
                    path: './test/test-directories/empty-dir-test/multi-yaml-dir/en',
                    pathType: 'directory',
                },
            ])
        })
        it('when scanning broken files should return appropriate errors', () => {
            const config = createConfig('broken-file-test')
            const result = scan(config, false)
            throw new Error('test is not working - examine multi dir yaml files')
            console.log(result.errors)
        })
    })
})
