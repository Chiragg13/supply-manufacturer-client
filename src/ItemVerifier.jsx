import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import contractABI from './contracts/SupplyChain.json';
import './App.css'; // We can reuse the same styles

// This should be the SAME address as in App.jsx
const contractAddress = "0xa2B1C09BF148E2dF4231DB449e5CeD869Eca6541";
// This is the RPC URL for your Truffle Develop network
const rpcUrl = "https://eth-sepolia.g.alchemy.com/v2/tfwRDpxv2sq-5-Y7tScKC";

function ItemVerifier() {
    const { itemId } = useParams(); // Gets the item ID from the URL
    const [itemHistory, setItemHistory] = useState(null);
    const [itemDetails, setItemDetails] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchItemHistory = async () => {
            try {
                // Create a read-only connection to the blockchain
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);

                const details = await contract.items(itemId);
                if (details.id.toString() === "0" && details.name === "") {
                    setErrorMessage(`Item with ID ${itemId} does not exist.`);
                    return;
                }
                setItemDetails(details);

                const history = await contract.getItemHistory(itemId);
                setItemHistory(history);
            } catch (error) {
                console.error("Error fetching item history:", error);
                setErrorMessage("Could not fetch item history. Is the blockchain running?");
            } finally {
                setIsLoading(false);
            }
        };

        if (itemId) {
            fetchItemHistory();
        }
    }, [itemId]);

    const StateEnum = ["Created", "InTransit", "ArrivedAtRetailer", "Sold"];

    if (isLoading) {
        return <div className="App"><header className="App-header"><h1>Loading Item History...</h1></header></div>;
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>Item Authenticity Report</h1>
                {errorMessage && <p className="error">{errorMessage}</p>}
                {itemHistory && itemDetails && (
                    <div className="history-container">
                        <h2>History for Item #{itemId}: {itemDetails.name}</h2>
                        <p><strong>Current Owner:</strong> {itemDetails.currentOwner}</p>
                        <p><strong>Current Status:</strong> {StateEnum[Number(itemDetails.currentState)]}</p>
                        <hr />
                        <h3>Provenance Trail</h3>
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
            </header>
        </div>
    );
}

export default ItemVerifier;