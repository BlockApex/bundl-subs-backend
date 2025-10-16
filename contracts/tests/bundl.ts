import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createApproveInstruction,
  createAssociatedTokenAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";
import { BN } from "bn.js";
import { assert } from "chai";
<<<<<<< HEAD
import * as dotenv from "dotenv";
=======
>>>>>>> fa724c2 (feat: initialize controller)
import { Bundl } from "../target/types/bundl";

dotenv.config();

describe("bundl", () => {
  const secretKey = Uint8Array.from(JSON.parse(process.env.KEY!));
  const bundlKeypair = anchor.web3.Keypair.fromSecretKey(secretKey);

  const recipientSecretKey = Uint8Array.from(
    JSON.parse(process.env.RECIPIENT!)
  );
  const recipientKeyPair =
    anchor.web3.Keypair.fromSecretKey(recipientSecretKey);

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bundl as Program<Bundl>;
  const authority = provider.wallet.publicKey;

  let controllerPda: anchor.web3.PublicKey;
  let controllerBump: number;
<<<<<<< HEAD
  let bundlePda: anchor.web3.PublicKey;
  let bundleBump: number;

  // Token related variables
  let user = provider.wallet.publicKey;
  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let recipientTokenAccount: anchor.web3.PublicKey;

=======
  let user = provider.wallet.publicKey;
  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let authorizedAcquirer: anchor.web3.Keypair;

  // create a keypair for acquirer
  const acquirer = anchor.web3.Keypair.generate();
>>>>>>> fa724c2 (feat: initialize controller)
  before(async () => {
    // Step 1: Create test mint (USDC)
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      user, // mint authority
      null,
      6 // decimals
    );

    // Step 2: Create ATA for user
    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      user
    );

<<<<<<< HEAD
    recipientTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      recipientKeyPair.publicKey // owner of the ATA
    );

=======
>>>>>>> fa724c2 (feat: initialize controller)
    // Step 3: Mint tokens to user
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount,
      user,
      1_000_000_000 // 1000 USDC
    );

    // Step 4: Derive controller PDA
    [controllerPda, controllerBump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("controller"), user.toBuffer()],
        program.programId
      );
  });

