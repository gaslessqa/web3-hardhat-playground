import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAddress } from "viem";

import { network } from "hardhat";

const CONTRACT_ADDRESS = "0x34096474B1b9aEccFC141439f6AD426E5B08Fa19";

describe("GaslessToken [integration] Sepolia", async function () {
  const { viem } = await network.connect({
    network: "sepolia",
    chainType: "l1",
  });

  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();
  const token = await viem.getContractAt("GaslessToken", CONTRACT_ADDRESS);

  // ── Deployment ───────────────────────────────────────────────

  it("[integration] Name and symbol are correct", async function () {
    assert.equal(await token.read.name(), "GaslessToken");
    assert.equal(await token.read.symbol(), "GLT");
  });

  it("[integration] Total supply is 1,000,000 GLT", async function () {
    const decimals = await token.read.decimals();
    const expectedSupply = 1000000n * 10n ** BigInt(decimals);
    assert.equal(await token.read.totalSupply(), expectedSupply);
  });

  // ── Balance ───────────────────────────────────────────────────

  it("[integration] Deployer wallet has a positive GLT balance", async function () {
    const balance = await token.read.balanceOf([walletClient.account.address]);
    assert.ok(balance > 0n, `Se esperaba balance > 0, got ${balance}`);
    console.log("Balance GLT:", balance.toString());
  });

  // ── Transfer ─────────────────────────────────────────────────

  it("[integration] transfer() reduces sender balance and increases receiver balance", async function () {
    const receiver = "0x000000000000000000000000000000000000dEaD";
    const amount = 1n * 10n ** 18n; // 1 GLT

    const senderBefore = await token.read.balanceOf([walletClient.account.address]);
    const receiverBefore = await token.read.balanceOf([receiver]);

    const txHash = await token.write.transfer([receiver, amount]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const senderAfter = await token.read.balanceOf([walletClient.account.address]);
    const receiverAfter = await token.read.balanceOf([receiver]);

    assert.equal(senderAfter, senderBefore - amount);
    assert.equal(receiverAfter, receiverBefore + amount);
  });

  it("[integration] Transfer event is emitted with correct args", async function () {
    const receiver = "0x000000000000000000000000000000000000dEaD";
    const amount = 1n * 10n ** 18n;
    const fromBlock = await publicClient.getBlockNumber();

    const txHash = await token.write.transfer([receiver, amount]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const toBlock = await publicClient.getBlockNumber();

    const events = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESS,
      abi: token.abi,
      eventName: "Transfer",
      fromBlock,
      toBlock,
      strict: true,
    });

    const nuestrosEventos = events.filter((e) => e.transactionHash === txHash);
    assert.equal(nuestrosEventos.length, 1, "Se esperaba exactamente 1 evento Transfer");

    const evento = nuestrosEventos[0];
    assert.equal(evento.args.from, getAddress(walletClient.account.address));
    assert.equal(evento.args.to, getAddress(receiver));
    assert.equal(evento.args.value, amount);
  });

  // ── Revert ───────────────────────────────────────────────────

  it("[integration] transfer() reverts if insufficient balance", async function () {
    const totalSupply = await token.read.totalSupply();

    await assert.rejects(
      publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: token.abi,
        functionName: "transfer",
        args: ["0x000000000000000000000000000000000000dEaD", totalSupply + 1n],
        account: walletClient.account,
      }),
      (err: Error) => {
        assert.ok(
          err.message.includes("ERC20InsufficientBalance"),
          `Error inesperado: ${err.message}`
        );
        return true;
      }
    );
  });
});
