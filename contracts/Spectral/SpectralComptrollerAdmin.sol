pragma solidity ^0.5.16;

import "./Ownable.sol";
import "./interfaces/ISpectralComptrollerAdmin.sol";
import "./interfaces/IScoracle.sol";

contract SpectralComptrollerAdmin is ISpectralComptrollerAdmin, Ownable {
    bytes32 public scoreId;
    uint256 public minScore;
    uint256 public maxAge;

    constructor() public {
        scoreId = 0x000000000000000000000000000000009348f5ba3f574f65958a675e468da9c8;
        maxAge = 1 hours;
    }

    function setScoreId(bytes32 _scoreId) external onlyOwner {
        emit ScoreIdUpdated(scoreId, _scoreId);
        scoreId = _scoreId;
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