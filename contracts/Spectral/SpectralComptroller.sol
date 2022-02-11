pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./interfaces/ISpectralComptrollerAdmin.sol";
import "./interfaces/IScoracle.sol";
import "../Comptroller.sol";

contract SpectralComptroller is Comptroller {

    bytes32 public constant LENDING_ID = 0x000000000000000000000000000000009348f5ba3f574f65958a675e468da9c8;

    function spectralAdmin() public view returns (ISpectralComptrollerAdmin) {
        // todo change address
        return ISpectralComptrollerAdmin(address(0));
    }

    function scoracle() public view returns (IScoracle) {
        // todo change address
        return IScoracle(address(0));
    }

    function borrowAllowed(address cToken, address borrower, uint borrowAmount) external returns (uint) {
        IScoracle.ScoreData memory data = scoracle().getScore(borrower, LENDING_ID);
        require(data.score >= spectralAdmin().minScore(), "SCORE_TOO_LOW");
        require(block.timestamp - data.lastUpdated <= spectralAdmin().maxAge(), "SCORE_EXPIRED");
        return super.borrowAllowed(cToken, borrower, borrowAmount);
    }
}