#!/usr/bin/env node

import { input, select, confirm } from "@inquirer/prompts";
import path from "path";
import chalk from "chalk";
import fs from "fs";
import { exec, spawn, spawnSync } from "child_process";

const currentDirectory = process.cwd()
const dependenciesFileName = 'dependencies.json';
console.clear();
try {

    const answer = await select({
        message: 'What do you want to do?',

        choices: [
            { name: 'Download Project', value: 'download', description: 'You can download a PHET repository by writing the name of it.' },
            { name: 'Prepare Dependencies', value: 'dependency', description: 'Prepare a PHET project, this will download required additional repositories.' },
            { name: 'Run Development Server', value: 'dev-server', description: 'Run a development server for a PHET project, in order to build or work on a project this step is necessary.' },
            { name: 'Build Project', value: 'build', description: 'Build a PHET project, this will create a build folder within project folder.' },
        ],
    })


    switch (answer) {
        case 'download':
            await DownloadPrompt();
            break
        case 'dependency':
            await DependencyPrompt();
            break;
        case 'dev-server':
            await DevServerPrompt();
            break;
        case 'build':
            await BuildPrompt();
            break;

    }
} catch (error) {
    console.log(chalk.red('Exit'));
}

async function DownloadPrompt() {
    const project = await input({
        type: 'text',
        name: 'project',
        message: 'What project do you want to download?',
    });
    const target = await clone(project);

    if (target) {
        const shouldInstallDependencies = await confirm({
            message: 'Do you want to install dependencies?',
            initial: true
        })
        if (shouldInstallDependencies) {

            const dep = await dependency(target);
            if (dep) {
                const response = await confirm({
                    message: 'Do you want to run development server? This will install additinal dependencies if needed.',

                    initial: true
                })
                if (response) {
                    await runDevServer();
                }
            }
        }
    }

}

async function DependencyPrompt() {

    const folders = fs.readdirSync(currentDirectory, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(currentDirectory, d.name, dependenciesFileName))).map(d => d.name);

    if (folders.length === 0) {
        console.error(chalk.red('There is no project to prepare'));
        return;
    }
    const project = await select({
        type: 'select',
        name: 'project',
        message: 'What project do you want to prepare?',
        choices: folders.map(f => ({ name: f, value: f }))
    });

    const dep = await dependency(project);

    if (dep) {
        const response = await confirm({
            message: 'Do you want to run development server? This will install additinal dependencies if needed.',
            initial: true
        })
        if (response) {
            await runDevServer();
        }
    }



}

async function DevServerPrompt() {
    const response = await confirm({
        message: 'This will install core dependencies, do you want to continue?',
        initial: true
    })
    if (response) {
        await runDevServer();
    }

}

async function BuildPrompt() {
    const folders = fs.readdirSync(currentDirectory, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(currentDirectory, d.name, dependenciesFileName))).map(d => d.name);
    if (folders.length === 0) {
        console.error(chalk.red('There is no project to build'));
        return;
    }
    const project = await select({
        type: 'select',
        name: 'project',
        message: 'What project do you want to build?',
        choices: folders.map(f => ({ name: f, value: f }))
    });

    const target = path.join(currentDirectory, project);
    // read package.json
    const packageJson = path.join(target, 'package.json');
    if (!fs.existsSync(packageJson)) {
        console.error(chalk.red('Please provide a valid directory, there is no package.json exist in it.'), chalk.blue(target));
        return;
    }
    let packageObject;
    try {
        packageObject = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    } catch (error) {
        console.error(chalk.red('Please provide a valid package.json file, it is not a valid JSON file.'), chalk.blue(target));
        return;
    }
    if (!packageObject) {
        console.error(chalk.red('Please provide a valid package.json file, it is empty.'), chalk.blue(target));
        return;
    }
    if (!packageObject.scripts || !packageObject.scripts.build) {
        packageObject.scripts = packageObject.scripts || {};
        packageObject.scripts['build'] = 'grunt build';
        fs.writeFileSync(packageJson, JSON.stringify(packageObject, null, 2));
    }

    const install = new Promise((resolve, reject) => {
        const child = spawn('npm', ['install'], { cwd: target });
        child.on('close', function (code) {
            if (code === 0) {
                resolve(true);
            } else {
                reject(false);
            }
        }
        )


    })
    const installed = await install;
    if (!installed) {
        console.error(chalk.red('Error while installing dependencies'));
        return;
    }
    const promise = new Promise((resolve, reject) => {
        const child = spawn('npm', ['run', 'build'], { cwd: target });

        console.log(chalk.blue('[BUILD]'), `Building ${chalk.blue(project)}`);
        child.stderr.on('data', function (data) {
            console.error(`${data}`);
        }
        );
        child.stdout.on('data', function (data) {
            console.log(`${data}`);
        }
        );
        child.on('close', function (code) {
            if (code === 0) {
                resolve(true);
            } else {
                reject(false);
            }
        });
    }
    );
    if (await promise) {
        console.log(chalk.green('Build finished successfully'));
        console.log(chalk.green(path.join(target, 'build')));
    } else {
        console.log(chalk.red('Build failed'));

    }




}

async function runDevServer() {
    const coreDependencies = [
        'perennial-alias',
        'chipper'
    ]
    for (let i = 0; i < coreDependencies.length; i++) {
        const p = coreDependencies[i];
        const t = await install(p)
        if (!t) {
            console.log(chalk.red('Error while installing core dependencies'));
            return false;
        }
    }

    // run dev server by running "node js/scripts/transpile.js --watch" in "chipper"
    const devServer = spawn('node', ['js/scripts/transpile.js', '--watch'], { cwd: path.join(currentDirectory, 'chipper') });
    devServer.stdout.on('data', function (data) {
        console.log(`${data}`);
    });
    devServer.stderr.on('data', function (data) {
        console.error(`${data}`);
    });
    devServer.on('close', function (code) {
        console.log(`child process exited with code ${code}`);
    });




}

