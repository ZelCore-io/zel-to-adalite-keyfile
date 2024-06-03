import fs from 'fs';
import { exportWalletSecretDef } from './src/keypass.js';
import pkg from 'cardano-crypto.js';
import readline from 'readline';

const { _seedToKeypairV2 } = pkg;

// Function to prompt the user for input
function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

// Create Cardano key file from mnemonic
async function createCardanoKeyFile(privateKey, password) {
  const pkBuf = await _seedToKeypairV2(Buffer.from(privateKey, 'hex'), '');
  const res = await exportWalletSecretDef({
    rootSecret: pkBuf,
    derivationScheme: {
      type: 'v2',
      ed25519Mode: 2,
      keyfileVersion: '2.0.0',
    }
  }, password, 'Cardano Key File');
  console.log(res);
  // Save key file
  fs.writeFileSync('cardano_key.json', JSON.stringify(res, null, 2));
  console.log('Cardano key file created: cardano_key.json');
}

// Main function
(async () => {
  try {
    const privateKey = await promptUser('Enter your private key: ');
    const password = await promptUser('Enter your password: ');
    await createCardanoKeyFile(privateKey, password);
  } catch (error) {
    console.error(error);
  }
})();
