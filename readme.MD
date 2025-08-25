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
