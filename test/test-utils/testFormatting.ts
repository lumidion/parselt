import fs from 'fs'
import * as uuid from 'uuid'
import { format } from '../../lib/commands'
import { InstanceConfig, SingleDirectoryInstanceConfig } from '../../lib/config/config'

export const testFormatting = (config: SingleDirectoryInstanceConfig, testName: string): string => {
    const srcFilePath = `${config.rootDirectoryPath}/${config.mainFileName}`
    const testId = uuid.v4()
    const dirName = `${testName}-${testId.slice(0, 7)}`
    const destDirPath = `./test/tmp/${dirName}`
    const destFilePath = `${destDirPath}/${config.mainFileName}`
    fs.mkdirSync(destDirPath, { recursive: true })
    fs.copyFileSync(srcFilePath, destFilePath)

    const convertedConfig = JSON.parse(JSON.stringify(config)) as InstanceConfig
    convertedConfig.rootDirectoryPath = destDirPath
    format({ rootConfig: { instances: [convertedConfig] }, shouldLogOutput: false, shouldRemoveExtras: false })
    const file = fs.readFileSync(destFilePath, 'utf8')

    return file
}
