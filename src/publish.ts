import { execSync } from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import { copyPackageToStore } from './copy'
import { addPackages } from './add'
import {
  PackageInstallation,
  readInstallationsFile,
  removeInstallations
} from './installations'

import {
  PackageManifest,
  getPackageManager,
  updatePackages,
  readPackage,
  getStorePackagesDir,
  PackageScripts,
  findPackage,
  values
} from '.'

export interface PublishPackageOptions {
  workingDir: string
  signature?: boolean
  knit?: boolean
  force?: boolean
  changed?: boolean
  push?: boolean
  pushSafe?: boolean
  yarn?: boolean
  files?: boolean
  private?: boolean
  recursive?: boolean
}

const { join } = path

const YALC_DIR = path.sep + values.yalcPackagesFolder + path.sep

const isLink = (f: string) => {
  try {
    return fs.lstatSync(f).isSymbolicLink()
  } catch {
    return false
  }
}

export const publishPackage = async (options: PublishPackageOptions) => {
  const workingDir = findPackage(options.workingDir)
  if (!workingDir) return

  const pkg = readPackage(workingDir)
  if (!pkg) return

  if (pkg.private && !options.private) {
    return console.log(
      'Will not publish package with `private: true`' +
        ' use --private flag to force publishing.'
    )
  }

  const publishedNames = new Set<string>()
  await publishDepthFirst(pkg, workingDir)

  // Only the root package is pushed.
  if (options.push || options.pushSafe) {
    const installationsConfig = readInstallationsFile()
    const installationPaths = installationsConfig[pkg.name] || []
    const installationsToRemove: PackageInstallation[] = []
    for (const workingDir of installationPaths) {
      console.log(`Pushing ${pkg.name}@${pkg.version} in ${workingDir}`)
      const installationsToRemoveForPkg = await updatePackages([pkg.name], {
        workingDir,
        noInstallationsRemove: true,
        yarn: options.yarn
      })
      if (installationsToRemoveForPkg) {
        installationsToRemove.push(...installationsToRemoveForPkg)
      }
    }
    if (installationsToRemove.length) {
      await removeInstallations(installationsToRemove)
    }
  }

  // Publish linked dependencies first.
  async function publishDepthFirst(pkg: PackageManifest, pkgDir: string) {
    if (publishedNames.has(pkg.name)) return
    publishedNames.add(pkg.name)

    const deps = pkg.dependencies
    if (deps && options.recursive) {
      const namesToAdd: string[] = []
      for (const name in deps) {
        const depDir = join(
          pkgDir,
          'node_modules',
          name.replace(/\//g, path.sep)
        )
        if (isLink(depDir)) {
          const target = fs.readlinkSync(depDir)
          if (!target.includes(YALC_DIR)) {
            const dep = readPackage(depDir)
            if (dep && !dep.private) {
              await publishDepthFirst(dep, depDir)
              namesToAdd.push(dep.name)
            }
          }
        }
      }
      await addPackages(namesToAdd, {
        workingDir: pkgDir
      })
    }

    console.log(`\nPublishing: ${pkg.name}`)
    await publish(pkg, pkgDir)
  }

  // Publish a single package.
  async function publish(pkg: PackageManifest, pkgDir: string) {
    const scripts = pkg.scripts || {}
    const scriptRunCmd =
      !options.force && pkg.scripts ? getPackageManager(pkgDir) + ' run ' : ''

    if (scriptRunCmd) {
      const scriptNames: (keyof PackageScripts)[] = [
        'preyalc',
        'prepare',
        'prepublishOnly',
        'prepublish'
      ]
      const scriptName = scriptNames.filter(name => !!scripts[name])[0]
      if (scriptName) {
        const scriptCmd = scripts[scriptName]
        console.log(`Running "${scriptName}" script: ${scriptCmd}`)
        execSync(scriptRunCmd + scriptName, {
          cwd: pkgDir,
          stdio: 'inherit'
        })
      }
    }

    const copyRes = await copyPackageToStore(pkg, {
      ...options,
      workingDir: pkgDir
    })
    if (options.changed && !copyRes) {
      console.log('Package content has not changed, skipping publish.')
      return
    }

    if (scriptRunCmd) {
      const scriptNames: (keyof PackageScripts)[] = ['postyalc', 'postpublish']
      const scriptName = scriptNames.filter(name => !!scripts[name])[0]
      if (scriptName) {
        const scriptCmd = scripts[scriptName]
        console.log(`Running "${scriptName}" script: ${scriptCmd}`)
        execSync(scriptRunCmd + scriptName, {
          cwd: pkgDir,
          stdio: 'inherit'
        })
      }
    }

    const publishedPackageDir = join(
      getStorePackagesDir(),
      pkg.name,
      pkg.version
    )
    const publishedPkg = readPackage(publishedPackageDir)!
    console.log(
      `${publishedPkg.name}@${publishedPkg.version} published locally.`
    )
  }
}
