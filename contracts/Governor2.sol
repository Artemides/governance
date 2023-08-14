// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

abstract contract Governor2 is
    IGovernor,
    Context,
    ERC165,
    EIP712,
    IERC721Receiver,
    IERC1155Receiver
{
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;

    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,uint8 support)");
    bytes32 public constant EXTENDED_BALLOT_TYPEHASH =
        keccak256(
            "ExtendedBallot(uint256 proposalId,uint8 support,string reason, bytes params)"
        );

    struct ProposalCore {
        address proposer;
        uint64 voteStart;
        bytes4 __gap_unused0;
        uint64 voteEnd;
        bytes4 __gap_unused1;
        bool executed;
        bool canceled;
    }

    string private _name;
    mapping(uint256 => ProposalCore) _proposals;
    DoubleEndedQueue.Bytes32Deque private _governanceCall;

    modifier onlyGovernance() {
        require(_msgSender() == _executor(), "Governor: onlyGovernor");

        if (_executor() != address(this)) {
            bytes32 msgDataHash = keccak256(_msgData());
            while (_governanceCall.popFront() != msgDataHash) {}
        }
        _;
    }

    constructor(string memory name_) EIP712(name_, version()) {
        _name = name_;
    }

    function version() public view virtual override returns (string memory) {
        return "1";
    }

    function _executor() internal view virtual returns (address) {
        return address(this);
    }

    receive() external payable virtual {
        require(
            _executor() == address(this),
            "Governor: must send to executor"
        );
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC165) returns (bool) {
        bytes4 governorCancelId = this.cancel.selector ^
            this.proposalProposer.selector;

        bytes4 governorParamsId = this.castVoteWithReasonAndParams.selector ^
            this.castVoteWithReasonAndParamsBySig.selector ^
            this.getVotesWithParams.selector;
        bytes4 governor43Id = type(IGovernor).interfaceId ^
            type(IERC6372).interfaceId ^
            governorCancelId ^
            governorParamsId;
        bytes4 governor46Id = type(IGovernor).interfaceId ^
            type(IERC6372).interfaceId ^
            governorCancelId;
        return
            interfaceId == governor43Id ||
            interfaceId == governor46Id ||
            interfaceId == governorCancelId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override returns (uint256) {
        address proposer = _msgSender();
        require(
            _isValidDescriptionForProposer(proposer, description),
            "Governor: proposer restricted"
        );

        uint256 currentTime = clock();
        require(
            getVotes(proposer, currentTime - 1) >= proposalThreshold(),
            "Governor: proposer votes below proposal threshold"
        );

        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            keccak256(bytes(description))
        );

        require(targets.length > 0, "Governor: Empty proposal");
        require(
            targets.length == values.length,
            "Governor: invalidad proposal length"
        );
        require(
            targets.length == calldatas.length,
            "Governor: Invalid proposal Length"
        );
        require(
            _proposals[proposalId].voteStart == 0,
            "Governor: Proposal Already exists"
        );
        uint256 snapshot = currentTime + votingDelay();
        uint256 deadline = snapshot + votingPeriod();

        _proposals[proposalId] = ProposalCore(
            proposer,
            SafeCast.toUint64(snapshot),
            0,
            SafeCast.toUint64(deadline),
            0,
            false,
            false
        );

        emit ProposalCreated(
            proposalId,
            proposer,
            targets,
            values,
            new string[](targets.length),
            calldatas,
            snapshot,
            deadline,
            description
        );
        return proposalId;
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 description
    ) public payable virtual override returns (uint256) {
        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            description
        );

        ProposalState currentState = state(proposalId);
        require(
            currentState == ProposalState.Succeeded ||
                currentState == ProposalState.Queued,
            "Governor: Proposal not successful"
        );

        _proposals[proposalId].executed = true;

        emit ProposalExecuted(proposalId);
        //get proposal Id
        //get proposal state
        //require succedd or queued
        // turn execute true
        // emit execute event
        //run before Execute
        //run _execute
        //run _after execute
        //return proposal Id
        return proposalId;
    }

    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override returns (uint256) {
        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            descriptionHash
        );

        require(
            state(proposalId) == ProposalState.Pending,
            "Governor: too late to cancel"
        );

        require(
            _msgSender() == _proposals[proposalId].proposer,
            "Governor: only Proposer can cancel"
        );

        return _cancel(targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual returns (uint256) {
        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            descriptionHash
        );

        ProposalState currentState = state(proposalId);
        require(
            currentState != ProposalState.Canceled &&
                currentState != ProposalState.Expired &&
                currentState != ProposalState.Executed,
            "Governor: ProposalNotActive"
        );

        _proposals[proposalId].canceled = true;

        emit ProposalCanceled(proposalId);
        return proposalId;
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public pure virtual override returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encode(targets, values, calldatas, descriptionHash)
                )
            );
    }

    function state(
        uint256 proposalId
    ) public view virtual override returns (ProposalState) {
        ProposalCore storage proposal = _proposals[proposalId];

        if (proposal.executed) {
            return ProposalState.Executed;
        }
        if (proposal.canceled) {
            return ProposalState.Executed;
        }

        uint256 snapshot = proposalSnapshot(proposalId);
        if (snapshot == 0) {
            revert("Governor: unknown proposal id");
        }

        uint256 currentTimePoint = clock();

        if (snapshot >= currentTimePoint) {
            return ProposalState.Pending;
        }

        uint256 deadline = proposalDeadline(proposalId);

        if (deadline >= currentTimePoint) {
            return ProposalState.Active;
        }
        if (_quorumReached(proposalId) && _voteSucceeded(proposalId)) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    function castVoteWithReasonAndParams(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params
    ) public virtual override returns (uint256) {
        address voter = _msgSender();
        return _castVote(proposalId, voter, support, reason, params);
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason
    ) internal virtual returns (uint256) {
        return
            _castVote(proposalId, account, support, reason, _defaultParams());
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason,
        bytes memory params
    ) internal virtual returns (uint256) {
        ProposalCore storage proposal = _proposals[proposalId];
        require(
            state(proposalId) == ProposalState.Active,
            "Governor: voting not currently active"
        );
        uint256 weight = _getVotes(account, proposal.voteStart, params);
        _countVote(proposalId, account, support, weight, params);
        if (params.length == 0) {
            emit VoteCast(account, proposalId, support, weight, reason);
        } else {
            emit VoteCastWithParams(
                account,
                proposalId,
                support,
                weight,
                reason,
                params
            );
        }
        return weight;
    }

    function castVoteWithReasonAndParamsBySig(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override returns (uint256) {
        address voter = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        EXTENDED_BALLOT_TYPEHASH,
                        proposalId,
                        support,
                        keccak256(bytes(reason)),
                        keccak256(params)
                    )
                )
            ),
            v,
            r,
            s
        );

        return _castVote(proposalId, voter, support, reason, params);
    }

    function _getVotes(
        address account,
        uint256 timepoint,
        bytes memory params
    ) internal view virtual returns (uint256) {}

    function getVotesWithParams(
        address account,
        uint256 timepoint,
        bytes memory params
    ) public view virtual override returns (uint256) {
        return _getVotes(account, timepoint, params);
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory params
    ) internal virtual;

    function _defaultParams() internal view virtual returns (bytes memory) {
        return "";
    }

    function _quorumReached(
        uint256 proposalId
    ) internal view virtual returns (bool) {}

    function _voteSucceeded(
        uint256 proposalId
    ) internal view virtual returns (bool) {}

    function proposalSnapshot(
        uint256 proposalId
    ) public view virtual override returns (uint256) {
        return _proposals[proposalId].voteStart;
    }

    function proposalDeadline(
        uint256 proposalId
    ) public view virtual override returns (uint256) {
        return _proposals[proposalId].voteEnd;
    }

    function proposalProposer(
        uint256 proposalId
    ) public view virtual override returns (address) {
        return _proposals[proposalId].proposer;
    }

    function proposalThreshold() public view virtual returns (uint256) {
        return 0;
    }

    function _isValidDescriptionForProposer(
        address proposer,
        string memory description
    ) internal view virtual returns (bool) {
        uint256 len = bytes(description).length;

        // Length is too short to contain a valid proposer suffix
        if (len < 52) {
            return true;
        }

        // Extract what would be the `#proposer=0x` marker beginning the suffix
        bytes12 marker;
        assembly {
            // - Start of the string contents in memory = description + 32
            // - First character of the marker = len - 52
            //   - Length of "#proposer=0x0000000000000000000000000000000000000000" = 52
            // - We read the memory word starting at the first character of the marker:
            //   - (description + 32) + (len - 52) = description + (len - 20)
            // - Note: Solidity will ignore anything past the first 12 bytes
            marker := mload(add(description, sub(len, 20)))
        }

        // If the marker is not found, there is no proposer suffix to check
        if (marker != bytes12("#proposer=0x")) {
            return true;
        }

        // Parse the 40 characters following the marker as uint160
        uint160 recovered = 0;
        for (uint256 i = len - 40; i < len; ++i) {
            (bool isHex, uint8 value) = _tryHexToUint(bytes(description)[i]);
            // If any of the characters is not a hex digit, ignore the suffix entirely
            if (!isHex) {
                return true;
            }
            recovered = (recovered << 4) | value;
        }

        return recovered == uint160(proposer);
    }

    function _tryHexToUint(bytes1 char) private pure returns (bool, uint8) {
        uint8 c = uint8(char);
        unchecked {
            // Case 0-9
            if (47 < c && c < 58) {
                return (true, c - 48);
            }
            // Case A-F
            else if (64 < c && c < 71) {
                return (true, c - 55);
            }
            // Case a-f
            else if (96 < c && c < 103) {
                return (true, c - 87);
            }
            // Else: not a hex char
            else {
                return (false, 0);
            }
        }
    }
}
