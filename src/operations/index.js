const Apify = require('apify');
const FileType = require('file-type');

const { OPERATIONS_TYPES } = require('../consts');
const { bufferToStream } = require('../utils');
const { Folder } = require('../operations/helper');
// const { Service } = require('../Service');

class KeyValueStoreFilesProvider {
    constructor({ idOrName, forceCloud = false, files }) {
        this.storeIdOrName = idOrName;
        this.forceCloud = forceCloud;
        this.files = files;
        this.kvStore = null;
    }

    async init() {
        if (this.kvStore) return;
        this.kvStore = await Apify.openKeyValueStore(this.storeIdOrName, { forceCloud: this.forceCloud });
        const filesKeys = this.files.map(f => f.key);
        const allFilesKeys = [];
        const notFoundFilesKeys = [];
        await this.kvStore.forEachKey(key => allFilesKeys.push(key));
        console.log(`Total number of files in the key-value store: ${allFilesKeys.length - 1}`);
        for (const fileKey of filesKeys) {
            if (!allFilesKeys.includes(fileKey)) {
                notFoundFilesKeys.push(fileKey);
            }
        }
        if (notFoundFilesKeys.length > 0) {
            throw new Error(`The following files with keys are not found: ${notFoundFilesKeys.join(', ')}`);
        }
    }

    async getFileContent(key) {
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
        if (!destination || !(destination instanceof Folder)) {
            throw new Error('Parameter "destination" must be of type Folder');
        }

        this.source = source;
        this.destination = destination;
    }

    /**
     *
     * @returns {KeyValueStoreFilesProvider}
     */
    async filesProvider() {
        if (this._filesProvider) return this._filesProvider;
        this._filesProvider = new KeyValueStoreFilesProvider(this.source);
        await this._filesProvider.init();
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

        const crawler = new Apify.BasicCrawler({
            maxConcurrency: driveService.config.fileUploadingMaxConcurrency,
            handleRequestTimeoutSecs: driveService.config.fileUploadTimeoutSecs,
            requestList,
            handleRequestFunction: async ({ request }) => {
                const { userData: { file } } = request;
                const fileUploadResult = await driveService.uploadFile(file, folderId, filesProvider);
                const { status, statusText, data } = fileUploadResult;
                await Apify.pushData({
                    operation: 'upload',
                    status: 'success',
                    file,
                    storeIdOrName: filesProvider.storeIdOrName,
                    fileUploadResult: { status, statusText, data },
                });
            },
            handleFailedRequestFunction: async ({ request }) => {
                const { userData: { file } } = request;
                await Apify.pushData({
                    operation: 'upload',
                    status: 'failed',
                    file,
                    storeIdOrName: filesProvider.storeIdOrName,
                    errors: request.errorMessages,
                });
            },

        });

        await crawler.run();
    }
}

class DeleteFolderOperation {
    constructor({ folder }) {
        if (!folder || !(folder instanceof Folder)) throw new Error('DeleteFolderOperation: Parameter "folder" must be of type Folder');

        this.folder = folder;
    }

    async execute(driveService) {
        const { folder } = this;
        console.log(`Deleting folder ${folder}...`);
        const { folderId } = await driveService.getFolderInfo(folder);
        if (!folderId) {
            console.log('Could not delete the folder because it does not exist');
            await Apify.pushData({
                operation: 'folders-delete',
                status: 'success',
                folder: folder.params,
                note: 'Folder does not exist',
            });
        } else {
            const folderDeleteResult = await driveService.deleteFolder(folderId);
            const { status, statusText, data } = folderDeleteResult;
            await Apify.pushData({
                operation: 'folders-delete',
                status: 'success',
                folder: folder.params,
                folderDeleteResult: { status, statusText, data },
            });
        }
    }
}

module.exports = {
    OPERATIONS_TYPES,
    UploadOperation,
    DeleteFolderOperation,
};
