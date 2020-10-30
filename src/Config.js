/* eslint-disable max-len */
const { GOOGLE_APIS, OPERATIONS_TYPES } = require('./consts');
const { Folder } = require('./operations/helper');

const ERROR_LABEL = '[PARSE_INPUT__ERROR]';

/**
 *
 *
 * @property {Object} input
 * @property {Array<Object>} constants
 * @property {Array<Object>} operations
 * @property {Number} fileUploadTimeoutSecs
 * @property {Number|undefined} fileUploadingMaxConcurrency
 * @property {Boolean} isSetupMode
 * @property {String} googleOAuthTokensStore
 * @property {Object} googleOAuthCredentials
 */
class Config {
    constructor(input) {
        this.input = input;
        const parsedInput = this.validateAndParseInput(input);
        for (const key of Object.keys(parsedInput)) {
            this[key] = parsedInput[key];
        }
    }

    validateAndParseInput(input) {
        console.log('Validating and parsing input...');

        const defaults = {
            fileUploadTimeoutSecs: 120,
            fileUploadingMaxConcurrency: 5,
            isSetupMode: false,
            googleOAuthTokensStore: 'google-oauth-tokens',
            googleOAuthCredentials: {
                client_id: GOOGLE_APIS.CLIENT_ID,
                client_secret: process.env.GOOGLE_APIS_CLIENT_SECRET,
                redirect_uri: GOOGLE_APIS.REDIRECT_URI,
            },
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
            : defaults.fileUploadingMaxConcurrency;

        parsedInput.googleOAuthTokensStore = input.googleOAuthTokensStore || defaults.googleOAuthTokensStore;


        if (input.googleOAuthCredentials) {
            const isValidGoogleOAuthCredentials = typeof input.googleOAuthCredentials === 'object'
                && typeof input.googleOAuthCredentials.client_id === 'string' && input.googleOAuthCredentials.client_id.length
                && typeof input.googleOAuthCredentials.client_secret === 'string' && input.googleOAuthCredentials.client_secret.length
                && typeof input.googleOAuthCredentials.redirect_uri === 'string' && input.googleOAuthCredentials.redirect_uri.length;
            if (!isValidGoogleOAuthCredentials) {
                throw new Error(`${ERROR_LABEL} Input field "googleOAuthCredentials" must be of type object and have the properties: "client_id" (string), "client_secret" (string), and "redirect_uri" (string)!`);
            }
        }
        parsedInput.googleOAuthCredentials = input.googleOAuthCredentials || defaults.googleOAuthCredentials;

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
                if (!type || !Object.values(OPERATIONS_TYPES)
                    .includes(type)) {
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
                        const folderParams = Folder.validateAndParse({
                            folder: inputDestination,
                            constants: parsedConstants,
                        });
                        parsedOperations.push({
                            type,
                            source,
                            destination: folderParams,
                        });
                        break;
                    }
                    case OPERATIONS_TYPES.FOLDERS_DELETE: {
                        const { folder: inputFolder } = operation;
                        const folderParams = Folder.validateAndParse({
                            folder: inputFolder,
                            constants: parsedConstants,
                        });
                        parsedOperations.push({
                            type,
                            folder: folderParams,
                        });
                        break;
                    }
                }
            }
        }

        parsedInput.constants = parsedConstants;
        parsedInput.operations = parsedOperations;

        return parsedInput;
    }
}

module.exports = Config;
