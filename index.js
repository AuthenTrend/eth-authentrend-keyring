const EventEmitter = require('events').EventEmitter
const Transaction = require('ethereumjs-tx')
const HDKey = require('hdkey')
const HttpStatus = require('http-status-codes')
const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')

const hdPathString = `m/44'/60'/0'/0/0`
const type = 'AuthenTrend Hardware'
const BRIDGE_URL = 'ws://localhost:8787/bridge'
const MAX_INDEX = 10
const NETWORK_API_URLS = {
  ropsten: 'http://api-ropsten.etherscan.io',
  kovan: 'http://api-kovan.etherscan.io',
  rinkeby: 'https://api-rinkeby.etherscan.io',
  mainnet: 'https://api.etherscan.io',
}

class AuthentrendKeyring extends EventEmitter {

  /* PUBLIC METHODS */

  constructor (opts = {}) {
    super()
    this.type = type
    this.accounts = []
    this.hdk = null
    this.page = 0
    this.perPage = 5
    this.unlockedAccount = 0
    this.paths = {}
    this.network = 'mainnet'
    this.deserialize(opts)
  }

  serialize () {
    return Promise.resolve({
      hdPath: this.hdPath,
      accounts: this.accounts,
      page: this.page,
      perPage: this.perPage,
      unlockedAccount: this.unlockedAccount,
    })
  }

  deserialize (opts = {}) {
    this.hdPath = opts.hdPath || hdPathString
    this.accounts = opts.accounts || []
    this.page = opts.page || 0
    this.perPage = opts.perPage || 5
    this.unlockedAccount = opts.unlockedAccount || 0
    return Promise.resolve()
  }

  isUnlocked () {
    return !!(this.hdk && this.hdk.publicKey)
  }

  unlock (hdPath) {
    if (this.isUnlocked() && !hdPath) return Promise.resolve('already unlocked')
    const path = hdPath ? hdPath : this.hdPath
    const pathComponents = path.split("/")
    if (pathComponents.length < 6) return Promise.reject('Wrong path')
    const accountPath = `m/${pathComponents[1]}/${pathComponents[2]}/${pathComponents[3]}`
    const keyPath = `m/${pathComponents[4]}/${pathComponents[5]}`
    return new Promise((resolve, reject) => {
      this._connectTo(BRIDGE_URL)
      .then(ws => {
        this._getExtendedPublicKey(ws, accountPath).then(hdkey => {
          ws.close()
          this.hdk = hdkey
          const dkey = this.hdk.derive(keyPath)
          const address = ethUtil.publicToAddress(dkey.publicKey, true).toString('hex')
          resolve(ethUtil.toChecksumAddress(address))
        }).catch(e => {
          ws.close()
          reject(e)
        })
      })
      .catch(e => {
        const msg = 'Please login your AT.Wallet Card via AT.Wallet App.' // TODO: localized string
        alert(msg)
        reject(msg)
      })
    })
  }

  setAccountToUnlock (index) {
    this.unlockedAccount = parseInt(index, 10)
  }

  setHdPath (hdPath) {
    // Reset HDKey if the path changes
    if (this.hdPath !== hdPath) {
      this.hdk = new HDKey()
    }
    this.hdPath = hdPath
  }

