pragma solidity ^0.5.16;

import "./CErc20Delegate.sol";

/**
 * @title Compound's CErc20Delegate Contract
 * @notice CTokens which wrap an EIP-20 underlying and are delegated to
 * @author Compound
 */
contract CErc20DelegateTempSOhmMigration is CDelegateInterface, CTokenStorage, CErc20Storage {
    OlympusTokenMigrator public constant MIGRATOR = OlympusTokenMigrator(0x184f3FAd8618a6F458C16bae63F70C426fE784B3);

    /**
     * @notice Construct an empty delegate
     */
    constructor() public {}

    /**
     * @notice Called by the delegator on a delegate to initialize it for duty
     * @param data The encoded bytes data for any initialization
     */
    function _becomeImplementation(bytes calldata data) external {
        // Shh -- currently unused
        data;

        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(msg.sender == address(this) || hasAdminRights(), "!self");

        // Migrate old sOHM to gOHM, set underlying as gOHM, and set cToken name and symbol (replacing "sOHM" with "gOHM")
        if (underlying == MIGRATOR.oldsOHM()) {
            MIGRATOR.migrate(EIP20Interface(underlying).balanceOf(address(this)), OlympusTokenMigrator.TYPE.STAKED, OlympusTokenMigrator.TYPE.WRAPPED);
            underlying = MIGRATOR.gOHM();
            (string memory _name, string memory _symbol) = abi.decode(data, (string, string));
            name = _name;
            symbol = _symbol;
        }
    }

    /**
     * @notice Called by the delegator on a delegate to forfeit its responsibility
     */
    function _resignImplementation() internal {
        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }
    }

    /**
     * @dev Internal function to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementationInternal(address implementation_, bool allowResign, bytes memory becomeImplementationData) internal {
        // Check whitelist
        require(fuseAdmin.cErc20DelegateWhitelist(implementation, implementation_, allowResign), "!impl");

        // Call _resignImplementation internally (this delegate's code)
        if (allowResign) _resignImplementation();

        // Get old implementation
        address oldImplementation = implementation;

        // Store new implementation
        implementation = implementation_;

        // Call _becomeImplementation externally (delegating to new delegate's code)
        _functionCall(address(this), abi.encodeWithSignature("_becomeImplementation(bytes)", becomeImplementationData), "!become");

        // Emit event
        emit NewImplementation(oldImplementation, implementation);
    }

    /**
     * @notice Called by the admin to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementationSafe(address implementation_, bool allowResign, bytes calldata becomeImplementationData) external {
        // Check admin rights
        require(hasAdminRights(), "!admin");

        // Set implementation
        _setImplementationInternal(implementation_, allowResign, becomeImplementationData);
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain `call` is an unsafe replacement for a function call: use this
     * function instead.
     * If `target` reverts with a revert reason, it is bubbled up by this
     * function (like regular Solidity function calls).
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     * @param data The call data (encoded using abi.encode or one of its variants).
     * @param errorMessage The revert string to return on failure.
     */
    function _functionCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.call(data);

        if (!success) {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }

        return returndata;
    }

    /**
     * @notice Function called before all delegator functions
     */
    function _prepare() external payable {}

    /**
     * @notice Returns a boolean indicating if the sender has admin rights
     */
    function hasAdminRights() internal view returns (bool) {
        ComptrollerV3Storage comptrollerStorage = ComptrollerV3Storage(address(comptroller));
        return (msg.sender == comptrollerStorage.admin() && comptrollerStorage.adminHasRights()) || (msg.sender == address(fuseAdmin) && comptrollerStorage.fuseAdminHasRights());
    }
}

interface OlympusTokenMigrator {
    function gOHM() external view returns (address);
    function oldsOHM() external view returns (address);

    enum TYPE {
        UNSTAKED,
        STAKED,
        WRAPPED
    }

    // migrate OHMv1, sOHMv1, or wsOHM for OHMv2, sOHMv2, or gOHM
    function migrate(
        uint256 _amount,
        TYPE _from,
        TYPE _to
    ) external;
}
