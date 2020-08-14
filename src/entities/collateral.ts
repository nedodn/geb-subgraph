import { CollateralType } from '../../generated/schema'
import { Bytes, ethereum, BigInt, Entity } from '@graphprotocol/graph-ts'

import * as decimal from '../utils/decimal'
import * as integer from '../utils/integer'
import { updateLastModifyCollateralType } from '../utils/state'

export function getOrCreateCollateral(collateralType: Bytes, event: ethereum.Event): CollateralType {
  let collateral = CollateralType.load(collateralType.toString())

  if (collateral == null) {
    collateral = new CollateralType(collateralType.toString())
    collateral.debtCeiling = decimal.ZERO
    collateral.debtFloor = decimal.ZERO
    collateral.debtAmount = decimal.ZERO

    // TODO: auction parameter init

    collateral.liquidationPenalty = decimal.ZERO
    collateral.liquidationCRatio = decimal.ZERO
    collateral.safetyCRatio = decimal.ZERO

    collateral.accumulatedRate = decimal.fromRay(BigInt.fromI32(10).pow(27))

    collateral.stabilityFee = decimal.ONE
    collateral.stabilityFeeLastUpdatedAt = event.block.timestamp

    collateral.unmanagedCdpCount = integer.ZERO
    collateral.cdpCount = integer.ZERO

    collateral.createdAt = event.block.timestamp
    collateral.createdAtBlock = event.block.number
    collateral.createdAtTransaction = event.transaction.hash

    collateral.save()
  }
  return collateral as CollateralType
}