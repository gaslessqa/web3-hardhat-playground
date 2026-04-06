import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

// Contrato desplegado en Sepolia — no se puede resetear, el estado persiste
const CONTRACT_ADDRESS = "0x64C9788c7Ca9385cC32313333347E1D04e46E86D";

describe("Counter [integration] Sepolia", async function () {
  const { viem } = await network.connect({
    network: "sepolia",
    chainType: "l1",
  });

  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();
  const counter = await viem.getContractAt("Counter", CONTRACT_ADDRESS);

  it("[integration] Lee el valor actual de x", async function () {
    const x = await counter.read.x();
    // No sabemos el valor exacto — el contrato es compartido y su estado cambia.
    // Solo verificamos que sea un número >= 0.
    assert.ok(typeof x === "bigint" && x >= 0n, `x debería ser un bigint >= 0, got: ${x}`);
    console.log("Valor actual de x:", x.toString());
  });

  it("[integration] inc() incrementa x en exactamente 1", async function () {
    const xAntes = await counter.read.x();

    const tx = await counter.write.inc();
    await publicClient.waitForTransactionReceipt({ hash: tx });

    const xDespues = await counter.read.x();
    assert.equal(xDespues, xAntes + 1n, `Se esperaba ${xAntes + 1n}, got ${xDespues}`);
  });

  it("[integration] incBy(N) incrementa x en exactamente N", async function () {
    const N = 5n;
    const xAntes = await counter.read.x();

    const tx = await counter.write.incBy([N]);
    await publicClient.waitForTransactionReceipt({ hash: tx });

    const xDespues = await counter.read.x();
    assert.equal(xDespues, xAntes + N, `Se esperaba ${xAntes + N}, got ${xDespues}`);
  });

  it("[integration] incBy(0) revierte con el mensaje correcto", async function () {
    // simulateContract hace una llamada de solo lectura (no gasta gas)
    // y captura el revert del contrato sin enviar ninguna transacción real
    await assert.rejects(
      publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: counter.abi,
        functionName: "incBy",
        args: [0n],
        account: walletClient.account,
      }),
      (err: Error) => {
        assert.ok(
          err.message.includes("incBy: increment should be positive"),
          `Error message inesperado: ${err.message}`
        );
        return true;
      }
    );
  });

  it("[integration] La suma de eventos Increment de nuestra wallet coincide con lo que hemos incrementado", async function () {
    const N = 3n;
    const fromBlock = await publicClient.getBlockNumber();

    const txHash = await counter.write.incBy([N]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const toBlock = await publicClient.getBlockNumber();

    const events = await publicClient.getContractEvents({
      address: CONTRACT_ADDRESS,
      abi: counter.abi,
      eventName: "Increment",
      fromBlock,
      toBlock,
      strict: true,
    });

    // Filtramos por el hash exacto de nuestra transacción — así aislamos
    // nuestros eventos aunque otras wallets hayan llamado al contrato en el mismo rango
    const nuestrosEventos = events.filter((e) => e.transactionHash === txHash);

    const total = nuestrosEventos.reduce((acc, e) => acc + (e.args.by ?? 0n), 0n);
    assert.equal(total, N, `Se esperaba suma ${N}, got ${total}`);
  });
});
