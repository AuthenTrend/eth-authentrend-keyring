global.document = require('./document.shim')
global.window = require('./window.shim')
const chai = require('chai')
const spies = require('chai-spies')
const {expect} = chai
const EthereumTx = require('ethereumjs-tx')
const assert = require('assert')
const HDKey = require('hdkey')

const AuthentrendKeyring = require('../')

// matter pistol degree pottery gas insect room judge shove flip fame smile vital museum pool anchor combine cushion coral card run puzzle slender chef
const fakeAccounts = [
    '0xB88Bc94EF54F512A8A861202850c1BFe70899df2',
    '0x1cD1B8b502bC095f9163D8CA50Ef043b2a3Ac7DD',
    '0x73b610EaBf7B0E2b87B65020187928FDbA5509ea',
    '0x800F2598F850C0E23cBAcBA90FfE02B0ebDD8243',
    '0x425414eb5f8110370Bfd4F29DDc3AA96A55AeD15',
    '0xf21A474A2c0368C58449Ce74CA20DAAb3fc1f11E',
    '0x7d3F3Fc1A26AA7FAD56af7A78DC9FBD9Cc61A313',
    '0x3948b4cbC6F741B1379ee36ba0aBfb441fADDe8d',
    '0x7b8Eb9AC5067D167084852387938D4238B1Ec551',
    '0xF8A6f1Db42000c869c11BF453c05ce078D9FA5f4',
    '0xe8aB388a836526D680210b15F948bbb466Aa6c72',
    '0xe060bc857D9C4342AfF0C055AbAdD10f1DEa5fc9',
    '0x23D479411e052932AA966af9706743d249da507a',
    '0x7525d6e5Fec7F115f33A73a70B4cd6AdCd7C77Eb',
    '0x7Ff3F9991C8Ac7BE1B149BB30fb359123bFB9D5e',
]

const fakeXPubKey = 'xpub6C8cpJ5LS2zhDAnpub6bPzhK55pjUHbJTgchB9RV437Reue5K89EGaxwWcjjZhCw7L27ZYb6v4dr97TmLJzmJNPC6FxWzqzNg31DbmQTk1j'
const fakeHdKey = HDKey.fromExtendedKey(fakeXPubKey)
const fakeTx = new EthereumTx({
    nonce: '0x00',
    gasPrice: '0x09184e72a000',
    gasLimit: '0x2710',
    to: '0x0000000000000000000000000000000000000000',
    value: '0x00',
    data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
    // EIP 155 chainId - mainnet: 1, ropsten: 3
    chainId: 1,
})

chai.use(spies)

