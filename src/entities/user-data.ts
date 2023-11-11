import { RRVPlatformUserData } from '../../generated/schema';

// Helper
import { ZERO_BI } from '../utils/constants.template';
import { setSyncingIndex } from '../utils/helper';

export function getRRVPlatformUserData(
  user: string,
  chainId: string
): RRVPlatformUserData {
  let id = user + '-' + chainId;
  let rrvPlatformUserData = RRVPlatformUserData.load(id);

  if (!rrvPlatformUserData) {
    rrvPlatformUserData = new RRVPlatformUserData(id);

    rrvPlatformUserData.user = user;
    rrvPlatformUserData.created = ZERO_BI;
    rrvPlatformUserData.minted = ZERO_BI;
    rrvPlatformUserData.uniqueMinted = ZERO_BI;
    rrvPlatformUserData.totalRevenue = ZERO_BI;
    rrvPlatformUserData.totalSpent = ZERO_BI;

    setSyncingIndex('RRVPlatformUserData', rrvPlatformUserData);

    rrvPlatformUserData.save();
  }

  return rrvPlatformUserData;
}
