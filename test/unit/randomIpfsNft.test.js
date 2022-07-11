const { assert, expect } = require("chai")
const { ethers, network, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft unit tests", () => {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock, user1

          before(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user1 = accounts[1]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          describe("constructor", () => {
              it("sets starting values correctly", async () => {
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0)
                  assert(dogTokenUriZero.includes("ipfs://"))
              })
          })

          describe("requestNft", () => {
              it("fails if payment isn't sent with the request", async () => {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith("NeedMoreETHSent")
              })
              it("tracks request id to sender", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  const requestNftResponse = await randomIpfsNft.requestNft({
                      value: fee.toString(),
                  })
                  const requestNftReceipt = await requestNftResponse.wait(1)
                  const requestId = requestNftReceipt.events[1].args.requestId
                  assert(await randomIpfsNft.s_requestIdToSender(requestId), deployer.address)
              })
              it("emits an event and kicks off a random word request", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(randomIpfsNft.requestNft({ value: fee.toString() })).to.emit(
                      randomIpfsNft,
                      "NftRequested"
                  )
              })
          })

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                      resolve()
                  })
              })
          })

          describe("withdraw", () => {
              it("revert when someone other than the owner tries to withdraw", async () => {
                  const notOwner = randomIpfsNft.connect(user1)
                  await expect(notOwner.withdraw()).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("Owner should be able to withdraw", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  const notOwner = randomIpfsNft.connect(user1)
                  const startingDeployerBalance = await randomIpfsNft.provider.getBalance(
                      deployer.address
                  )
                  await notOwner.requestNft({ value: fee })
                  const startingRandomIpfsNftBalance = await randomIpfsNft.provider.getBalance(
                      randomIpfsNft.address
                  )
                  const txResponse = await randomIpfsNft.withdraw()
                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingRandomIpfsNftBalance = await randomIpfsNft.provider.getBalance(
                      randomIpfsNft.address
                  )
                  const endingDeployerBalance = await randomIpfsNft.provider.getBalance(
                      deployer.address
                  )
                  assert.equal(endingRandomIpfsNftBalance, 0)
                  assert.equal(
                      startingRandomIpfsNftBalance.add(startingDeployerBalance).toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
          })
      })
