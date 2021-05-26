const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction;

const Token = require('./build/contracts/VonToken.json');
const MasterChef = require('./build/contracts/MasterChef.json');
const SmartChef = require('./build/contracts/SmartChef.json');
const ModComp = require('./build/contracts/ModComp.json');
// const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json');

const config = require('./config-deploy.json');
require('dotenv').config();

  const DEVADDRESS = "0x4d246458828978FF2F4288DA07d08B3DCBbbE0Fa";
  const FEEADDRESS = "0x4d23A39DA45943adFfc6Ec6d64226C39610Ca295";

// Export flat:
// npx truffle-flattener contracts/ModComp.sol > ModComp.sol

const mainAccount = {
    address: process.env.addressTest,
    privateKey: process.env.privateKeyTest,
    web3: new Web3(new Web3.providers.HttpProvider(`https://data-seed-prebsc-1-s1.binance.org:8545/`)),
    SALTaddress: "0xeE3644982e0725043f0eD7fAFC6Ed1F469c6802f"
} // same as testnet

const testAccount = {
    address: process.env.addressTest,
    privateKey: process.env.privateKeyTest,
    web3: new Web3(new Web3.providers.HttpProvider(`https://data-seed-prebsc-1-s1.binance.org:8545/`)),
    SALTaddress: "0xeE3644982e0725043f0eD7fAFC6Ed1F469c6802f"
}

// Setup web3
const INFURA_API_KEY = config.infuraApiKey;
const NETWORK_ID = config.networkId;

const web3 = mainAccount.web3

const TokenContract = new web3.eth.Contract(Token.abi);
const MasterChefContract = new web3.eth.Contract(MasterChef.abi);
const SmartChefContract = new web3.eth.Contract(SmartChef.abi);
const ModCompContract = new web3.eth.Contract(ModComp.abi);
// const ERC20 = new web3.eth.Contract(IERC20.abi);

setup();

async function setup() {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(mainAccount.address);
    console.log(nonce);
    let balance = await web3.eth.getBalance(mainAccount.address);
    console.log(balance);

    //deployTokenContract(accountData, nonce);
    deployMasterChef("0xeE3644982e0725043f0eD7fAFC6Ed1F469c6802f", account, nonce++);
}

async function deployTokenContract(account, nonce) {

    const gasPriceWei = await web3.eth.getGasPrice();

    TokenContract.deploy({
        data: Token.bytecode,
    })
        .send({
            nonce: Web.utils.toHex(nonce++),
            from: account.address,
            gas: 2000000,
            gasPrice: gasPriceWei,
        })
        .then((newContractInstance) => {
            console.log(`Token contract deployed at ${newContractInstance.options.address}`);
            // setUniswapPool(newContractInstance.options.address, account, ++nonce);
            // unpause(newContractInstance.options.address, account, ++nonce);
            deployMasterChef(newContractInstance.options.address, account, nonce);
        });
}

async function deployMasterChef(tokenContractAddress, account, nonce) {
    //const web3 = account.web3
    const accountData = account;
    const saltPerBlock = web3.utils.toWei('1000', 'ether');
    //const saltPerBlock = 1000 * 10 ** 18;
    const startBlock = 9184374;

    MasterChefContract.deploy({
        data: MasterChef.bytecode,
        arguments: [tokenContractAddress, DEVADDRESS, FEEADDRESS, saltPerBlock, startBlock]
    })
        .send({
            nonce: Web3.utils.toHex(nonce++),
            from: accountData.address,
            gas: Web3.utils.toHex(config.gasLimit),
            gasPrice: Web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`MasterChef contract deployed at ${newContractInstance.options.address}`);

            // SALT 4x 0% deposit fee
            add(newContractInstance.options.address, 4000, tokenContractAddress, 0, true, account, nonce++);

            // unpause(newContractInstance.options.address, account, ++nonce);
            // deployCrowdsaleContract(newContractInstance.options.address, account, nonce++);
        });
}

async function add(masterChefAddress, allocPoint, lpTokenAddress, depositFee, withUpdate, account, nonce) {
    const web3 = mainAccount.web3;
    // function add(uint256 _allocPoint, IBEP20 _lpToken, uint16 _depositFeeBP, bool _withUpdate) public onlyOwner {
    const txOptions = {
        nonce: Web3.utils.toHex(nonce),
        from: account.address,
        to: masterChefAddress,
        gas: Web3.utils.toHex(config.gasLimit),
        gasPrice: Web3.utils.toHex(config.gasPrice),
        data: MasterChefContract.methods.add(allocPoint, lpTokenAddress, depositFee, withUpdate).encodeABI()
    }
    const signed = await web3.eth.accounts.signTransaction(txOptions, account.privateKey);
    web3.eth.sendSignedTransaction(signed.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
        });
}

  setupSmartChef()

