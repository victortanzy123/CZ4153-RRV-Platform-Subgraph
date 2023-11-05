// Schema:
import { BigInt } from '@graphprotocol/graph-ts';
import { UserToken } from '../../generated/schema';

// Helper:
import { ZERO_BI } from '../utils/constants.template';
import { getRRVPlatformTokenEntityId, setSyncingIndex } from '../utils/helper';

export function getUserToken(
  user: string,
  chainId: string,
  contractAddress: string,
  tokenId: BigInt
): UserToken {
  let id = user + '-' + tokenId.toString();
  let userToken = UserToken.load(id);

  if (!userToken) {
    userToken = new UserToken(id);

    let tokenEntityId = getRRVPlatformTokenEntityId(chainId, contractAddress, tokenId);

    userToken.user = user;
    userToken.token = tokenEntityId;
    userToken.totalSent = ZERO_BI;
    userToken.totalReceived = ZERO_BI;
    userToken.balance = ZERO_BI;
    setSyncingIndex('userTokens', userToken);

    userToken.save();
  }

  return userToken;
}
