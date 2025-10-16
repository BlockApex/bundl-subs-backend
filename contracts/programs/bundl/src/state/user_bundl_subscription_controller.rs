use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserBundlSubscriptionController {
<<<<<<< HEAD
    pub user: Pubkey,
    pub bundle_counter: u64,
    pub user_token_account: Pubkey, //TODO: maybe redundant store mint account maybe 
=======
    pub authorized_acquirer: Pubkey,
    pub interval: i64,
    pub amount_per_interval: u64,
    pub user_token_account: Pubkey,
>>>>>>> fa724c2 (feat: initialize controller)
    pub bump: u8,
}