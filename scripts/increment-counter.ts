import { network } from "hardhat";

const CONTRACT_ADDRESS = "0x64C9788c7Ca9385cC32313333347E1D04e46E86D";

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

console.log("Llamando a inc() desde:", walletClient.account.address);

const tx = await walletClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: [
    {
      name: "inc",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: [],
    },
  ],
  functionName: "inc",
});

console.log("Transacción enviada:", tx);
console.log("Esperando confirmación...");

await publicClient.waitForTransactionReceipt({ hash: tx });

console.log("Transacción confirmada!");
