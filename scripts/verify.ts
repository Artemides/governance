import { address as tokenAddress } from "../deployments/sepolia/Gimnastiky.json";
import { address as governorAddress } from "../deployments/sepolia/MyGovernor.json";
import { verify as _verify } from "../utils/verify";
const verify = async () => {
  await _verify(tokenAddress, [governorAddress]);
  await _verify(governorAddress, [tokenAddress]);
};

verify();
