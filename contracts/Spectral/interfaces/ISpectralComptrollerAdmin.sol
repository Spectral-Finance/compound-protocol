// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;

interface ISpectralComptrollerAdmin {
    event MinScoreUpdated(uint256 scoreBefore, uint256 scoreAfter);
    event MaxAgeUpdated(uint256 ageBefore, uint256 ageAfter);

    function minScore() external view returns (uint256);
    function maxAge() external view returns (uint256);

    function setMinScore(uint256 _minScore) external;
    function setMaxAge(uint256 _maxAge) external;
}