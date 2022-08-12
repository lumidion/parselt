import { MultiDirectoryInstanceConfig } from './config'
import { ScanningErrorsCollector } from './errorCollector'
import fs from 'fs'
import * as lodash from 'lodash'

const addValueToObjectFromKey = (keyString: string, value: string, obj: any) => {
    const keys = keyString.split('.')
    const newObject = lodash.cloneDeep(obj)
    let ref = newObject

    keys.forEach((key, index) => {
        if (index === keys.length - 1) {
            ref[key] = value
        } else if (keys.includes(key)) {
            ref = ref[key]
        } else {
            ref[key] = {}
            ref = ref[key]
        }
    })

    return newObject
}

interface DirectoryTranslationAddition {
    value: string
    directoryName: string
}

// export const addTranslationFromKeyString = (
//     keyString: string,
//     fileName: string,
//     config: MultiDirectoryInstanceConfig,
//     additions: DirectoryTranslationAddition[]
// ) => {
    
//     const errorCollector = new ScanningErrorsCollector()
//     const dirs = fs.readdirSync(config.rootDirectoryPath, { withFileTypes: true })
//     dirs.forEach((directory) => {
//         if (directory.isDirectory()) {
//             const currentDirectoryPath = `${config.rootDirectoryPath}/${directory.name}`
//             const additions = additions.filter((addition) => addition.directoryName === directory.name)

//             if (additions)
//             const files = fs.readdirSync(currentDirectoryPath, { withFileTypes: true })
//             files.forEach((file) => {
//                 styleFile({
//                     fileName: file.name,
//                     directoryPath: currentDirectoryPath,
//                     fileType: config.fileType,
//                     errorCollector,
//                     indentation: config.indentation,
//                 })
//             })
//         }
//     })
// }
