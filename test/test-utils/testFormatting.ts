import fs from 'fs'
import * as uuid from 'uuid'
import { format } from '../../lib/commands'
import { InstanceConfig, SingleDirectoryInstanceConfig } from '../../lib/config/config'

export const testFormatting = (config: SingleDirectoryInstanceConfig, cleanupAfter: boolean): string => {
    const srcFilePath = `${config.rootDirectoryPath}/${config.mainFileName}`
    const dirName = uuid.v4()
    const destDirPath = `./test/test-directories/tmp/${dirName}`
    const destFilePath = `${destDirPath}/${config.mainFileName}`
    fs.mkdirSync(destDirPath, { recursive: true })
    fs.copyFileSync(srcFilePath, destFilePath)

    const convertedConfig = JSON.parse(JSON.stringify(config)) as InstanceConfig
    convertedConfig.rootDirectoryPath = destDirPath
    format({ instances: [convertedConfig], shouldLogOutput: false, shouldRemoveExtras: false })
    const file = fs.readFileSync(destFilePath, 'utf8')

    if (cleanupAfter) {
        fs.rmSync(destDirPath, { recursive: true, force: true })
    }
    return file
}