describe('AuthentrendKeyring', function () {

    let keyring

    beforeEach(() => {
        keyring = new AuthentrendKeyring()
        keyring.hdk = fakeHdKey
    })

    describe('Keyring.type', function () {
        it('is a class property that returns the type string.', function () {
            const type = AuthentrendKeyring.type
            assert.equal(typeof type, 'string')
        })

        it('returns the correct value', function () {
            const type = keyring.type
            const correct = AuthentrendKeyring.type
            assert.equal(type, correct)
        })
    })

    describe('constructor', function () {
        it('constructs', function (done) {
            const t = new AuthentrendKeyring({hdPath: `m/44'/60'/0'/0/0`})
            assert.equal(typeof t, 'object')
            t.getAccounts()
            .then(accounts => {
                assert.equal(Array.isArray(accounts), true)
                done()
            })
        })
    })

    describe('serialize', function () {
        it('serializes an instance', function (done) {
            keyring.serialize()
            .then((output) => {
              assert.equal(output.hdPath, `m/44'/60'/0'/0/0`)
              assert.equal(Array.isArray(output.accounts), true)
              assert.equal(output.accounts.length, 0)
              done()
            })
          })
    })

    describe('deserialize', function () {
        it('serializes what it deserializes', function (done) {

            const someHdPath = `m/44'/60'/1'/0/0`

            keyring.deserialize({
                page: 10,
                hdPath: someHdPath,
                accounts: [],
            })
            .then(() => {
                return keyring.serialize()
            }).then((serialized) => {
                assert.equal(serialized.accounts.length, 0, 'restores 0 accounts')
                assert.equal(serialized.hdPath, someHdPath, 'restores hdPath')
                done()
            })
        })
    })


    describe('isUnlocked', function () {
        it('should return true if we have a public key', function () {
            assert.equal(keyring.isUnlocked(), true)
        })
    })

    describe('unlock', function () {
        it('should resolve if we have a public key', function (done) {
            keyring.unlock().then(_ => {
                done()
            })
        })
    })

    describe('setHdPath', function () {
        it('should set the hdPath', function (done) {
            const someHDPath = `m/44'/60'/2'/0/0`
            keyring.setHdPath(someHDPath)
            assert.equal(keyring.hdPath, someHDPath)
            done()
        })

        it('should reset the HDKey if the path changes', function (done) {
            const someHDPath = `m/44'/60'/3'/0/0`
            keyring.setHdPath(someHDPath)
            assert.equal(keyring.hdk.publicKey, null)
            done()
        })
    })

    describe('setAccountToUnlock', function () {
        it('should set unlockedAccount', function () {
            keyring.setAccountToUnlock(4)
            assert.equal(keyring.unlockedAccount, 4)
        })
    })

    describe('addAccounts', function () {
        describe('with no arguments', function () {
            it('returns a single account', function (done) {
                keyring.setAccountToUnlock(0)
                keyring.addAccounts()
                .then((accounts) => {
                    assert.equal(accounts.length, 1)
                    done()
                })
            })
        })

        describe('with a numeric argument', function () {
            it('returns that number of accounts', function (done) {
                keyring.setAccountToUnlock(0)
                keyring.addAccounts(5)
                .then((accounts) => {
                    assert.equal(accounts.length, 5)
                    done()
                })
            })

            it('returns the expected accounts', function (done) {
                keyring.setAccountToUnlock(0)
                keyring.addAccounts(3)
                .then((accounts) => {
                    assert.equal(accounts[0], fakeAccounts[0])
                    assert.equal(accounts[1], fakeAccounts[1])
                    assert.equal(accounts[2], fakeAccounts[2])
                    done()
                })
            })
        })
    })

    describe('removeAccount', function () {
        describe('if the account exists', function () {
            it('should remove that account', function (done) {
                keyring.setAccountToUnlock(0)
                keyring.addAccounts()
                .then(async (accounts) => {
                    assert.equal(accounts.length, 1)
                    keyring.removeAccount(fakeAccounts[0])
                    const accountsAfterRemoval = await keyring.getAccounts()
                    assert.equal(accountsAfterRemoval.length, 0)
                    done()
                })
            })
        })

        describe('if the account does not exist', function () {
            it('should throw an error', function () {
                const unexistingAccount = '0x0000000000000000000000000000000000000000'
                expect(_ => {
                   keyring.removeAccount(unexistingAccount)
                }).to.throw(`Address ${unexistingAccount} not found in this keyring`)
            })
        })
    })

    describe('getFirstPage', function () {
        it('should set the currentPage to 1', async function () {
            await keyring.getFirstPage()
            assert.equal(keyring.page, 1)
        })

        it('should return the list of accounts for current page', async function () {

            const accounts = await keyring.getFirstPage()

            expect(accounts.length, keyring.perPage)
            expect(accounts[0].address, fakeAccounts[0])
            expect(accounts[1].address, fakeAccounts[1])
            expect(accounts[2].address, fakeAccounts[2])
            expect(accounts[3].address, fakeAccounts[3])
            expect(accounts[4].address, fakeAccounts[4])
        })
    })

    describe('getNextPage', function () {

        it('should return the list of accounts for current page', async function () {
            const accounts = await keyring.getNextPage()
            expect(accounts.length, keyring.perPage)
            expect(accounts[0].address, fakeAccounts[0])
            expect(accounts[1].address, fakeAccounts[1])
            expect(accounts[2].address, fakeAccounts[2])
            expect(accounts[3].address, fakeAccounts[3])
            expect(accounts[4].address, fakeAccounts[4])
        })
    })

    describe('getPreviousPage', function () {

        it('should return the list of accounts for current page', async function () {
            // manually advance 1 page
            await keyring.getNextPage()
            const accounts = await keyring.getPreviousPage()

            expect(accounts.length, keyring.perPage)
            expect(accounts[0].address, fakeAccounts[0])
            expect(accounts[1].address, fakeAccounts[1])
            expect(accounts[2].address, fakeAccounts[2])
            expect(accounts[3].address, fakeAccounts[3])
            expect(accounts[4].address, fakeAccounts[4])
        })


        it('should be able to go back to the previous page', async function () {
            // manually advance 1 page
            await keyring.getNextPage()
            const accounts = await keyring.getPreviousPage()

            expect(accounts.length, keyring.perPage)
            expect(accounts[0].address, fakeAccounts[0])
            expect(accounts[1].address, fakeAccounts[1])
            expect(accounts[2].address, fakeAccounts[2])
            expect(accounts[3].address, fakeAccounts[3])
            expect(accounts[4].address, fakeAccounts[4])
        })
    })

    describe('getAccounts', async function () {
        const accountIndex = 5
        let accounts = []
        beforeEach(async function () {
            keyring.setAccountToUnlock(accountIndex)
            await keyring.addAccounts()
            accounts = await keyring.getAccounts()
        })

        it('returns an array of accounts', function () {
            assert.equal(Array.isArray(accounts), true)
            assert.equal(accounts.length, 1)
        })

        it('returns the expected', function () {
            const expectedAccount = fakeAccounts[accountIndex]
            assert.equal(accounts[0], expectedAccount)
        })
    })

    describe('signMessage', function () {
        it('should throw an error because it is not supported', function () {
            expect(_ => {
                keyring.signMessage(fakeAccounts[0], '0x123')
            }).to.throw('Not supported on this device')
        })
    })

    describe('signTypedData', function () {
        it('should throw an error because it is not supported', function () {
            expect(_ => {
                keyring.signTypedData()
            }).to.throw('Not supported on this device')
        })
    })

    describe('exportAccount', function () {
        it('should throw an error because it is not supported', function () {
            expect(_ => {
                keyring.exportAccount()
            }).to.throw('Not supported on this device')
        })
    })

    describe('forgetDevice', function () {
        it('should clear the content of the keyring', async function () {
            // Add an account
            keyring.setAccountToUnlock(0)
            await keyring.addAccounts()

            // Wipe the keyring
            keyring.forgetDevice()

            const accounts = await keyring.getAccounts()

            assert.equal(keyring.isUnlocked(), false)
            assert.equal(accounts.length, 0)
        })
    })

    describe('signTransaction', function () {
        it('should call should call create a listener waiting for the iframe response', function (done) {

            chai.spy.on(window, 'addEventListener')
            setTimeout(_ => {
                keyring.signTransaction(fakeAccounts[0], fakeTx)
                expect(window.addEventListener).to.have.been.calledWith('message')
            }, 1800)
            chai.spy.restore(window, 'addEventListener')
            done()

        })
    })

    describe('signPersonalMessage', function () {
        it('should throw an error because it is not supported', function () {
            expect(_ => {
                keyring.signPersonalMessage(fakeAccounts[0], 'some msg')
            }).to.throw('Not supported on this device')
        })
    })

})
