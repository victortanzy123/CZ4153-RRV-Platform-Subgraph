import { dataSource } from '@graphprotocol/graph-ts';

// Events from ABI:
import {
  TransferSingle as TransferSingleEvent,
  TransferBatch as TransferBatchEvent,
  TokenInitialised,
  TokenMint,
  TokenClaimStatusUpdate,
} from '../../generated/RRVPlatform/RRVPlatform';

// Schemas:
import { Transfer, TokenMintRecord } from '../../generated/schema';
import { getRRVPlatformToken } from '../entities/rrv-platform-tokens';
import { getUser } from '../entities/user';
import { getUserToken } from '../entities/user-token';
import { getToken } from '../entities/token';

// Constants/Helpers:
import {
  getTokenClaimStatusString,
  getTransferId,
  setSyncingIndex,
} from '../utils/helper';
import {
  getPlatformFeeBps,
  getRRVPlatformOverallData,
} from '../entities/rrv-platform-overall-data';
import { BPS_BI, ONE_BI, ZERO_BI } from '../utils/constants.template';
import { getRRVPlatformUserData } from '../entities/user-data';

// Handle TransferSingle events:
export function handleTransferSingle(event: TransferSingleEvent): void {
  let rrvPlatformAddress = dataSource.address().toHexString();
  let tokenId = event.params.id;
  let chainId = dataSource.network();

  // Retrieve or create rrvPlatformToken:
  let rrvPlatformToken = getRRVPlatformToken(chainId, rrvPlatformAddress, tokenId);

  let hash = event.transaction.hash.toHexString();
  let index = event.logIndex;
  let blockNumber = event.block.number;
  let blockTimestamp = event.block.timestamp;
  let transferId = getTransferId(hash, index, tokenId);

  // Create new Transfer object:
  let transfer = new Transfer(transferId);
  transfer.hash = hash;
  transfer.token = rrvPlatformToken.id;
  transfer.from = event.params.from.toHexString();
  transfer.to = event.params.to.toHexString();
  transfer.value = event.params.value;
  transfer.blockNumber = blockNumber;
  transfer.timestamp = blockTimestamp;

  setSyncingIndex('transfers', transfer);
  transfer.save();

  // Update UserToken Data:
  let from = getUser(event.params.from.toHexString());
  let to = getUser(event.params.to.toHexString());

  let fromUserToken = getUserToken(from.id, chainId, rrvPlatformAddress, tokenId);
  fromUserToken.totalSent = fromUserToken.totalSent.plus(event.params.value);
  fromUserToken.balance = fromUserToken.balance.minus(event.params.value);

  fromUserToken.save();

  let toUserToken = getUserToken(to.id, chainId, rrvPlatformAddress, tokenId);
  toUserToken.totalReceived = toUserToken.totalReceived.plus(event.params.value);
  toUserToken.balance = toUserToken.balance.plus(event.params.value);

  toUserToken.save();
}

// Handle TransferBatch events:
export function handleTransferBatch(event: TransferBatchEvent): void {
  let rrvPlatformAddress = dataSource.address().toHexString();
  let chainId = dataSource.network();
  let tokenIds = event.params.ids;
  let amounts = event.params.values;
  let hash = event.transaction.hash.toHexString();
  let index = event.logIndex;
  let blockNumber = event.block.number;
  let blockTimestamp = event.block.timestamp;
  // Retrieve and save all tokens in the graph node
  for (let i = 0; i < tokenIds.length; i++) {
    // Retrieve or create token object:
    let token = getToken(chainId, rrvPlatformAddress, tokenIds[i]);
    token.save();
    // Retrieve or create rrvPlatformToken:
    let rrvPlatformToken = getRRVPlatformToken(chainId, rrvPlatformAddress, tokenIds[i]);
    rrvPlatformToken.save();
    // Create new Transfer object:
    let transferId = getTransferId(hash, index, tokenIds[i]);
    let transfer = new Transfer(transferId);
    transfer.hash = hash;
    transfer.token = token.id;
    transfer.from = event.params.from.toHexString();
    transfer.to = event.params.to.toHexString();
    transfer.value = amounts[i];
    transfer.blockNumber = blockNumber;
    transfer.timestamp = blockTimestamp;
    setSyncingIndex('transfers', transfer);
    transfer.save();
    // Update UserToken Data
    let from = getUser(event.params.from.toHexString());
    let to = getUser(event.params.to.toHexString());
    let fromUserToken = getUserToken(from.id, chainId, rrvPlatformAddress, tokenIds[i]);
    fromUserToken.totalReceived = fromUserToken.totalReceived.plus(amounts[i]);
    fromUserToken.balance = fromUserToken.balance.plus(amounts[i]);
    fromUserToken.save();
    let toUserToken = getUserToken(to.id, chainId, rrvPlatformAddress, tokenIds[i]);
    toUserToken.totalSent = toUserToken.totalSent.plus(amounts[i]);
    toUserToken.balance = toUserToken.balance.minus(amounts[i]);
    toUserToken.save();
  }
}

