import fs from 'fs'
import path from 'path'
import url from 'url'

export const getPackageVersionOrThrow = (): string => {
    const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
    const packageJsonPath = path.join(__dirname, '..', 'package.json')

    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    const { version } = JSON.parse(packageJson)

    if (typeof version === 'string') {
        return version
    } else throw new Error('Package version could not be found')
}
