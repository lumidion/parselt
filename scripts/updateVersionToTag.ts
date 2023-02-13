import path from 'path'
import fs from 'fs'
import url from 'url'

const updateVersionToTag = () => {
    const tagName = process.env.GITHUB_REF_NAME

    if (tagName === undefined) {
        throw new Error('Tag needs to be specified for version to be updated')
    }

    const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
    const packageJsonPath = path.join(__dirname, '..', 'package.json')
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
    
    const packageJsonAsObject = JSON.parse(packageJson)
    
    const versionNumber = tagName.replace(/^v/, "")
    
    packageJsonAsObject.version = versionNumber
    
    const json = JSON.stringify(packageJsonAsObject, undefined, 4)
    
    fs.writeFileSync(path.join(__dirname, '..', 'package.json'), json)
}

updateVersionToTag()


