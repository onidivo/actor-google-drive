const { GOOGLE_APIS } = require('./consts');
const { validateAndParseInput } = require('./utils');
/**
 *
 *
 * @property {Object} input
 * @property {Array<Object>} constants
 * @property {Array<Object>} operations
 * @property {Number} fileUploadTimeoutSecs
 * @property {Number|undefined} fileUploadingMaxConcurrency
 * @property {Boolean} isSetupMode
 * @property {String} tokensStore
 * @property {Object} googleApisCredentials
 */
class Config {
    constructor(input) {
        this.input = input;
        const parsedInput = validateAndParseInput(input);
        for (const key of Object.keys(parsedInput)) {
            this[key] = parsedInput[key];
        }


        this.googleApisCredentials = {
            client_id: GOOGLE_APIS.CLIENT_ID,
            client_secret: process.env.GOOGLE_APIS_CLIENT_SECRET,
            redirect_uri: GOOGLE_APIS.REDIRECT_URI,
        };
    }
}

module.exports = Config;
