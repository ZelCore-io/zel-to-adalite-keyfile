/* based on https://github.com/input-output-hk/cardano-crypto/blob/master/cbits/encrypted_sign.c */
import derivationSchemes from './helpers/derivation-schemes.js'

import {decodeCbor, encodeCbor} from './helpers/cbor.js'

import pkg from 'cardano-crypto.js';

const {cardanoMemoryCombine, blake2b, scrypt} = pkg;

export const HARDENED_THRESHOLD = 0x80000000
function transformPassword(password) {
  return password ? blake2b(Buffer.from(password), 32) : Buffer.from([])
}

async function verifyPassword(passwordToVerify, passwordHash) {
  const passwordHashSplit = decodeCbor(passwordHash)
    .toString('ascii')
    .split('|')

  const n = 1 << parseInt(passwordHashSplit[0], 10)
  const r = parseInt(passwordHashSplit[1], 10)
  const p = parseInt(passwordHashSplit[2], 10)
  const salt = Buffer.from(passwordHashSplit[3], 'base64')
  const expectedHash = Buffer.from(passwordHashSplit[4], 'base64')

  const passwordToVerifyHash = await new Promise((resolve, reject) => {
    scrypt(
      encodeCbor(transformPassword(passwordToVerify)),
      salt,
      {
        N: n,
        r,
        p,
        dkLen: expectedHash.length,
        encoding: 'base64',
        interruptStep: 1000,
      },
      (hash) => resolve(hash)
    )
  })

  return passwordToVerifyHash === expectedHash.toString('base64')
}

function getRandomSaltForPasswordHash() {
  const randBytes = Buffer.alloc(32)
  for (let i = 0; i < randBytes.length; i++) {
    randBytes[i] = Math.floor(Math.random() * 256)
  }
  return encodeCbor(randBytes)
}

async function hashPasswordAndPack(password, salt) {
  const [n, r, p, hashLen] = [14, 8, 1, 32]
  const hash = await new Promise((resolve, reject) => {
    scrypt(
      encodeCbor(transformPassword(password)),
      salt,
      {
        N: 1 << n,
        r,
        p,
        dkLen: hashLen,
        encoding: 'base64',
        interruptStep: 1000,
      },
      (hash) => resolve(hash)
    )
  })

  return [n.toString(), r.toString(), p.toString(), salt.toString('base64'), hash].join('|')
}

// wallet secret encryption/decryption is self-inverse
const [encryptWalletSecret, decryptWalletSecret] = Array(2).fill((walletSecret, password) => {
  const secretKey = walletSecret.slice(0, 64)
  const extendedPublicKey = walletSecret.slice(64, 128)

  return Buffer.concat([cardanoMemoryCombine(secretKey, password), extendedPublicKey])
})

function parseWalletExportObj(walletExportObj) {
  if (walletExportObj.fileType !== 'WALLETS_EXPORT') {
    throw new Error('Invalid file type')
  }

  const {passwordHash: b64PasswordHash, walletSecretKey: b64WalletSecret} = walletExportObj.wallet
  const passwordHash = Buffer.from(b64PasswordHash, 'base64')
  const derivationScheme = Object.values(derivationSchemes).find(
    (x) => x.keyfileVersion === walletExportObj.fileVersion
  )

  if (derivationScheme === undefined) {
    throw new Error(`Invalid file version: ${walletExportObj.fileVersion}`)
  }

  const walletSecretDef = {
    rootSecret: decodeCbor(Buffer.from(b64WalletSecret, 'base64')),
    derivationScheme,
  }

  return {
    passwordHash,
    walletSecretDef,
  }
}

async function isWalletExportEncrypted(walletExportObj) {
  const {passwordHash} = parseWalletExportObj(walletExportObj)

  const isPasswordVerified = await verifyPassword('', passwordHash)
  return !isPasswordVerified
}

async function importWalletSecretDef(walletExportObj, password) {
  const {passwordHash, walletSecretDef} = parseWalletExportObj(walletExportObj)

  const isPasswordVerified = await verifyPassword(password, passwordHash)
  if (!isPasswordVerified) {
    throw new Error('Wrong password')
  }

  if (!password) {
    return walletSecretDef
  }

  walletSecretDef.rootSecret = decryptWalletSecret(walletSecretDef.rootSecret, password)

  return walletSecretDef
}

async function exportWalletSecretDef(walletSecretDef, password, walletName) {
  const encryptedWalletSecret = encryptWalletSecret(walletSecretDef.rootSecret, password)
  const packedPasswordHash = await hashPasswordAndPack(password, getRandomSaltForPasswordHash())

  return {
    wallet: {
      accounts: [
        {
          name: 'Initial account',
          index: HARDENED_THRESHOLD,
        },
      ],
      walletSecretKey: encodeCbor(encryptedWalletSecret).toString('base64'),
      walletMeta: {
        name: walletName,
        assurance: 'normal',
        unit: 'ADA',
      },
      passwordHash: encodeCbor(Buffer.from(packedPasswordHash, 'ascii')).toString('base64'),
    },
    fileType: 'WALLETS_EXPORT',
    fileVersion: walletSecretDef.derivationScheme.keyfileVersion,
  }
}

export {importWalletSecretDef, exportWalletSecretDef, isWalletExportEncrypted}