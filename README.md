# SamWitch ERC1155 Upgradeable NFT contract

Based on OpenZeppelin V5 ERC1155 upgradeable token but optimized for the case where each token has a single owner.  
Supports the ERC1155Supply extension, adding totalSupply() and totalSupply(id). Does not support diamond storage.

```shell
yarn install

# To compile the contracts
yarn compile

# To run the tests
yarn test

# To get code coverage
yarn coverage
```
