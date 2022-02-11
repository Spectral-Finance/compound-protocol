pragma solidity ^0.5.16;

import "./Ownable.sol";
import "./interfaces/ISpectralComptrollerAdmin.sol";
import "./interfaces/IScoracle.sol";

contract SpectralComptrollerAdmin is ISpectralComptrollerAdmin, Ownable {
    uint256 public minScore;
    uint256 public maxAge;

    constructor() public {
        maxAge = 1 hours;
    }

    function setMinScore(uint256 _minScore) external onlyOwner {
        emit MinScoreUpdated(minScore, _minScore);
        minScore = _minScore;
    }

    function setMaxAge(uint256 _maxAge) external onlyOwner {
        emit MaxAgeUpdated(maxAge, _maxAge);
        maxAge = _maxAge;
    }
}