// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GaslessToken} from "./GaslessToken.sol";

contract GaslessTokenTest is Test {
    GaslessToken token;
    address owner;
    address alice;
    address bob;

    uint256 constant INITIAL_SUPPLY = 1000;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob   = makeAddr("bob");

        token = new GaslessToken(INITIAL_SUPPLY);
    }

    // ── Deployment ───────────────────────────────────────────────

    function test_Name() public view {
        assertEq(token.name(), "GaslessToken");
    }

    function test_Symbol() public view {
        assertEq(token.symbol(), "GLT");
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY * 10 ** token.decimals());
    }

    function test_DeployerReceivesFullSupply() public view {
        assertEq(token.balanceOf(owner), token.totalSupply());
    }

    // ── Transfer ─────────────────────────────────────────────────

    function test_TransferReducesSenderBalance() public {
        uint256 amount = 100 * 10 ** token.decimals();
        uint256 ownerBefore = token.balanceOf(owner);

        token.transfer(alice, amount);

        assertEq(token.balanceOf(owner), ownerBefore - amount);
    }

    function test_TransferIncreasesReceiverBalance() public {
        uint256 amount = 100 * 10 ** token.decimals();

        token.transfer(alice, amount);

        assertEq(token.balanceOf(alice), amount);
    }

    function test_TransferRevertsIfInsufficientBalance() public {
        uint256 amount = token.totalSupply() + 1;

        vm.expectRevert();
        token.transfer(alice, amount);
    }

    function test_TransferRevertsToZeroAddress() public {
        vm.expectRevert();
        token.transfer(address(0), 100);
    }

    // ── Approve / TransferFrom ────────────────────────────────────

    function test_ApproveSetAllowance() public {
        uint256 amount = 50 * 10 ** token.decimals();

        token.approve(alice, amount);

        assertEq(token.allowance(owner, alice), amount);
    }

    function test_TransferFromSpendAllowance() public {
        uint256 amount = 50 * 10 ** token.decimals();

        token.approve(alice, amount);

        // alice ejecuta el transferFrom en nombre del owner
        vm.prank(alice);
        token.transferFrom(owner, bob, amount);

        assertEq(token.balanceOf(bob), amount);
        assertEq(token.allowance(owner, alice), 0);
    }

    function test_TransferFromRevertsWithoutApproval() public {
        uint256 amount = 50 * 10 ** token.decimals();

        vm.prank(alice);
        vm.expectRevert();
        token.transferFrom(owner, bob, amount);
    }

    function test_TransferFromRevertsIfExceedsAllowance() public {
        uint256 approved = 50 * 10 ** token.decimals();
        uint256 attempt  = 51 * 10 ** token.decimals();

        token.approve(alice, approved);

        vm.prank(alice);
        vm.expectRevert();
        token.transferFrom(owner, bob, attempt);
    }

    // ── Fuzz ─────────────────────────────────────────────────────

    function testFuzz_TransferNeverExceedsSupply(uint256 amount) public {
        amount = bound(amount, 0, token.balanceOf(owner));

        token.transfer(alice, amount);

        assertEq(
            token.balanceOf(owner) + token.balanceOf(alice),
            token.totalSupply()
        );
    }
}
