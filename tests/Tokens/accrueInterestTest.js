const {
  etherMantissa,
  etherUnsigned
} = require('../Utils/Ethereum');
const {
  makeCToken,
  setBorrowRate
} = require('../Utils/Compound');

const blockNumber = 2e7;
const borrowIndex = 1e18;
const borrowRate = .000001;

async function pretendBlock(cToken, accrualBlock = blockNumber, deltaBlocks = 1) {
  await send(cToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(cToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber + deltaBlocks)]);
  await send(cToken, 'harnessSetBorrowIndex', [etherUnsigned(borrowIndex)]);
}

async function preAccrue(cToken) {
  await setBorrowRate(cToken, borrowRate);
  await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(cToken, 'harnessExchangeRateDetails', [0, 0, 0, 0, 0]);
}

describe('CToken', () => {
  let root, accounts;
  let cToken;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    cToken = await makeCToken({comptrollerOpts: {kind: 'bool'}});
  });

  beforeEach(async () => {
    await preAccrue(cToken);
  });

  describe('accrueInterest', () => {
    it('reverts if the interest rate is absurdly high', async () => {
      await pretendBlock(cToken, blockNumber, 1);
      expect(await call(cToken, 'getBorrowRateMaxMantissa')).toEqualNumber(etherMantissa(0.000005)); // 0.0005% per block
      await setBorrowRate(cToken, 0.001e-2); // 0.0010% per block
      await expect(send(cToken, 'accrueInterest')).rejects.toRevert("revert borrow rate is absurdly high");
    });

    it('fails if new borrow rate calculation fails', async () => {
      await pretendBlock(cToken, blockNumber, 1);
      await send(cToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(send(cToken, 'accrueInterest')).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it('fails if simple interest factor calculation fails', async () => {
      await pretendBlock(cToken, blockNumber, 5e70);
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_SIMPLE_INTEREST_FACTOR_CALCULATION_FAILED');
    });

    it('fails if new borrow index calculation fails', async () => {
      await pretendBlock(cToken, blockNumber, 5e60);
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED');
    });

    it('fails if new borrow interest index calculation fails', async () => {
      await pretendBlock(cToken)
      await send(cToken, 'harnessSetBorrowIndex', [-1]);
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_BORROW_INDEX_CALCULATION_FAILED');
    });

    it('fails if interest accumulated calculation fails', async () => {
      await send(cToken, 'harnessExchangeRateDetails', [0, -1, 0, 0, 0]);
      await pretendBlock(cToken)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_ACCUMULATED_INTEREST_CALCULATION_FAILED');
    });

    it('fails if new total borrows calculation fails', async () => {
      await setBorrowRate(cToken, 1e-18);
      await pretendBlock(cToken)
      await send(cToken, 'harnessExchangeRateDetails', [0, -1, 0, 0, 0]);
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_BORROWS_CALCULATION_FAILED');
    });

    it('fails if interest accumulated for reserves calculation fails', async () => {
      await setBorrowRate(cToken, .000001);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e30), -1, 0, 0]);
      await send(cToken, 'harnessSetReserveFactorFresh', [etherUnsigned(1e10)]);
      await pretendBlock(cToken, blockNumber, 5e20)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED');
    });

    it('fails if new total reserves calculation fails', async () => {
      await setBorrowRate(cToken, 1e-18);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e56), -1, 0, 0]);
      await send(cToken, 'harnessSetReserveFactorFresh', [etherUnsigned(1e17)]);
      await pretendBlock(cToken)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_RESERVES_CALCULATION_FAILED');
    });

    it('fails if interest accumulated for admin fees calculation fails', async () => {
      await setBorrowRate(cToken, .000001);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e30), 0, -1, 0]);
      await send(cToken, 'harnessSetAdminFeeFresh', [etherUnsigned(1e10)]);
      await pretendBlock(cToken, blockNumber, 5e20)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_ADMIN_FEES_CALCULATION_FAILED');
    });

    it('fails if new total admin fees calculation fails', async () => {
      await setBorrowRate(cToken, 1e-18);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e56), 0, -1, 0]);
      await send(cToken, 'harnessSetAdminFeeFresh', [etherUnsigned(1e17)]);
      await pretendBlock(cToken)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_ADMIN_FEES_CALCULATION_FAILED');
    });

    it('fails if interest accumulated for Fuse fees calculation fails', async () => {
      await setBorrowRate(cToken, .000001);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e30), 0, 0, -1]);
      await send(cToken, 'harnessSetFuseFeeFresh', [etherUnsigned(1e10)]);
      await pretendBlock(cToken, blockNumber, 5e20)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_FUSE_FEES_CALCULATION_FAILED');
    });

    it('fails if new total Fuse fees calculation fails', async () => {
      await setBorrowRate(cToken, 1e-18);
      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e56), 0, 0, -1]);
      await send(cToken, 'harnessSetFuseFeeFresh', [etherUnsigned(1e17)]);
      await pretendBlock(cToken)
      expect(await send(cToken, 'accrueInterest')).toHaveTokenFailure('MATH_ERROR', 'ACCRUE_INTEREST_NEW_TOTAL_FUSE_FEES_CALCULATION_FAILED');
    });

    it('succeeds and saves updated values in storage on success', async () => {
      const startingTotalBorrows = 1e22;
      const startingTotalReserves = 1e20;
      const startingTotalAdminFees = 1e19;
      const startingTotalFuseFees = 1e18;
      const reserveFactor = 1e17;
      const adminFee = 5e16;
      const fuseFee = 8e16;

      await send(cToken, 'harnessExchangeRateDetails', [0, etherUnsigned(startingTotalBorrows), etherUnsigned(startingTotalReserves), etherUnsigned(startingTotalAdminFees), etherUnsigned(startingTotalFuseFees)]);
      await send(cToken, 'harnessSetReserveFactorFresh', [etherUnsigned(reserveFactor)]);
      await send(cToken, 'harnessSetAdminFeeFresh', [etherUnsigned(adminFee)]);
      await send(cToken, 'harnessSetFuseFeeFresh', [etherUnsigned(fuseFee)]);
      await pretendBlock(cToken)

      const expectedAccrualBlockNumber = blockNumber + 1;
      const expectedBorrowIndex = borrowIndex + borrowIndex * borrowRate;
      const expectedTotalBorrows = startingTotalBorrows + startingTotalBorrows * borrowRate;
      const expectedTotalReserves = startingTotalReserves + startingTotalBorrows *  borrowRate * reserveFactor / 1e18;
      const expectedTotalAdminFees = startingTotalAdminFees + startingTotalBorrows *  borrowRate * adminFee / 1e18;
      const expectedTotalFuseFees = startingTotalFuseFees + startingTotalBorrows *  borrowRate * fuseFee / 1e18;

      const receipt = await send(cToken, 'accrueInterest')
      expect(receipt).toSucceed();
      expect(receipt).toHaveLog('AccrueInterest', {
        cashPrior: 0,
        interestAccumulated: etherUnsigned(expectedTotalBorrows).sub(etherUnsigned(startingTotalBorrows)),
        borrowIndex: etherUnsigned(expectedBorrowIndex),
        totalBorrows: etherUnsigned(expectedTotalBorrows)
      })
      expect(await call(cToken, 'accrualBlockNumber')).toEqualNumber(expectedAccrualBlockNumber);
      expect(await call(cToken, 'borrowIndex')).toEqualNumber(expectedBorrowIndex);
      expect(await call(cToken, 'totalBorrows')).toEqualNumber(expectedTotalBorrows);
      expect(await call(cToken, 'totalReserves')).toEqualNumber(expectedTotalReserves);
      expect(await call(cToken, 'totalAdminFees')).toEqualNumber(expectedTotalAdminFees);
      expect(await call(cToken, 'totalFuseFees')).toEqualNumber(expectedTotalFuseFees);
    });
  });
});
