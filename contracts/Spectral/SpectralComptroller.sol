pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./interfaces/ISpectralComptrollerAdmin.sol";
import "./interfaces/IScoracle.sol";
import "../Comptroller.sol";

contract SpectralComptroller is Comptroller {

    function spectralAdmin() public pure returns (ISpectralComptrollerAdmin) {
        // todo change address
        return ISpectralComptrollerAdmin(address(0));
    }

    function scoracle() public pure returns (IScoracle) {
        // todo change address
        return IScoracle(address(0x93C69C64233D2911c9dFAd7F0CfB119535E9095b));
    }

    function borrowAllowed(address cToken, address borrower, uint borrowAmount) public returns (uint) {
        IScoracle.ScoreData memory data = scoracle().getScore(borrower, spectralAdmin().scoreId());
        require(data.score >= spectralAdmin().minScore(), "SCORE_TOO_LOW");
        require(block.timestamp - data.lastUpdated <= spectralAdmin().maxAge(), "SCORE_EXPIRED");
        return super.borrowAllowed(cToken, borrower, borrowAmount);
    }
}