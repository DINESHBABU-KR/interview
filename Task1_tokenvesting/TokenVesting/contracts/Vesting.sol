//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
   
   struct VestingScheuleInfo {
    uint256 totalAllocation;
    uint256 startTime;
    uint256 cliffDuration;
    uint256 vestingDuration;
    uint256 amountClaimed;
    bool revoked;
    bool exists;
    }

    mapping(address => VestingScheuleInfo) public vestingSchedules;

    uint256 public totalAllocated;
   
    event ScheduleCreated(
        address indexed beneficiary,
        uint256 totalAllocation,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensClaimed(address indexed beneficiary, uint256 amountClaimed);
    event ScheduleRevoked(address indexed beneficiary, uint256 unvestedAmountReturned);
    event EmergencyWithdrawal(address indexed owner, uint256 amountWithdrawn);

    constructor(address _token) Ownable(msg.sender) {
        require(address(_token) != address(0), "Token address cannot be zero");
        token = IERC20(_token);
    }

     function createVestingSchedule(
        address beneficiary,
        uint256 totalAllocation,
        uint256 startTimestamp,
        uint256 cliffDuration,
        uint256 vestingDuration
    ) public onlyOwner {
        require(beneficiary != address(0), "Vesting: beneficiary is zero address");
        require(totalAllocation > 0, "Vesting: allocation must be > 0");
        require(vestingDuration > 0, "Vesting: duration must be > 0");
        require(cliffDuration <= vestingDuration, "Vesting: cliff exceeds duration");
        require(!vestingSchedules[beneficiary].exists, "Vesting: schedule already exists");

        vestingSchedules[beneficiary] = VestingScheuleInfo(
            totalAllocation,
            startTimestamp,
            cliffDuration,
            vestingDuration,
            0,
            false,
            true
        );

        totalAllocated += totalAllocation;
        require(
            token.balanceOf(address(this)) >= totalAllocated,
            "Vesting: insufficient token balance for allocation"
        );

        emit ScheduleCreated(
            beneficiary,
            totalAllocation,
            startTimestamp,
            cliffDuration,
            vestingDuration
        );
    }

     function createVestingSchedulesBatch(
        address[] calldata beneficiaries,
        uint256[] calldata totalAllocations,
        uint256[] calldata startTimestamps,
        uint256[] calldata cliffDurations,
        uint256[] calldata vestingDurations
    ) external onlyOwner {
        uint256 len = beneficiaries.length;
        require(
            len == totalAllocations.length &&
            len == startTimestamps.length &&
            len == cliffDurations.length &&
            len == vestingDurations.length,
            "Vesting: array length mismatch"
        );

        for (uint256 i = 0; i < len; i++) {
            createVestingSchedule(
                beneficiaries[i],
                totalAllocations[i],
                startTimestamps[i],
                cliffDurations[i],
                vestingDurations[i]
            );
        }
    }

    function claimableAmount(address beneficiary) public view returns (uint256) {
        VestingScheuleInfo memory s = vestingSchedules[beneficiary];
        if (!s.exists) return 0;

        uint256 vested = _vestedAmount(s);
        return vested - s.amountClaimed;
    }

    function _vestedAmount(VestingScheuleInfo memory s) internal view returns (uint256) {
        if (block.timestamp < s.startTime + s.cliffDuration) {
            return 0;
        }

        uint256 elapsed = block.timestamp - s.startTime;

        if (elapsed >= s.vestingDuration) {
            return s.totalAllocation;
        }

        return (s.totalAllocation * elapsed) / s.vestingDuration;
    }

    function claim() external nonReentrant {
        VestingScheuleInfo storage s = vestingSchedules[msg.sender];
        require(s.exists, "Vesting: no schedule for caller");
        require(!s.revoked, "Vesting: schedule revoked");

        uint256 claimable = claimableAmount(msg.sender);
        require(claimable > 0, "Vesting: nothing to claim");

        s.amountClaimed += claimable;

        token.safeTransfer(msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable);
    }

    function revokeSchedule(address beneficiary) external onlyOwner nonReentrant {
        VestingScheuleInfo storage s = vestingSchedules[beneficiary];
        require(s.exists, "Vesting: no schedule");
        require(!s.revoked, "Vesting: already revoked");

        uint256 vested = _vestedAmount(s);
        uint256 unvested = s.totalAllocation - vested;

        s.revoked = true;
        s.totalAllocation = vested;
        totalAllocated -= unvested;

        if (unvested > 0) {
            token.safeTransfer(owner(), unvested);
        }

        emit ScheduleRevoked(beneficiary, unvested);
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = token.balanceOf(address(this));
        uint256 outstanding = totalAllocated - _totalClaimedAcrossAll();
       
        require(amount <= balance - outstanding, "Vesting: cannot withdraw committed tokens");

        token.safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(owner(), amount);
    }

    function _totalClaimedAcrossAll() internal pure returns (uint256) {
        return 0;
    }

    function getSchedule(address beneficiary) external view returns (VestingScheuleInfo memory) {
        return vestingSchedules[beneficiary];
    }

}