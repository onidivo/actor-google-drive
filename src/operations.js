const Apify = require('apify');

const { bufferToStream } = require('./utils');

const OPERATIONS_TYPES = {
    FILES_COPY: 'files-copy',
    FOLDERS_DELETE: 'folders-delete',
};

class KeyValueStoreFilesProvider {
    constructor(id, forceCloud, files) {
        this.id = id;
        this.forceCloud = false;
        this.files = files;
        this.kvStore = null;
    }

    async init() {
        if (this.kvStore) return;
        this.kvStore = await Apify.openKeyValueStore(this.id, { forceCloud: this.forceCloud });
    }

    async getFileStream(key) {
        await this.init();
        const buffer = await this.kvStore.getValue(key);
        return bufferToStream(buffer);
    }

    getFileName(key) {
        const file = this.files.find(f => f.key === key);
        if (!file) throw new Error(`[KeyValueStoreFilesProvider.getFileName()] File not found for key "${key}"`);
        let name;
        if (file.options.resource && file.options.resource.name) {
            // eslint-disable-next-line prefer-destructuring
            name = file.options.resource.name;
        } else {
            name = file.name ? file.name : file.key;
        }
        return name;
    }
}

class CopyFilesOperation {
    constructor(source, destination) {
        if (!destination || typeof destination !== 'string' || destination === '') throw new Error(`CopyFilesOperation: Parameter "destination" must be of type string and not empty, provided value was ${destination}`);
        // TODO: Validate source

        this.source = source;
        this.destination = destination;
        // TODO: Validate parameters
    }

    filesProvider() {
        if (this._filesProvider) return this._filesProvider;
        const { type, id, inCloud: forceCloud = false, files } = this.source;
        switch (type) {
            case 'key-value-store': {
                this._filesProvider = new KeyValueStoreFilesProvider(id, forceCloud, files);
                break;
            }
            default: {
                throw new Error(`[CopyFilesOperation.filesProvider()] The source type "${type}" is not recognized!`);
            }
        }
        return this._filesProvider;
    }

    async execute(driveService) {
        console.log(`Copying files to ${this.destination}...`);

        const { folderId } = await driveService.createFolder(this.destination);
        const filesProvider = await this.filesProvider();
        for (const file of filesProvider.files) {
            await driveService.copyFile(file, folderId, filesProvider);
        }
    }
}

class DeleteFolderOperation {
    constructor(folder) {
        if (!folder || typeof folder !== 'string' || folder === '') throw new Error(`DeleteFolderOperation: Parameter "folder" must be of type string and not empty, provided value was ${folder}`);

        this.folder = folder;
        // TODO: Validate parameters
    }

    async execute(driveService) {
        console.log(`Deleting folder ${this.folder}...`);
        const { folderId } = await driveService.getFolderInfo(this.folder);
        if (!folderId) console.log('Couldn\'t delete folder because it doesn\'t exist');
        else {
            const res = await driveService.deleteFolder(folderId);
            if (res.code === 404 && res.message.includes('File not found')) console.log(`Couldn't delete folder with id "${folderId}" because it doesn't exist`);
        }
    }
}

module.exports = { OPERATIONS_TYPES, CopyFilesOperation, DeleteFolderOperation };