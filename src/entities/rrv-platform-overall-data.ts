import { Address, BigInt } from '@graphprotocol/graph-ts';
import { RRVPlatformOverallData } from '../../generated/schema';
import { ZERO_BI } from '../utils/constants.template';

// ABIs:
import { RRVPlatform } from '../../generated/RRVPlatform/RRVPlatform';

let OVERALL_DATA_ID: string = 'RRV_PLATFORM_OVERALL_DATA';

export function getRRVPlatformOverallData(): RRVPlatformOverallData {
  let overallData = RRVPlatformOverallData.load(OVERALL_DATA_ID);
  if (!overallData) {
    overallData = new RRVPlatformOverallData(OVERALL_DATA_ID);

    overallData.created = ZERO_BI;
    overallData.minted = ZERO_BI;
    overallData.revenue = ZERO_BI;
    overallData.platformFees = ZERO_BI;

    overallData.save();
  }

  return overallData;
}

export function getPlatformFeeBps(address: string): BigInt {
  let contract = RRVPlatform.bind(Address.fromString(address));
  let result = contract.try_PLATFORM_FEE_BPS();

  if (result.reverted) {
    return ZERO_BI;
  }

  return result.value;
}
