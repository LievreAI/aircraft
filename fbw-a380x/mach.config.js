const imagePlugin = require('esbuild-plugin-inline-image');
const postCssPlugin = require('esbuild-style-plugin-v2');
const tailwind = require('tailwindcss');
const postCssColorFunctionalNotation = require('postcss-color-functional-notation');
const postCssInset = require('postcss-inset');
const { typecheckingPlugin } = require("#build-utils");

/** @type { import('@synaptic-simulations/mach').MachConfig } */
module.exports = {
    packageName: 'A380X',
    packageDir: 'out/flybywire-aircraft-a380-842',
    plugins: [
        imagePlugin({ limit: -1 }),
        postCssPlugin({
            extract: true,
            postcss: {
                plugins: [
                    tailwind('../fbw-common/src/systems/instruments/src/EFB/tailwind.config.js'),

                    // transform: hsl(x y z / alpha) -> hsl(x, y, z, alpha)
                    postCssColorFunctionalNotation(),

                    // transform: inset: 0; -> top/right/left/bottom: 0;
                    postCssInset(),
                ],
            }
        }),
        typecheckingPlugin(),
    ],
    instruments: [
        msfsAvionicsInstrument('PFD'),
        msfsAvionicsInstrument('ND'),
        msfsAvionicsInstrument('MFD'),
        msfsAvionicsInstrument('Clock'),
        msfsAvionicsInstrument('ND'),
        msfsAvionicsInstrument('PFD'),
        msfsAvionicsInstrument('RMP'),

        reactInstrument('BAT'),
        reactInstrument('EFB', ['/Pages/VCockpit/Instruments/Shared/Map/MapInstrument.html']),
        reactInstrument('EWD'),
        reactInstrument('OIT'),
        reactInstrument('SD'),
    ],
};

function msfsAvionicsInstrument(name, folder = name) {
    return {
        name,
        index: `src/systems/instruments/src/${folder}/instrument.tsx`,
        simulatorPackage: {
            type: 'baseInstrument',
            templateId: `A380X_${name}`,
            mountElementId: `${name}_CONTENT`,
            fileName: name.toLowerCase(),
            imports: ['/JS/dataStorage.js', '/JS/fbw-a32nx/A32NX_Util.js'],
        },
    };
}

function reactInstrument(name, additionalImports) {
    return {
        name,
        index: `src/systems/instruments/src/${name}/index.tsx`,
        simulatorPackage: {
            type: 'react',
            isInteractive: false,
            fileName: name.toLowerCase(),
            imports: ['/JS/dataStorage.js','/JS/fbw-a380x/A380X_Simvars.js', ...(additionalImports ?? [])],
        },
    };
}
