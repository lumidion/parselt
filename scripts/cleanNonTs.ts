import fs from 'fs'

const files = fs.readdirSync('./lib', { withFileTypes: true })

files.forEach((file) => {
    const shouldFileBeRemoved = file.name.includes('.js') || file.name.includes('.d.ts')
    if (file.isFile() && shouldFileBeRemoved) {
        fs.rmSync(`./lib/${file.name}`)
    }
})
