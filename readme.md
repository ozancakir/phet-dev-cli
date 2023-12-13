# PhET Developer Helper CLI

PhET Developer Helper CLI is a command-line interface (CLI) tool designed to streamline common development tasks for PhET Interactive Simulations projects. This interactive CLI provides easy access to essential project operations, making it more convenient for developers to manage their PhET projects.

This CLI basically, download and prepare an individual PhET simulation for you without downloading all the repositories of https://github.com/phetsims. For a simulation, by reading **dependencies.json** in simulation's root directory, cli will selectively clone repositores, prepare dependencies and will provide you a development server with an interactive format. 

## Installation

To use PhET Developer Helper CLI, you need to install the package globally. Open your terminal and run the following command:

```bash
npm install -g phet-dev-cli

```

## Getting Started

Once the package is installed, ensure that you create a root directory and navigate to that folder to host phet repositories;

```bash
mkdir ~/phet
cd ~/phet
```
You can access the PhET Developer Helper CLI by typing phet-dev in your terminal.

```bash
phet-dev
```

Upon running the command, you will be presented with the following options:

1. **Download Project**: Download a PhET repository by specifying its name.

2. **Prepare Dependencies**: Prepare a PhET project by downloading required additional repositories.

3. **Run Development Server**: Start a development server for a PhET project. This step is necessary for building or working on a project.

4. **Build Project**: Build a PhET project, creating a build folder within the project directory.

## Usage

Select one of the options presented in the interactive prompt by typing the corresponding number or selecting it with the arrow keys and pressing Enter.

In order to use a step, the previous step must be completed. For example, before running the development server (Step 3), you must first download a PhET repository (Step 1). Likewise, preparing dependencies (Step 2) is a prerequisite for both running the development server and building the project.


### Note:
- Ensure that you follow the steps sequentially to maintain a consistent and error-free development process.

## Feedback and Issues

If you encounter any issues or have suggestions for improvement, please feel free to open an issue on the [GitHub repository](https://github.com/ozan-cakir/phet-dev-cli). Your feedback is valuable and contributes to the overall improvement of PhET Developer Helper CLI.

## Contribution

We welcome contributions to enhance and expand the features of PhET Developer Helper CLI. Feel free to fork the repository, make your changes, and submit a pull request.

