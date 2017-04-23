# Yalc  (WIP)

> Better workflow than **npm | yarn link** for package authors.

## Why

When developing and authoring multiple packages (private or public) you often find yourself in a need of using the latest/WIP versions in your other projects in your local environment without publishing those packages to remote registry. Npm/yarn adress this issue with standard [symlinked packages](https://docs.npmjs.com/cli/link) aproach (`npm/yarn link`). Though this approach can solve the problem and work for you, it also often imposes unpleasant constrains and issues with dependencies resolution, symlinks interoperability between file systems, etc.

## What

- `Yalc` acts like very simple local repository of your localy developed packages that you want to share across your local environment. 
- When you  you do `yalc publish` in the package directory it grabs only files that should be published to NPM and *puts* them into special global store located for example in  `~/.yalc`. 
- When you do `yalc add my-package` (or `yalc link my-package` - see below) in your `project` it *pulls* package content to `.yalc` in current folder and either injects `file:` dependency in `package.json` or creates symlink in `node_modules`.
-  `yalc` creates special `yalc.lock` file in your project (near `yarn.lock` and `package.json`) that be used to ensure consistentcy while performing `yalc's` routines.

## Install

![npm (scoped)](https://img.shields.io/npm/v/yalc.svg?maxAge=86400)

```
  npm i yalc -g
```


## Usage 

#### Publish
- Run `yalc publish` in your dependency package `my-package`. 
- It will run `preloc` or `prepublish` scripts before, and `postloc` or `postpublish` after. Use `--force` to publish without running scripts.

#### Add
- Run `yalc add my-package` in your dependant project, 
it will copy current version frome store to your project's `.yalc` folder and inject `file:.yalc/my-package` dependency in package.json.
- You may add particular versoin `yalc add my-package@version`, this version will be fixed in `yalc.lock` file and while updates it will not update to newly published versions.

#### Link
-  Alternatively to `add` you may use `link` operation which should actually work for you the same way as `npm/yarn link` does, the only difference is that source for symllink will be not global link directory but lolcal `.yalc` folder. 
- After `yalc` copies package content to `.yalc` folder it will create symlink:
`project/.yalc/my-package ==> project/node_modules/my-package`. It will not touch `package.json` in this case.

#### Remove (NOT IMPLEMENTED)
 - Run `yalc remove my-package`

#### Update
  - Run `yalc update my-package` to update the latest version from store, 
  or `yalc update` to update all the packages found in `yalc.lock`.
  - Running simply `yalc` in the directory will do the same as `yalc update`
  
#### Other

- Add `.yalc` folder to `.gitignore` (and `.npmignore`, etc) and hide it from your view.
- You probably want to add `yalc.lock` to `.gitignore` too.

## Advanced usage

#### Pusing updates automaticly to all installations

- When do `yalc add/link` locations where packages added are saved, 
so `yalc` tries to know where each package from store is being used.
- `yalc publish --push` will publish package to store and propagate all changes to existing `yalc's` package installations (will actually do `update` operation on the location).
- You may just use shortcut for push operation `yloc push`, **which will likely become your primarily used command** for publication :
  - it support `--knit`, `--safe`, options
  - `force` options is `true` by default, so it won't run scripts `publish/loc` scripts.

#### Publish/push sub-projects

Useful for monorepos (projects with multiple sub-projects/packages): `yalc publish package` will perform publish operation in nested `package` folder of current working dir.

#### Try to use [knitting](https://github.com/yarnpkg/rfcs/blob/master/text/0000-yarn-knit.md)

- You want try to `--knit` option. Instead of just copying files from original package location to store it will create symlinks for each individual file in the package.
  
- Changes to files will be propagated immidiately to all locations as you make updates to linked files.

- It is still symlinks. Modules will be resolving their dependencies relative to their original location. [Until you use available workarounds for loaders/resolvers.](https://nodejs.org/api/cli.html#cli_preserve_symlinks)

- Excluded folders from publications like `node_modules` stay isolated to the area of use.

- When add new files you still need *may need* to push updated version to `yalc` store (for new links to be created).


## Related Yarn Issues

- [yarn probably shouldn't cache packages resolved with a file path](https://github.com/yarnpkg/yarn/issues/2165)


## Licence

WTF.