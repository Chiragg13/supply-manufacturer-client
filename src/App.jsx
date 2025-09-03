import { useState } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode'; // Import the new library
import contractABI from './contracts/SupplyChain.json';
import './App.css';

const contractAddress = "0xa2B1C09BF148E2dF4231DB449e5CeD869Eca6541"; // <-- Make sure this is correct!

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [itemName, setItemName] = useState('');
  const [viewItemId, setViewItemId] = useState('');
  const [itemHistory, setItemHistory] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // --- NEW STATE for the QR Code ---
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');


  const connectWallet = async () => {
    // ... (This function remains unchanged)
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const supplyChainContract = new ethers.Contract(contractAddress, contractABI.abi, signer);
        
        setContract(supplyChainContract);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask to use this application.");
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!contract || !itemName) return;
    setQrCodeDataUrl(''); // Clear previous QR code
    try {
      const tx = await contract.createItem(itemName);
      const receipt = await tx.wait(); // Wait for the transaction to be mined
      
      // --- NEW LOGIC to get the newItemId and generate QR code ---
      // The contract emits an 'ItemCreated' event, which is in the transaction logs.
      // We parse the logs to find the ID of the item we just created.
      const iface = new ethers.Interface(contractABI.abi);
      const parsedLog = iface.parseLog(receipt.logs[0]);
      const newItemId = parsedLog.args.itemId;
      
      const qrUrl = `${window.location.origin}/item/${newItemId}`;
      const dataUrl = await QRCode.toDataURL(qrUrl);
      setQrCodeDataUrl(dataUrl);

      alert(`Item created successfully! New Item ID is: ${newItemId}`);
      setItemName('');
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Error creating item. See the console for details.");
    }
  };

  const handleGetItemHistory = async (e) => {
    // ... (This function remains unchanged)
    e.preventDefault();
    if (!contract || !viewItemId) return;
    setItemHistory(null);
    setItemDetails(null);
    setErrorMessage('');
    try {
      const details = await contract.items(viewItemId);
      if (details.id.toString() === "0" && details.name === "") {
        setErrorMessage(`Item with ID ${viewItemId} does not exist.`);
        return;
      }
      setItemDetails(details);
      const history = await contract.getItemHistory(viewItemId);
      setItemHistory(history);
    } catch (error) {
      console.error("Error fetching item history:", error);
      setErrorMessage("Error fetching history. Does the item exist?");
    }
  };

  const StateEnum = ["Created", "InTransit", "ArrivedAtRetailer", "Sold"];

  return (
    <div className="App">
      <header className="App-header">
        <h1>Supply Chain Tracker</h1>
        {account ? (
          <div>
            <p><strong>Connected Account:</strong> {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
            
            <div className="form-container">
              <form onSubmit={handleCreateItem}>
                <h3>Create a New Item</h3>
                <input
                  type="text"
                  placeholder="Enter item name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
                <button type="submit">Create Item</button>
              </form>
              {/* --- NEW DISPLAY for the QR Code --- */}
              {qrCodeDataUrl && (
                <div className="qr-code-container">
                  <h4>New Item QR Code:</h4>
                  <img src={qrCodeDataUrl} alt="Item QR Code" />
                  <p>Save this code to track your item.</p>
                </div>
              )}
            </div>

            <hr />

            <div className="form-container">
              <form onSubmit={handleGetItemHistory}>
                <h3>View Item History</h3>
                <input
                  type="number"
                  placeholder="Enter item ID"
                  value={viewItemId}
                  onChange={(e) => setViewItemId(e.target.value)}
                  required
                />
                <button type="submit">Get History</button>
              </form>
            </div>

            {errorMessage && <p className="error">{errorMessage}</p>}
            {itemHistory && itemDetails && (
              <div className="history-container">
                {/* ... (This display section remains unchanged) */}
                <h3>History for Item #{viewItemId}: {itemDetails.name}</h3>
                <p>Current Owner: {itemDetails.currentOwner}</p>
                <p>Current Status: {StateEnum[Number(itemDetails.currentState)]}</p>
                <ul>
                  {itemHistory.map((entry, index) => (
                    <li key={index}>
                      <strong>Status:</strong> {StateEnum[Number(entry.state)]} <br />
                      <strong>Timestamp:</strong> {new Date(Number(entry.timestamp) * 1000).toLocaleString()} <br />
                      <strong>Updated by:</strong> {entry.actor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </header>
    </div>
  );
}

export default App;