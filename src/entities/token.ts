import { Address, BigInt } from '@graphprotocol/graph-ts';
// Schemas:
import { Token } from '../../generated/schema';

import { ERC721 } from '../../generated/RRVPlatform/ERC721';
import { ERC1155 } from '../../generated/RRVPlatform/ERC1155';

// Constants/Helper:
import {
  getRRVPlatformTokenEntityId,
  getTokenMetadataEntityId,
  setSyncingIndex,
} from '../utils/helper';
import { ERC721_INTERFACE_ID, ERC1155_INTERFACE_ID } from '../utils/constants';
import { getTokenMetadata } from './token-metadata';

/* ==================================================
                    Main Function
=====================================================*/

// RRVPlatform Token -> ID = chainId-address-tokenId
export function getToken(
  chainId: string,
  contractAddress: string,
  tokenId: BigInt
): Token {
  let tokenEntityId = getRRVPlatformTokenEntityId(chainId, contractAddress, tokenId);
  let token = Token.load(tokenEntityId);

  if (!token) {
    token = new Token(tokenEntityId);
    token.type = getType(contractAddress);
    token.name = getName(contractAddress);
    token.symbol = getSymbol(contractAddress);
    let uri = getTokenUri(contractAddress, tokenId);
    token.tokenUri = uri;

    // Set metadata of token:
    let tokenMetadataDetails = getTokenMetadata(chainId, contractAddress, tokenId);
    token.metadata = tokenMetadataDetails.id;

    setSyncingIndex('tokens', token);
  }

  token.save();

  return token;
}

/* ==================================================
            Helper/Intermediate Functions
=====================================================*/

export function getType(address: string): string {
  let contract_721 = ERC721.bind(Address.fromString(address));
  const interface721_validity_result =
    contract_721.try_supportsInterface(ERC721_INTERFACE_ID);

  if (!interface721_validity_result.reverted && interface721_validity_result.value) {
    return 'ERC721';
  }

  let contract_1155 = ERC1155.bind(Address.fromString(address));
  const interface1155_validity_result =
    contract_1155.try_supportsInterface(ERC1155_INTERFACE_ID);

  if (!interface1155_validity_result.reverted && interface1155_validity_result.value) {
    return 'ERC1155';
  }

  return 'UNKNOWN';
}

// Metadata helper functions:
export function getName(address: string): string {
  let contract = ERC721.bind(Address.fromString(address));
  const result = contract.try_name();

  if (result.reverted) {
    return 'unknown';
  }
  return result.value;
}

export function getSymbol(address: string): string {
  let contract = ERC721.bind(Address.fromString(address));
  const result = contract.try_symbol();

  if (result.reverted) {
    return 'unknown';
  }
  return result.value;
}

export function getTokenUri(address: string, tokenId: BigInt): string {
  let contract_721 = ERC721.bind(Address.fromString(address));

  const tokenUriResult = contract_721.try_tokenURI(tokenId);

  let contract_1155 = ERC1155.bind(Address.fromString(address));
  const uriResult = contract_1155.try_uri(tokenId);

  if (!tokenUriResult.reverted && uriResult.reverted) {
    return tokenUriResult.value;
  }

  if (tokenUriResult.reverted && !uriResult.reverted) {
    return uriResult.value;
  }

  return 'unknown';
}
