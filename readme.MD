solana config get

solana logs --url https://api.devnet.solana.com JByXFkytyBzHxtZHPRQoY4qaEumfYK7LQntyyfJBsWYB

solana account "--url" "https://api.devnet.solana.com" JByXFkytyBzHxtZHPRQoY4qaEumfYK7LQntyyfJBsWYB


solana-keygen pubkey /Users/steve/.config/solana/id.json 



## Handle When Fail on middle of deploy
solana-keygen recover -o buffer.json
<12 words>

solana-keygen pubkey buffer.json
solana account <BUFFER_PUBKEY> --url https://api.devnet.solana.com


solana program close 9f3k...AbCd --recipient <YOUR_MAIN_WALLET>
  --keypair buffer.json


## resume when fail in middle tx:

solana program deploy \
  --program-id <PROGRAM_ID_JSON> \
  --buffer <BUFFER_PUBKEY> \
  --buffer-signer buffer.json \
  --upgrade-authority <UPGRADE_AUTH_KEYPAIR> \
  --fee-payer <FEEPAYER_KEYPAIR> \
  --url https://api.devnet.solana.com \
  <PATH_TO_PROGRAM_SO>


pyth devnet
rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ

https://docs.pyth.network/price-feeds/contract-addresses/solana


Crypto.SOL/USD	
0xef0d...80b56d

0xfe65...51decd

7UVimf...1pjLiE


