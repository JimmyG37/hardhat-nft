const { network } = require("hardhat")
const { DECIMALS, INITIAL_PRICE, developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = "250000000000000000"
const GAS_PRICE_LINK = 1e9

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const args = [BASE_FEE, GAS_PRICE_LINK]
    // We need to deploy mocks if we're on a local development network
    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_PRICE],
        })
        log("Mocks Deployed!")
        log("-----------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks", "main"]
