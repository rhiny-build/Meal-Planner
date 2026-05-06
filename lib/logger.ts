const verbose = process.env.VERBOSE_LOGGING === 'true'

type LogData = Record<string, unknown>

const fmt = (level: string, message: string, data?: LogData) =>
  JSON.stringify({ level, message, ts: new Date().toISOString(), ...data })

export const logger = {
  info: (message: string, data?: LogData) => {
    if (verbose) console.log(fmt('info', message, data))
  },
  warn: (message: string, data?: LogData) => {
    console.warn(fmt('warn', message, data))
  },
  error: (message: string, data?: LogData) => {
    console.error(fmt('error', message, data))
  },
}
