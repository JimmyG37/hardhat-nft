const { ethers, network, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic Nft Unit Tests", () => {
          let basicNft, deployer

          before(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["basicnft"])
              basicNft = await ethers.getContract("BasicNft")
          })

          it("Allows users to mint an NFT and updates counter", async () => {
              const txResponse = await basicNft.mintNft()
              await txResponse.wait(1)
              const tokenURI = await basicNft.tokenURI(0)
              const tokenCounter = await basicNft.getTokenCounter()
              assert.equal(tokenCounter.toString(), "1")
              assert.equal(tokenURI, await basicNft.TOKEN_URI())
          })
      })
