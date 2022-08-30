import { Console } from 'console'
import { Transform } from 'stream'

export const logSuccess = (msg: string) => {
    console.log(`\x1b[32m${msg}\x1b[1m`)
}

export const logWarning = (warning: string): void => {
    console.log(`\x1b[33m${warning}\x1b[1m`)
}

export const logError = (error: string): void => {
    console.log(`\x1b[31m${error}\x1b[1m`)
}

export const logLineBreak = () => {
    console.log('\n')
}

export const logTable = (input: any) => {
    // @see https://stackoverflow.com/a/67859384
    const ts = new Transform({
        transform(chunk: any, enc: any, cb: any) {
            cb(null, chunk)
        },
    })
    const logger = new Console({ stdout: ts })
    logger.table(input)
    const table = (ts.read() || '').toString()
    let result = ''
    for (const row of table.split(/[\r\n]+/)) {
        let r = row.replace(/[^┬]*┬/, '┌')
        r = r.replace(/^├─*┼/, '├')
        r = r.replace(/│[^│]*/, '')
        r = r.replace(/^└─*┴/, '└')
        r = r.replace(/'/g, ' ')
        result += `${r}\n`
    }
    console.log(result)
}
