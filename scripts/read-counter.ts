import { network } from "hardhat";

const CONTRACT_ADDRESS = "0x64C9788c7Ca9385cC32313333347E1D04e46E86D";

const { viem } = await network.connect({
  network: "sepolia",
  chainType: "l1",
});

const publicClient = await viem.getPublicClient();

const x = await publicClient.readContract({
  address: CONTRACT_ADDRESS,
  abi: [
    {
      name: "x",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
  ],
  functionName: "x",
});

console.log("Valor de x en el contrato:", x.toString());