export function handleTokenInitialisation(event: TokenInitialised): void {
  let blockTimestamp = event.block.timestamp;
  let rrvPlatformAddress = dataSource.address().toHexString();
  let chainId = dataSource.network();
  let tokenId = event.params.tokenId;
  let revenueRecipient = event.params.revenueRecipient.toHexString();
  // Save token on the graph node:
  let rrvPlatformToken = getRRVPlatformToken(chainId, rrvPlatformAddress, tokenId);
  rrvPlatformToken.timestampCreated = blockTimestamp;
  rrvPlatformToken.creator = revenueRecipient;
  rrvPlatformToken.save();

  // Update user statistics
  // Update creator's statistics
  let creatorStatistics = getRRVPlatformUserData(revenueRecipient, chainId);

  creatorStatistics.created = creatorStatistics.created.plus(ONE_BI);
  creatorStatistics.save();

  // Update Overall Data
  let overallData = getRRVPlatformOverallData();

  overallData.created = overallData.created.plus(ONE_BI);
  overallData.save();
}

export function handleTokenMint(event: TokenMint): void {
  let rrvPlatformAddress = dataSource.address().toHexString();
  let chainId = dataSource.network();
  let hash = event.transaction.hash.toHexString();
  let tokenId = event.params.tokenId;
  let quantity = event.params.amount;
  let proceeds = event.params.value;
  let receiver = event.params.receiver.toHexString();

  // Update rrvPlatform Token object
  let rrvPlatformToken = getRRVPlatformToken(chainId, rrvPlatformAddress, tokenId);
  rrvPlatformToken.totalSupply = rrvPlatformToken.totalSupply.plus(quantity);
  rrvPlatformToken.save();

  let creator = rrvPlatformToken.creator;

  // Create new Token Mint Record
  let tokenMintRecordId = `${chainId}-${rrvPlatformAddress}-${tokenId}-${hash}`;
  let tokenMintRecord = new TokenMintRecord(tokenMintRecordId);
  tokenMintRecord.token = rrvPlatformToken.id;
  tokenMintRecord.metadata = rrvPlatformToken.metadata;
  tokenMintRecord.minter = event.params.minter.toHexString();
  tokenMintRecord.receiver = event.params.receiver.toHexString();
  tokenMintRecord.value = proceeds;
  tokenMintRecord.timestamp = event.block.timestamp;
  tokenMintRecord.hash = hash;
  tokenMintRecord.quantity = quantity;
  setSyncingIndex('tokenMintRecord', tokenMintRecord);

  tokenMintRecord.save();

  // Update Overall & Creator + Minter Statistics
  let minterStatistics = getRRVPlatformUserData(receiver, chainId);

  minterStatistics.minted = minterStatistics.minted.plus(quantity);
  minterStatistics.uniqueMinted = minterStatistics.uniqueMinted.plus(ONE_BI);

  let overallData = getRRVPlatformOverallData();

  overallData.minted = overallData.minted.plus(quantity);
  if (proceeds.gt(ZERO_BI)) {
    let platformBps = getPlatformFeeBps(rrvPlatformAddress);
    let feeCollected = proceeds.times(platformBps).div(BPS_BI);

    // Update total revenue less platform fee for creator and also totalSpent for minter
    let creatorStatistics = getRRVPlatformUserData(creator, chainId);
    creatorStatistics.totalRevenue = creatorStatistics.totalRevenue.plus(
      proceeds.minus(feeCollected)
    );
    minterStatistics.totalSpent = minterStatistics.totalSpent.plus(proceeds);

    // Overall data
    overallData.revenue = overallData.revenue.plus(proceeds);
    overallData.platformFees = overallData.platformFees.plus(feeCollected);

    creatorStatistics.save();
  }

  minterStatistics.save();
  overallData.save();
}

export function handleTokenClaimStatusUpdate(event: TokenClaimStatusUpdate): void {
  let rrvPlatformAddress = dataSource.address().toHexString();
  let chainId = dataSource.network();
  let tokenId = event.params.tokenId;

  let rrvPlatformToken = getRRVPlatformToken(chainId, rrvPlatformAddress, tokenId);
  rrvPlatformToken.claimStatus = getTokenClaimStatusString(event.params.claimStatus);

  rrvPlatformToken.save();
}
