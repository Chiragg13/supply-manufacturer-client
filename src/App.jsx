import { useState, useRef } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode';
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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const latestItemId = useRef(null);
  
  // --- NEW STATE for loading indicator ---
  const [isLoading, setIsLoading] = useState(false);


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
    setQrCodeDataUrl('');
    
    // --- NEW: Set loading to true ---
    setIsLoading(true);

    try {
      const tx = await contract.createItem(itemName);
      const receipt = await tx.wait();
      
      const iface = new ethers.Interface(contractABI.abi);
      const parsedLog = iface.parseLog(receipt.logs[0]);
      const newItemId = parsedLog.args.itemId;
      
      latestItemId.current = newItemId.toString();
      
      const qrUrl = `${window.location.origin}/item/${newItemId}`;
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 300 });
      setQrCodeDataUrl(dataUrl);

      alert(`Item created successfully! New Item ID is: ${newItemId}`);
      setItemName('');
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Error creating item. See the console for details.");
    } finally {
      // --- NEW: Set loading back to false when done ---
      setIsLoading(false);
    }
  };
  
  const handleDownloadQR = () => {
    // ... (This function remains unchanged)
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `item-qrcode-${latestItemId.current}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrintQR = () => {
    // ... (This function remains unchanged)
    if (!qrCodeDataUrl) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Print QR Code</title></head>
        <body style="text-align: center; margin-top: 50px;">
          <h1>Item ID: ${latestItemId.current}</h1>
          <p>Scan to verify authenticity</p>
          <img src="${qrCodeDataUrl}" />
          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
    <div className="main-container">
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
                {/* --- NEW: Button is now disabled and changes text when loading --- */}
                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Create Item'}
                </button>
              </form>
              {qrCodeDataUrl && (
                <div className="qr-code-container">
                  <h4>New Item QR Code:</h4>
                  <img src={qrCodeDataUrl} alt="Item QR Code" />
                  <p>Save this code to track your item.</p>
                  <div className="button-group">
                    <button onClick={handleDownloadQR}>Download QR</button>
                    <button onClick={handlePrintQR}>Print QR</button>
                  </div>
                </div>
              )}
            </div>

            <hr />

            <div className="form-container">
               {/* ... (Get History form remains unchanged) ... */}
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
                {/* ... (History display remains unchanged) ... */}
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
    </div>
  );
}

export default App;