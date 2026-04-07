import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAddress } from "viem";

import { network } from "hardhat";

const INITIAL_SUPPLY = 1000n;

describe("GaslessToken", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, alice, bob] = await viem.getWalletClients();

  // ── Deployment ───────────────────────────────────────────────

  it("[smoke] Name and symbol are correct", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);

    assert.equal(await token.read.name(), "GaslessToken");
    assert.equal(await token.read.symbol(), "GLT");
  });

  it("[smoke] Deployer receives the full initial supply", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const decimals = await token.read.decimals();
    const expectedSupply = INITIAL_SUPPLY * 10n ** BigInt(decimals);

    assert.equal(await token.read.totalSupply(), expectedSupply);
    assert.equal(await token.read.balanceOf([owner.account.address]), expectedSupply);
  });

  // ── Transfer ─────────────────────────────────────────────────

  it("[regression] transfer() emits Transfer event with correct args", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const decimals = await token.read.decimals();
    const amount = 100n * 10n ** BigInt(decimals);

    await viem.assertions.emitWithArgs(
      token.write.transfer([alice.account.address, amount]),
      token,
      "Transfer",
      [getAddress(owner.account.address), getAddress(alice.account.address), amount]
    );
  });

  it("[regression] transfer() reduces sender balance and increases receiver balance", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const decimals = await token.read.decimals();
    const amount = 100n * 10n ** BigInt(decimals);

    const ownerBefore = await token.read.balanceOf([owner.account.address]);

    await token.write.transfer([alice.account.address, amount]);

    assert.equal(await token.read.balanceOf([owner.account.address]), ownerBefore - amount);
    assert.equal(await token.read.balanceOf([alice.account.address]), amount);
  });

  it("[regression] transfer() reverts if insufficient balance", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const totalSupply = await token.read.totalSupply();

    await assert.rejects(
      token.write.transfer([alice.account.address, totalSupply + 1n]),
      (err: Error) => {
        assert.ok(err.message.includes("ERC20InsufficientBalance"), `Error inesperado: ${err.message}`);
        return true;
      }
    );
  });

  // ── Approve / TransferFrom ────────────────────────────────────

  it("[regression] approve() emits Approval event with correct args", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const decimals = await token.read.decimals();
    const amount = 50n * 10n ** BigInt(decimals);

    await viem.assertions.emitWithArgs(
      token.write.approve([alice.account.address, amount]),
      token,
      "Approval",
      [getAddress(owner.account.address), getAddress(alice.account.address), amount]
    );
  });

  it("[regression] transferFrom() moves tokens and reduces allowance", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const decimals = await token.read.decimals();
    const amount = 50n * 10n ** BigInt(decimals);

    // owner aprueba a alice
    await token.write.approve([alice.account.address, amount]);

    // alice ejecuta transferFrom en nombre del owner
    await alice.writeContract({
      address: token.address,
      abi: token.abi,
      functionName: "transferFrom",
      args: [owner.account.address, bob.account.address, amount],
    });

    assert.equal(await token.read.balanceOf([bob.account.address]), amount);
    assert.equal(await token.read.allowance([owner.account.address, alice.account.address]), 0n);
  });

  it("[regression] transferFrom() reverts without prior approval", async function () {
    const token = await viem.deployContract("GaslessToken", [INITIAL_SUPPLY]);
    const decimals = await token.read.decimals();
    const amount = 50n * 10n ** BigInt(decimals);

    const tokenAsAlice = await viem.getContractAt("GaslessToken", token.address, {
      client: alice,
    });

    await assert.rejects(
      tokenAsAlice.write.transferFrom([owner.account.address, bob.account.address, amount]),
      (err: Error) => {
        assert.ok(err.message.includes("ERC20InsufficientAllowance"), `Error inesperado: ${err.message}`);
        return true;
      }
    );
  });
});