async function setupSmartChef() {
    const accountData = mainAccount
    const web3 = mainAccount.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    const SALTaddress = "0x2849b1aE7E04A3D9Bc288673A92477CF63F28aF4" // SALT
    const rewardToken = "0xa8c514d991f59bab02d32b68f04204cb89261c88" // SAFEP (Change this)
    const decimals = 8 // (Change this)
    const daysToRun = Web3.utils.toBN(60)
    const tokens = Web3.utils.toBN(10000000)
    const rewardAmount = tokens.mul(Web3.utils.toBN(10**decimals))
    const rewardPerBlock = rewardAmount.div(daysToRun).div(Web3.utils.toBN(28800))
    const startBlock = 6706800 // (Change this)
    const endBlock = startBlock + Math.floor(rewardAmount / rewardPerBlock)
    const burnMultiplier = 1 // = 1.0% (Change this)
    
    console.log("startblock:", startBlock)
    console.log("endBlock:", endBlock)
    console.log("rewardAmount", rewardAmount.toString())
    console.log("rewardPerBlock", rewardPerBlock.toString())
    console.log("burnMultiplier:", burnMultiplier/10)

    deploySmartChef(SALTaddress, rewardToken, rewardAmount.toString(), rewardPerBlock.toString(), account, nonce, startBlock, burnMultiplier, endBlock);

    // deploy a new SALT Token
    /* TokenContract.deploy({
        data: Token.bytecode,
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: mainAccount.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((saltContractAddress) => {
            console.log(`Token contract deployed at ${saltContractAddress.options.address}`);
            deploySmartChef(saltContractAddress.options.address, rewardToken, rewardAmount, rewardPerBlock, account, nonce);
        }); */
}

async function deploySmartChef(tokenContractAddress, rewardTokenAddress, rewardAmount, rewardPerBlock, account, nonce, startBlock, burnMultiplier, endBlock) {

    // deploy SmartChef
    SmartChefContract.deploy({
        data: SmartChef.bytecode,
        arguments: [tokenContractAddress, rewardTokenAddress, rewardPerBlock, startBlock, endBlock, burnMultiplier]
    })
       .send({
            nonce: Web3.utils.toHex(nonce++),
            from: account.address,
            gas: Web3.utils.toHex(config.gasLimit),
            gasPrice: Web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`SmartChef contract deployed at ${newContractInstance.options.address}`);
            // now we need to deposit rewardTokenAddress
            //sendRewardTokenToSmartChef(newContractInstance.options.address, rewardTokenAddress, rewardAmount)
        });
}

async function sendRewardTokenToSmartChef(smartChef, rewardToken, amountToSend) {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = Web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    // send to smartchef the reward token
    const txOptions2 = {
        nonce: web3.utils.toHex(nonce),
        from: accountData.address,
        to: rewardToken,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: TokenContract.methods.transfer(smartChef, amountToSend).encodeABI()
    }
    const signed2 = await web3.eth.accounts.signTransaction(txOptions2, account.privateKey);
    web3.eth.sendSignedTransaction(signed2.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('reward token sent to SmartChef: ', amountToSend);
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
        });
}

 // startSmartFarming()

async function startSmartFarming() {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    const SALTaddress = "0x569FCb5d25C126F9b68405fFbB20D069768f0780"
    const smartChef = "0xd53186ADd1fc44cB57D13A7482a53eDDf7e48970"

    const approvedAmount = Web3.utils.toWei('100000', 'ether');
    // Approve smartchef to get SALT
    const txOptions = {
        nonce: web3.utils.toHex(nonce),
        from: mainAccount.address,
        to: SALTaddress,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: TokenContract.methods.approve(smartChef, approvedAmount).encodeABI()
    }
    const signed = await web3.eth.accounts.signTransaction(txOptions, account.privateKey);
    web3.eth.sendSignedTransaction(signed.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
            depositSaltToSmartChef(smartChef)
        });
}

async function depositSaltToSmartChef(smartChef) {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    // deposit SALT to smartchef
    const SALTtoSend = web3.utils.toWei('0.1', 'ether');
    const txOptions2 = {
        nonce: web3.utils.toHex(nonce),
        from: mainAccount.address,
        to: smartChef,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: SmartChefContract.methods.deposit(SALTtoSend).encodeABI()
    }
    const signed2 = await web3.eth.accounts.signTransaction(txOptions2, account.privateKey);
    web3.eth.sendSignedTransaction(signed2.rawTransaction)
        .on('error', function (err) {
            console.log('error', err);
        })
        .on('transactionHash', function (transactionHash) {
            console.log('transactionHash', transactionHash);
        })
        .on('receipt', function (receipt) {
            var transactionHash = receipt.transactionHash;
            console.log('receipt', receipt);
        });

}


 //  setupModSalary()

 async function setupModSalary() {
    const accountData = mainAccount
    const web3 = accountData.web3
    const privateKey = accountData.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:", nonce);

    const SALTaddress = testAccount.SALTaddress // testnet

    deployModSalary(SALTaddress, account, nonce);
}

async function deployModSalary(paymentTokenAddress, account, nonce) {
    // deploy ModSalary
    ModCompContract.deploy({
        data: ModComp.bytecode,
        arguments: [paymentTokenAddress]
    })
        .send({
            nonce: web3.utils.toHex(nonce++),
            from: account.address,
            gas: web3.utils.toHex(config.gasLimit),
            gasPrice: web3.utils.toHex(config.gasPrice),
        })
        .then((newContractInstance) => {
            console.log(`ModComp contract deployed at ${newContractInstance.options.address}`);
        });
}