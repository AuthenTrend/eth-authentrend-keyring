eth-authentrend-keyring [![CircleCI](https://circleci.com/gh/MetaMask/eth-authentrend-keyring.svg?style=svg)](https://circleci.com/gh/MetaMask/eth-authentrend-keyring)
==================

An implementation of MetaMask's [Keyring interface](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol), that uses a AuthenTrend AT.Wallet hardware wallet for all cryptographic operations.

In most regards, it works in the same way as
[eth-hd-keyring](https://github.com/MetaMask/eth-hd-keyring), but using a AuthenTrend AT.Wallet
device. However there are a number of differences:

- Because the keys are stored in the device, operations that rely on the device
  will fail if there is no AuthenTrend AT.Wallet device attached, or a different AuthenTrend AT.Wallet device
  is attached.

- It does not support the `signMessage`, `signPersonalMessage`, `signTypedData` or `exportAccount`
  methods, because AuthenTrend AT.Wallet devices do not support these operations.

- Because extensions have limited access to browser features, there's no easy way to interact wth the AuthenTrend Hardware wallet from the MetaMask extension. This library implements a workaround to those restrictions by injecting (on demand) an iframe to the background page of the extension, (which is hosted [here](https://metamask.github.io/eth-authentrend-keyring/index.html).

Usage
-----

In addition to all the known methods from the [Keyring class protocol](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol),
there are a few others:


- **isUnlocked** : Returns true if we have the public key in memory, which allows to generate the list of accounts at any time

- **unlock** : Connects to the AuthenTrend AT.Wallet device and exports the extended public key, which is later used to read the available ethereum addresses inside the AuthenTrend AT.Wallet account.

- **setAccountToUnlock** : the index of the account that you want to unlock in order to use with the signTransaction and signPersonalMessage methods

- **getFirstPage** : returns the first ordered set of accounts from the AuthenTrend AT.Wallet account

- **getNextPage** : returns the next ordered set of accounts from the AuthenTrend AT.Wallet account based on the current page

- **getPreviousPage** : returns the previous ordered set of accounts from the AuthenTrend AT.Wallet account based on the current page

- **forgetDevice** : removes all the device info from memory so the next interaction with the keyring will prompt the user to connect the AuthenTrend AT.Wallet device and export the account information

Testing
-------
Run the following command:

```
npm test
```



Attributions
-------
This code was inspired by [eth-ledger-keyring](https://github.com/jamespic/eth-ledger-keyring) and [eth-hd-keyring](https://github.com/MetaMask/eth-hd-keyring)