<<<<<<< HEAD
  describe("initialize controller", async () => {
    describe("given half amount is approved", async () => {
=======
  describe("when amount is approved", async () => {
    before(async () => {
      // Step 5: Approve PDA to spend
      const approveIx = createApproveInstruction(
        userTokenAccount,
        controllerPda,
        user,
        500_000_000 // Approve 500 USDC
      );

      const tx = new anchor.web3.Transaction().add(approveIx);
      await provider.sendAndConfirm(tx);
    });

    it("Initializes a controller account", async () => {
      // Call the initialize_controller instruction
      await program.methods
        .initializeController(acquirer.publicKey, new BN(500_000_000))
        .accounts({
          authority: authority,
          mintAccount: mint,
          // controller: controllerPda, // you can add this, but it is auto derived so no need
          // systemProgram: anchor.web3.SystemProgram.programId, // also auto added
        })
        .rpc();

      // Fetch the account
      const controllerAccount =
        await program.account.userBundlSubscriptionController.fetch(
          controllerPda
        );

      // Check controller values
      assert.ok(
        controllerAccount.authorizedAcquirer.equals(acquirer.publicKey)
      );
      assert.strictEqual(controllerAccount.interval.toNumber(), 28);
      assert.strictEqual(controllerAccount.amountPerInterval.toNumber(), 0);
    });

    it("when half amount is approved", async () => {
>>>>>>> fa724c2 (feat: initialize controller)
      before(async () => {
        // Step 5: Approve PDA to spend
        const approveIx = createApproveInstruction(
          userTokenAccount,
          controllerPda,
          user,
          250_000_000 // Approve 500 USDC
        );

        const tx = new anchor.web3.Transaction().add(approveIx);
        await provider.sendAndConfirm(tx);
      });

<<<<<<< HEAD
      it("fails with `LowAllowance`", async () => {
        let failed = false;
        try {
          // Call the instruction without approving the PDA
          await program.methods
            .initializeController()
=======
      it("fails with `NoAllowance`", async () => {
        try {
          // Call the instruction without approving the PDA
          await program.methods
            .initializeController(
              acquirer.publicKey,
              new anchor.BN(500_000_000)
            ) // 500 USDC
>>>>>>> fa724c2 (feat: initialize controller)
            .accounts({
              authority: authority,
              mintAccount: mint,
            })
            .signers([]) // authority already set in provider
            .rpc();
        } catch (err) {
<<<<<<< HEAD
          failed = true;
          // console.log(err);
          assert.ok(err.error.errorCode.code === "LowAllowance");
        }
        assert.ok(failed, "Expected call to fail but it succeeded");
      });
    });

    describe("given amount is approved", async () => {
      before(async () => {
        // Step 5: Approve PDA to spend
        const approveIx = createApproveInstruction(
          userTokenAccount,
          controllerPda,
          user,
          1_000_000_000 // Approve 1,000 USDC
        );

        const tx = new anchor.web3.Transaction().add(approveIx);
        await provider.sendAndConfirm(tx);
      });

      it("Initializes a controller account", async () => {
        // Call the initialize_controller instruction
        await program.methods
          .initializeController()
          .accounts({
            authority: authority,
            mintAccount: mint,
            // controller: controllerPda, // you can add this, but it is auto derived so no need
            // systemProgram: anchor.web3.SystemProgram.programId, // also auto added
          })
          .rpc();

        // Fetch the account
        const controllerAccount =
          await program.account.userBundlSubscriptionController.fetch(
            controllerPda
          );

        // Check controller values
        assert.ok(controllerAccount.user.equals(authority));
        assert.ok(controllerAccount.userTokenAccount.equals(userTokenAccount));
        assert.ok(controllerAccount.bundleCounter.toNumber() == 0);
        assert.ok(controllerAccount.bump === controllerBump);
      });
    });

    it("when amount is not approved, then fails with `InvalidDelegate`", async () => {
      let failed = false;
      try {
        // Call the instruction without approving the PDA
        await program.methods
          .initializeController()
          .accounts({
            authority: authority,
            mintAccount: mint,
          })
          .signers([]) // authority already set in provider
          .rpc();
      } catch (err) {
        failed = true;
        assert.ok(err.error.errorCode.code === "InvalidDelegate");
      }
      assert.ok(failed, "Expected call to fail but it succeeded");
    });
  });

  describe("add bundle", async () => {
    before(async () => {
      // Step 5: Approve PDA to spend
      const approveIx = createApproveInstruction(
        userTokenAccount,
        controllerPda,
        user,
        500_000_000 // Approve 500 USDC
      );

      const tx = new anchor.web3.Transaction().add(approveIx);
      await provider.sendAndConfirm(tx);

      // // Call the initialize_controller instruction
      // await program.methods
      //   .initializeController()
      //   .accounts({
      //     authority: authority,
      //     mintAccount: mint,
      //   })
      //   .rpc();
    });

    it("Adds a bundle", async () => {
      const amountPerInterval = 100_000_000; // 100 USDC
      const interval = 30 * 24 * 60 * 60; // 30 days in seconds
      const seed = Buffer.alloc(8);
      seed.writeBigUInt64LE(BigInt(0));

      // Call the add_bundle instruction
      await program.methods
        .addBundle(new BN(amountPerInterval), new BN(interval))
        .accounts({
          authority: authority,
        })
        .rpc();

      [bundlePda, bundleBump] =
        await anchor.web3.PublicKey.findProgramAddressSync(
          [seed, controllerPda.toBuffer()],
          program.programId
        );

      // fetch the controller account to check bundle counter increment
      const controllerAccount =
        await program.account.userBundlSubscriptionController.fetch(
          controllerPda
        );

      // Fetch the bundle account
      const bundleAccount = await program.account.bundle.fetch(bundlePda);

      // Check controller values
      assert.ok(controllerAccount.bundleCounter.toNumber() == 1);

      // Check bundle values
      assert.ok(bundleAccount.bundleIdentifier.toNumber() == 0);
      assert.ok(
        bundleAccount.amountPerInterval.toNumber() == amountPerInterval
      );
      assert.ok(bundleAccount.interval.toNumber() == interval);
      assert.ok(bundleAccount.lastPaid.toNumber() == 0);
    });
  });

  describe("trigger", async () => {
    it("given incorrect authority, it fails with `Unauthorized`", async () => {
      const bundleIdentifier = 0;

      let failed = false;
      try {
        await program.methods
          .trigger(new BN(bundleIdentifier))
          .accounts({
            authority: authority,
            user: user,
            mintAccount: mint,
            recipient: recipientKeyPair.publicKey,
          })
          .rpc();
      } catch (err: any) {
        failed = true;
        // console.log(err)
        assert.equal(err.error.errorCode.code, "Unauthorized");
      }

      assert.ok(failed, "Expected call to fail but it succeeded");
    });

    it("given first time payment, it triggers a bundle payment", async () => {
      // get balance of recipient before
      const recipientBefore = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      // get balance of user before
      const userBefore = await provider.connection.getTokenAccountBalance(
        userTokenAccount
      );

      const bundleIdentifier = 0;
      await program.methods
        .trigger(new BN(bundleIdentifier))
        .accounts({
          authority: bundlKeypair.publicKey,
          user: user,
          mintAccount: mint,
          recipient: recipientKeyPair.publicKey,
        })
        .signers([bundlKeypair])
        .rpc();

      // get balance of recipient after
      const recipientAfter = await provider.connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      // fetch bundle account to check last paid update
      const bundleAccount = await program.account.bundle.fetch(bundlePda);

      // check the difference
      const difference =
        recipientAfter.value.uiAmount! - recipientBefore.value.uiAmount!;
      assert.ok(
        difference === bundleAccount.amountPerInterval.toNumber() / 1_000_000
      ); // 100 USDC

      // get balance of user after
      const userAfter = await provider.connection.getTokenAccountBalance(
        userTokenAccount
      );
      const userDifference =
        userBefore.value.uiAmount! - userAfter.value.uiAmount!;
      assert.ok(
        userDifference ===
          bundleAccount.amountPerInterval.toNumber() / 1_000_000
      ); // 100 USDC

      // assert last paid is updated
      const now = Math.floor(Date.now() / 1000);
      // allow a difference of 5 seconds
      assert.ok(bundleAccount.lastPaid.toNumber() >= now - 5);
    });

    it("given time has not elapsed, it fails with `IntervalNotPassed`", async () => {
      let failed = false;
      try {
        const bundleIdentifier = 0;
        await program.methods
          .trigger(new BN(bundleIdentifier))
          .accounts({
            authority: bundlKeypair.publicKey,
            user: user,
            mintAccount: mint,
            recipient: recipientKeyPair.publicKey,
          })
          .signers([bundlKeypair])
          .rpc();
      } catch (err: any) {
        // console.log(err)
        failed = true;
        assert.equal(err.error.errorCode.code, "IntervalNotPassed");
      }
      assert.ok(failed, "Expected call to fail but it succeeded");
    });

    it("respects the interval — fails before 30s, succeeds after", async () => {
      const amountPerInterval = new BN(100_000_000); // 100 USDC
      const interval = new BN(30); // 30 seconds
      const bundleIdentifier = 1; // new bundle

      // Create a new bundle with 30s interval
      await program.methods
        .addBundle(amountPerInterval, interval)
        .accounts({
          authority: authority,
        })
        .rpc();

      // Trigger once — should succeed and set `last_paid`
      await program.methods
        .trigger(new BN(bundleIdentifier))
        .accounts({
          authority: bundlKeypair.publicKey,
          user: user,
          mintAccount: mint,
          recipient: recipientKeyPair.publicKey,
        })
        .signers([bundlKeypair])
        .rpc();

      // Immediate re-trigger should fail
      let failed = false;
      try {
        await program.methods
          .trigger(new BN(bundleIdentifier))
          .accounts({
            authority: bundlKeypair.publicKey,
            user: user,
            mintAccount: mint,
            recipient: recipientKeyPair.publicKey,
          })
          .signers([bundlKeypair])
          .rpc();
      } catch (err: any) {
        failed = true;
        assert.equal(err.error.errorCode.code, "IntervalNotPassed");
      }
      assert.ok(failed, "Expected IntervalNotPassed error");

      // Wait 31 seconds
      await new Promise((res) => setTimeout(res, 31_000));

      // Call trigger again — should now succeed
      await program.methods
        .trigger(new BN(bundleIdentifier))
        .accounts({
          authority: bundlKeypair.publicKey,
          user: user,
          mintAccount: mint,
          recipient: recipientKeyPair.publicKey,
        })
        .signers([bundlKeypair])
        .rpc();
    });
=======
          assert.ok(err.error.errorCode.code === "NoAllowance");
        }
      });
    });
  });

  it("when amount is not approved, then fails with `InvalidDelegate`", async () => {
    try {
      // Call the instruction without approving the PDA
      await program.methods
        .initializeController(acquirer.publicKey, new anchor.BN(500_000_000)) // 500 USDC
        .accounts({
          authority: authority,
          mintAccount: mint,
        })
        .signers([]) // authority already set in provider
        .rpc();
    } catch (err) {
      assert.ok(err.error.errorCode.code === "InvalidDelegate");
    }
>>>>>>> fa724c2 (feat: initialize controller)
  });
});
