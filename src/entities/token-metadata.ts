import { BigInt, json } from '@graphprotocol/graph-ts';
import { TokenMetadata } from '../../generated/schema';
import { getTokenMetadataEntityId } from '../utils/helper';
import { getTokenMetadataDetails } from './rrv-platform-tokens';

export function getTokenMetadata(
  chainId: string,
  contractAddress: string,
  tokenId: BigInt
): TokenMetadata {
  let tokenMetadataEntityId = getTokenMetadataEntityId(chainId, contractAddress, tokenId);
  let tokenMetadata = TokenMetadata.load(tokenMetadataEntityId);

  if (!tokenMetadata) {
    tokenMetadata = new TokenMetadata(tokenMetadataEntityId);

    let ipfsResult = getTokenMetadataDetails(contractAddress, tokenId);

    if (ipfsResult) {
      const metadata = json.fromBytes(ipfsResult).toObject();

      tokenMetadata.name = metadata.get('name')!.toString();
      tokenMetadata.image = metadata.get('image')!.toString();
      tokenMetadata.description = metadata.get('description')!.toString();

      let externalUrl = metadata.get('external_url')!.toString();
      tokenMetadata.externalUrl = externalUrl ? externalUrl : 'NIL';

      let artist = metadata.get('artist')!.toString();
      tokenMetadata.artist = artist ? artist : 'NIL';
    }
  } else {
    tokenMetadata.name = 'NIL';
    tokenMetadata.image = 'NIL';
    tokenMetadata.description = 'NIL';
    tokenMetadata.externalUrl = 'NIL';
    tokenMetadata.artist = 'NIL';
  }

  tokenMetadata.save();

  return tokenMetadata;
}
