use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
<<<<<<< HEAD
=======
    #[msg("Too early to trigger the next payment")]
    TooEarly,
>>>>>>> fa724c2 (feat: initialize controller)
    #[msg("Insufficient funds in the vault")]
    InsufficientFunds,
    #[msg("The program is not approved as a delegate")]
    InvalidDelegate,
    #[msg("Sufficient allowance is not set")]
<<<<<<< HEAD
    LowAllowance,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("The required interval has not yet passed since the last payment")]
    IntervalNotPassed,
=======
    NoAllowance,
>>>>>>> fa724c2 (feat: initialize controller)
}
