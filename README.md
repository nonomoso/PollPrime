# PredictHaven

**Encrypted prediction markets powered by Zama FHEVM**

PredictHaven enables private prediction markets where bet amounts, positions, and strategies remain encrypted throughout market operations. Built on Zama's Fully Homomorphic Encryption Virtual Machine (FHEVM), the platform computes odds, tracks positions, and resolves markets over encrypted data—revealing only final outcomes and payouts.

---

## Product Overview

PredictHaven is a decentralized prediction market platform that combines the transparency of blockchain with the privacy of fully homomorphic encryption. Traders can participate in markets on sports, politics, technology, and custom events without exposing their positions or strategies to other participants or market makers.

**Core Value**: Private position management with public market outcomes.

---

## Key Differentiators

### Privacy-First Trading
Unlike traditional prediction markets where all positions are visible, PredictHaven encrypts individual positions using Zama FHEVM, preventing front-running and strategy copying.

### Homomorphic Market Operations
Market mechanics—odds calculation, position tracking, payout computation—execute over encrypted data without decryption, ensuring privacy while maintaining market integrity.

### Decentralized Resolution
Market outcomes resolved on-chain with cryptographic proofs, eliminating need for trusted oracles or centralized resolution.

### Fair Market Access
Encrypted positions prevent market manipulation and ensure all participants operate on equal footing, regardless of position size.

---

## Market Flow

### 1. Market Creation
- Creator defines event, outcomes, and closing conditions
- Market contract deployed with encrypted initialization
- Opening parameters set (minimum stake, fee structure)

### 2. Position Entry
- Trader encrypts stake amount using FHE public key
- Encrypted position submitted to market contract
- Position tracked in encrypted ledger (amounts invisible)

### 3. Market Operations
- **Odds Calculation**: Computed homomorphically from encrypted position totals
- **Liquidity Pools**: Managed over encrypted stake amounts
- **Price Discovery**: Automatic market making over encrypted data

### 4. Market Resolution
- Outcome determined by oracle or designated resolver
- Payouts computed homomorphically from encrypted positions
- Final results revealed with cryptographic proofs

### 5. Settlement
- Winners receive payouts based on encrypted position sizes
- Market fees distributed over encrypted calculations
- All positions settled transparently

---

## Architecture Components

### Smart Contract Layer

```solidity
contract PredictHavenMarket {
    // Encrypted market state
    mapping(address => euint64) private encryptedPositions;
    euint64 private encryptedTotalStake;
    euint64 private encryptedPoolBalance;
    
    // Market operations
    function enterPosition(bytes calldata encryptedStake) external;
    function computeOdds() external view returns (euint64[] memory);
    function resolveMarket(uint256 outcomeId) external;
    function claimPayout() external;
}
```

### Frontend Layer
- **React/TypeScript**: User interface for market interaction
- **Wallet Integration**: MetaMask, WalletConnect support
- **FHE Client**: Encrypts stakes before submission
- **Market Dashboard**: Real-time odds and position tracking (aggregated only)

### Backend Services (Optional)
- **Oracle Integration**: Outcome determination
- **Market Analytics**: Aggregate statistics computation
- **Notification Service**: Market updates and resolutions

---

## Market Types Supported

### Binary Markets
- Yes/No outcomes (e.g., "Will Team A win?")
- Simplified odds calculation
- Fast resolution and settlement

### Multiple Choice Markets
- Multiple outcome options
- Complex odds distribution
- Proportional payout structure

### Scalar Markets
- Numerical outcome ranges
- Continuous pricing
- Graduated payouts

### Conditional Markets
- Nested conditions (e.g., "Team A wins AND score > 3")
- Complex logic evaluation
- Combined outcome resolution

---

## Privacy Model

### Encrypted Throughout Lifecycle

| Stage | Data Privacy |
|-------|-------------|
| Position Entry | Stake amount encrypted |
| Market Operations | All positions encrypted |
| Odds Calculation | Computed over encrypted totals |
| Position Tracking | Individual positions encrypted |
| Market Resolution | Outcome public, positions encrypted |
| Payout Calculation | Computed homomorphically |
| Settlement | Winners revealed, amounts disclosed |

### What's Public
- Market creation parameters
- Market outcome
- Final odds (aggregate statistics)
- Total market volume
- Winner addresses (after resolution)

### What's Private
- Individual stake amounts
- Position sizes
- Trading strategies
- Entry/exit timing
- Profit/loss until resolution

---

## Technical Specifications

### FHE Operations

**Encrypted Types:**
```solidity
euint64 encryptedStake;      // Position amount
euint64 encryptedOdds;        // Calculated odds
euint64 encryptedPayout;     // Payout amount
euint32 encryptedTimestamp;  // Position timing
```

**Homomorphic Functions:**
- **Summation**: Aggregate total stakes across positions
- **Division**: Calculate odds from stake distribution
- **Multiplication**: Compute payouts from odds and stakes
- **Comparison**: Determine winners and losers
- **Conditional**: Handle complex market logic

### Gas Optimization

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Create market | ~500,000 | One-time setup |
| Enter position | ~150,000 | Per position |
| Compute odds | ~300,000 | Periodic updates |
| Resolve market | ~200,000 | Outcome resolution |
| Claim payout | ~100,000 | Per winner |

**Optimization Techniques:**
- Batch position updates
- Cache encrypted intermediate results
- Defer expensive operations until resolution
- Off-chain aggregation for large markets

---

## Use Cases

### Sports Betting Markets
**Scenario**: Private betting on game outcomes  
**Benefit**: Positions remain secret until game completion  
**Example**: Football match results, tournament winners, player statistics

### Political Prediction Markets
**Scenario**: Prediction markets for elections and political events  
**Benefit**: Prevent market manipulation through position visibility  
**Example**: Election outcomes, policy decisions, approval ratings

