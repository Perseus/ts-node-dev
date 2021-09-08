import fs from 'fs'
import path from 'path'
import { Options } from './bin'
import { type } from 'os'

function read(dir: string) {
  const f = path.resolve(dir, '.node-dev.json')
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : null
}

function resolvePath(unresolvedPath: string) {
  return path.resolve(process.cwd(), unresolvedPath)
}

export type Config = {
  vm: boolean
  fork: boolean
  notify: boolean
  deps: number
  timestamp: number
  clear: boolean
  dedupe: boolean
  ignore: string[]
  respawn: boolean
  debug: boolean
  quiet: boolean
  extensions: Record<string, string>,
  noRestart: boolean,
  restartOnlyForItems: string[],
}

export const makeCfg = (main: string, opts: Partial<Options>): Config => {
  const dir = main ? path.dirname(main) : '.'
  const userDir = process.env.HOME || process.env.USERPROFILE
  const c = read(dir) || read(process.cwd()) || (userDir && read(userDir)) || {}

  c.deps = parseInt(opts['deps-level'] || '') || 0
  if (typeof c.depsLevel === 'number') c.deps = c.depsLevel

  if (opts) {
    // Overwrite with CLI opts ...
    if (opts['deps'] || opts['all-deps']) c.deps = -1
    if (opts.dedupe) c.dedupe = true
    if (opts.respawn) c.respawn = true
    if (opts.notify === false) c.notify = false
    if (opts.clear || opts.cls) c.clear = true
    if (opts.noRestart) c.noRestart = true
    c.fork = opts.fork
  }

  let restartOnlyForItems: string[] = []
  if (opts.config) {
    const fileContent = fs.readFileSync(opts.config).toString()
    const config = JSON.parse(fileContent)

    if (config.restartForFiles && Array.isArray(config.restartForFiles))  {
      restartOnlyForItems.push(...config.restartForFiles);
      restartOnlyForItems = restartOnlyForItems.map(resolvePath);

      c.restartOnlyForItems = restartOnlyForItems;
    }
  }

  opts.debug && console.log('Restart only for:', restartOnlyForItems);

  const ignoreWatchItems: string[] = opts['ignore-watch']
    ? ([] as string[])
        .concat(opts['ignore-watch'] as string)
        .map((_) => _.trim())
    : []
  const ignoreWatch: string[] = ignoreWatchItems.concat(c.ignore || [])
  
  opts.debug && console.log('Ignore watch:', ignoreWatch)
  const ignore = ignoreWatch.concat(ignoreWatch.map(resolvePath))
  return {
    vm: c.vm !== false,
    fork: c.fork !== false,
    notify: c.notify !== false,
    deps: c.deps,
    timestamp: c.timestamp || (c.timestamp !== false && 'HH:MM:ss'),
    clear: !!c.clear,
    dedupe: !!c.dedupe,
    ignore: ignore,
    respawn: c.respawn || false,
    debug: !!opts.debug,
    quiet: !!opts.quiet,
    extensions: c.extensions,
    noRestart: c.noRestart,
    restartOnlyForItems: c.restartOnlyForItems,
  }
}
