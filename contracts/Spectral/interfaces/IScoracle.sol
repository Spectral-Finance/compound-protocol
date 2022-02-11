// SPDX-License-Identifier: MIT
pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

interface IScoracle {
    struct ScoreData {
        uint40 lastUpdated;
        uint216 score;
        bytes extraData;
    }

    function getScore(address _user, bytes32 _scoreTypeJobId) external view returns (ScoreData memory scoreData);
}
