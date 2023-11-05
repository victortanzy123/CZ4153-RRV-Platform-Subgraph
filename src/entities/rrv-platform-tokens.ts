import { Address, BigInt, Bytes, ipfs } from '@graphprotocol/graph-ts';

// ABIs:
import { RRVPlatform } from '../../generated/RRVPlatform/RRVPlatform';

// Schemas:
import { RRVPlatformToken, RoyaltyConfig } from '../../generated/schema';

// Constants/Helper:
import { ZERO_BI, IPFS_HASH_LENGTH, BPS_BI, NATIVE } from '../utils/constants.template';
import {
  getRRVPlatformTokenEntityId,
  getTokenClaimStatusString,
  processUriStringForIpfs,
} from '../utils/helper';
import { setSyncingIndex } from '../utils/helper';
import { getToken } from './token';

export class RoyaltyConfigDetails {
  bps: BigInt;
  receiver: string;

  constructor(bps: BigInt, receiver: string) {
    this.receiver = receiver;
    this.bps = bps;
  }
}

export class TokenMetadataDetails {
  totalSupply: BigInt;
  maxSupply: BigInt;
  price: BigInt;
  maxClaimPerUser: BigInt;
  uri: string;
  claimStatus: string;

  constructor(
    totalSupply: BigInt,
    maxSupply: BigInt,
    price: BigInt,
    maxClaimPerUser: BigInt,
    uri: string,
    claimStatus: string
  ) {
    this.totalSupply = totalSupply;
    this.maxSupply = maxSupply;
    this.price = price;
    this.maxClaimPerUser = maxClaimPerUser;
    this.uri = uri;
    this.claimStatus = claimStatus;
  }
}

/* ==================================================
            Token Related Functions
=====================================================*/
//  Token -> ID = chainId-address-tokenId
export function getRRVPlatformToken(
  chainId: string,
  contractAddress: string,
  tokenId: BigInt
): RRVPlatformToken {
  let rrvPlatformTokenId = getRRVPlatformTokenEntityId(chainId, contractAddress, tokenId);
  // Load token from existing Graph node:
  let rrvPlatformToken = RRVPlatformToken.load(rrvPlatformTokenId);
  if (!rrvPlatformToken) {
    rrvPlatformToken = new RRVPlatformToken(rrvPlatformTokenId);

    let token = getToken(chainId, contractAddress, tokenId);
    rrvPlatformToken.token = token.id;

    let rrvPlatformTokenOverallDetails = getRRVPlatformTokenOverallDetails(
      contractAddress,
      tokenId
    );
    rrvPlatformToken.totalSupply = rrvPlatformTokenOverallDetails.totalSupply;
    rrvPlatformToken.maxSupply = rrvPlatformTokenOverallDetails.maxSupply;
    rrvPlatformToken.maxClaimPerUser = rrvPlatformTokenOverallDetails.maxClaimPerUser;
    rrvPlatformToken.price = rrvPlatformTokenOverallDetails.price;
    rrvPlatformToken.claimStatus = rrvPlatformTokenOverallDetails.claimStatus;
    rrvPlatformToken.timestampCreated = ZERO_BI;
    rrvPlatformToken.creator = NATIVE;

    // Royalty Info for tokenId
    let royaltyConfig = getRoyaltiesInfo(chainId, contractAddress, tokenId);
    rrvPlatformToken.royalties = [royaltyConfig.id];

    setSyncingIndex('rrvplatformtokens', rrvPlatformToken);

    rrvPlatformToken.save();
  }

  return rrvPlatformToken;
}

// export const getRRVPlatform

// Metadata helper functions:
export function getName(address: string): string {
  let contract = RRVPlatform.bind(Address.fromString(address));
  const result = contract.try_name();

  if (result.reverted) {
    return 'unknown';
  }
  return result.value;
}

export function getSymbol(address: string): string {
  let contract = RRVPlatform.bind(Address.fromString(address));
  const result = contract.try_symbol();

  if (result.reverted) {
    return 'unknown';
  }
  return result.value;
}

export function getTokenUri(address: string, tokenId: BigInt): string {
  let contract = RRVPlatform.bind(Address.fromString(address));
  const result = contract.try_uri(tokenId);

  if (result.reverted) {
    return 'unknown';
  }
  return result.value;
}

export function getRRVPlatformTokenOverallDetails(
  address: string,
  tokenId: BigInt
): TokenMetadataDetails {
  let contract = RRVPlatform.bind(Address.fromString(address));
  const result = contract.try_tokenMetadata(tokenId);

  if (result.reverted) {
    return new TokenMetadataDetails(
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      'NIL',
      'DISABLED'
    );
  }

  return new TokenMetadataDetails(
    result.value.value0,
    result.value.value1,
    result.value.value2,
    result.value.value3,
    result.value.value4,
    getTokenClaimStatusString(result.value.value5)
  );
}

export function getTokenMaximumSupply(address: string, tokenId: BigInt): BigInt {
  let contract = RRVPlatform.bind(Address.fromString(address));
  const result = contract.try_maxSupply(tokenId);

  if (result.reverted) {
    return ZERO_BI;
  }
  return result.value;
}

export function getTokenTotalSupply(address: string, tokenId: BigInt): BigInt {
  let contract = RRVPlatform.bind(Address.fromString(address));
  const result = contract.try_totalSupply(tokenId);

  if (result.reverted) {
    return ZERO_BI;
  }
  return result.value;
}

export function getRoyaltiesInfo(
  chainId: string,
  contractAddress: string,
  tokenId: BigInt
): RoyaltyConfig {
  let entityId = getRRVPlatformTokenEntityId(chainId, contractAddress, tokenId);
  let royalties = RoyaltyConfig.load(entityId);

  if (!royalties) {
    royalties = new RoyaltyConfig(entityId);

    let contract = RRVPlatform.bind(Address.fromString(contractAddress));
    const result = contract.try_royaltyInfo(tokenId, BPS_BI);

    if (!result.reverted) {
      royalties.receiver = result.value.value0.toHexString();
      royalties.bps = result.value.value1;
    } else {
      let royaltyConfigDetails = new RoyaltyConfigDetails(ZERO_BI, NATIVE);
      royalties.receiver = royaltyConfigDetails.receiver;
      royalties.bps = royaltyConfigDetails.bps;
    }
  }
  royalties.save();

  return royalties;
}

export function getTokenMetadataDetails(address: string, tokenId: BigInt): Bytes | null {
  let tokenUri = getTokenUri(address, tokenId);

  // Retrieve IPFS hash from tokenUri
  let metadataIpfs = processUriStringForIpfs(tokenUri);

  // Get metadata from IPFS
  let metadata = ipfs.cat(metadataIpfs);

  return metadata;
}
