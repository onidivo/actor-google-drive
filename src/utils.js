const { Duplex } = require('stream');
const { OPERATIONS_TYPES } = require('./consts');
const { Folder } = require('./operations/helper');

const ERROR_LABEL = '[PARSE_INPUT__ERROR]';

const validateAndParseInput = (input) => {
    console.log('Validating and parsing input...');

    const defaults = {
        fileUploadTimeoutSecs: 120,
        isSetupMode: false,
        tokensStore: 'google-auth-tokens',

    };
    const parsedInput = {};

    if (typeof input !== 'object') {
        throw new Error(`${ERROR_LABEL} Input must be a JSON object`);
    }
    parsedInput.isSetupMode = input.isSetupMode || defaults.isSetupMode;

    parsedInput.fileUploadTimeoutSecs = input.fileUploadTimeoutSecs
        ? Number(input.fileUploadTimeoutSecs)
        : defaults.fileUploadTimeoutSecs;

    parsedInput.fileUploadingMaxConcurrency = input.fileUploadingMaxConcurrency
        ? Number(input.fileUploadingMaxConcurrency)
        : undefined;

    parsedInput.tokensStore = input.tokensStore || defaults.tokensStore;


    const parsedOperations = [];
    const parsedConstants = [];
    if (!parsedInput.isSetupMode) {
        if (typeof input.constants !== 'undefined') {
            if (!Array.isArray(input.constants)) {
                throw new Error(`${ERROR_LABEL} Input field "constants" must be of type array!`);
            }
            const isValidConstantsValues = input.constants.every((c) => {
                return typeof c === 'object'
                    && typeof c.name === 'string'
                    && (typeof c.value === 'string' || typeof c.value === 'object');
            });
            if (!isValidConstantsValues) {
                throw new Error(`${ERROR_LABEL} Input field "constants" must be of type array of objects, and each object should have two fields: "name" (string) and "value" (string | object)!`);
            }
            for (const constant of input.constants) {
                parsedConstants.push(constant);
            }
        }

        if (!input.operations) {
            throw new Error(`${ERROR_LABEL} Input must have the "operations" field!`);
        }
        if (!Array.isArray(input.operations) || !input.operations.length) {
            throw new Error(`${ERROR_LABEL} Input field "operations" must be of type array and with one operation at least!`);
        }

        for (const operation of input.operations) {
            const { type } = operation;
            if (!type || !Object.values(OPERATIONS_TYPES).includes(type)) {
                throw new Error(`${ERROR_LABEL} Input field "operation.type" must be of type string and is a valid type, provided value was ${type}`);
            }
            // eslint-disable-next-line default-case
            switch (type) {
                case OPERATIONS_TYPES.UPLOAD: {
                    const { source, destination: inputDestination } = operation;
                    if (typeof source !== 'object') {
                        throw new Error(`${ERROR_LABEL} Input field "operation.source" must be of type object, provided value was ${source}`);
                    }
                    if (typeof source.idOrName !== 'string' || !source.idOrName) {
                        throw new Error(`${ERROR_LABEL} Input field "operation.source.idOrName" must be of type string, provided value was ${source.idOrName}`);
                    }
                    if (!Array.isArray(source.files) || !source.files.length) {
                        throw new Error(`${ERROR_LABEL} Input field "operation.source.files" must be of type array and has at least one operation, provided value was ${source.files}`);
                    }
                    const folderParams = Folder.validateAndParse({ folder: inputDestination, constants: parsedConstants });
                    parsedOperations.push({ type, source, destination: folderParams });
                    break;
                }
                case OPERATIONS_TYPES.FOLDERS_DELETE: {
                    const { folder: inputFolder } = operation;
                    const folderParams = Folder.validateAndParse({ folder: inputFolder, constants: parsedConstants });
                    parsedOperations.push({ type, folder: folderParams });
                    break;
                }
            }
        }
    }

    parsedInput.constants = parsedConstants;
    parsedInput.operations = parsedOperations;

    return parsedInput;
};

const bufferToStream = (buffer) => {
    const stream = new Duplex();
    stream.push(buffer);
    stream.push(null);
    return stream;
};


module.exports = { validateAndParseInput, bufferToStream };
