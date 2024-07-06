import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers, upgrades} from "hardhat";
import {TestERC1155UpgradeableSinglePerToken} from "../typechain-types";

// Test stuff like mint/burn/transfer/balanceOf/totalSupply. The rest should be covered by the normal OZ ERC1155 tests.
describe("SamWitchERC1155UpgradeableSinglePerToken", function () {
  const firstTokenId = 1n;
  const secondTokenId = 2n;
  const unknownTokenId = 3n;

  const firstAmount = 1n;
  const secondAmount = 1n;
  async function deployContracts() {
    const [owner, alice] = await ethers.getSigners();
    const ERC1155UpgradeableSinglePerToken = await ethers.getContractFactory("TestERC1155UpgradeableSinglePerToken");
    const erc1155UpgradeableSinglePerToken = (await upgrades.deployProxy(ERC1155UpgradeableSinglePerToken, [], {
      kind: "uups",
    })) as unknown as TestERC1155UpgradeableSinglePerToken;
    return {owner, alice, erc1155UpgradeableSinglePerToken};
  }

  describe("balanceOf", function () {
    it("returns zero for given addresses when accounts don't own tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, secondTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, unknownTokenId)).to.eq(0);
    });

    it("returns the amount of tokens owned by the given addresses when accounts own some tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, 1, "0x");

      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(firstAmount);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, secondTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, unknownTokenId)).to.eq(0);
    });
  });

  describe("balanceOfBatch", function () {
    it("returns zeros for each account when they own no tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      const result = await erc1155UpgradeableSinglePerToken.balanceOfBatch(
        [owner.address, alice.address, owner.address],
        [firstTokenId, secondTokenId, unknownTokenId],
      );
      expect(result).to.be.an("array");
      expect(result).to.deep.eq([0, 0, 0]);
    });

    it("when accounts own some tokens return correctly", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      await erc1155UpgradeableSinglePerToken.mint(alice.address, secondTokenId, secondAmount, "0x");

      const result = await erc1155UpgradeableSinglePerToken.balanceOfBatch(
        [alice.address, owner.address, owner.address],
        [secondTokenId, firstTokenId, unknownTokenId],
      );
      expect(result).to.be.an("array");
      expect(result).to.deep.eq([secondAmount, firstAmount, 0]);
    });

    it("returns multiple times the balance of the same address when asked", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      await erc1155UpgradeableSinglePerToken.mint(alice.address, secondTokenId, secondAmount, "0x");

      const result = await erc1155UpgradeableSinglePerToken.balanceOfBatch(
        [alice.address, alice.address, owner.address],
        [secondTokenId, secondTokenId, firstTokenId],
      );

      expect(result).to.be.an("array");
      expect(result[0]).to.eq(result[2]);
      expect(result).to.deep.eq([firstAmount, secondAmount, firstAmount]);
    });
  });

  describe("safeTransferFrom", function () {
    it("reverts when transferring more than balance", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      await expect(
        erc1155UpgradeableSinglePerToken.safeTransferFrom(
          owner.address,
          alice.address,
          firstTokenId,
          firstAmount + 1n,
          "0x",
        ),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155InsufficientBalance");
    });

    it("Transfer correct amount should work", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.safeTransferFrom(
        owner.address,
        alice.address,
        firstTokenId,
        firstAmount,
        "0x",
      );

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, firstTokenId)).to.eq(1);
      // Transfer again
      await erc1155UpgradeableSinglePerToken
        .connect(alice)
        .safeTransferFrom(alice.address, owner.address, firstTokenId, firstAmount, "0x");

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, firstTokenId)).to.eq(0);
    });
  });

  describe("safeBatchTransferFrom", function () {
    it("reverts when transferring more than balance", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mintBatch(
        owner.address,
        [firstTokenId, secondTokenId],
        [firstAmount, secondAmount],
        "0x",
      );
      await expect(
        erc1155UpgradeableSinglePerToken.safeBatchTransferFrom(
          owner.address,
          alice.address,
          [firstTokenId],
          [firstAmount + 1n],
          "0x",
        ),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155InsufficientBalance");
    });

    it("Transfer correct amount should work", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mintBatch(
        owner.address,
        [firstTokenId, secondTokenId],
        [firstAmount, secondAmount],
        "0x",
      );
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(1);
      await erc1155UpgradeableSinglePerToken.safeBatchTransferFrom(
        owner.address,
        alice.address,
        [firstTokenId, secondTokenId],
        [firstAmount, secondAmount],
        "0x",
      );
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(2);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](secondTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, firstTokenId)).to.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, secondTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, secondTokenId)).to.eq(1);

      // Transfer again
      await erc1155UpgradeableSinglePerToken
        .connect(alice)
        .safeBatchTransferFrom(
          alice.address,
          owner.address,
          [firstTokenId, secondTokenId],
          [firstAmount, secondAmount],
          "0x",
        );

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(2);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](secondTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, firstTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, secondTokenId)).to.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(alice.address, secondTokenId)).to.eq(0);
    });
  });

  describe("mint", function () {
    it("reverts when minting more than 1 at once", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await expect(
        erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount + 1n, "0x"),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155MintingMoreThanOneSameNFT");
    });

    it("reverts when minting more than 1 during separate mints", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      await expect(
        erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x"),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155MintingMoreThanOneSameNFT");
    });

    it("Minting should add to totalSupply correctly", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](secondTokenId)).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(1);

      await erc1155UpgradeableSinglePerToken.mint(owner.address, secondTokenId, secondAmount, "0x");
      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(2);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](secondTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, secondTokenId)).to.eq(1);
    });
  });

  describe("mintBatch", function () {
    it("reverts when minting more than balance", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await expect(
        erc1155UpgradeableSinglePerToken.mintBatch(
          owner.address,
          [firstTokenId, secondTokenId],
          [firstAmount, secondAmount + 1n],
          "0x",
        ),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155MintingMoreThanOneSameNFT");
    });

    it("reverts when minting more than 1 during separate mints", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mintBatch(owner.address, [firstTokenId], [firstAmount], "0x");
      await expect(
        erc1155UpgradeableSinglePerToken.mintBatch(owner.address, [firstTokenId], [firstAmount], "0x"),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155MintingMoreThanOneSameNFT");
    });

    it("Minting should add to totalSupply correctly", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mintBatch(owner.address, [firstTokenId], [firstAmount], "0x");

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](secondTokenId)).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(1);

      await erc1155UpgradeableSinglePerToken.mintBatch(owner.address, [secondTokenId], [secondAmount], "0x");
      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(2);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](secondTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, secondTokenId)).to.eq(1);
    });
  });

  describe("burn", function () {
    it("Reverts when burning more than balance", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await expect(
        erc1155UpgradeableSinglePerToken.burn(owner.address, firstTokenId, firstAmount + 1n),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155InsufficientBalance");
    });

    it("Burning should remove from totalSupply and remove balance", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.burn(owner.address, firstTokenId, firstAmount);

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, secondTokenId)).to.eq(0);
    });

    it("Burning with dead address should not remove from totalSupply and remove balance", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.safeTransferFrom(
        owner.address,
        "0x000000000000000000000000000000000000dEaD",
        firstTokenId,
        firstAmount,
        "0x",
      );

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(firstAmount);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(firstAmount);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
    });

    it("Reminting after burning should work fine", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.burn(owner.address, firstTokenId, firstAmount);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);

      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(1);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(1);
    });

    it("Approved operators can burn the holder's tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.setApprovalForAll(alice, true);
      await erc1155UpgradeableSinglePerToken.connect(alice).burn(owner, firstTokenId, firstAmount);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner, firstTokenId)).to.equal(0);
    });

    it("Unapproved accounts cannot burn the holder's tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      await expect(erc1155UpgradeableSinglePerToken.connect(alice).burn(owner, firstTokenId, firstAmount))
        .to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155MissingApprovalForAll")
        .withArgs(alice.address, owner.address);
    });
  });

  describe("burnBatch", function () {
    it("Reverts when burning more than balance", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await expect(
        erc1155UpgradeableSinglePerToken.burnBatch(owner.address, [firstTokenId], [firstAmount + 1n]),
      ).to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155InsufficientBalance");
    });

    it("Burning should remove from totalSupply and remove balance", async function () {
      const {owner, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.burnBatch(owner.address, [firstTokenId], [firstAmount]);

      expect(await erc1155UpgradeableSinglePerToken["totalSupply()"]()).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken["totalSupply(uint256)"](firstTokenId)).to.be.eq(0);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner.address, firstTokenId)).to.eq(0);
    });

    it("Approved operators can burn the holder's tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");

      await erc1155UpgradeableSinglePerToken.setApprovalForAll(alice, true);
      await erc1155UpgradeableSinglePerToken.connect(alice).burnBatch(owner, [firstTokenId], [firstAmount]);
      expect(await erc1155UpgradeableSinglePerToken.balanceOf(owner, firstTokenId)).to.equal(0);
    });

    it("Unapproved accounts cannot burn the holder's tokens", async function () {
      const {owner, alice, erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      await erc1155UpgradeableSinglePerToken.mint(owner.address, firstTokenId, firstAmount, "0x");
      await expect(erc1155UpgradeableSinglePerToken.connect(alice).burnBatch(owner, [firstTokenId], [firstAmount]))
        .to.be.revertedWithCustomError(erc1155UpgradeableSinglePerToken, "ERC1155MissingApprovalForAll")
        .withArgs(alice.address, owner.address);
    });
  });

  describe("supportsInterface", async function () {
    it("IERC165", async function () {
      const {erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      expect(await erc1155UpgradeableSinglePerToken.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("IERC1155", async function () {
      const {erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      expect(await erc1155UpgradeableSinglePerToken.supportsInterface("0xd9b67a26")).to.be.true;
    });

    it("IERC1155Metadata", async function () {
      const {erc1155UpgradeableSinglePerToken} = await loadFixture(deployContracts);
      expect(await erc1155UpgradeableSinglePerToken.supportsInterface("0x0e89341c")).to.be.true;
    });
  });
});
