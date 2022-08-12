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
