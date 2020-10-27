const { typeCheck } = require('type-check');

class Folder {
    constructor(params) {
        this.validate(params);
        this.params = params;
        for (const paramKey of Object.keys(params)) {
            this[paramKey] = params[paramKey];
        }
    }

    validate(params) {
        if (!typeCheck('Object', params)) {
            throw new Error(`Folder: Parameter "params" must be of type object, provided value was ${JSON.stringify(params)}`);
        }
        if (!typeCheck('String', params.parentFolderId) && !typeCheck('String', params.parentFolderName)) {
            throw new Error('Folder: Parameter "params" must have at least one this fields: "parentFolderId", "parentFolderName".');
        }
        if (params.relativePath && !typeCheck('Maybe String', params.relativePath)) {
            throw new Error('Folder: Parameter "params" must have the field "relativePath" as "String".');
        }
        // TODO: Add support for folder path as String
        // if (typeCheck('String', params) && params === '') throw new Error(`Folder: Parameter "params" must not be empty string`);
    }

    getFolders() {
        const folders = [];
        folders.push({
            id: this.parentFolderId,
            name: this.parentFolderName,
            root: true,
        });
        if (this.relativePath) {
            for (const folderName of this.relativePath.split('/')) {
                folders.push({
                    name: folderName,
                    root: false,
                });
            }
        }
        return folders;
    }

    toString() {
        if (this.folderAsString) return this.folderAsString;
        const parent = (this.parentFolderName || '') + (this.parentFolderId ? `::${this.parentFolderId}` : '');
        const relative = this.relativePath ? `/${this.relativePath}` : '';
        const folderAsString = `{${parent}}${relative}`;
        this.folderAsString = folderAsString;
        return folderAsString;
    }

    static validateAndParse({ folder, constants }) {
        if (!typeCheck('Object', folder) && !typeCheck('String', folder)) {
            throw new Error(`Parameter "folder" must be of type object or string, provided value was ${folder}`);
        }
        let finalFolder = folder;
        if (typeCheck('String', folder) && folder.includes('constants.')) {
            const constantName = folder.split('.')[1];
            const constant = constants.find(c => c.name === constantName);
            if (!constant) {
                throw new Error(`Constant "${constantName}" not found in the input!`);
            }
            finalFolder = constant.value;
        }
        const folderParams = {
            parentFolderId: undefined,
            parentFolderName: undefined,
            relativePath: undefined,
        };
        let folderPath = finalFolder;

        if (typeCheck('Object', finalFolder)) {
            if (!typeCheck('String', finalFolder.path)) {
                throw new Error(`Value of "path" in folder object must be of type string, provided value was ${finalFolder.path}`);
            }
            if (finalFolder.parentFolderId && !typeCheck('String', finalFolder.path)) {
                throw new Error(`Value of "parentFolderId" in folder object must be of type string, provided value was ${finalFolder.parentFolderId}`);
            }
            folderPath = finalFolder.path;
            folderParams.parentFolderId = finalFolder.parentFolderId;
        }

        if (folderParams.parentFolderId) {
            folderParams.relativePath = folderPath;
        } else {
            const pathSplits = folderPath.split('/');

            // eslint-disable-next-line prefer-destructuring
            folderParams.parentFolderName = pathSplits[0];
            folderParams.relativePath = pathSplits.length > 1 ? pathSplits.slice(1)
                .join('/') : undefined;
        }


        return folderParams;
    }
}

module.exports = { Folder };
