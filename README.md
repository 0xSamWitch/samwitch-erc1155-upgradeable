# SamWitch ERC1155 Upgradeable NFT contract

![swerc1155](https://github.com/0xSamWitch/samwitch-erc1155-upgradeable/assets/84033732/141d9f9c-01f9-4f73-b551-569ec1f47b29)

This ERC1155 contract is optimized for the case where each token has a single owner, like ERC721.  

It is based on OpenZeppelin V5 ERC1155 upgradeable token, supports the ERC1155Supply extension (adding totalSupply() and totalSupply(id)).
It has a different storage layout, so is not a drop-in replaceplacement if have already deployed a contract, it also does not have namespaced storage intentionally to allow further packing in derived contracts.  

For even more optimizations override `ownerOf` & `_updateOwner` if you are able to pack the owner inside your own structs efficiently.  
Although it uses a version based on OpenZeppelin V4, Estfor Kingdom is using this for the PetNFT for example:  
```js
  struct Pet {
    uint40 lastAssignmentTimestamp;
    address owner; // Will be used as an optimzation to avoid having to look up the owner of the pet in another storage slot in base class
  }

  function ownerOf(uint _tokenId) public view override returns (address) {
    return pets[_tokenId].owner;
  }

  function _updateOwner(uint256 _id, address _to) internal override {
    bool isBurnt = _to == address(0) || _to == 0x000000000000000000000000000000000000dEaD;
    if (isBurnt) {
      delete pets[_id];
    } else {
      pets[_id].owner = _to;
      pets[_id].lastAssignmentTimestamp = uint40(block.timestamp);
    }
  }
```

To compile and run tests:  

```shell
yarn install

# To compile the contracts
yarn compile

# To run the tests
yarn test
```
