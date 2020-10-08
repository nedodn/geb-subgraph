import { dataSource } from '@graphprotocol/graph-ts'
import {
  UpdateResult,
  Medianizer as ChainlinkMedianizer,
  ModifyParameters,
} from '../../../../generated/EthMedianizer/Medianizer'
import { Medianizer as UniMedianizer } from '../../../../generated/CoinMedianizer/Medianizer'
import { UniswapPair as UniswapPairContract } from '../../../../generated/templates/UniswapPair/UniswapPair'
import { UniswapPair as UniswapPairIndexer } from '../../../../generated/templates'
import { MedianizerUpdate, UniswapPair as UniswapPairEntity } from '../../../entities'
import { eventUid, NULL_ADDRESS } from '../../../utils/ethereum'
import * as decimal from '../../../utils/decimal'

// Called for both Chainlink and Uniswap medianizer
export function handleUpdateResult(event: UpdateResult): void {
  let update = new MedianizerUpdate(eventUid(event))
  let contractAddress = dataSource.address()

  update.medianizerAddress = contractAddress
  update.value = decimal.fromWad(event.params.medianPrice)
  update.symbol = ChainlinkMedianizer.bind(contractAddress)
    .symbol()
    .toString()
  update.createdAt = event.block.timestamp
  update.createdAtBlock = event.block.number
  update.createdAtTransaction = event.transaction.hash
  update.save()
}

// Only call for the Uniswap medianizer
export function handleModifyParameters(event: ModifyParameters): void {
  let uniswapMedian = UniMedianizer.bind(dataSource.address())
  let pairAddress = uniswapMedian.uniswapPair()

  if (pairAddress.equals(NULL_ADDRESS)) {
    // We are updating another parameter
    return
  }

  let pair = UniswapPairEntity.load(pairAddress.toHexString())
  if (pair == null) {
    // Create a new pair entity
    pair = new UniswapPairEntity(pairAddress.toHexString())
    let pairContract = UniswapPairContract.bind(pairAddress)

    pair.medianizerSymbol = uniswapMedian.symbol().toString()

    pair.token0 = pairContract.token0()
    pair.token1 = pairContract.token1()

    let reserves = pairContract.getReserves()
    pair.reserve0 = decimal.fromWad(reserves.value0)
    pair.reserve1 = decimal.fromWad(reserves.value1)

    if (pair.reserve1.notEqual(decimal.ZERO)) pair.token0Price = pair.reserve0.div(pair.reserve1)
    else pair.token0Price = decimal.ZERO
    if (pair.reserve0.notEqual(decimal.ZERO)) pair.token1Price = pair.reserve1.div(pair.reserve0)
    else pair.token1Price = decimal.ZERO

    pair.createdAt = event.block.timestamp
    pair.createdAtBlock = event.block.number
    pair.createdAtTransaction = event.transaction.hash
    pair.modifiedAt = event.block.timestamp
    pair.modifiedAtBlock = event.block.number
    pair.modifiedAtTransaction = event.transaction.hash

    pair.save()
  }

  // Start indexing
  UniswapPairIndexer.create(pairAddress)
}