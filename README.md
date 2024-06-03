# zel-to-adalite-keyfile (Cardano Key File Creator)
Script to convert Zelcore private key to adaLite key file
This script allows you to create a Cardano key file from a private key and password. 

## Prerequisites

Ensure you have the following installed:

- Node.js (version 20.x or higher)
- npm (version 10.x or higher)

## Installation

1. Clone this repository or download the script files.
2. Navigate to the project directory.
3. Install the required npm packages:

```bash
npm i
```

## Usage

### Running the Script

1. Open a terminal and navigate to the project directory.
2. Run the script using the following command:

```bash
node index.js
```

3. You will be prompted to enter your private key and password:

```
Enter your private key: [Your Private Key] // Needs to be zelcore wallet private key and not the wif format one.
Enter your password: [Your Password] // A password of you own choosing used to decrypt the file when importing.
```

### Example

```
Enter your private key: dfe2acb0
Enter your password: 1234
```

### Output

Once the script runs successfully, it will create a `cardano_key.json` file in the project directory. The content of this file will be the exported Cardano key file.
The file can the be imported to AdaLite wallet @see https://adalite.io/ with key file option.

### Error Handling

If there are any errors during the execution, they will be logged in the console.

## Script Overview

The script performs the following actions:

1. Prompts the user for their private key and password.
2. Uses the `cardano-crypto.js` library to generate a Cardano key pair from the provided private key.
3. Exports the wallet secret using the provided password.
4. Saves the exported wallet secret to a `cardano_key.json` file.
