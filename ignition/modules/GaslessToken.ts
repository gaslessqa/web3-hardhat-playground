import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GaslessTokenModule", (m) => {
  const gaslessToken = m.contract("GaslessToken", [1000000n]);

  return { gaslessToken };
});