### Technology Forecasting
**Scenario**: Markets on tech developments and product launches  
**Benefit**: Trade on predictions without revealing conviction levels  
**Example**: Product release dates, feature adoption, market share

### Custom Event Markets
**Scenario**: User-created markets on any topic  
**Benefit**: Decentralized market creation with private participation  
**Example**: Community events, personal milestones, creative competitions

---

## Getting Started

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/predichaven.git
cd predicthaven

# Install dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Configuration

Create `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
FHEVM_NODE_URL=https://your-fhevm-node.com
CONTRACT_ADDRESS=0x...
```

### Deployment

```bash
# Deploy smart contracts
npx hardhat run scripts/deploy.js --network sepolia

# Start frontend
cd frontend
npm run dev
```

### First Market

1. **Connect Wallet**: Use MetaMask to connect to Sepolia
2. **Create Market**: Define event, outcomes, closing time
3. **Fund Position**: Encrypt stake amount and submit
4. **Monitor**: Watch aggregated odds (position private)
5. **Resolve**: Market resolves automatically or manually
6. **Claim**: Winners claim payouts automatically

---

## Development Guide

### Project Structure

```
predichaven/
├── contracts/          # Solidity smart contracts
│   ├── PredictHavenMarket.sol
│   └── MarketFactory.sol
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/     # FHEVM integration
│   │   └── pages/
├── scripts/           # Deployment scripts
└── test/             # Contract tests
```

### Smart Contract Development

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy
npx hardhat run scripts/deploy.js --network sepolia
```

### Frontend Development

```bash
cd frontend
npm run dev        # Development server
npm run build      # Production build
npm test           # Run tests
```

### Testing FHE Operations

```bash
# Test homomorphic operations
npx hardhat test test/FHEMarket.test.js

# Test with mock FHEVM
npm run test:fhevm
```

---

## Security Considerations

### Smart Contract Security

**Best Practices:**
- Audit all contract code before mainnet deployment
- Use established libraries for FHE operations
- Implement access controls for market resolution
- Add circuit breakers for emergency situations

**Known Risks:**
- FHE key compromise (mitigated by threshold key management)
- Oracle manipulation (use multiple oracles)
- Gas limit exhaustion (optimize operations)

### Operational Security

**Key Management:**
- Store FHE keys in hardware wallets
- Use threshold cryptography for key fragments
- Implement key rotation policies
- Secure backup and recovery procedures

**Privacy Considerations:**
- Batch transactions to reduce timing analysis
- Use anonymous addresses for maximum privacy
- Implement delayed reveal mechanisms
- Regular privacy audits

---

## Roadmap

### Q1 2025: Core Platform ✅
- Basic market creation and participation
- Encrypted position management
- Homomorphic odds calculation
- Market resolution and settlement

### Q2 2025: Enhanced Features 🔄
- Multiple market types (scalar, conditional)
- Advanced analytics dashboard
- Mobile application
- Social features and sharing

### Q3 2025: Enterprise Tools 📋
- API for third-party integrations
- Custom market templates
- Advanced risk management
- Institutional features

### Q4 2025: Ecosystem Growth 📋
- Governance token and DAO
- Cross-chain compatibility
- Market aggregator support
- Educational resources

---

## Contributing

We welcome contributions from developers, cryptographers, and prediction market enthusiasts!

**Areas for Contribution:**
- FHE optimization and gas reduction
- Security audits and formal verification
- UI/UX improvements
- Additional market types
- Documentation and tutorials

**How to Contribute:**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

**Code Standards:**
- Follow Solidity style guide
- Maintain 85%+ test coverage
- Document all public functions
- Run linters before submitting

---

## FAQ

**Q: How private are my positions if they're on a public blockchain?**  
A: Positions are encrypted using FHE before submission. Only encrypted ciphertexts are stored on-chain, and all market operations happen homomorphically without decryption.

**Q: Can I see other people's positions?**  
A: No. Individual positions are encrypted. You can only see aggregate statistics like total market volume and current odds.

**Q: How are markets resolved?**  
A: Markets can be resolved by designated oracles, community consensus, or automatically based on on-chain data sources.

**Q: What happens if the FHE keys are lost?**  
A: Keys are managed using threshold cryptography. As long as a quorum of key holders is available, markets can be resolved and payouts distributed.

**Q: How expensive are FHE operations?**  
A: FHE operations have higher gas costs than plaintext operations, but PredictHaven uses optimization techniques to keep costs reasonable. Typical position entry costs ~150k gas.

**Q: Can I create custom markets?**  
A: Yes! PredictHaven supports user-created markets on any topic with customizable parameters.

**Q: Are markets auditable?**  
A: Yes. All market operations are recorded on-chain with cryptographic proofs, ensuring full auditability while maintaining position privacy.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

PredictHaven is built on cutting-edge privacy technology:

- **[Zama FHEVM](https://www.zama.ai/fhevm)**: Fully Homomorphic Encryption Virtual Machine enabling private computation on Ethereum
- **[Zama](https://www.zama.ai/)**: Leading FHE research and developer tooling
- **Ethereum Foundation**: Decentralized infrastructure and standards

Special thanks to the Zama team for pioneering fully homomorphic encryption on EVM-compatible chains and making private computation accessible to developers.

---

## Contact & Links

- **Repository**: [GitHub](https://github.com/yourusername/predichaven)
- **Documentation**: [Full Docs](https://docs.predichaven.io)
- **Discord**: [Community](https://discord.gg/predichaven)
- **Twitter**: [@PredictHaven](https://twitter.com/predichaven)

---

**PredictHaven** - Predict privately, profit transparently.

_Powered by Zama FHEVM_

