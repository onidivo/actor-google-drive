# Google Drive Actor

Transfer files between [Apify's key-value stores](https://docs.apify.com/storage#key-value-store) and Google Drive.

- [Input](#input)
   
   [- Constants (`constants`)](#Constants)
   
   [- Operations (`operations`)](#Operations)
   
   [- Is setup mode (`isSetupMode`)](#Is-setup-mode)
   
   [- Google OAuth credentials (`googleOAuthCredentials`)](#Google-OAuth-credentials)
   
   


## Input

The input is a JSON object with the following fields.

| Field | Type | Description | Default value | Possible values | Required |
| ----- | ---- | ----------- | ------ | -------- | -------- |
| constants | array | Constants to use in the operations | - | - | false |
| constants[*] | object |  Constant settings | - | - | - |
| constants[name] | string |  Constant name | - | - | true |
| constants[value] | string or Object |  Constant value | - | - | true |
| operations | array | The operations to execute | - | - | false |
| operations[*] | Object |  Operation settings, mainly it contains the **type** and other specific settings  | - | - | - |
| fileUploadTimeoutSecs | number |  Maximum available time (in seconds) used to upload a single file | 120 | - | false |
| fileUploadingMaxConcurrency | number |  Maximum concurrency used for uploading files in parallel | - | - | false |
| isSetupMode | boolean |  Whether yes or no to activate the setup mode  | false | - | false |
| googleOAuthTokensStore | string |  Key-value store where your Google OAuth tokens will be stored so you don't have to authorize every time again  | "google-oauth-tokens" | - | false |
| googleOAuthCredentials | object | Google OAuth credentials  | - | - | false |

### Constants
 
An array of folder info constants to use by the operations (DRY principle). Each constant is a JSON object composed of two fields: name and value.

#### Constant value as string

Represent the path of the folder

**Example**
```json
{
      "name": "myFolder",
      "value": "my-project/files"
}
```

#### Constant value as object

Provide more folder definition, which can be useful for defining a shared folder.


**Example**

```json
{
      "name": "myFolder",
      "value": {
            "parentFolderId": "GoogleDriveFolderId",
            "path": "files"
      }
}
```

#### Constant usage

We use the constant inside a string with the following format `"constants.[CONSTANT_NAME]"`.

**Example**

```json
  {
      "type": "folders-delete",
      "folder": "constants.myFolder"
  }
 ```
### Operations

Operations are the backbone. Each operation is an object and distinguished by the **type** field. The field **type** can have one the following values: **upload**, and **folders-delete**.

For each operation **type** there are specific settings that accompany as explained below:

#### Operation "upload"

Upload files from the key-value stores to a Google Drive folder.

| Field | Type | Description | Default value | Possible values | Required |
| ----- | ---- | ----------- | ------ | -------- | -------- |
| source | object | Represent the file(s) to upload | - | - | true |
| source.idOrName | string | The ID or name of the key-value store  | - | - | true |
| source.forceCloud | boolean | Forcibly use the key-value store from the cloud | false | - | false |
| source.files | array | File(s) to apply the operation on them  |  |  |  |
| source.files[*] | object |  File(s) settings | - | - | true |
| source.files[key] | string |  The key of the file on the key-value store | - | - | true |
| source.files[name] | string|  The name of upload file on Google Drive | - | - | false |
| source.files[mimeType] | string |  The Google Drive MIME type of the file | - | [Google Drive MIME types](https://developers.google.com/drive/api/v3/mime-types) | false |
| destination | string / object | Info of the Google Drive's folder where we will upload the file(s) | - | - | true |

**Example**
```json
{
      "type": "upload",
      "source": {
        "idOrName": "my-store",
        "files": [
            {
              "key": "my_spreadsheet",
              "name": "My spreadsheet",
              "mimeType": "application/vnd.google-apps.spreadsheet"
            },
            {
              "key": "my_image",
              "name": "My Image"
            }
        ]
      },
      "destination": "My actor files"
    }
```

#### Operation "folders-delete"

Delete a folder. This operation type is useful for deleting folders before uploading files to prevent file duplication.

| Field | Type | Description | Default value | Possible values | Required |
| ----- | ---- | ----------- | ----- | ---- | ----------- |
| folder | string / object | Info of the Google Drive's folder to delete | - | - | true |

**Example:**
```json
{
      "type": "folders-delete",
      "folder": "My Folder"
}
```


### Is setup mode

Before you start using the actor for running operations, you will need to run it in the setup mode. To achieve that, you need to run it with the bellow input and follow the steps in the run's log ( for more info, check this [article](https://kb.apify.com/integration/google-integration)). 

```json
{
  "isSetupMode": true
}
```
**Note**: If the setup mode is activated, operations will not get executed.

### Google OAuth credentials

If you want to use this actor locally or with your own version, you have to provide your own credentials. To setup yours, check this [guide](https://support.google.com/googleapi/answer/6158849?hl=en&ref_topic=7013279#). Required credentials data is: "client_id", "client_secret", and "redirect_uri".
