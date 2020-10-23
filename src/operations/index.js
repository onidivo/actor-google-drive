const Apify = require('apify');
const FileType = require('file-type');

const { OPERATIONS_TYPES } = require('../consts');
const { bufferToStream } = require('../utils');
const { Folder } = require('../operations/helper');
// const { Service } = require('../Service');

class KeyValueStoreFilesProvider {
    constructor({ id, forceCloud = false, files }) {
        this.id = id;
        this.forceCloud = forceCloud;
        this.files = files;
        this.kvStore = null;
        this.initPromise = this.init();
    }

    async init() {
        if (this.kvStore) return;
        this.kvStore = await Apify.openKeyValueStore(this.id, { forceCloud: this.forceCloud });
    }

    async getFileContent(key) {
        await this.initPromise;
        const fileContent = await this.kvStore.getValue(key);
        if (!fileContent) throw new Error(`[KeyValueStoreFilesProvider.getFileContent()] File not found for key "${key}"`);
        return fileContent;
    }

    getFileName(key) {
        const file = this.files.find(f => f.key === key);
        if (!file) throw new Error(`[KeyValueStoreFilesProvider.getFileName()] File not found for key "${key}"`);
        let name;
        if (file.options && file.options.resource && file.options.resource.name) {
            // eslint-disable-next-line prefer-destructuring
            name = file.options.resource.name;
        } else {
            name = file.name ? file.name : file.key;
        }
        return name;
    }

    async getFileData(key) {
        const fileName = this.getFileName(key);
        const fileContent = await this.getFileContent(key);
        let fileInfo;
        let fileBuffer;
        if (Buffer.isBuffer(fileContent)) {
            fileBuffer = fileContent;
            fileInfo = await FileType.fromBuffer(fileBuffer);
        } else if (typeof fileContent === 'string') {
            fileBuffer = Buffer.from(fileContent, 'utf-8');
            fileInfo = {
                mimeType: 'text/plain',
            };
        } else if (typeof fileContent === 'object') {
            fileBuffer = Buffer.from(JSON.stringify(fileContent), 'utf-8');
            fileInfo = {
                mimeType: 'application/json',
            };
        }
        const fileStream = bufferToStream(fileBuffer);
        return {
            fileName,
            fileInfo,
            fileStream,
        };
    }
}

class UploadOperation {
    /**
     *
     * @param {Object} source
     * @param {Folder} destination
     */
    constructor({ source, destination }) {
        // TODO: Validate parameters
        if (!destination || !(destination instanceof Folder)) {
            throw new Error('Parameter "destination" must be of type Folder');
        }

        this.source = source;
        this.destination = destination;
    }

    filesProvider() {
        if (this._filesProvider) return this._filesProvider;
        this._filesProvider = new KeyValueStoreFilesProvider(this.source);
        return this._filesProvider;
    }

    /**
     *
     * @param {Service} driveService
     * @return {Promise<void>}
     */
    async execute(driveService) {
        console.log(`Uploading files to ${this.destination}...`);

        const { folderId } = await driveService.createFolder(this.destination);
        const filesProvider = await this.filesProvider();

        const requestList = new Apify.RequestList({
            sources: filesProvider.files.map(file => ({ url: 'http://www.example.com/', uniqueKey: file.key, userData: { file } })),
        });
        await requestList.initialize();

        const uploadedFiles = [];
        const crawler = new Apify.BasicCrawler({
            maxConcurrency: driveService.config.maxConcurrency,
            handleRequestTimeoutSecs: 120,
            requestList,
            handleRequestFunction: async ({ request }) => {
                const { userData: { file } } = request;
                const uploadedFile = await driveService.uploadFile(file, folderId, filesProvider);
                const { status, statusText, data } = uploadedFile;
                uploadedFiles.push({ file, status, statusText, data });
            },

        });

        await crawler.run();

        await Apify.setValue('UPLOAD', uploadedFiles);
    }
}

class DeleteFolderOperation {
    constructor({ folder }) {
        if (!folder || !(folder instanceof Folder)) throw new Error('DeleteFolderOperation: Parameter "folder" must be of type Folder');

        this.folder = folder;

        // TODO: Validate parameters
    }

    async execute(driveService) {
        console.log(`Deleting folder ${this.folder}...`);
        const { folderId } = await driveService.getFolderInfo(this.folder);
        if (!folderId) {
            console.log('Couldn\'t delete folder because it doesn\'t exist');
        } else {
            await driveService.deleteFolder(folderId);
        }
    }
}

module.exports = {
    OPERATIONS_TYPES,
    UploadOperation,
    DeleteFolderOperation,
};
