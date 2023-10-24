// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/IAccessControlDefaultAdminRules.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./AccessControlV2.sol";
import "@openzeppelin/contracts/interfaces/IERC5313.sol";

abstract contract MyAccessControlDefaultAdminRules is
    IAccessControlDefaultAdminRules,
    AccessControlV2,
    IERC5313
{
    address private _currentDefaultAdmin;
    address private _pendingDedaultAdmin;

    uint48 private _pendingDefaultAdminSchedule;
    uint48 private _pendingDelaySchedule;

    uint48 private _currentDelay;
    uint48 private _pendingDelay;

    constructor(uint48 initialDelay, address initialDefaultAdmin) {
        require(
            initialDefaultAdmin != address(0),
            "AccessControl: Default admin address 0"
        );
        _currentDelay = initialDelay;
        _grantRole(DEFAULT_ADMIN_ROLE, initialDefaultAdmin);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IAccessControlDefaultAdminRules).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function owner() public view virtual returns (address) {
        return defaultAdmin();
    }

    function grantRole(
        bytes32 role,
        address account
    ) public virtual override(AccessControlV2, IAccessControl) {
        require(
            role != DEFAULT_ADMIN_ROLE,
            "AccessControlV2:Can't directly grant default role"
        );
        super.grantRole(role, account);
    }

    function revokeRole(
        bytes32 role,
        address account
    ) public virtual override(AccessControlV2, IAccessControl) {
        require(
            role != DEFAULT_ADMIN_ROLE,
            "AccessControlV2:Can't directly revoke default role"
        );
        super.grantRole(role, account);
    }

    function renounceRole(
        bytes32 role,
        address account
    ) public virtual override(AccessControlV2, IAccessControl) {
        if (role == DEFAULT_ADMIN_ROLE && account == defaultAdmin()) {
            (address newDefultAdmin, uint48 schedule) = pendingDefaultAdmin();
            require(
                newDefultAdmin != address(0) &&
                    _isScheduleSet(schedule) &&
                    _hasSchedulePassed(schedule),
                "AccessControlV2: only can renounce in two deplayed states"
            );

            delete _pendingDefaultAdminSchedule;
        }

        super.renounceRole(role, account);
    }

    function _grantRole(
        bytes32 role,
        address account
    ) internal virtual override {
        if (role == DEFAULT_ADMIN_ROLE) {
            require(
                defaultAdmin() == address(0),
                "AccessControlV2: default admin already set"
            );
            _currentDefaultAdmin = account;
        }

        super._grantRole(role, account);
    }

    function _revokeRole(
        bytes32 role,
        address account
    ) internal virtual override {
        if (role == DEFAULT_ADMIN_ROLE && account == defaultAdmin()) {
            delete _currentDefaultAdmin;
        }
        super._revokeRole(role, account);
    }

    function _setRoleAdmin(
        bytes32 role,
        bytes32 roleAdmin
    ) internal virtual override {
        require(
            role != DEFAULT_ADMIN_ROLE,
            "AccessControl: can't violate default admin rules"
        );
        super._setRoleAdmin(role, roleAdmin);
    }

    function defaultAdmin() public view virtual returns (address) {
        return _currentDefaultAdmin;
    }

    function pendingDefaultAdmin()
        public
        view
        virtual
        override
        returns (address newAdmin, uint48 schedule)
    {
        return (_pendingDedaultAdmin, _pendingDefaultAdminSchedule);
    }

    function beginDefaultAdminTransfer(
        address newAdmin
    ) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        _beginDefaultAdminTransfer(newAdmin);
    }

    function _beginDefaultAdminTransfer(address newAdmin) internal virtual {
        uint48 newSchedule = SafeCast.toUint48(block.timestamp) +
            defaultAdminDelay();
        _setPendingDefaultAdmin(newAdmin, newSchedule);
        emit DefaultAdminTransferScheduled(newAdmin, newSchedule);
    }

    function cancelDefaultAdminTransfer()
        public
        virtual
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _cancelDefaultAdminTransfer();
    }

    function _cancelDefaultAdminTransfer() internal virtual {
        _setPendingDefaultAdmin(address(0), 0);
    }

    function acceptDefaultAdminTransfer() public virtual {
        (address newDefaultAdmin, ) = pendingDefaultAdmin();
        require(
            _msgSender() == newDefaultAdmin,
            "AccessControl: only perding adming can accept"
        );
    }

    function _acceptDefaultAdminTransfer() internal virtual {
        (address newDefaultAdmin, uint48 newSchedule) = pendingDefaultAdmin();
        require(
            _isScheduleSet(newSchedule) && _hasSchedulePassed(newSchedule),
            "AccessControlV2: transfer delay not passed"
        );

        _revokeRole(DEFAULT_ADMIN_ROLE, defaultAdmin());
        _grantRole(DEFAULT_ADMIN_ROLE, newDefaultAdmin);

        delete _pendingDedaultAdmin;
        delete _pendingDefaultAdminSchedule;
    }

    function changeDefaultAdminDelay(
        uint48 newDelay
    ) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {}

    function _changeDefaultAdminDelay(uint48 newDelay) internal virtual {
        uint48 newSchedule = SafeCast.toUint48(block.timestamp) +
            _delayChangeWait(newDelay);
        _setPendingDelay(newDelay, newSchedule);

        emit DefaultAdminDelayChangeScheduled(newDelay, newSchedule);
    }

    function defaultAdminDelay() public view virtual returns (uint48) {
        uint48 schedule = _pendingDelaySchedule;
        return
            (_isScheduleSet(schedule) && _hasSchedulePassed(schedule))
                ? _pendingDelay
                : _currentDelay;
    }

    function rollbackDefaultAdminDelay()
        public
        virtual
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _rollbackDefaultAdminDelay();
    }

    function _rollbackDefaultAdminDelay() internal virtual {
        _setPendingDelay(0, 0);
    }

    function pendingDefaultAdminDelay()
        public
        view
        virtual
        returns (uint48 newDelay, uint48 schedule)
    {
        schedule = _pendingDelaySchedule;
        return (
            (_isScheduleSet(schedule) && _hasSchedulePassed(schedule))
                ? (_pendingDelay, schedule)
                : (0, 0)
        );
    }

    function defaultAdminDelayIncreaseWait()
        public
        view
        virtual
        returns (uint48)
    {
        return 5 days;
    }

    function _setPendingDefaultAdmin(
        address newAdmin,
        uint48 newSchedule
    ) private {
        (, uint48 oldSchedule) = pendingDefaultAdmin();
        _pendingDedaultAdmin = newAdmin;
        _pendingDefaultAdminSchedule = newSchedule;

        if (_isScheduleSet(oldSchedule)) {
            emit DefaultAdminTransferCanceled();
        }
    }

    function _isScheduleSet(uint48 schedule) internal pure returns (bool) {
        return schedule != 0;
    }

    function _hasSchedulePassed(uint48 schedule) private view returns (bool) {
        return schedule < block.timestamp;
    }

    function _setPendingDelay(uint48 newDelay, uint48 newSchedule) private {
        uint48 oldSchedule = _pendingDelaySchedule;
        if (_isScheduleSet(oldSchedule)) {
            if (_hasSchedulePassed(oldSchedule)) {
                _currentDelay = _pendingDelay;
            } else {
                emit DefaultAdminDelayChangeCanceled();
            }
        }

        _pendingDelay = newDelay;
        _pendingDelaySchedule = newSchedule;
    }

    function _delayChangeWait(
        uint48 newDelay
    ) internal view virtual returns (uint48) {
        uint48 currentDelay = defaultAdminDelay();
        return
            newDelay > currentDelay
                ? uint48(Math.min(newDelay, defaultAdminDelayIncreaseWait()))
                : newDelay - currentDelay;
    }
}
