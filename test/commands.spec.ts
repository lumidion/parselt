import { createConfig } from './test-utils/config'
import { scan } from '../lib/commands'

describe('Commands', () => {
    describe('Scan Command', () => {
        it('when scanning empty directories should return appropriate errors', () => {
            const config = createConfig('empty-dir-test')
            const result = scan(config, false)
            console.log(result.errors)
            console.log(result.warnings)
        })
    })
})
