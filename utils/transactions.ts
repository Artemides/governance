import { ContractTransactionReceipt, TransactionReceipt } from "ethers";

export function calculateTransactionCost(
  receipt: ContractTransactionReceipt | null
): bigint {
  if (!receipt) return BigInt(0);

  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.gasPrice;
  return gasUsed * gasPrice;
}
