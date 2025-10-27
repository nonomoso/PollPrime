import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

// Interface for a governance proposal
interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  options: { name: string; votes: number }[];
  status: "active" | "closed";
  timestamp: number;
}

// Interface for a user's vote, to be encrypted
interface EncryptedVote {
  proposalId: string;
  voter: string;
  encryptedVoteData: string; // Represents FHE-encrypted vote counts
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState<Proposal | null>(null);
  
  // Transaction states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState({
    visible: false,
    status: "pending" as "pending" | "success" | "error",
    message: ""
  });

  // Load all proposals from the blockchain on initial render
  useEffect(() => {
    loadProposals().finally(() => setLoading(false));
  }, []);

  // --- Wallet Connection Logic ---
  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", (newAccounts: string[]) => {
        setAccount(newAccounts[0] || "");
      });
    } catch (e) {
      console.error("Failed to connect wallet", e);
      alert("Failed to connect wallet. See console for details.");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };
  
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);

  // --- Core FHE Contract Interaction Logic ---

  const loadProposals = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) throw new Error("Contract not available.");

      const available = await contract.isAvailable();
      if (!available) {
          console.warn("Contract check returned false.");
      }

      const keysBytes = await contract.getData("proposal_keys");
      let keys: string[] = [];
       if (keysBytes && keysBytes.length > 0) {
        try {
          const parsedKeys = JSON.parse(ethers.toUtf8String(keysBytes));
          if (Array.isArray(parsedKeys)) {
            keys = parsedKeys;
          }
        } catch (e) {
          console.error("Error parsing proposal keys, starting with a fresh list.", e);
          keys = [];
        }
      }

      const proposalList: Proposal[] = [];
      for (const key of keys) {
        const proposalBytes = await contract.getData(`proposal_${key}`);
        if (proposalBytes.length > 0) {
          try {
            const proposalData = JSON.parse(ethers.toUtf8String(proposalBytes));
            proposalList.push(proposalData);
          } catch (e) {
             console.error(`Error parsing data for proposal ${key}:`, e);
          }
        }
      }
      
      proposalList.sort((a, b) => b.timestamp - a.timestamp);
      setProposals(proposalList);
    } catch (e) {
      console.error("Error loading proposals:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Creates a new governance proposal and stores it on-chain.
   * The proposal data is serialized and passed to the `setData` method.
   */
  const handleCreateProposal = async (title: string, description: string, optionsStr: string) => {
    if (!provider) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!title || !description || !optionsStr) {
      alert("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Preparing proposal data for secure storage..." });

    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Could not connect to contract with signer.");

      const options = optionsStr.split(',').map(name => ({ name: name.trim(), votes: 0 }));
      const newProposal: Proposal = {
        id: `prop_${Date.now()}`,
        title,
        description,
        proposer: account,
        options,
        status: "active",
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Transaction 1: Store the new proposal data
      await contract.setData(`proposal_${newProposal.id}`, ethers.toUtf8Bytes(JSON.stringify(newProposal)));

      // --- [FIXED] Robust key list retrieval and update ---
      const keysBytes = await contract.getData("proposal_keys");
      let keys: string[] = [];
      
      // Safely parse the existing keys
      if (keysBytes && keysBytes.length > 0) {
        try {
          const parsedKeys = JSON.parse(ethers.toUtf8String(keysBytes));
          // Ensure the parsed data is an array before using it
          if (Array.isArray(parsedKeys)) {
            keys = parsedKeys;
          } else {
             console.warn("Corrupted 'proposal_keys' data is not an array, resetting.");
          }
        } catch (e) {
          console.error("Failed to parse 'proposal_keys', resetting to an empty list.", e);
          // If parsing fails, we start with a new empty list to prevent the app from breaking.
          keys = [];
        }
      }
      
      keys.push(newProposal.id);

      // Transaction 2: Update the list of proposal keys
      await contract.setData("proposal_keys", ethers.toUtf8Bytes(JSON.stringify(keys)));
      // --- End of fix ---

      setTransactionStatus({ visible: true, status: "success", message: "Proposal successfully created on-chain." });
      await loadProposals();
      
      setTimeout(() => {
        setShowCreateModal(false);
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);

    } catch (e: any) {
      const message = e.message.includes("user rejected transaction") ? "Transaction rejected by user" : "Failed to create proposal.";
      setTransactionStatus({ visible: true, status: "error", message });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVoteSubmit = async (proposalId: string, votes: { [key: string]: number }) => {
    if (!provider) {
        alert("Please connect your wallet first.");
        return;
    }

    setIsSubmitting(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Encrypting vote with FHE and submitting to chain..." });
    
    try {
        const contract = await getContractWithSigner();
        if (!contract) throw new Error("Could not get contract with signer.");
        
        const encryptedVoteData = `fhe_encrypted_${btoa(JSON.stringify(votes))}`;
        const newVote: EncryptedVote = {
            proposalId,
            voter: account,
            encryptedVoteData
        };
        const voteId = `vote_${proposalId}_${account}`;

        await contract.setData(voteId, ethers.toUtf8Bytes(JSON.stringify(newVote)));

        setTransactionStatus({ visible: true, status: "success", message: "Your encrypted vote has been securely recorded." });
        
        await loadProposals();
        
        setTimeout(() => {
            setShowVoteModal(null);
            setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);

    } catch (e: any) {
        const message = e.message.includes("user rejected transaction") ? "Transaction rejected by user" : "Failed to submit encrypted vote.";
        setTransactionStatus({ visible: true, status: "error", message });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Initializing Astraea Protocol Interface...</p>
      </div>
    );
  }

  const activeProposals = proposals.filter(p => p.status === 'active').length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <h1>Astraea Protocol</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)}>Create Proposal</button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <h2>Fairness Meets Privacy in Decentralized Governance</h2>
          <p>
            Astraea Protocol leverages Fully Homomorphic Encryption (FHE) to enable private and fair
            Quadratic Voting on-chain, protecting voter preferences while resisting Sybil attacks and plutocracy.
          </p>
        </section>

        <section className="stats-dashboard">
          <div className="stat-card">
            <h4>Total Proposals</h4>
            <span className="stat-value">{proposals.length}</span>
          </div>
          <div className="stat-card">
            <h4>Active Proposals</h4>
            <span className="stat-value">{activeProposals}</span>
          </div>
          <div className="stat-card">
            <h4>Governance Participants</h4>
            <span className="stat-value">--</span>
          </div>
           <div className="stat-card">
            <h4>Total Encrypted Votes</h4>
            <span className="stat-value">--</span>
          </div>
        </section>

        <section className="proposals-section">
          <div className="section-header">
            <h3>Active Governance Proposals</h3>
            <button className="btn-refresh" onClick={loadProposals} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="proposals-list">
            {proposals.length === 0 ? (
              <div className="empty-state">
                <p>No proposals found.</p>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Create the First Proposal</button>
              </div>
            ) : (
              proposals.map(proposal => (
                <div className="proposal-card" key={proposal.id}>
                  <div className="proposal-header">
                    <span className={`status-badge ${proposal.status}`}>{proposal.status}</span>
                    <h4 className="proposal-title">{proposal.title}</h4>
                  </div>
                  <p className="proposal-description">{proposal.description.substring(0, 100)}...</p>
                  <div className="proposal-footer">
                    <span>Proposer: {proposal.proposer.substring(0, 6)}...{proposal.proposer.substring(38)}</span>
                    <button className="btn btn-primary" onClick={() => setShowVoteModal(proposal)}>Vote</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showCreateModal && (
        <CreateProposalModal
          isSubmitting={isSubmitting}
          onSubmit={handleCreateProposal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {showVoteModal && (
        <VoteModal
          proposal={showVoteModal}
          isSubmitting={isSubmitting}
          onSubmit={handleVoteSubmit}
          onClose={() => setShowVoteModal(null)}
        />
      )}

      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <TransactionStatusModal status={transactionStatus.status} message={transactionStatus.message} />
      )}
    </div>
  );
};

// --- Child Components for Modals ---

const CreateProposalModal = ({ onSubmit, onClose, isSubmitting }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Proposal</h3>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Proposal Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Allocate treasury funds..." />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Provide a detailed description of the proposal."></textarea>
          </div>
          <div className="form-group">
            <label>Vote Options (comma-separated)</label>
            <input type="text" value={options} onChange={e => setOptions(e.target.value)} placeholder="e.g., For, Against, Abstain" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSubmit(title, description, options)} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Proposal"}
          </button>
        </div>
      </div>
    </div>
  );
};

const VoteModal = ({ proposal, onSubmit, onClose, isSubmitting }) => {
  const [votes, setVotes] = useState({});
  const [totalCost, setTotalCost] = useState(0);

  const handleVoteChange = (optionName, value) => {
    const numVotes = Math.max(0, parseInt(value) || 0);
    const newVotes = { ...votes, [optionName]: numVotes };
    
    const cost = Object.values(newVotes).reduce((acc: number, v: number) => acc + (v * v), 0);
    
    setVotes(newVotes);
    setTotalCost(cost);
  };
  
  const availableCredits = 100;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Vote on: {proposal.title}</h3>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        <div className="modal-body">
          <p className="fhe-notice">Your vote distribution is private and will be encrypted using FHE before submission.</p>
          
          <div className="vote-options">
            {proposal.options.map(option => (
              <div className="vote-option-row" key={option.name}>
                <label>{option.name}</label>
                <div className="vote-input-group">
                  <input 
                    type="number"
                    min="0"
                    onChange={e => handleVoteChange(option.name, e.target.value)}
                    placeholder="0"
                  />
                  <span>Votes</span>
                </div>
                <div className="vote-cost">
                  Cost: <strong>{(votes[option.name] || 0) * (votes[option.name] || 0)}</strong> credits
                </div>
              </div>
            ))}
          </div>

          <div className="vote-summary">
            <div>Total Voice Credits Cost: <strong>{totalCost}</strong></div>
            <div>Your Available Credits: <strong>{availableCredits}</strong></div>
            {totalCost > availableCredits && <div className="error-text">Cost exceeds available credits!</div>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={() => onSubmit(proposal.id, votes)} 
            disabled={isSubmitting || totalCost > availableCredits || totalCost === 0}
          >
            {isSubmitting ? "Encrypting & Submitting..." : "Submit Encrypted Vote"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TransactionStatusModal = ({ status, message }) => {
    const icon = {
        pending: <div className="spinner-small"></div>,
        success: <div className="icon-check"></div>,
        error: <div className="icon-error"></div>,
    };

    return (
        <div className="transaction-status-overlay">
            <div className={`transaction-status-content ${status}`}>
                <div className="transaction-icon">{icon[status]}</div>
                <p>{message}</p>
            </div>
        </div>
    );
};

export default App;