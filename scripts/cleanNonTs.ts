import fs from 'fs'

const removeNonTsFilesInDir = (dirPath: string) => {
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
    files.forEach((file) => {
        const shouldFileBeRemoved = file.name.includes('.js') || file.name.includes('.d.ts')
        if (file.isFile() && shouldFileBeRemoved) {
            fs.rmSync(`${dirPath}/${file.name}`)
        }
    })
}

removeNonTsFilesInDir('./bin')
removeNonTsFilesInDir('./lib')