async function install(directory) {
    const target = directory.startsWith('/') ? directory : path.join(currentDirectory, directory);
    if (!fs.existsSync(target)) {
        console.error(chalk.red('Directory does not exist'), chalk.blue(directory));
        return;
    }
    if (!fs.lstatSync(target).isDirectory()) {
        console.error(chalk.red('Please provide a valid directory'), chalk.blue(directory));
        return;
    }
    const packageJson = path.join(target, 'package.json');
    if (!fs.existsSync(packageJson)) {
        console.error(chalk.red('Please provide a valid directory, there is no package.json exist in it.'), chalk.blue(directory));
        return;
    }
    try {

        const promise = new Promise((resolve, reject) => {
            const child = spawn('npm', ['install'], { cwd: target });

            console.log(chalk.blue('[INSTALL]'), `Installing dependencies for ${chalk.blue(directory)}`);
            child.on('close', function (code) {
                if (code === 0) {
                    console.log(chalk.blue('[INSTALL]'), chalk.green(`Dependencies installed for ${chalk.blue(directory)}`));
                    resolve(true);
                } else {
                    console.error(chalk.blue('[INSTALL]'), `${chalk.red('Error while installing dependencies')}`, chalk.blue(directory));
                    reject(false);
                }
            });
        }
        );
        return await promise;

    } catch (error) {
        console.error(chalk.blue('[INSTALL]'), `${chalk.red('Error while installing dependencies')}`, chalk.blue(directory));
        return false;
    }

}

async function clone(p) {
    let _source = "",
        _target = "";
    if (typeof p === 'object' && Array.isArray(p) && p.length === 2) {
        _source = p[0];
        _target = p[1];
    } else if (typeof p === 'string') {
        _source = p;
        _target = p;
    } else {
        console.error(chalk.blue('[CLONE]'), `${chalk.red('Invalid package name')}`, chalk.blue(p));
        return;
    }
    if (!_source) {
        console.error(chalk.blue('[CLONE]'), `${chalk.red('Please provide a package name')}`);
        return;
    }
    if (!_target) {
        console.error(chalk.blue('[CLONE]'), `${chalk.red('Please provide a target name')}`);
        return;
    }
    const url = `https://github.com/phetsims/${_source}`;
    const target = path.join(currentDirectory, _target);
    if (fs.existsSync(target)) {
        console.log(chalk.blue('[CLONE]'), chalk.yellow(`Skipping ${chalk.blue(_source)}, already exists`));
        return target;
    }
    if (_source !== _target)
        console.log(chalk.blue('[CLONE]'), `Cloning ${chalk.blue(_source)} to ${chalk.blue(_target)}`);
    else
        console.log(chalk.blue('[CLONE]'), `Cloning ${chalk.blue(_source)}`);
    const promise = new Promise((resolve) => {
        exec(`git clone ${url} ${target}`, (err) => {
            if (err) {
                console.error(chalk.blue('[CLONE]'), `${chalk.red('Error while cloning')}`, chalk.blue(_target));
                resolve();
            } else {
                resolve(target);
            }
        });
    });
    return await promise;

}




async function dependency(directory) {

    if (!directory) {
        console.error(chalk.red('Please provide a directory for dependencies'));
        return;
    }
    const d = directory.startsWith('/') ? directory : path.join(currentDirectory, directory);

    if (!fs.existsSync(d)) {
        console.error(chalk.red('Directory does not exist'), chalk.blue(d));
        return;
    }
    if (!fs.lstatSync(d).isDirectory()) {
        console.error(chalk.red('Please provide a valid directory'), chalk.blue(d));
        return;
    }
    const packagesFile = path.join(d, dependenciesFileName);
    if (!fs.existsSync(packagesFile)) {
        console.error(chalk.red(`Please provide a valid directory, there is no '${chalk.white(dependenciesFileName)}' exist in it.`), chalk.blue(d));
        return;
    }

    let packages;
    try {

        packages = JSON.parse(fs.readFileSync(packagesFile, 'utf8'));
    } catch (error) {
        console.error(chalk.red(`Please provide a valid '${chalk.white(dependenciesFileName)}' file, it is not a valid JSON file.`), chalk.blue(d));
        return;

    }

    if (!packages) {
        console.error(chalk.red(`Please provide a valid '${chalk.white(dependenciesFileName)}' file, it is empty.`), chalk.blue(d));
        return;
    }



    const packageAliases = {
        'perennial-alias': 'perennial',
    }
    const _packages = [];
    if (isRealObject(packages)) {
        Object.entries(packages).forEach(([key, value]) => {
            if (isRealObject(value)) {
                if (value.branch == 'main') {
                    if (packageAliases[key])
                        _packages.push([packageAliases[key], key]);
                    else
                        _packages.push(key);
                }
            }
        });
    }

    console.log(chalk.blueBright("*** Cloning Dependencies ***"))
    let success = 0
    let fail = 0
    for (let i = 0; i < _packages.length; i++) {
        const p = _packages[i];
        try {

            const target = await clone(p);
            if (target) {
                success++
            }
            else {
                fail++
            }
        } catch (error) {
            console.error(chalk.red('Something went wrong while cloning'), chalk.blue(p));
        }
    }
    console.log(chalk.blueBright(`*** Cloning Finished *** ${chalk.greenBright(success)} success, ${chalk.redBright(fail)} fail`))
    return true



}

function isRealObject(o) {
    return typeof o === 'object' && !Array.isArray(o);
}