  addAccounts (n = 1) {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async _ => {
          const ws = await this._connectTo(BRIDGE_URL)
          const from = this.unlockedAccount
          const to = from + n
          for (let i = from; i < to; i++) {
            const path = this._getPathForIndex(i)
            const address = await this.unlock(path)
            if (this.accounts.map(a => a.toLowerCase()).includes(address.toLowerCase())) {
              continue
            }
            const pathComponents = path.split("/")
            const accountPath = `m/${pathComponents[1]}/${pathComponents[2]}/${pathComponents[3]}`
            const successful = await this._addAccount(ws, accountPath).catch(e => {
              // do nothing
            })
            if (successful == true) {
              this.accounts.push(address)
            }
            else {
              break
            }
          }
          this.page = 0
          ws.close()
          resolve(this.accounts)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  getFirstPage () {
    this.page = 0
    return this.__getPage(1)
  }

  getNextPage () {
    return this.__getPage(1)
  }

  getPreviousPage () {
    return this.__getPage(-1)
  }

  getAccounts () {
    return Promise.resolve(this.accounts.slice())
  }

  removeAccount (address) {
    if (!this.accounts.map(a => a.toLowerCase()).includes(address.toLowerCase())) {
      throw new Error(`Address ${address} not found in this keyring`)
    }
    this.accounts = this.accounts.filter(a => a.toLowerCase() !== address.toLowerCase())
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async _ => {
          const ws = await this._connectTo(BRIDGE_URL)
          await this._removeAccount(ws, address).catch(e => {
            // do nothing
          })
          ws.close()
          resolve()
        })
        .catch(e => {
          resolve()
        })
    })
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction (address, tx) {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async _ => {
          const ws = await this._connectTo(BRIDGE_URL)
          const signedTx = await this._signTransaction(ws, address, tx).catch(e => {
            ws.close()
            reject(e)
          })
          ws.close()
          if (signedTx.verifySignature()) {
            resolve(signedTx)
          } else {
            reject('The transaction signature is not valid')
          }
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  signMessage (address, data) {
    throw new Error('Not supported on this device')
    /*
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async _ => {
          const ws = await this._connectTo(BRIDGE_URL)
          const signature = await this._signHash(ws, address, data).catch(e => {
            ws.close()
            reject(e)
          })
          ws.close()
          const addressSignedWith = sigUtil.recoverPersonalSignature({data: message, sig: signature})
          if (ethUtil.toChecksumAddress(addressSignedWith) !== ethUtil.toChecksumAddress(address)) {
            reject('The signature doesnt match the right address')
          }
          resolve(signature)
        })
        .catch(e => {
          reject(e)
        })
    })
    */
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage (address, message) {
    throw new Error('Not supported on this device')
    /*
    const msgBuffer = ethUtil.toBuffer(msgHex)
    const msgHash = ethUtil.hashPersonalMessage(msgBuffer)
    return signMessage(address, msgHash)
    */
  }

  signTypedData (address, typedData) {
    throw new Error('Not supported on this device')
  }

  exportAccount (address) {
    throw new Error('Not supported on this device')
  }

  forgetDevice () {
    this.accounts = []
    this.hdk = null
    this.page = 0
    this.unlockedAccount = 0
    this.paths = {}
  }

  /* PRIVATE METHODS */

  _normalize (buf) {
    return ethUtil.bufferToHex(buf).toString()
  }

  __getPage (increment) {
    this.page += increment

    if (this.page <= 0) { this.page = 1 }
    const from = (this.page - 1) * this.perPage
    const to = ((from + this.perPage) > MAX_INDEX) ? MAX_INDEX : (from + this.perPage)

    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async _ => {
          const accounts = []
          for (let i = from; i < to; i++) {
            const path = this._getPathForIndex(i)
            const address = await this.unlock(path)
            const valid = await this._hasPreviousTransactions(address)
            accounts.push({
              address: address,
              balance: null,
              index: i,
            })
            // PER BIP44
            // "Software should prevent a creation of an account if
            // a previous account does not have a transaction history
            // (meaning none of its addresses have been used before)."
            if (!valid) {
              break
            }
          }
          resolve(accounts)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  _getPathForIndex (index) {
    return `m/44'/60'/${index}'/0/0`
  }

  async _hasPreviousTransactions (address) {
    const apiUrl = this._getApiUrl()
    const response = await fetch(`${apiUrl}/api?module=account&action=txlist&address=${address}&tag=latest&page=1&offset=1`)
    const parsedResponse = await response.json()
    if (parsedResponse.status !== '0' && parsedResponse.result.length > 0) {
      return true
    }
    return false
  }

  _getApiUrl () {
    return NETWORK_API_URLS[this.network] ? NETWORK_API_URLS[this.network] : NETWORK_API_URLS['mainnet']
  }

  _connectTo (url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      ws.onopen = function (event) {
        ws.onopen = null
        resolve(ws)
      }
      ws.onerror = function (event) {
        ws.onerror = null
        const msg = 'Please login your AT.Wallet Card via AT.Wallet App.' // TODO: localized string
        reject(msg)
      }
    })
  }

  _getExtendedPublicKey(ws, path) {
    let request = {
      requester: "MetaMask",
      cmd: "GetExtendedPublicKey",
      parameters: {
        path: path
      }
    }
    let jsonString = JSON.stringify(request)
    return new Promise((resolve, reject) => {
      ws.onmessage = function (event) {
        ws.onmessage = null
        var obj = JSON.parse(event.data)
        if (!(obj.status && obj.results && obj.results.parkeyFp && obj.results.chainCode && obj.results.pubkey)) {
          reject('Unknown error')
        }
        if (obj.status != HttpStatus.OK) {
          reject(HttpStatus.getStatusText(obj.status))
        }
        let hdkey = new HDKey()
        hdkey.publicKey = new Buffer(obj.results.pubkey, 'hex')
        hdkey.chainCode = new Buffer(obj.results.chainCode, 'hex')
        resolve(hdkey)
      }
      ws.onerror = function (event) {
        ws.onerror = null
        reject(event)
      }
      ws.send(jsonString)
    })
  }

  _addAccount(ws, path) {
    let request = {
      requester: "MetaMask",
      cmd: "AddAccount",
      parameters: {
        path: path
      }
    }
    let jsonString = JSON.stringify(request)
    return new Promise((resolve, reject) => {
      ws.onmessage = function (event) {
        ws.onmessage = null
        var obj = JSON.parse(event.data)
        if (!obj.status) {
          reject('Unknown error')
        }
        if (obj.status != HttpStatus.OK) {
          reject(HttpStatus.getStatusText(obj.status))
        }
        resolve(true)
      }
      ws.onerror = function (event) {
        ws.onerror = null
        reject(event)
      }
      ws.send(jsonString)
    })
  }

  _removeAccount(ws, address) {
    let request = {
      requester: "MetaMask",
      cmd: "RemoveAccount",
      parameters: {
        address: address
      }
    }
    let jsonString = JSON.stringify(request)
    return new Promise((resolve, reject) => {
      ws.onmessage = function (event) {
        ws.onmessage = null
        var obj = JSON.parse(event.data)
        if (!obj.status) {
          reject('Unknown error')
        }
        if (obj.status != HttpStatus.OK) {
          reject(HttpStatus.getStatusText(obj.status))
        }
        resolve(ture)
      }
      ws.onerror = function (event) {
        ws.onerror = null
        reject(event)
      }
      ws.send(jsonString)
    })
  }

  _signTransaction(ws, address, tx) {
    let request = {
      requester: "MetaMask",
      cmd: "SignTransaction",
      parameters: {
        address: address,
        transaction: {
          to: this._normalize(tx.to),
          value: this._normalize(tx.value),
          data: this._normalize(tx.data),
          chainId: tx._chainId,
          nonce: this._normalize(tx.nonce),
          gasLimit: this._normalize(tx.gasLimit),
          gasPrice: this._normalize(tx.gasPrice),
        }
      }
    }
    let jsonString = JSON.stringify(request)
    return new Promise((resolve, reject) => {
      ws.onmessage = function (event) {
        ws.onmessage = null
        var obj = JSON.parse(event.data)
        if (!(obj.status && obj.results && obj.results.v && obj.results.r && obj.results.s)) {
          reject('Unknown error')
        }
        if (obj.status != HttpStatus.OK) {
          reject(HttpStatus.getStatusText(obj.status))
        }
        tx.v = Buffer.from(obj.results.v, 'hex')
        tx.r = Buffer.from(obj.results.r, 'hex')
        tx.s = Buffer.from(obj.results.s, 'hex')
        resolve(tx)
      }
      ws.onerror = function (event) {
        ws.onerror = null
        reject(event)
      }
      ws.send(jsonString)
    })
  }

  _signHash(ws, address, hash, description = '') {
    let request = {
      requester: "MetaMask",
      cmd: "SignHash",
      parameters: {
        address: address,
        hash: hash,
        description: description
      }
    }
    let jsonString = JSON.stringify(request)
    return new Promise((resolve, reject) => {
      ws.onmessage = function (event) {
        ws.onmessage = null
        var obj = JSON.parse(event.data)
        if (!(obj.status && obj.results && obj.results.signature)) {
          reject('Unknown error')
        }
        if (obj.status != HttpStatus.OK) {
          reject(HttpStatus.getStatusText(obj.status))
        }
        let signature = obj.results.signature
        if (!signature.startsWith('0x')) signature = `0x${signature}`
        resolve(signature)
      }
      ws.onerror = function (event) {
        ws.onerror = null
        reject(event)
      }
      ws.send(jsonString)
    })
  }

}

AuthentrendKeyring.type = type
module.exports = AuthentrendKeyring
